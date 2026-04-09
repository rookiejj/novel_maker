# 한편 — 아무도 읽지 않는 이야기를 씁니다

오늘의 기분과 날씨를 기록하면, 그것을 반영한 짧은 소설을 한 편 써 드립니다.
소설은 시리즈 단위로 이어서 연재할 수 있고, 자동으로 세계관과 등장인물이 누적됩니다.
저장된 소설에는 장면에 어울리는 일러스트가 자동으로 생성되어 카드에 붙습니다.

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + SSR + Storage)
- **Anthropic Claude API** — 소설 본문 / 요약 / 일러스트 프롬프트 생성
- **Fal.ai** (`fal-ai/flux/schnell`) — 일러스트 이미지 생성
- 배포: **Vercel**

## 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env.local
# .env.local 파일에 아래 키들을 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

### 환경변수

| 이름 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키 (`sk-ant-...`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키 (레거시 형식) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 (레거시 형식). Storage 업로드용. **서버 전용, 브라우저 노출 금지** |
| `FAL_KEY` | Fal.ai API 키. 일러스트 생성에 사용 |

> `.env.local` 파일은 git에 올리지 않습니다. `.gitignore`에 포함되어 있습니다.
> `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하므로 반드시 서버 사이드에서만 사용하고, `NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다.

## Supabase 설정

### 1. Auth Provider (Google OAuth)

- Supabase Dashboard → Authentication → Providers → Google 활성화
- Google Cloud Console OAuth 2.0 Client ID의 **Authorized redirect URIs**에 다음을 추가:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Supabase Dashboard → Authentication → URL Configuration:
  - **Site URL**: 프로덕션 도메인 (예: `https://your-app.vercel.app`)
  - **Redirect URLs**: `http://localhost:3000/**`, `https://your-app.vercel.app/**`

### 2. 테이블

모든 테이블은 RLS가 켜져 있고, 정책은 `auth.uid() = user_id` 단일 규칙입니다.

| 테이블 | 용도 |
| --- | --- |
| `series` | 연작 시리즈 메타 (장르, 주인공, 총 편수 등) |
| `novels` | 개별 소설 (본문, config, series_id, 일러스트 url/status) |
| `world_bibles` | 시리즈별 세계관 (characters / rules jsonb) |
| `story_bibles` | 에피소드별 요약 (threads / new_characters jsonb) |
| `active_series` | 유저별 현재 활성 시리즈 (user_id PK) |
| `mood_records` | 날짜별 기분 (user_id + date UNIQUE) |
| `weather_records` | 날짜별 날씨 (user_id + date UNIQUE) |

`novels` 테이블에는 일러스트 관련 컬럼 두 개가 있습니다:

- `illustration_url text` — 생성된 이미지의 public URL
- `illustration_status text` — `'pending' | 'generating' | 'done' | 'failed'`

### 3. Storage (일러스트)

일러스트는 Supabase Storage의 `novel-illustrations` 버킷에 저장됩니다.

- **Bucket**: `novel-illustrations`
- **Public**: `true` (이미지는 public URL로 직접 접근)
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/png`, `image/jpeg`, `image/webp`

RLS 정책 3개가 걸려 있습니다 (모두 `authenticated` role):

```sql
-- INSERT: 본인 폴더에만 업로드
CREATE POLICY "Users can upload own illustrations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'novel-illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE / DELETE: 본인 파일에만
CREATE POLICY "Users can update own illustrations" ON storage.objects FOR UPDATE TO authenticated USING (...);
CREATE POLICY "Users can delete own illustrations" ON storage.objects FOR DELETE TO authenticated USING (...);
```

업로드 경로는 `{user_id}/{novel_id}.{ext}` 형식입니다.

> ⚠️ 서버의 `/api/illustration` 라우트는 Storage 업로드에 한해 **service_role 클라이언트를 별도로 사용**하여 RLS를 우회합니다. `@supabase/ssr`의 cookie 기반 클라이언트가 Storage 요청에서 세션 전파가 불안정한 경우가 있기 때문입니다. 인증(사용자 식별)은 여전히 cookie 기반 클라이언트로 수행하므로, service_role은 "경로에 검증된 user_id를 강제하는" 방식으로만 쓰여 안전합니다.

## Vercel 배포

```bash
# GitHub 연동 후 Vercel 대시보드에서 Import
# 또는 CLI
npm i -g vercel
vercel
```

Vercel 프로젝트 → Settings → Environment Variables에 위 환경변수 5개를 모두 등록합니다. `SUPABASE_SERVICE_ROLE_KEY`와 `FAL_KEY`도 잊지 말고 추가해야 합니다.

## 구조

```
├── app/
│   ├── api/
│   │   ├── novel/route.ts          # Claude SSE 스트리밍 소설 생성
│   │   ├── summarize/route.ts      # 소설 → story/world bible 자동 요약
│   │   └── illustration/route.ts   # Haiku 프롬프트 → Fal.ai → Storage 업로드
│   ├── auth/
│   │   └── callback/route.ts       # Supabase OAuth 콜백 (code exchange)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # 서버 컴포넌트. 세션 확인 후 HomeView 렌더
├── components/
│   ├── layout/
│   │   └── Header.tsx              # 헤더 + 조건부 로그아웃 버튼
│   ├── views/
│   │   ├── HomeView.tsx            # 메인 화면 (기분/날씨/시리즈/이야기 목록 + 일러스트 폴링)
│   │   └── LoginSection.tsx        # 비로그인 시 HomeView 내부에 렌더되는 로그인 카드
│   ├── mood/
│   │   ├── MoodSelector.tsx        # 오늘의 기분 선택
│   │   └── MoodHistory.tsx
│   ├── weather/
│   │   └── WeatherSelector.tsx     # 오늘의 날씨 선택
│   ├── novel/
│   │   ├── NovelWizard.tsx         # 장르/분위기/필체/분량/주인공 선택
│   │   ├── NovelViewer.tsx         # 스트리밍 소설 뷰어
│   │   ├── NovelCard.tsx           # 저장된 소설 카드 (일러스트 썸네일 포함)
│   │   ├── NovelReadModal.tsx      # 소설 전체 읽기 모달 (일러스트 표시)
│   │   └── SeriesPickerModal.tsx   # 시리즈 전환 모달
│   └── ui/
│       └── TwEmoji.tsx             # Twemoji 렌더러
├── lib/
│   ├── anthropic.ts                # Anthropic 클라이언트 singleton (서버)
│   ├── fal.ts                      # Fal.ai 클라이언트 초기화
│   ├── supabase/
│   │   ├── client.ts               # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts               # 서버 컴포넌트/라우트용 클라이언트
│   │   └── db.ts                   # 모든 테이블 CRUD 래퍼
│   ├── storage.ts                  # db.ts를 구 이름(moodStorage/novelStorage)으로 재노출
│   ├── types.ts                    # 공유 타입 및 상수 맵 (GENRE_MAP, MOOD_MAP, IllustrationStatus 등)
│   └── utils.ts                    # generateId(), extractTitle(), formatDate() 등
├── prompts/
│   ├── novelist.ts                 # 소설가 시스템 프롬프트 빌더
│   └── illustration.ts             # 일러스트 프롬프트 생성용 Haiku 시스템 프롬프트
├── middleware.ts                   # Supabase 세션 쿠키 갱신 (리다이렉트 없음)
└── vercel.json                     # maxDuration: 300
```

## 인증 플로우

루트 페이지 `/`는 **서버 컴포넌트**로 동작하며, 로그인 여부에 따라 다른 UI를 내려보냅니다.

```
middleware.ts            → 세션 쿠키만 갱신 (리다이렉트 없음)
        ↓
app/page.tsx             → supabase.auth.getUser() 체크
        ↓
<HomeView isAuthenticated={!!user} />
        ↓
비로그인: 기분/날씨 + <LoginSection />
로그인:   기분/날씨 + 시리즈/작성/지난 이야기
```

- 로그인: `LoginSection`의 "Google 계정으로 계속하기" → `supabase.auth.signInWithOAuth({ provider: 'google' })` → Google → `/auth/callback?code=...` → 세션 쿠키 저장 → `/`로 리다이렉트
- 로그아웃: `Header`의 로그아웃 버튼 → `supabase.auth.signOut()` → `window.location.href = '/'` (하드 리로드로 전역 상태 리셋)

### 인앱 브라우저 대응

`LoginSection` 내부에서 `navigator.userAgent`로 알려진 인앱 브라우저(KakaoTalk, Facebook, Instagram, LINE, Naver, Daum, 일반 Android WebView)를 감지합니다.

- **Android 인앱**: `intent://` 스킴으로 Chrome 강제 실행
- **iOS 인앱**: "Safari에서 열어주세요" 안내 카드 표시
- **감지 불가능한 WebView** (텔레그램 등 UA 위장): 감지 실패하지만 OAuth redirect flow로 진행되어 대부분 정상 동작

## 작동 원리

1. 사용자가 오늘의 기분/날씨 선택 → Supabase `mood_records` / `weather_records`에 upsert
2. 시리즈 시작 또는 이어 쓰기 → `NovelWizard`에서 장르 / 분위기 / 필체 / 분량 선택
   - **새 시리즈**는 위저드 완료 시점에 `series` 테이블에 즉시 저장됩니다 (`novels.series_id`가 FK라서).
   - 사용자가 저장 없이 취소하면 `handleViewerClose`에서 빈 시리즈를 `deleteSeries`로 롤백합니다.
3. `/api/novel`에 POST
   - 기존 `world_bible`, `story_bibles`, 최근 7일 기분, 현재 설정을 시스템 프롬프트에 합성
   - Anthropic Messages API의 SSE 스트리밍으로 본문 반환
4. `NovelViewer`가 스트리밍을 받아 실시간 렌더
5. 저장 시
   - `novels` 테이블에 본문 저장 (`illustration_status`는 DB 기본값 `'pending'`)
   - `NovelViewer`는 즉시 닫히고, `handleNovelSaved`는 백그라운드로 진행
   - `series.episode_count` 증가 + `last_options` 갱신
   - `/api/summarize` 호출하여 story bible / world bible 자동 생성·병합
   - `/api/illustration` 을 fire-and-forget으로 트리거

### 일러스트 생성 파이프라인

```
클라이언트                          /api/illustration (서버)
   │                                    │
   │ fire-and-forget POST               │
   ├──────────────────────────────────→ │
   │                                    │ 1. 인증 확인 (cookie 기반)
   │                                    │ 2. novels 행 로드, 이미 done/generating이면 스킵
   │                                    │ 3. status='generating'으로 업데이트
   │                                    │ 4. Claude Haiku에 프롬프트 생성 요청
   │                                    │    (prompts/illustration.ts 사용, 애니/지브리 풍 고정)
   │                                    │ 5. Fal.ai (flux/schnell) 호출 — 4:3 landscape
   │                                    │ 6. 이미지 바이트 다운로드
   │                                    │ 7. Supabase Storage 업로드 (service_role 클라이언트)
   │                                    │ 8. novels.illustration_url + status='done' 업데이트
   │                                    │
   │ (탭 닫혀도 keepalive:true로 진행)  │
   │                                    │
   │ 4초마다 폴링                       │
   │ loadNovels() — 상태만 확인         │
   │ (pending/generating이 있을 때만)   │
   │                                    │
   │ status='done'이면                  │
   │ 카드 썸네일을 스피너→이미지로       │
```

- 폴링은 `HomeView`의 `useEffect`에서 돌며, `novels`에 `pending`/`generating`이 **하나도 없으면 자동으로 멈춥니다**.
- 열려 있는 `NovelReadModal`도 폴링이 동기화해주므로, 모달을 먼저 열어둬도 완성되면 자동으로 이미지가 들어찹니다.
- 실패 시 `illustration_status='failed'`로 업데이트되어 해당 소설에 대한 폴링은 멈춥니다. 현재는 재시도 UI가 없습니다.

## 주요 동작 참고

- 모든 데이터의 `id`는 클라이언트에서 생성한 UUID (text 타입). `generateId()` 참고
- `novels.series_id`는 NOT NULL — 모든 소설은 반드시 시리즈에 속함 (단편 개념 없음)
- **새 시리즈의 저장 순서**: 위저드 완료 직후 `saveSeries`가 먼저 실행되고, 그 다음 소설 생성 화면으로 진입합니다. 이 순서가 보장되어야 `novels` insert 시 FK 제약이 통과합니다.
- `middleware.ts`는 리다이렉트하지 않습니다. 로그인/비로그인 화면 분기는 루트 서버 컴포넌트에서만 일어남
- `saveNovel`의 upsert는 `illustration_url` / `illustration_status` 컬럼을 **의도적으로 payload에 포함하지 않습니다**. 신규 행은 DB 기본값(`'pending'`)을 쓰고, 기존 행은 현재 상태(서버가 업데이트 중일 수 있음)를 덮어쓰지 않기 위함입니다.
- `/api/illustration`은 `maxDuration: 300` (vercel.json). Fal.ai 호출이 길어져도 끊기지 않도록 여유를 둡니다.
