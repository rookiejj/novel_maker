'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import WeatherSelector from '@/components/weather/WeatherSelector';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';
import SeriesPickerModal from '@/components/novel/SeriesPickerModal';
import {
  getTodayMood, saveMood, loadMoodHistory,
  getTodayWeather, saveWeather,
  loadNovels, deleteNovel,
  loadAllSeries, saveSeries,
  saveActiveSeriesId, loadActiveSeriesId,
  incrementEpisodeCount, updateSeriesLastOptions, updateSeriesTitle,
  loadWorldBible, saveWorldBible, mergeCharactersIntoWorldBible,
  loadStoryBibles, saveStoryBible,
} from '@/lib/storage';
import {
  MoodEmoji, MoodEntry, MoodRecord,
  NovelConfig, NovelOptions, NovelRecord,
  Series, SeriesLength, ProtagGender,
  WorldBible, StoryBibleEntry,
  WeatherType, WEATHER_MAP, MOOD_MAP, GENRE_MAP,
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

// ─── GSI 타입 ─────────────────────────────────────────────────────────────────

interface CredentialResponse {
  credential: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// ─── 인앱 브라우저 감지 ───────────────────────────────────────────────────────

type InAppInfo = { isInApp: boolean; isAndroid: boolean; isIOS: boolean; name: string | null };

function detectInAppBrowser(ua: string): InAppInfo {
  const isAndroid = /Android/i.test(ua);
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  let name: string | null = null;
  if      (/KAKAOTALK/i.test(ua))             name = '카카오톡';
  else if (/FBAN|FBAV|FB_IAB/i.test(ua))      name = 'Facebook';
  else if (/Instagram/i.test(ua))             name = 'Instagram';
  else if (/Line/i.test(ua))                  name = 'LINE';
  else if (/NAVER/i.test(ua))                 name = '네이버';
  else if (/Daum/i.test(ua))                  name = '다음';
  else if (/; wv\)/i.test(ua))                name = '인앱 브라우저';
  return { isInApp: name !== null, isAndroid, isIOS, name };
}

type Step = 'home' | 'wizard' | 'viewing';

export default function HomePage() {
  const router = useRouter();

  // ─── 인증 상태 (undefined = 로딩중) ────────────────────────────────────────
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined);

  // ─── GSI 상태 ──────────────────────────────────────────────────────────────
  const buttonRef   = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loginError, setLoginError]     = useState<string | null>(null);
  const [inAppInfo, setInAppInfo]       = useState<InAppInfo | null>(null);

  // ─── 앱 상태 ───────────────────────────────────────────────────────────────
  const [todayMood,        setTodayMood]        = useState<MoodEntry | null>(null);
  const [moodHistory,      setMoodHistory]      = useState<MoodEntry[]>([]);
  const [todayWeather,     setTodayWeather]     = useState<WeatherType | null>(null);
  const [allSeries,        setAllSeries]        = useState<Series[]>([]);
  const [activeSeries,     setActiveSeries]     = useState<Series | null>(null);
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);
  const [step,             setStep]             = useState<Step>('home');
  const [currentConfig,    setCurrentConfig]    = useState<NovelConfig | null>(null);
  const [novels,           setNovels]           = useState<NovelRecord[]>([]);
  const [readingNovel,     setReadingNovel]     = useState<NovelRecord | null>(null);
  const pendingNewSeriesRef = useRef<Series | null>(null);
  const prevActiveSeriesRef = useRef<Series | null>(null);

  // ─── 유저 데이터 로드 ──────────────────────────────────────────────────────
  async function loadUserData() {
    let mood = await getTodayMood();
    if (!mood) {
      mood = { date: new Date().toISOString().slice(0, 10), emoji: '😊', label: MOOD_MAP['😊'].label };
      await saveMood(mood);
    }
    setTodayMood(mood);
    setMoodHistory(await loadMoodHistory());

    let weather = await getTodayWeather();
    if (!weather) {
      weather = { date: new Date().toISOString().slice(0, 10), weather: '맑음' };
      await saveWeather(weather);
    }
    setTodayWeather(weather.weather);

    const series   = await loadAllSeries();
    const activeId = await loadActiveSeriesId();
    const active   = series.find(s => s.id === activeId) ?? series[0] ?? null;
    setAllSeries(series);
    setActiveSeries(active);
    if (active) setNovels(await loadNovels(active.id));
  }

  // ─── 초기화 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const info = detectInAppBrowser(navigator.userAgent);
    setInAppInfo(info);

    if (info.isInApp && info.isAndroid) {
      const url = window.location.href.replace(/^https?:\/\//, '');
      window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setTodayMood({ date: new Date().toISOString().slice(0, 10), emoji: '😊', label: MOOD_MAP['😊'].label });
        setTodayWeather('맑음');
        return;
      }
      setUser({ id: authUser.id });
      await loadUserData();
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id });
        await loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAllSeries([]);
        setNovels([]);
        setActiveSeries(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── GSI 초기화 (비로그인 시) ──────────────────────────────────────────────
  const generateNonce = useCallback(async (): Promise<{ raw: string; hashed: string }> => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const raw   = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const buf   = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hashed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { raw, hashed };
  }, []);

  const handleCredential = useCallback(async (res: CredentialResponse) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: res.credential,
      nonce: rawNonceRef.current ?? undefined,
    });
    if (error) { setLoginError(`로그인 실패: ${error.message}`); return; }
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (user !== null) return;
    if (!scriptLoaded || !buttonRef.current || inAppInfo?.isInApp) return;
    if (!window.google) { setLoginError('Google 스크립트 로드 실패'); return; }
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) { setLoginError('NEXT_PUBLIC_GOOGLE_CLIENT_ID 미설정'); return; }

    (async () => {
      const { raw, hashed } = await generateNonce();
      rawNonceRef.current = raw;
      window.google!.accounts.id.initialize({
        client_id: clientId, callback: handleCredential,
        nonce: hashed, use_fedcm_for_prompt: true, auto_select: false,
      });
      window.google!.accounts.id.renderButton(buttonRef.current!, {
        type: 'standard', theme: 'outline', size: 'large',
        text: 'continue_with', shape: 'pill', logo_alignment: 'left',
        locale: 'ko', width: 280,
      });
      window.google!.accounts.id.prompt();
    })();
  }, [user, scriptLoaded, generateNonce, handleCredential, inAppInfo]);

  // ─── 앱 핸들러 ─────────────────────────────────────────────────────────────
  function handleMoodSelect(emoji: MoodEmoji) {
    const entry: MoodEntry = { date: new Date().toISOString().slice(0, 10), emoji, label: MOOD_MAP[emoji].label };
    setTodayMood(entry);
    if (user) loadMoodHistory().then(setMoodHistory);
  }

  async function switchSeries(series: Series) {
    setActiveSeries(series);
    await saveActiveSeriesId(series.id);
    setNovels(await loadNovels(series.id));
    setShowSeriesPicker(false);
    setStep('home');
  }

  async function handleWizardComplete(options: NovelOptions) {
    prevActiveSeriesRef.current = activeSeries;
    let series = activeSeries;
    if (!series) {
      const newSeries: Series = {
        id: generateId(), title: `${options.genre} 연재`,
        genre: options.genre, protagonistName: options.protagonistName,
        protagonistGender: (options.protagonistGender as ProtagGender) ?? '중성',
        totalEpisodes: (options.totalEpisodes as SeriesLength) ?? 20,
        episodeCount: 0, createdAt: Date.now(),
      };
      pendingNewSeriesRef.current = newSeries;
      setActiveSeries(newSeries);
      setNovels([]);
      series = newSeries;
    }
    const currentEpisode = series.episodeCount + 1;
    const [worldBible, storyBibles] = await Promise.all([
      loadWorldBible(series.id), loadStoryBibles(series.id),
    ]);
    setCurrentConfig({
      ...options, seriesId: series.id,
      protagonistName: series.protagonistName,
      protagonistGender: series.protagonistGender,
      weather: todayWeather ?? undefined,
      totalEpisodes: series.totalEpisodes,
      currentEpisode,
      worldBible: worldBible ?? null,
      storyBibles: storyBibles ?? [],
    });
    setStep('viewing');
  }

  async function handleViewerClose() {
    if (pendingNewSeriesRef.current) {
      setActiveSeries(prevActiveSeriesRef.current);
      setNovels(prevActiveSeriesRef.current ? await loadNovels(prevActiveSeriesRef.current.id) : []);
      pendingNewSeriesRef.current = null;
    }
    setStep('home');
  }

  async function handleNovelSaved(record: NovelRecord) {
    const seriesId = record.seriesId;
    if (pendingNewSeriesRef.current?.id === seriesId) {
      await saveSeries(pendingNewSeriesRef.current);
      await saveActiveSeriesId(seriesId);
      pendingNewSeriesRef.current = null;
    }
    await incrementEpisodeCount(seriesId);
    if (record.config.atmosphere && record.config.style && record.config.length) {
      await updateSeriesLastOptions(seriesId, {
        atmosphere: record.config.atmosphere,
        style: record.config.style,
        length: record.config.length,
      });
    }
    const freshSeries = await loadAllSeries();
    setAllSeries(freshSeries);
    setActiveSeries(freshSeries.find(s => s.id === seriesId) ?? null);
    setNovels(await loadNovels(seriesId));

    const worldBible   = await loadWorldBible(seriesId);
    const isFirstNovel = !worldBible;
    const date         = new Date().toISOString().slice(0, 10);
    const moodLabel    = todayMood ? MOOD_MAP[todayMood.emoji].label : '';
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId: record.id, seriesId, title: record.title,
          content: record.content, genre: record.config.genre,
          date, mood: moodLabel, isFirstNovel, existingWorld: worldBible ?? undefined,
        }),
      });
      if (res.ok) {
        const { storyBible, worldBible: newWB, newCharacterProfiles, suggestedSeriesTitle } =
          await res.json() as {
            storyBible: StoryBibleEntry; worldBible: WorldBible | null;
            newCharacterProfiles: WorldBible['characters']; suggestedSeriesTitle: string | null;
          };
        await saveStoryBible(storyBible);
        if (isFirstNovel && newWB) {
          await saveWorldBible(newWB);
          if (suggestedSeriesTitle) {
            await updateSeriesTitle(seriesId, suggestedSeriesTitle);
            const updated = await loadAllSeries();
            setAllSeries(updated);
            setActiveSeries(updated.find(s => s.id === seriesId) ?? null);
          }
        } else if (!isFirstNovel && newCharacterProfiles?.length > 0) {
          await mergeCharactersIntoWorldBible(seriesId, newCharacterProfiles);
        }
      }
    } catch (err) { console.warn('[Story/World Bible]', err); }
  }

  async function handleDelete(id: string) {
    await deleteNovel(id);
    if (activeSeries) setNovels(await loadNovels(activeSeries.id));
  }

  // ─── 헬퍼 ──────────────────────────────────────────────────────────────────
  const recentMoods: MoodRecord[] = moodHistory.slice(0, 7).map((e, i) => ({ id: String(i), date: e.date, mood: e.emoji }));
  const baseMood: MoodRecord | null = todayMood ? { id: '0', date: todayMood.date, mood: todayMood.emoji } : null;

  function hasEndConsonant(word: string): boolean {
    const code = word.charCodeAt(word.length - 1) - 0xAC00;
    return code >= 0 && code % 28 !== 0;
  }
  const contextHint = (() => {
    const parts: string[] = [];
    if (todayMood)    parts.push(`"${MOOD_MAP[todayMood.emoji].label}" 기분`);
    if (todayWeather) parts.push(`"${WEATHER_MAP[todayWeather].label}" 날씨`);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0] + (hasEndConsonant(todayMood ? '기분' : '날씨') ? '이' : '가') + ' 이야기에 반영됩니다';
    return `${parts[0]}과 ${parts[1]}가 이야기에 반영됩니다`;
  })();

  // ─── 로딩 ──────────────────────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#F0EEFF] flex items-center justify-center">
        <p className="text-sm text-brand-300 animate-pulse">불러오는 중...</p>
      </div>
    );
  }

  // ─── iOS 인앱 브라우저 ──────────────────────────────────────────────────────
  if (inAppInfo?.isInApp && inAppInfo.isIOS) {
    return (
      <div className="min-h-screen bg-[#F0EEFF] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold text-brand-700">한편</h1>
          <p className="mt-2 text-sm text-slate-500">아무도 읽지 않는 이야기를 씁니다</p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left space-y-3">
            <p className="text-sm font-semibold text-amber-900">⚠️ {inAppInfo.name} 인앱 브라우저에서는 Google 로그인이 제한됩니다</p>
            <div className="text-xs text-amber-800 space-y-2 leading-relaxed">
              <p className="font-semibold">Safari에서 열어주세요:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>화면 우측 상단(또는 하단)의 <b>⋯</b> 또는 <b>공유</b> 아이콘을 누르세요</li>
                <li>&quot;Safari로 열기&quot; 또는 &quot;기본 브라우저로 열기&quot;를 선택하세요</li>
              </ol>
              <p className="pt-2">또는 아래 버튼으로 주소를 복사한 뒤 Safari에 붙여넣으세요.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(window.location.href); alert('주소가 복사되었습니다. Safari를 열고 주소창에 붙여넣으세요.'); }
              catch { alert('복사 실패. 주소창의 URL을 길게 눌러 복사해주세요.'); }
            }}
            className="w-full py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
          >주소 복사하기</button>
        </div>
      </div>
    );
  }

  // ─── 공통 섹션: 기분 + 날씨 ────────────────────────────────────────────────
  const moodWeatherSection = (
    <section className="space-y-1">
      <MoodSelector todayMood={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
      <WeatherSelector todayWeather={todayWeather} onSelect={setTodayWeather} />
      {contextHint && <p className="text-[11px] text-center text-brand-400 pt-1">{contextHint}</p>}
    </section>
  );

  const divider = (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-brand-100" />
      <div className="w-1.5 h-1.5 rounded-full bg-brand-200" />
      <div className="flex-1 h-px bg-brand-100" />
    </div>
  );

  // ─── 비로그인: 기분/날씨 + 로그인 안내 ────────────────────────────────────
  if (user === null) {
    return (
      <div className="min-h-screen bg-[#F0EEFF] text-slate-900">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
          onError={() => setLoginError('Google 스크립트 로드 실패')}
        />
        <Header />
        <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
          {moodWeatherSection}
          {divider}
          <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm text-center space-y-5">
            <div className="space-y-1.5">
              <p className="text-base font-bold text-slate-800">이야기를 시작하려면</p>
              <p className="text-sm text-slate-400">
                로그인하면 어떤 기기에서도<br />오늘의 한 편을 이어갈 수 있어요
              </p>
            </div>
            <div className="flex justify-center min-h-[44px]">
              <div ref={buttonRef} />
            </div>
            {loginError && <p className="text-xs text-rose-500">{loginError}</p>}
          </div>
        </main>
      </div>
    );
  }

  // ─── 로그인 상태: 메인 앱 ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0EEFF] text-slate-900">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* 기분 + 날씨 */}
        {moodWeatherSection}
        {divider}

        {/* 시리즈 */}
        {step === 'home' && (
          <section className="space-y-3">
            <div className="flex gap-2">
              {allSeries.length > 0 && (
                <button
                  onClick={() => setShowSeriesPicker(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl
                             border border-brand-200 bg-white text-brand-600 text-sm font-semibold
                             hover:bg-brand-50 transition-colors"
                >
                  <span>📚</span>다른 시리즈 ({allSeries.length}개)
                </button>
              )}
              <button
                onClick={() => {
                  prevActiveSeriesRef.current = activeSeries;
                  setActiveSeries(null); setNovels([]); setStep('wizard');
                }}
                className="flex-1 py-2.5 rounded-2xl border border-brand-200 bg-white
                           text-brand-600 text-sm font-semibold hover:bg-brand-50 transition-colors"
              >
                + 새 시리즈
              </button>
            </div>

            {activeSeries ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                      <TwEmoji emoji={GENRE_MAP[activeSeries.genre].icon} size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{activeSeries.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {GENRE_MAP[activeSeries.genre].label}
                        {activeSeries.protagonistName && ` · ${activeSeries.protagonistName}`}
                        {` · ${activeSeries.episodeCount}/${activeSeries.totalEpisodes}편`}
                      </p>
                    </div>
                  </div>
                  {activeSeries.episodeCount >= activeSeries.totalEpisodes ? (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">완결</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-brand-500 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">연재 중</span>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-brand-50 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-400 transition-all"
                      style={{ width: `${Math.min((activeSeries.episodeCount / activeSeries.totalEpisodes) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">
                    {activeSeries.episodeCount}/{activeSeries.totalEpisodes}편
                  </p>
                </div>
                <button
                  onClick={() => { if (activeSeries.episodeCount < activeSeries.totalEpisodes) setStep('wizard'); }}
                  className={`w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold
                             hover:bg-brand-700 transition-colors shadow-sm
                             ${activeSeries.episodeCount >= activeSeries.totalEpisodes ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {activeSeries.episodeCount >= activeSeries.totalEpisodes ? '완결된 시리즈입니다' : '다음 이야기 이어 쓰기'}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 p-8 text-center">
                <p className="text-sm text-slate-400">첫 번째 시리즈를 시작해보세요 ✨</p>
              </div>
            )}
          </section>
        )}

        {step === 'wizard' && (
          <NovelWizard
            lockedGenre={activeSeries?.genre}
            lockedProtagonistName={activeSeries?.protagonistName}
            lockedGender={activeSeries?.protagonistGender}
            lockedTotalEpisodes={activeSeries?.totalEpisodes}
            lastOptions={activeSeries?.lastOptions}
            onGenerate={handleWizardComplete}
            onCancel={() => setStep('home')}
          />
        )}

        {step === 'viewing' && currentConfig && (
          <NovelViewer
            config={currentConfig}
            recentMoods={recentMoods}
            baseMood={baseMood}
            onSaved={handleNovelSaved}
            onClose={handleViewerClose}
          />
        )}

        {novels.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest mb-3">
              {activeSeries?.title ?? '지난 이야기'}
            </h2>
            <div className="space-y-3">
              {novels.map(novel => (
                <NovelCard key={novel.id} novel={novel} onRead={setReadingNovel} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        )}
      </main>

      {showSeriesPicker && (
        <SeriesPickerModal
          series={allSeries} activeId={activeSeries?.id}
          onSelect={switchSeries} onClose={() => setShowSeriesPicker(false)}
        />
      )}
      {readingNovel && <NovelReadModal novel={readingNovel} onClose={() => setReadingNovel(null)} />}
    </div>
  );
}
