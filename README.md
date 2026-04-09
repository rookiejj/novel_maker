# 한편 — 아무도 읽지 않는 이야기를 씁니다

오늘의 기분과 날씨를 기록하면, 그것을 반영한 짧은 소설을 한 편 써 드립니다.
소설은 시리즈 단위로 이어서 연재할 수 있고, 자동으로 세계관과 등장인물이 누적됩니다.

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + SSR)
- **Anthropic Claude API** — 소설 본문 / 요약 생성
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
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public 키 |

> `.env.local` 파일은 git에 올리지 않습니다. `.gitignore`에 포함되어 있습니다.

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
| `novels` | 개별 소설 (본문, config, series_id) |
| `world_bibles` | 시리즈별 세계관 (characters / rules jsonb) |
| `story_bibles` | 에피소드별 요약 (threads / new_characters jsonb) |
| `active_series` | 유저별 현재 활성 시리즈 (user_id PK) |
| `mood_records` | 날짜별 기분 (user_id + date UNIQUE) |
| `weather_records` | 날짜별 날씨 (user_id + date UNIQUE) |

## Vercel 배포

```bash
# GitHub 연동 후 Vercel 대시보드에서 Import
# 또는 CLI
npm i -g vercel
vercel
```

Vercel 프로젝트 → Settings → Environment Variables에 위 환경변수 3개를 모두 등록합니다.

## 구조

```
├── app/
│   ├── api/
│   │   ├── novel/route.ts          # Claude SSE 스트리밍 소설 생성
│   │   └── summarize/route.ts      # 소설 → story/world bible 자동 요약
│   ├── auth/
│   │   └── callback/route.ts       # Supabase OAuth 콜백 (code exchange)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                    # 서버 컴포넌트. 세션 확인 후 HomeView 렌더
├── components/
│   ├── layout/
│   │   └── Header.tsx              # 헤더 + 조건부 로그아웃 버튼
│   ├── views/
│   │   ├── HomeView.tsx            # 메인 화면 (기분/날씨/시리즈/이야기 목록)
│   │   └── LoginSection.tsx        # 비로그인 시 HomeView 내부에 렌더되는 로그인 카드
│   ├── mood/
│   │   ├── MoodSelector.tsx        # 오늘의 기분 선택
│   │   └── MoodHistory.tsx
│   ├── weather/
│   │   └── WeatherSelector.tsx     # 오늘의 날씨 선택
│   ├── novel/
│   │   ├── NovelWizard.tsx         # 장르/분위기/필체/분량/주인공 선택
│   │   ├── NovelViewer.tsx         # 스트리밍 소설 뷰어
│   │   ├── NovelCard.tsx           # 저장된 소설 카드
│   │   ├── NovelReadModal.tsx      # 소설 전체 읽기 모달
│   │   └── SeriesPickerModal.tsx   # 시리즈 전환 모달
│   └── ui/
│       └── TwEmoji.tsx             # Twemoji 렌더러
├── lib/
│   ├── anthropic.ts                # Anthropic 클라이언트 singleton (서버)
│   ├── supabase/
│   │   ├── client.ts               # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts               # 서버 컴포넌트/라우트용 클라이언트
│   │   └── db.ts                   # 모든 테이블 CRUD 래퍼
│   ├── storage.ts                  # db.ts를 구 이름(moodStorage/novelStorage)으로 재노출
│   ├── types.ts                    # 공유 타입 및 상수 맵 (GENRE_MAP, MOOD_MAP 등)
│   └── utils.ts                    # generateId(), extractTitle(), formatDate() 등
├── prompts/
│   └── novelist.ts                 # 소설가 시스템 프롬프트 빌더
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
3. `/api/novel`에 POST
   - 기존 `world_bible`, `story_bibles`, 최근 7일 기분, 현재 설정을 시스템 프롬프트에 합성
   - Anthropic Messages API의 SSE 스트리밍으로 본문 반환
4. `NovelViewer`가 스트리밍을 받아 실시간 렌더
5. 저장 시
   - `novels` 테이블에 본문 저장
   - `series.episode_count` 증가 + `last_options` 갱신
   - `/api/summarize`를 호출하여 story bible / world bible 자동 생성·병합
6. 이후 이 시리즈의 다음 편은 누적된 바이블을 참고해 일관성을 유지한 채 이어짐

## 주요 동작 참고

- 모든 데이터의 `id`는 클라이언트에서 생성한 UUID (text 타입). `generateId()` 참고
- `novels.series_id`는 NOT NULL — 모든 소설은 반드시 시리즈에 속함 (단편 개념 없음)
- `middleware.ts`는 리다이렉트하지 않습니다. 로그인/비로그인 화면 분기는 루트 서버 컴포넌트에서만 일어남
