'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import MoodHistory from '@/components/mood/MoodHistory';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';
import SeriesPickerModal from '@/components/novel/SeriesPickerModal';
import {
  getTodayMood, loadMoodHistory,
  loadNovels, deleteNovel,
  loadAllSeries, saveSeries, saveActiveSeriesId, loadActiveSeriesId,
  loadWorldBible, saveWorldBible, mergeCharactersIntoWorldBible,
  loadStoryBibles, saveStoryBible,
  updateSeriesTitle,
} from '@/lib/storage';
import {
  MoodEmoji, MoodEntry, MoodRecord,
  NovelConfig, NovelOptions, NovelRecord,
  Series, WorldBible, StoryBibleEntry,
  MOOD_MAP, GENRE_MAP,
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

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

  // 아직 저장되지 않은 새 시리즈 — 소설이 실제로 저장될 때만 storage에 쓴다
  const pendingNewSeriesRef = useRef<Series | null>(null);
  // viewer를 열기 전 활성 시리즈 (취소 시 복원용)
  const prevActiveSeriesRef = useRef<Series | null>(null);

  useEffect(() => {
    setTodayMood(getTodayMood());
    setMoodHistory(loadMoodHistory());
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
    prevActiveSeriesRef.current = activeSeries; // 취소 시 복원용으로 보관

    let series = activeSeries;

    if (!series) {
      // ★ 새 시리즈는 아직 storage에 저장하지 않는다 — ref에만 보관
      const newSeries: Series = {
        id:              generateId(),
        title:           `${options.genre} 연재`,
        genre:           options.genre,
        protagonistName: options.protagonistName,
        episodeCount:    0,
        createdAt:       Date.now(),
      };
      pendingNewSeriesRef.current = newSeries;
      setActiveSeries(newSeries); // UI 표시용으로만 state 반영
      setNovels([]);
      series = newSeries;
    }

    setCurrentConfig({
      ...options,
      seriesId:        series.id,
      protagonistName: series.protagonistName,
      worldBible:      loadWorldBible(series.id) ?? null,
      storyBibles:     loadStoryBibles(series.id) ?? [],
    });
    setStep('viewing');
  }

  // ── 저장 없이 뷰어 닫기 ──────────────────────────────────────────────────
  function handleViewerClose() {
    if (pendingNewSeriesRef.current) {
      // 저장되지 않은 새 시리즈였으면 이전 상태로 복원
      setActiveSeries(prevActiveSeriesRef.current);
      setNovels(prevActiveSeriesRef.current
        ? loadNovels(prevActiveSeriesRef.current.id)
        : []);
      pendingNewSeriesRef.current = null;
    }
    setStep('home');
  }

  // ── 소설 저장 후 콜백 ────────────────────────────────────────────────────
  async function handleNovelSaved(record: NovelRecord) {
    const seriesId = record.seriesId;

    // ★ 이 시점에 비로소 새 시리즈를 storage에 저장
    if (pendingNewSeriesRef.current?.id === seriesId) {
      saveSeries(pendingNewSeriesRef.current);
      saveActiveSeriesId(seriesId);
      setAllSeries(loadAllSeries());
      pendingNewSeriesRef.current = null;
    }

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
            storyBible:           StoryBibleEntry;
            worldBible:           WorldBible | null;
            newCharacterProfiles: WorldBible['characters'];
            suggestedSeriesTitle: string | null;
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
    .slice(0, 7)
    .map((e, i) => ({ id: String(i), date: e.date, mood: e.emoji }));

  const baseMood: MoodRecord | null = todayMood
    ? { id: '0', date: todayMood.date, mood: todayMood.emoji }
    : null;

  return (
    <div className="min-h-screen bg-[#F0EEFF] text-slate-900">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">

        {/* ── 시리즈 + 생성 (상단) ─────────────────────────────── */}
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
                  <span>📚</span>
                  다른 시리즈 ({allSeries.length}개)
                </button>
              )}
              <button
                disabled={!todayMood}
                onClick={() => {
                  setActiveSeries(null);
                  setNovels([]);
                  setStep('wizard');
                }}
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
                        {` · ${activeSeries.episodeCount}편`}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-brand-500 bg-brand-50
                                   px-2.5 py-1 rounded-full border border-brand-100">
                    연재 중
                  </span>
                </div>
                <button
                  disabled={!todayMood}
                  onClick={() => setStep('wizard')}
                  className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold
                             disabled:opacity-40 hover:bg-brand-700 transition-colors shadow-sm"
                >
                  다음 이야기 이어 쓰기
                </button>
                {!todayMood && (
                  <p className="text-xs text-center text-slate-400">기분을 먼저 기록해주세요</p>
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-brand-100" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-200" />
          <div className="flex-1 h-px bg-brand-100" />
        </div>

        {/* ── 기분 (하단) ──────────────────────────────────────── */}
        <section className="space-y-1">
          <MoodSelector todayMood={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
          <MoodHistory records={recentMoods} />
          {todayMood && (
            <p className="text-xs text-center text-brand-400 pt-1">
              <TwEmoji emoji={MOOD_MAP[todayMood.emoji].emoji} size={13} className="mr-1 align-middle" />
              <strong>"{MOOD_MAP[todayMood.emoji].label}"</strong> 기분이 이야기 분위기와 주인공 감정에 반영됩니다
            </p>
          )}
        </section>

        {/* ── 지난 이야기 ──────────────────────────────────────── */}
        {novels.length > 0 && (
          <section>
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
        <NovelReadModal novel={readingNovel} onClose={() => setReadingNovel(null)} />
      )}
    </div>
  );
}