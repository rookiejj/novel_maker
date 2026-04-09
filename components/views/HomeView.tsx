'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';
import SeriesPickerModal from '@/components/novel/SeriesPickerModal';
import LoginSection from '@/components/views/LoginSection';
import {
  getTodayMood, loadMoodHistory, saveMood,
  loadNovels, deleteNovel,
  loadAllSeries, saveSeries, deleteSeries, saveActiveSeriesId, loadActiveSeriesId, incrementEpisodeCount,
  getTodayWeather, saveWeather, updateSeriesLastOptions,
  loadWorldBible, saveWorldBible, mergeCharactersIntoWorldBible,
  loadStoryBibles, saveStoryBible, updateSeriesTitle,
} from '@/lib/storage';
import {
  MoodEmoji, MoodEntry, MoodRecord,
  NovelConfig, NovelOptions, NovelRecord,
  Series, SeriesLength, ProtagGender, WorldBible, StoryBibleEntry,
  MOOD_MAP, GENRE_MAP, WeatherType, WEATHER_MAP,
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';
import WeatherSelector from '@/components/weather/WeatherSelector';

type Step = 'home' | 'wizard' | 'viewing';

interface Props {
  isAuthenticated: boolean;
}

// 일러스트 생성을 백그라운드로 트리거 (fire-and-forget).
// 응답을 기다리지 않음 — 실패해도 UI는 막히지 않는다.
function triggerIllustrationGeneration(novelId: string) {
  fetch('/api/illustration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId }),
    keepalive: true, // 탭 닫혀도 요청은 계속 진행
  }).catch(err => console.warn('[illustration trigger]', err));
}

export default function HomeView({ isAuthenticated }: Props) {
  const [todayMood,        setTodayMood]        = useState<MoodEntry | null>(null);
  const [moodHistory,      setMoodHistory]      = useState<MoodEntry[]>([]);
  const [allSeries,        setAllSeries]        = useState<Series[]>([]);
  const [activeSeries,     setActiveSeries]     = useState<Series | null>(null);
  const [showSeriesPicker, setShowSeriesPicker] = useState(false);
  const [step,             setStep]             = useState<Step>('home');
  const [currentConfig,    setCurrentConfig]    = useState<NovelConfig | null>(null);
  const [novels,           setNovels]           = useState<NovelRecord[]>([]);
  const [readingNovel,     setReadingNovel]     = useState<NovelRecord | null>(null);
  const [todayWeather,     setTodayWeather]     = useState<WeatherType | null>(null);

  // 초기 데이터 로딩 상태.
  // 로그인 직후 mount effect가 series/novels/mood/weather를 불러오는 동안 true.
  // 이 동안에는 "첫 번째 시리즈를 시작해보세요"나 "+ 새 시리즈" 버튼을 띄우지
  // 않고, 로딩 플레이스홀더를 보여준다. 사용자가 데이터 없는 것으로 오인하거나
  // 성급히 버튼을 누르는 것을 방지.
  //
  // 초기값은 isAuthenticated에 따라 결정:
  //   - 로그인: true (데이터 로딩 필요)
  //   - 비로그인: false (로딩할 데이터 없음, 바로 로그인 섹션 노출)
  const [isLoading, setIsLoading] = useState<boolean>(isAuthenticated);

  const pendingNewSeriesRef = useRef<Series | null>(null);
  const prevActiveSeriesRef = useRef<Series | null>(null);

  // "방금 저장해서 홈으로 돌아가는 중"을 표시하는 플래그.
  // handleNovelSaved에서 true로 세우고, step='home' 전이 effect에서 소비.
  // 취소로 나가는 경로와 구분하기 위함 (그쪽은 스크롤 이동 원치 않음).
  const justSavedRef = useRef<boolean>(false);

  // 저장 후 스크롤 대상: "지난 이야기" 섹션 ref
  const novelListSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    (async () => {
      // 비로그인: Supabase 접근 없이 UI용 기본값만 세팅하고 종료.
      if (!isAuthenticated) {
        setTodayMood({
          date: new Date().toISOString().slice(0, 10),
          emoji: '😊',
          label: MOOD_MAP['😊'].label,
        });
        setTodayWeather('맑음');
        setIsLoading(false);
        return;
      }

      // 로그인 상태: 초기 로딩 시작
      setIsLoading(true);

      try {
        // 기분 기본값: 행복해
        const savedMood = await getTodayMood();
        if (savedMood) {
          setTodayMood(savedMood);
        } else {
          const defaultMood: MoodEntry = {
            date: new Date().toISOString().slice(0, 10),
            emoji: '😊',
            label: MOOD_MAP['😊'].label,
          };
          await saveMood(defaultMood);
          setTodayMood(defaultMood);
        }
        setMoodHistory(await loadMoodHistory());

        // 날씨 기본값: 맑음
        const savedWeather = await getTodayWeather();
        if (savedWeather) {
          setTodayWeather(savedWeather.weather);
        } else {
          await saveWeather({ date: new Date().toISOString().slice(0, 10), weather: '맑음' });
          setTodayWeather('맑음');
        }

        const series   = await loadAllSeries();
        const activeId = await loadActiveSeriesId();
        const active   = series.find(s => s.id === activeId) ?? series[0] ?? null;
        setAllSeries(series);
        setActiveSeries(active);
        setNovels(active ? await loadNovels(active.id) : []);
      } catch (err) {
        console.error('[HomeView] 초기 데이터 로딩 실패:', err);
      } finally {
        // 성공/실패 모두 로딩 플래그는 반드시 해제한다.
        // 실패 시엔 빈 상태로 홈이 그려지지만 최소한 사용자가 멈춰있다고
        // 느끼지 않도록 하기 위함.
        setIsLoading(false);
      }
    })();
  }, [isAuthenticated]);

  // ─── 위저드 → 뷰어 전환 시 상단으로 자동 스크롤 ─────────────────────────
  // NovelViewer는 높이가 그리 크지 않아, 페이지 아래에서 "이야기 만들기"를
  // 누르면 뷰어가 화면 밖에 렌더되어 사용자가 당황한다. step이 'viewing'이
  // 되는 순간 페이지를 최상단으로 올린다.
  useEffect(() => {
    if (step !== 'viewing') return;
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  // ─── 저장 후 홈 복귀 시 "지난 이야기" 섹션으로 스크롤 ──────────────────
  //
  // 뷰어가 닫히면 레이아웃이 확 줄어들어(viewer 사라짐 + 일러스트 카드 하나
  // 추가), 사용자 시야에서 방금 쓴 글이 완전히 벗어날 수 있다. step이
  // 'home'으로 돌아오면서 justSavedRef가 세워져 있을 때만, 카드 섹션이
  // 화면 중앙에 오도록 scrollIntoView 한다.
  //
  // 플래그는 effect 안에서 바로 소비(false 리셋)해 다음 home 진입에 영향 없음.
  // rAF 한 번으로 새 카드가 DOM에 렌더되고 레이아웃이 안정된 뒤 스크롤.
  useEffect(() => {
    if (step !== 'home') return;
    if (!justSavedRef.current) return;
    justSavedRef.current = false;

    const id = requestAnimationFrame(() => {
      const el = novelListSectionRef.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  // ─── 일러스트 상태 폴링 ────────────────────────────────────────────────────
  // novels 중에 illustrationStatus가 pending 또는 generating인 항목이 있으면
  // 4초마다 novels를 새로 읽어 상태 변화를 감지한다.
  // 모든 소설의 상태가 done/failed로 수렴하면 자동으로 폴링이 멈춘다.
  useEffect(() => {
    if (!isAuthenticated || !activeSeries) return;

    const needsPolling = novels.some(n =>
      n.illustrationStatus === 'pending' || n.illustrationStatus === 'generating'
    );
    if (!needsPolling) return;

    const seriesId = activeSeries.id;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const fresh = await loadNovels(seriesId);
        if (cancelled) return;
        setNovels(fresh);
        // 읽기 모달이 열려 있고 해당 소설의 일러스트가 방금 완성됐다면 동기화
        setReadingNovel(prev => {
          if (!prev) return prev;
          const updated = fresh.find(n => n.id === prev.id);
          return updated ?? prev;
        });
      } catch (err) {
        console.warn('[illustration polling]', err);
      }
    }, 4000);

    return () => { cancelled = true; clearInterval(timer); };
  }, [novels, activeSeries, isAuthenticated]);

  async function handleMoodSelect(emoji: MoodEmoji) {
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    };
    setTodayMood(entry);
    // 저장은 MoodSelector 내부(moodStorage.saveMood)에서 처리된다.
    // 비로그인 상태에서는 히스토리 로딩을 생략한다.
    if (!isAuthenticated) return;
    setMoodHistory(await loadMoodHistory());
  }

  async function switchSeries(series: Series) {
    setActiveSeries(series);
    await saveActiveSeriesId(series.id);
    setNovels(await loadNovels(series.id));
    setShowSeriesPicker(false);
    setStep('home');
  }

  async function handleWizardComplete(options: NovelOptions) {
    let series = activeSeries;

    if (!series) {
      const newSeries: Series = {
        id:                generateId(),
        title:             `${options.genre} 연재`,
        genre:             options.genre,
        protagonistName:   options.protagonistName,
        protagonistGender: (options.protagonistGender as ProtagGender) ?? '중성',
        totalEpisodes:     (options.totalEpisodes as SeriesLength) ?? 20,
        episodeCount:      0,
        createdAt:         Date.now(),
      };
      // 새 시리즈는 즉시 DB에 저장한다.
      // novels.series_id는 NOT NULL FK이므로 소설 저장 전에 시리즈 row가
      // 반드시 존재해야 한다. 사용자가 저장 없이 취소하면 handleViewerClose에서
      // 롤백(deleteSeries)한다.
      await saveSeries(newSeries);
      await saveActiveSeriesId(newSeries.id);
      pendingNewSeriesRef.current = newSeries; // 롤백 대상 플래그
      setActiveSeries(newSeries);
      setAllSeries(await loadAllSeries());
      setNovels([]);
      series = newSeries;
    }

    const currentEpisode = series.episodeCount + 1;
    const [worldBible, storyBibles] = await Promise.all([
      loadWorldBible(series.id),
      loadStoryBibles(series.id),
    ]);

    setCurrentConfig({
      ...options,
      seriesId:          series.id,
      protagonistName:   series.protagonistName,
      protagonistGender: series.protagonistGender,
      weather:           todayWeather ?? undefined,
      totalEpisodes:     series.totalEpisodes,
      currentEpisode,
      worldBible:        worldBible ?? null,
      storyBibles:       storyBibles ?? [],
    });
    setStep('viewing');
  }

  async function handleViewerClose() {
    // 새 시리즈를 만들었는데 소설 저장 없이 취소한 경우 → 시리즈 롤백
    if (pendingNewSeriesRef.current) {
      const orphanSeriesId = pendingNewSeriesRef.current.id;
      const prev = prevActiveSeriesRef.current;
      pendingNewSeriesRef.current = null;

      // DB에서 빈 시리즈 삭제 (active_series FK는 ON DELETE 정책에 따라 정리됨)
      try {
        await deleteSeries(orphanSeriesId);
        if (prev) {
          await saveActiveSeriesId(prev.id);
        } else {
          await saveActiveSeriesId(null);
        }
      } catch (err) {
        console.warn('[handleViewerClose] series rollback failed:', err);
      }

      setAllSeries(await loadAllSeries());
      setActiveSeries(prev);
      setNovels(prev ? await loadNovels(prev.id) : []);
    }
    setStep('home');
  }

  // ─── 저장 직후 호출 ───────────────────────────────────────────────────────
  //
  // 이 함수의 반환(resolve) 시점에 NovelViewer가 onClose()를 부른다.
  // 따라서 "뷰어가 즉시 닫히는" 것을 보장하려면 이 함수가 최소한의 동기 작업만
  // 수행하고 곧바로 resolve되어야 한다.
  //
  // 단, 세 가지는 반드시 첫 `await` 이전에 동기적으로 처리되어야 한다:
  //   (1) pendingNewSeriesRef.current = null
  //       → 이게 누락되면 handleViewerClose가 방금 저장한 시리즈를 고아로
  //         판단해 deleteSeries()로 날려버린다. (새 시리즈 첫 화 데이터 손실)
  //   (2) novels 낙관적 갱신 — 뷰어가 닫히자마자 홈 화면에 방금 쓴 글이
  //       카드로 보이도록. (백그라운드 loadNovels가 곧 진짜 상태로 덮어씀)
  //   (3) justSavedRef = true — step='home' 복귀 effect가 "지난 이야기"
  //       섹션으로 스크롤하도록 플래그 세움.
  //
  // 나머지 무거운 작업(incrementEpisodeCount / updateSeriesLastOptions /
  // loadAllSeries / loadNovels / Haiku /api/summarize 호출 / worldBible/storyBible
  // 저장 등)은 전부 백그라운드 IIFE로 밀어낸다. 이들은 서버측 정합성 작업이라
  // 실패해도 다음 홈 진입 시 loadAllSeries/loadNovels가 진실 상태를 복구한다.
  function handleNovelSaved(record: NovelRecord) {
    const seriesId = record.seriesId;

    // ★ (1) 롤백 방지 — 반드시 첫 await 이전!
    pendingNewSeriesRef.current = null;

    // ★ (3) 스크롤 플래그 — viewing → home 전이 effect가 소비한다.
    justSavedRef.current = true;

    // ★ (2) 낙관적 목록 갱신 — 중복 방지를 위해 동일 id가 있으면 덮어쓴다.
    //     illustrationStatus를 'pending'으로 명시해 폴링 트리거가 즉시 붙도록 함.
    const optimistic: NovelRecord = { ...record, illustrationStatus: 'pending' };
    setNovels(prev => {
      const without = prev.filter(n => n.id !== optimistic.id);
      return [optimistic, ...without];
    });

    // 홈으로 돌아갔을 때 activeSeries의 episodeCount가 한 박자 늦게 보이는 것을
    // 막기 위해 로컬 activeSeries도 낙관적으로 +1 해둔다. 백그라운드에서
    // loadAllSeries가 곧 진짜 값으로 덮어쓴다.
    setActiveSeries(prev =>
      prev && prev.id === seriesId
        ? { ...prev, episodeCount: prev.episodeCount + 1 }
        : prev,
    );

    // 일러스트 생성 트리거 (fire-and-forget).
    triggerIllustrationGeneration(record.id);

    // ─── 백그라운드 후처리 ─────────────────────────────────────────────────
    // 여기서부터는 뷰어 닫힘 속도와 무관. 실패해도 UI는 막히지 않는다.
    void (async () => {
      try {
        // episode count 증가 (DB 정합성)
        await incrementEpisodeCount(seriesId);

        // 위저드 설정 저장
        if (record.config.atmosphere && record.config.style && record.config.length) {
          await updateSeriesLastOptions(seriesId, {
            atmosphere: record.config.atmosphere,
            style:      record.config.style,
            length:     record.config.length,
          });
        }

        // 서버 진실로 리프레시 (낙관적 상태를 덮어쓴다)
        const freshSeries = await loadAllSeries();
        setAllSeries(freshSeries);
        setActiveSeries(freshSeries.find(s => s.id === seriesId) ?? null);
        setNovels(await loadNovels(seriesId));
      } catch (err) {
        console.warn('[handleNovelSaved] episode/series 후처리 실패:', err);
      }

      // Story/World Bible 요약 (Haiku 호출 — 수 초 소요)
      try {
        const worldBible   = await loadWorldBible(seriesId);
        const isFirstNovel = !worldBible;
        const date         = new Date().toISOString().slice(0, 10);
        const moodLabel    = todayMood ? MOOD_MAP[todayMood.emoji].label : '';

        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            novelId: record.id, seriesId,
            title: record.title, content: record.content,
            genre: record.config.genre, date, mood: moodLabel,
            isFirstNovel, existingWorld: worldBible ?? undefined,
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
      } catch (err) {
        console.warn('[Story/World Bible] 생성 실패:', err);
      }
    })();
  }

  async function handleDelete(id: string) {
    await deleteNovel(id);
    if (activeSeries) setNovels(await loadNovels(activeSeries.id));
  }

  // ─── 일러스트 재시도 ─────────────────────────────────────────────────────
  //
  // /api/illustration은 이미 멱등(idempotent)하게 설계돼 있다:
  //   - done       → skip
  //   - generating → skip (동시 호출 방지)
  //   - failed/pending → 진행 후 상태를 generating → done/failed 로 전이
  //
  // 따라서 재시도는 동일 엔드포인트에 novelId만 다시 POST하면 된다.
  // DB 상태(novels.illustration_status) 전이는 전적으로 서버가 담당한다.
  // 클라이언트에서는 직접 DB 쓰기를 하지 않는다.
  //
  // 흐름:
  //  1) 로컬 상태를 'pending'으로 낙관적 갱신 → 폴링 useEffect 즉시 재가동
  //     (spinner가 바로 보임)
  //  2) /api/illustration POST
  //     - 성공: 서버가 곧 'done' 또는 'failed'로 전이 → 폴링이 감지해 화면 반영
  //     - 실패(네트워크 오류 등): 서버는 손대지 않은 상태이거나 catch에서
  //       'failed'로 되돌려 놨을 수 있음. 안전하게 로컬을 'failed'로 롤백해
  //       다시 시도 버튼이 재노출되도록 한다.
  async function handleRetryIllustration(id: string) {
    // (1) 낙관적 갱신 — novels + readingNovel 모두 동기화
    const toPending = (n: NovelRecord): NovelRecord =>
      n.id === id
        ? { ...n, illustrationStatus: 'pending', illustrationUrl: null }
        : n;

    setNovels(prev => prev.map(toPending));
    setReadingNovel(prev => (prev && prev.id === id ? toPending(prev) : prev));

    // (2) 서버 호출
    try {
      const res = await fetch('/api/illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novelId: id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // 성공 시 폴링 useEffect가 4초 주기로 최신 상태를 가져온다.
    } catch (err) {
      console.warn('[handleRetryIllustration] 재시도 요청 실패:', err);
      // 롤백 — 버튼을 다시 보이게 함
      const toFailed = (n: NovelRecord): NovelRecord =>
        n.id === id ? { ...n, illustrationStatus: 'failed' } : n;
      setNovels(prev => prev.map(toFailed));
      setReadingNovel(prev => (prev && prev.id === id ? toFailed(prev) : prev));
    }
  }

  const recentMoods: MoodRecord[] = moodHistory
    .slice(0, 7).map((e, i) => ({ id: String(i), date: e.date, mood: e.emoji }));
  const baseMood: MoodRecord | null = todayMood
    ? { id: '0', date: todayMood.date, mood: todayMood.emoji } : null;

  // 조사 자동 처리
  function hasEndConsonant(word: string): boolean {
    const code = word.charCodeAt(word.length - 1) - 0xAC00;
    return code >= 0 && code % 28 !== 0;
  }
  const contextHint = (() => {
    const parts: string[] = [];
    if (todayMood)    parts.push(`"${MOOD_MAP[todayMood.emoji].label}" 기분`);
    if (todayWeather) parts.push(`"${WEATHER_MAP[todayWeather].label}" 날씨`);
    if (parts.length === 0) return '';
    if (parts.length === 1) {
      const lastWord = todayMood ? '기분' : '날씨';
      return parts[0] + (hasEndConsonant(lastWord) ? '이' : '가') + ' 이야기에 반영됩니다';
    }
    return `${parts[0]}과 ${parts[1]}가 이야기에 반영됩니다`;
  })();

  return (
    <div className="min-h-screen bg-[#F0EEFF] text-slate-900">
      <Header isAuthenticated={isAuthenticated} />

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* ── 1. 기분 + 날씨 ───────────────────────────────── */}
        <section className="space-y-1">
          <MoodSelector todayMood={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
          <div className="mt-4">
            <WeatherSelector todayWeather={todayWeather} onSelect={setTodayWeather} />
          </div>
          {contextHint && (
            <p className="text-[11px] text-center text-brand-400 pt-1">{contextHint}</p>
          )}
        </section>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-brand-100" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-200" />
          <div className="flex-1 h-px bg-brand-100" />
        </div>

        {/* ── 2. 로그인 섹션 (비로그인 시) ─────────────────────── */}
        {!isAuthenticated && <LoginSection />}

        {/* ── 로딩 플레이스홀더 ─────────────────────────────────
            isAuthenticated && isLoading일 때만. 초기 데이터가 도착하기 전에
            빈 시리즈 카드나 "첫 번째 시리즈를 시작해보세요" 문구가 노출되어
            사용자가 로그인이 실패한 것으로 오해하거나 성급히 버튼을 누르는
            것을 방지한다. */}
        {isAuthenticated && isLoading && (
          <section className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
              <p className="text-sm font-medium text-brand-500">이야기들을 불러오는 중…</p>
              <p className="text-[11px] text-slate-400">잠시만 기다려 주세요</p>
            </div>
          </section>
        )}

        {/* ── 2. 시리즈 + 생성 (로그인 & 로딩 완료 시) ──────────── */}
        {isAuthenticated && !isLoading && step === 'home' && (
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
                  setActiveSeries(null);
                  setNovels([]);
                  setStep('wizard');
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
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50
                                     px-2.5 py-1 rounded-full border border-emerald-100">완결</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-brand-500 bg-brand-50
                                     px-2.5 py-1 rounded-full border border-brand-100">연재 중</span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-brand-50 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-400 transition-all"
                      style={{ width: `${Math.min((activeSeries.episodeCount / activeSeries.totalEpisodes) * 100, 100)}%` }}
                    />
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
                  {activeSeries.episodeCount >= activeSeries.totalEpisodes
                    ? '완결된 시리즈입니다'
                    : '다음 이야기 이어 쓰기'}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 p-8 text-center">
                <p className="text-sm text-slate-400">첫 번째 시리즈를 시작해보세요 ✨</p>
              </div>
            )}
          </section>
        )}

        {/* ── 위저드 ───────────────────────────────────────── */}
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

        {/* ── NovelViewer ──────────────────────────────────── */}
        {step === 'viewing' && currentConfig && (
          <NovelViewer
            config={currentConfig}
            recentMoods={recentMoods}
            baseMood={baseMood}
            onSaved={handleNovelSaved}
            onClose={handleViewerClose}
          />
        )}

        {/* ── 지난 이야기 ─────────────────────────────────────
            로딩 중에는 숨긴다 (novels가 아직 빈 배열이라 자연 비노출이지만,
            명시적으로 !isLoading 조건을 걸어둬 가독성 확보) */}
        {!isLoading && novels.length > 0 && (
          <section ref={novelListSectionRef}>
            <h2 className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest mb-3">
              {activeSeries?.title ?? '지난 이야기'}
            </h2>
            <div className="space-y-3">
              {novels.map(novel => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                  onRead={setReadingNovel}
                  onDelete={handleDelete}
                  onRetryIllustration={handleRetryIllustration}
                />
              ))}
            </div>
          </section>
        )}

      </main>

      {showSeriesPicker && (
        <SeriesPickerModal
          series={allSeries}
          activeId={activeSeries?.id}
          onSelect={switchSeries}
          onClose={() => setShowSeriesPicker(false)}
        />
      )}
      {readingNovel && (
        <NovelReadModal
          novel={readingNovel}
          onClose={() => setReadingNovel(null)}
          onRetryIllustration={handleRetryIllustration}
        />
      )}
    </div>
  );
}