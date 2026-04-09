import { createClient } from '@/lib/supabase/server';
import HomeView from '@/components/views/HomeView';
import LoginView from '@/components/views/LoginView';

// 루트 페이지는 서버 컴포넌트로 동작한다.
// 서버에서 세션을 확인해 로그인 여부에 따라 두 뷰 중 하나를 내려보낸다.
// - 비로그인: <LoginView /> (GSI + 인앱 브라우저 처리)
// - 로그인:   <HomeView />  (메인 앱)
//
// 로그인/로그아웃 후에는 클라이언트에서 router.refresh()만 호출하면
// 서버가 새로운 세션 상태로 이 컴포넌트를 다시 렌더해 자동 전환된다.
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <LoginView />;
  }
  return <HomeView />;
}
