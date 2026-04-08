'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';
import SeriesPickerModal from '@/components/novel/SeriesPickerModal';
import {
  getTodayMood, loadMoodHistory,
  loadNovels, deleteNovel,
  loadAllSeries, saveSeries, saveActiveSeriesId, loadActiveSeriesId, incrementEpisodeCount,
  getTodayWeather,
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

export default function HomePage() {
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
    setTodayMood(getTodayMood());
    setMoodHistory(loadMoodHistory());
    setTodayWeather(getTodayWeather()?.weather ?? null);
    const series   = loadAllSeries();
    const activeId = loadActiveSeriesId();
    const active   = series.find(s => s.id === activeId) ?? series[0] ?? null;
    setAllSeries(series);
    setActiveSeries(active);
    setNovels(active ? loadNovels(active.id) : []);
  }, []);

  function handleMoodSelect(emoji: MoodEmoji) {
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    };
    setTodayMood(entry);
    setMoodHistory(loadMoodHistory());
  }

  function switchSeries(series: Series) {
    setActiveSeries(series);
    saveActiveSeriesId(series.id);
    setNovels(loadNovels(series.id));
    setShowSeriesPicker(false);
    setStep('home');
  }

  function handleWizardComplete(options: NovelOptions) {
    let series = activeSeries;

    if (!series) {
      const newSeries: Series = {
        id:              generateId(),
        title:           `${options.genre} 연재`,
        genre:           options.genre,
        protagonistName:   options.protagonistName,
        protagonistGender: (options.protagonistGender as ProtagGender) ?? '중성',
        totalEpisodes:     (options.totalEpisodes as SeriesLength) ?? 20,
        episodeCount:    0,
        createdAt:       Date.now(),
      };
      pendingNewSeriesRef.current = newSeries;
      setActiveSeries(newSeries);
      setNovels([]);
      series = newSeries;
    }

    const currentEpisode = series.episodeCount + 1;

    setCurrentConfig({
      ...options,
      seriesId:        series.id,
      protagonistName:   series.protagonistName,
      protagonistGender: series.protagonistGender,
      weather:           todayWeather ?? undefined,
      totalEpisodes:     series.totalEpisodes,
      currentEpisode,
      worldBible:      loadWorldBible(series.id) ?? null,
      storyBibles:     loadStoryBibles(series.id) ?? [],
    });
    setStep('viewing');
  }

  function handleViewerClose() {
    if (pendingNewSeriesRef.current) {
      setActiveSeries(prevActiveSeriesRef.current);
      setNovels(prevActiveSeriesRef.current ? loadNovels(prevActiveSeriesRef.current.id) : []);
      pendingNewSeriesRef.current = null;
    }
    setStep('home');
  }

  async function handleNovelSaved(record: NovelRecord) {
    const seriesId = record.seriesId;

    // 새 시리즈는 이 시점에 처음으로 storage에 저장
    if (pendingNewSeriesRef.current?.id === seriesId) {
      saveSeries(pendingNewSeriesRef.current);
      saveActiveSeriesId(seriesId);
      pendingNewSeriesRef.current = null;
    }

    // 시리즈 존재가 보장된 후 episode count 증가
    incrementEpisodeCount(seriesId);

    // series state 갱신 (episodeCount 포함)
    const freshSeries = loadAllSeries();
    setAllSeries(freshSeries);
    setActiveSeries(freshSeries.find(s => s.id === seriesId) ?? null);

    setNovels(loadNovels(seriesId));

    const worldBible   = loadWorldBible(seriesId);
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

        saveStoryBible(storyBible);
        if (isFirstNovel && newWB) {
          saveWorldBible(newWB);
          if (suggestedSeriesTitle) {
            updateSeriesTitle(seriesId, suggestedSeriesTitle);
            const updated = loadAllSeries();
            setAllSeries(updated);
            setActiveSeries(updated.find(s => s.id === seriesId) ?? null);
          }
        } else if (!isFirstNovel && newCharacterProfiles?.length > 0) {
          mergeCharactersIntoWorldBible(seriesId, newCharacterProfiles);
        }
      }
    } catch (err) {
      console.warn('[Story/World Bible] 생성 실패:', err);
    }
  }

  function handleDelete(id: string) {
    deleteNovel(id);
    if (activeSeries) setNovels(loadNovels(activeSeries.id));
  }

  const recentMoods: MoodRecord[] = moodHistory
    .slice(0, 7).map((e, i) => ({ id: String(i), date: e.date, mood: e.emoji }));
  const baseMood: MoodRecord | null = todayMood
    ? { id: '0', date: todayMood.date, mood: todayMood.emoji } : null;


  // 조사 자동 처리 (받침 있으면 이, 없으면 가)
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
      <Header />

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* ── 1. 기분 (최상단, 컴팩트) ─────────────────────────── */}
        <section className="space-y-1">
          <MoodSelector todayMood={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
          <div className="mt-6">
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

        {/* ── 2. 시리즈 + 생성 ─────────────────────────────────── */}
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
                disabled={!todayMood || !todayWeather}
                onClick={() => { prevActiveSeriesRef.current = activeSeries; setActiveSeries(null); setNovels([]); setStep('wizard'); }}
                className="flex-1 py-2.5 rounded-2xl border border-brand-200 bg-white
                           text-brand-600 text-sm font-semibold
                           disabled:opacity-40 hover:bg-brand-50 transition-colors"
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
                  {/* 진행 상태 배지 */}
                  {activeSeries.episodeCount >= activeSeries.totalEpisodes ? (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50
                                     px-2.5 py-1 rounded-full border border-emerald-100">완결</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-brand-500 bg-brand-50
                                     px-2.5 py-1 rounded-full border border-brand-100">연재 중</span>
                  )}
                </div>

                {/* 진행 바 */}
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
                  disabled={!todayMood || !todayWeather || activeSeries.episodeCount >= activeSeries.totalEpisodes}
                  onClick={() => setStep('wizard')}
                  className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold
                             disabled:opacity-40 hover:bg-brand-700 transition-colors shadow-sm"
                >
                  {activeSeries.episodeCount >= activeSeries.totalEpisodes
                    ? '완결된 시리즈입니다'
                    : '다음 이야기 이어 쓰기'}
                </button>
                {(!todayMood || !todayWeather) && (
                  <p className="text-xs text-center text-slate-400">
                    {!todayMood ? '기분을' : '날씨를'} 먼저 기록해주세요
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 p-8 text-center">
                <p className="text-sm text-slate-400">첫 번째 시리즈를 시작해보세요 ✨</p>
              </div>
            )}
          </section>
        )}

        {/* ── 위저드 ───────────────────────────────────────────── */}
        {step === 'wizard' && (
          <NovelWizard
            lockedGenre={activeSeries?.genre}
            lockedProtagonistName={activeSeries?.protagonistName}
            lockedGender={activeSeries?.protagonistGender}
            lockedTotalEpisodes={activeSeries?.totalEpisodes}
            onGenerate={handleWizardComplete}
            onCancel={() => setStep('home')}
          />
        )}

        {/* ── NovelViewer ──────────────────────────────────────── */}
        {step === 'viewing' && currentConfig && (
          <NovelViewer
            config={currentConfig}
            recentMoods={recentMoods}
            baseMood={baseMood}
            onSaved={handleNovelSaved}
            onClose={handleViewerClose}
          />
        )}

        {/* ── 지난 이야기 ──────────────────────────────────────── */}
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