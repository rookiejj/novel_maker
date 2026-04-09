import { createClient } from '@/lib/supabase/server';
import HomeView from '@/components/views/HomeView';

// 루트는 항상 HomeView를 렌더한다.
// 비로그인 상태에서는 HomeView 내부에서 기분/날씨만 보여주고
// 시리즈 섹션 자리에 LoginSection을 표시한다.
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <HomeView isAuthenticated={!!user} />;
}
