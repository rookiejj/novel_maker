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

`series.total_episodes`는 `10`, `20`, `30` 중 하나이며, 시리즈 생성 시 선택한 뒤 변경할 수 없습니다.

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
│   ├── globals.css                 # 본문 타이포그래피 + 모달 높이(.modal-max-h) 등
│   ├── layout.tsx
│   └── page.tsx                    # 서버 컴포넌트. 세션 확인 후 HomeView 렌더
├── components/
│   ├── layout/
│   │   └── Header.tsx              # 헤더 + 조건부 로그아웃 버튼
│   ├── views/
│   │   ├── HomeView.tsx            # 메인 화면 (로딩 상태/시리즈/작성/지난 이야기/폴링/재시도/자동 스크롤)
│   │   └── LoginSection.tsx        # 비로그인 시 HomeView 내부에 렌더되는 로그인 카드
│   ├── mood/
│   │   ├── MoodSelector.tsx        # 오늘의 기분 선택
│   │   └── MoodHistory.tsx
│   ├── weather/
│   │   └── WeatherSelector.tsx     # 오늘의 날씨 선택
│   ├── novel/
│   │   ├── NovelWizard.tsx         # 장르/분위기/필체/분량/주인공/총편수(10/20/30) 선택
│   │   ├── NovelViewer.tsx         # 스트리밍 소설 뷰어 (페이싱 버퍼 + 상시 footer)
│   │   ├── NovelCard.tsx           # 저장된 소설 카드 (일러스트 썸네일 + 실패 시 재시도)
│   │   ├── NovelReadModal.tsx      # 소설 전체 읽기 모달 (일러스트 + 재시도, 배경 클릭 닫기)
│   │   └── SeriesPickerModal.tsx   # 시리즈 전환 모달 (완결/진행 중 배지)
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
│   ├── types.ts                    # 공유 타입 및 상수 맵 (GENRE_MAP, MOOD_MAP, SeriesLength 등)
│   ├── useModalBackDismiss.ts      # 모달 공통 훅 (뒤로 가기 가로채기 + body 스크롤 잠금)
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
로그인:   기분/날씨 + (로딩 중이면 플레이스홀더) + 시리즈/작성/지난 이야기
```

- 로그인: `LoginSection`의 "Google 계정으로 계속하기" → `supabase.auth.signInWithOAuth({ provider: 'google' })` → Google → `/auth/callback?code=...` → 세션 쿠키 저장 → `/`로 리다이렉트
- 로그아웃: `Header`의 로그아웃 버튼 → `supabase.auth.signOut()` → `window.location.href = '/'` (하드 리로드로 전역 상태 리셋)

### 초기 로딩 플레이스홀더

로그인 직후 `HomeView`의 mount effect가 Supabase에서 `series` / `novels` / `mood` / `weather`를 불러오는 동안 `isLoading` 플래그가 true이며, 그동안은 "이야기들을 불러오는 중…" 스피너 카드가 노출됩니다. 로딩이 끝나기 전에 빈 상태(`"첫 번째 시리즈를 시작해보세요"` 혹은 `+ 새 시리즈` 버튼)가 잠깐 노출돼 사용자가 로그인 실패로 오해하거나 성급히 버튼을 누르는 문제를 막기 위함입니다. `try / finally`로 감싸서 로딩 중 예외가 발생해도 반드시 플래그가 해제됩니다.

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
4. `NovelViewer`가 스트리밍을 받아 실시간 렌더 (페이싱 버퍼 — 아래 참고)
5. 저장 시
   - `novels` 테이블에 본문 저장 (`illustration_status`는 DB 기본값 `'pending'`)
   - `NovelViewer`는 즉시 닫히고, `handleNovelSaved`는 백그라운드로 진행
   - `series.episode_count` 증가 + `last_options` 갱신
   - `/api/summarize` 호출하여 story bible / world bible 자동 생성·병합
   - `/api/illustration` 을 fire-and-forget으로 트리거

### 스트리밍 뷰어와 페이싱

`NovelViewer`는 SSE 청크를 그대로 화면에 붙이지 않고, 내부 버퍼(`pendingBufferRef`)에 쌓은 뒤 `requestAnimationFrame` 루프에서 적응형 속도(`perFrame = max(2, ceil(pending / 30))`)로 조금씩 흘려보냅니다. 이로써 청크 크기·간격의 불균일을 어느 정도 흡수해 "멈춤 → 뭉텅이 → 멈춤"의 체감을 완화합니다. 서버 `event: done` 수신 시에는 즉시 완료 전이하지 않고 `streamDoneRef`만 세우며, 루프가 버퍼를 모두 비운 뒤에야 `status='done'`으로 전이해 "마지막 문장이 뚝 나타나고 바로 저장 버튼"이 생기는 현상을 막습니다. rAF 루프와 fetch는 하나의 `useEffect`로 묶여 있고, 진입 시점에 모든 ref가 명시적으로 리셋되어 React Strict Mode 이중 실행에서도 상태가 꼬이지 않습니다.

Footer는 항상 표시되지만, `canSave = (status === 'done' && !saved && raw.trim().length > 0)`가 아닐 때 저장 버튼은 `disabled` + 회색 + `cursor-not-allowed`로 시각·기능 모두 비활성화되고 라벨도 상태에 따라 `작성 중…` / `저장 불가` / `저장하기` / `저장됨 ✓`로 바뀝니다. 스트리밍 중엔 헤더의 `×` 버튼 없이 하단 `취소` 버튼으로만 나가도록 해 UX를 단순화했습니다.

### 자동 스크롤

`HomeView`는 `step` 전이에 맞춰 두 가지 자동 스크롤을 수행합니다.

- **위저드 → 뷰어**: `step === 'viewing'`으로 바뀌는 순간 페이지를 최상단으로 smooth 스크롤. 뷰어 높이가 작아 페이지 중간에서 클릭했을 때 뷰어가 화면 밖에 렌더되는 문제를 막습니다.
- **저장 후 홈 복귀**: `handleNovelSaved`가 `justSavedRef.current = true`를 세우고, `step === 'home'` 전이 effect가 이 플래그를 소비하여 "지난 이야기" 섹션(`novelListSectionRef`)으로 `scrollIntoView`. 뷰어가 사라지면서 레이아웃이 줄어들어 방금 쓴 글 카드가 시야에서 벗어나는 문제를 해결합니다. 취소 경로에서는 플래그가 세워지지 않아 스크롤이 발생하지 않습니다.

### 모달 뒤로 가기 가로채기 + body 스크롤 잠금

`lib/useModalBackDismiss.ts`가 `NovelReadModal`과 `SeriesPickerModal`에서 공통으로 사용되는 훅입니다. 해결하는 두 문제:

1. **모바일 뒤로 가기 → 앱 탈출**: 순수 React state로 열리는 모달은 브라우저 history에 엔트리가 없어, Android 백키 / iOS 엣지 스와이프를 누르면 루트 페이지가 아닌 이전 페이지(=로그인 화면)로 이동해버립니다. 훅은 모달이 열리는 순간 `history.pushState`로 더미 엔트리를 추가하고 `popstate` 리스너를 등록해, 뒤로 가기를 "모달 닫기"로 가로챕니다. 내부의 X 버튼 · 백드롭 클릭 등 수동 닫기 경로는 훅이 반환하는 `dismiss()`를 호출하며, `dismiss()`는 `history.back()`을 실행해 우리가 쌓은 엔트리를 소비하고 `popstate` 리스너가 `onClose`를 호출하는 단일 경로로 수렴합니다. **cleanup에서는 리스너만 제거하고 `history.back()`은 호출하지 않습니다** — 호출하면 React Strict Mode 이중 실행 시 popstate가 연쇄로 발생해 "모달이 열리자마자 스스로 닫히는" 버그가 생깁니다.

2. **뒷배경 스크롤 방지 + fixed 모달 위치 틀어짐**: 단순 `body { overflow: hidden }`만 걸면 iOS Safari / 모바일 Chrome에서 현재 스크롤 위치가 유지되지 못해, 페이지를 한참 아래로 스크롤한 상태에서 모달을 열면 fixed 모달이 "원래 scrollY만큼 밀려난" 위치에 렌더되어 하단이 화면 밖으로 잘리는 문제가 있었습니다. 훅은 대신 `position: fixed + top: -${scrollY}px` 패턴을 씁니다. body를 viewport에 고정하면서 top 값으로 기존 스크롤 위치를 상쇄하면 시각적으로는 제자리에 있고 실제 문서 스크롤은 0으로 리셋되어, 뒷배경이 완벽히 멈추고 fixed 모달도 viewport 기준으로 정확히 렌더됩니다. 모달이 닫힐 때 body 스타일을 원복하고 `window.scrollTo(0, savedScrollY)`로 복원합니다. 모듈 레벨 카운터(`lockCount`)로 참조 카운팅해 여러 모달 중첩에도 안전합니다.

### 모달 높이 (iOS 주소창 대응)

`app/globals.css`의 `.modal-max-h` 커스텀 클래스:

```css
.modal-max-h {
  max-height: calc(100vh - 3rem);
  max-height: calc(100dvh - 3rem);
}
```

`100vh`는 iOS Safari / 모바일 Chrome에서 주소창을 포함한 "큰" 뷰포트 기준이라 실제 가시 영역보다 커서 모달 하단이 잘립니다. `100dvh`는 브라우저 UI를 제외한 실제 가시 영역 기준(iOS 15.4+ / Chrome 108+). 두 선언을 같은 클래스에 넣어 `dvh`를 지원하는 브라우저는 두 번째 선언이 cascade로 적용되고, 구형 브라우저는 파싱 실패한 두 번째 선언을 버리고 첫 번째 `vh`로 fallback합니다. `3rem`은 backdrop 패딩 `pt-8 p-4`(상단 2rem + 하단 1rem)의 합계입니다. 인라인 `style` 객체는 JS에서 동일 키가 덮어쓰이고 Tailwind arbitrary value는 동일 프로퍼티 유틸리티를 병합할 수 있어, raw CSS로 쓰는 이 방식이 가장 확실합니다.

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
   │                                    │ 5. Fal.ai (flux/schnell) 호출 — 4:3 landscape
   │                                    │ 6. 이미지 바이트 다운로드
   │                                    │ 7. Supabase Storage 업로드 (service_role 클라이언트)
   │                                    │ 8. novels.illustration_url + status='done' 업데이트
   │                                    │    실패 시 status='failed'
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
- **실패 시 재시도**: `illustration_status='failed'`가 되면 `NovelCard`와 `NovelReadModal`에 "↻ 다시 시도" 버튼이 노출됩니다. 버튼 클릭 → `handleRetryIllustration`가 로컬 상태를 낙관적으로 `pending`으로 되돌리고 동일 `/api/illustration` 엔드포인트를 POST. API는 멱등하게 설계되어 있어(`done`/`generating` 스킵, `pending`/`failed` 진행) 같은 호출이 그대로 복구 경로가 됩니다. 네트워크 오류로 POST 자체가 실패하면 로컬을 다시 `failed`로 롤백해 버튼이 재노출됩니다. 클라이언트는 DB 상태를 직접 건드리지 않습니다 — 모든 전이는 서버가 담당.

## 주요 동작 참고

- 모든 데이터의 `id`는 클라이언트에서 생성한 UUID (text 타입). `generateId()` 참고
- `novels.series_id`는 NOT NULL — 모든 소설은 반드시 시리즈에 속함 (단편 개념 없음)
- **새 시리즈의 저장 순서**: 위저드 완료 직후 `saveSeries`가 먼저 실행되고, 그 다음 소설 생성 화면으로 진입합니다. 이 순서가 보장되어야 `novels` insert 시 FK 제약이 통과합니다.
- **저장 후처리의 동기/백그라운드 분리**: `handleNovelSaved`는 첫 await 이전에 (1) `pendingNewSeriesRef.current = null` — 시리즈 롤백 방지, (2) novels 낙관적 갱신, (3) `justSavedRef = true` — 스크롤 플래그 세 가지를 동기적으로 처리한 뒤, `incrementEpisodeCount` / `updateSeriesLastOptions` / `loadAllSeries` / `loadNovels` / `/api/summarize` / `saveWorldBible` / `saveStoryBible` 등의 무거운 작업은 전부 백그라운드 IIFE로 분리합니다. 이 구조 덕분에 `NovelViewer`의 `await onSaved(record) → onClose()` 경로가 수 ms 내로 완료되어 뷰어가 즉시 닫히면서도, 새 시리즈 첫 화 저장 시 시리즈가 고아로 롤백되는 데이터 손실 버그가 발생하지 않습니다. 순서 주의: `onSaved`는 반드시 `onClose` 이전에 await돼야 합니다.
- `middleware.ts`는 리다이렉트하지 않습니다. 로그인/비로그인 화면 분기는 루트 서버 컴포넌트에서만 일어남
- `saveNovel`의 upsert는 `illustration_url` / `illustration_status` 컬럼을 **의도적으로 payload에 포함하지 않습니다**. 신규 행은 DB 기본값(`'pending'`)을 쓰고, 기존 행은 현재 상태(서버가 업데이트 중일 수 있음)를 덮어쓰지 않기 위함입니다.
- `/api/illustration`은 `maxDuration: 300` (vercel.json). Fal.ai 호출이 길어져도 끊기지 않도록 여유를 둡니다.
- **본문 타이포그래피**: `.prose p`의 상하 margin을 `0.25em !important`로 고정해 Tailwind Typography 플러그인 기본값(`1.25em`)과 `<p>`의 `mb-4` 유틸리티까지 한꺼번에 덮어씁니다. 문단 *내부* 줄간격(`line-height: 2.0`)은 유지.
