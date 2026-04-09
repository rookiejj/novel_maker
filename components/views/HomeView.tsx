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

  const pendingNewSeriesRef = useRef<Series | null>(null);
  const prevActiveSeriesRef = useRef<Series | null>(null);

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
        return;
      }

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
    })();
  }, [isAuthenticated]);

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

  async function handleNovelSaved(record: NovelRecord) {
    const seriesId = record.seriesId;

    // 새 시리즈는 이미 handleWizardComplete에서 DB에 저장됐다.
    // 소설 저장이 성공했으므로 롤백 대상에서 해제.
    pendingNewSeriesRef.current = null;

    // episode count 증가
    await incrementEpisodeCount(seriesId);

    // 위저드 설정 저장
    if (record.config.atmosphere && record.config.style && record.config.length) {
      await updateSeriesLastOptions(seriesId, {
        atmosphere: record.config.atmosphere,
        style:      record.config.style,
        length:     record.config.length,
      });
    }

    // series state 갱신
    const freshSeries = await loadAllSeries();
    setAllSeries(freshSeries);
    setActiveSeries(freshSeries.find(s => s.id === seriesId) ?? null);
    setNovels(await loadNovels(seriesId));

    // 일러스트 생성 트리거 (fire-and-forget).
    // 서버가 백그라운드로 Haiku → Fal → Storage 업로드 → DB 갱신을 진행하고,
    // 클라이언트는 아래 useEffect의 폴링으로 상태 변화를 감지한다.
    triggerIllustrationGeneration(record.id);

    const worldBible   = await loadWorldBible(seriesId);
    const isFirstNovel = !worldBible;
    const date         = new Date().toISOString().slice(0, 10);
    const moodLabel    = todayMood ? MOOD_MAP[todayMood.emoji].label : '';

    try {
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
  }

  async function handleDelete(id: string) {
    await deleteNovel(id);
    if (activeSeries) setNovels(await loadNovels(activeSeries.id));
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

        {/* ── 2. 시리즈 + 생성 (로그인 시) ─────────────────────── */}
        {isAuthenticated && step === 'home' && (
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

        {/* ── 지난 이야기 ──────────────────────────────────── */}
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
          series={allSeries}
          activeId={activeSeries?.id}
          onSelect={switchSeries}
          onClose={() => setShowSeriesPicker(false)}
        />
      )}
      {readingNovel && (
        <NovelReadModal novel={readingNovel} onClose={() => setReadingNovel(null)} />
      )}
    </div>
  );
}