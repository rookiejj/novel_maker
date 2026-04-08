'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import MoodHistory from '@/components/mood/MoodHistory';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';
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

type Step = 'home' | 'wizard' | 'viewing';

export default function HomePage() {
  const [todayMood,    setTodayMood]    = useState<MoodEntry | null>(null);
  const [moodHistory,  setMoodHistory]  = useState<MoodEntry[]>([]);

  const [allSeries,    setAllSeries]    = useState<Series[]>([]);
  const [activeSeries, setActiveSeries] = useState<Series | null>(null);
  const [showAllSeries, setShowAllSeries] = useState(false);

  const [step,          setStep]          = useState<Step>('home');
  const [currentConfig, setCurrentConfig] = useState<NovelConfig | null>(null);

  const [novels,       setNovels]       = useState<NovelRecord[]>([]);
  const [readingNovel, setReadingNovel] = useState<NovelRecord | null>(null);

  // ─── 초기 로드 ────────────────────────────────────────────────────────────
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

  // ─── 기분 선택 ────────────────────────────────────────────────────────────
  function handleMoodSelect(emoji: MoodEmoji) {
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    };
    setTodayMood(entry);
    setMoodHistory(loadMoodHistory());
  }

  // ─── 시리즈 전환 ──────────────────────────────────────────────────────────
  function switchSeries(series: Series) {
    setActiveSeries(series);
    saveActiveSeriesId(series.id);
    setNovels(loadNovels(series.id)); // ← 해당 시리즈 목록으로 교체
    setShowAllSeries(false);
    setStep('home');
  }

  // ─── 위저드 완료 ──────────────────────────────────────────────────────────
  function handleWizardComplete(options: NovelOptions) {
    let series = activeSeries;

    if (!series) {
      // 새 시리즈 생성
      const newSeries: Series = {
        id:           generateId(),
        title:        `${options.genre} 연재`,
        genre:        options.genre,
        episodeCount: 0,
        createdAt:    Date.now(),
      };
      saveSeries(newSeries);
      saveActiveSeriesId(newSeries.id);
      setAllSeries(loadAllSeries());
      setActiveSeries(newSeries);
      setNovels([]); // ← 새 시리즈이므로 목록 초기화
      series = newSeries;
    }

    const worldBible  = loadWorldBible(series.id);
    const storyBibles = loadStoryBibles(series.id);

    setCurrentConfig({
      ...options,
      seriesId:    series.id,
      worldBible:  worldBible  ?? null,
      storyBibles: storyBibles ?? [],
    });
    setStep('viewing');
  }

  // ─── 소설 저장 후 콜백 ────────────────────────────────────────────────────
  async function handleNovelSaved(record: NovelRecord) {
    const seriesId = record.seriesId;

    // 현재 활성 시리즈의 목록만 갱신
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
          novelId:       record.id,
          seriesId,
          title:         record.title,
          content:       record.content,
          genre:         record.config.genre,
          date,
          mood:          moodLabel,
          isFirstNovel,
          existingWorld: worldBible ?? undefined,
        }),
      });

      if (res.ok) {
        const { storyBible, worldBible: newWorldBible, newCharacterProfiles, suggestedSeriesTitle } =
          await res.json() as {
            storyBible:           StoryBibleEntry;
            worldBible:           WorldBible | null;
            newCharacterProfiles: WorldBible['characters'];
            suggestedSeriesTitle: string | null;
          };

        saveStoryBible(storyBible);

        if (isFirstNovel && newWorldBible) {
          saveWorldBible(newWorldBible);
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

  // ─── 소설 삭제 ────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    deleteNovel(id);
    if (activeSeries) setNovels(loadNovels(activeSeries.id));
  }

  // ─── MoodEntry → MoodRecord ───────────────────────────────────────────────
  const recentMoods: MoodRecord[] = moodHistory
    .slice(0, 7)
    .map((e, i) => ({ id: String(i), date: e.date, mood: e.emoji }));

  const baseMood: MoodRecord | null = todayMood
    ? { id: '0', date: todayMood.date, mood: todayMood.emoji }
    : null;

  // ─── 렌더 ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-10 space-y-10">

        {/* 기분 선택 */}
        <section>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-3">
            오늘의 기분
          </h2>
          <MoodSelector todayMood={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
          <MoodHistory records={recentMoods} />

          {/* 기분이 소설에 영향을 준다는 안내 */}
          {todayMood && (
            <p className="mt-2 text-xs text-stone-400 text-center">
              {MOOD_MAP[todayMood.emoji].emoji} 오늘의 기분 <strong className="text-stone-500">"{MOOD_MAP[todayMood.emoji].label}"</strong>이
              이야기의 분위기와 주인공의 감정에 반영됩니다
            </p>
          )}
        </section>

        <div className="text-stone-300 text-center text-2xl select-none">✦</div>

        {/* 시리즈 & 소설 생성 */}
        {step === 'home' && (
          <section className="space-y-4">
            {activeSeries ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{GENRE_MAP[activeSeries.genre].icon}</span>
                    <div>
                      <p className="font-serif font-semibold text-stone-800">{activeSeries.title}</p>
                      <p className="text-xs text-stone-400">
                        {GENRE_MAP[activeSeries.genre].label} · {activeSeries.episodeCount}편
                      </p>
                    </div>
                  </div>
                  <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-full">연재 중</span>
                </div>
                <button
                  disabled={!todayMood}
                  onClick={() => setStep('wizard')}
                  className="w-full py-2.5 rounded-xl bg-stone-800 text-stone-50 text-sm
                             disabled:opacity-40 hover:bg-stone-700 transition-colors"
                >
                  다음 이야기 이어 쓰기
                </button>
                {!todayMood && (
                  <p className="text-xs text-center text-stone-400">기분을 먼저 기록해주세요</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-center text-stone-400">첫 번째 시리즈를 시작해보세요</p>
            )}

            <div className="flex gap-2">
              {allSeries.length > 0 && (
                <button
                  onClick={() => setShowAllSeries(v => !v)}
                  className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-500 text-sm
                             hover:bg-stone-100 transition-colors"
                >
                  {showAllSeries ? '접기' : `다른 시리즈 (${allSeries.length}개)`}
                </button>
              )}
              <button
                disabled={!todayMood}
                onClick={() => {
                  setActiveSeries(null);
                  saveActiveSeriesId(null);
                  setNovels([]);
                  setStep('wizard');
                }}
                className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-600 text-sm
                           disabled:opacity-40 hover:bg-stone-100 transition-colors"
              >
                + 새 시리즈 시작
              </button>
            </div>

            {showAllSeries && (
              <div className="space-y-2">
                {allSeries.map(s => (
                  <button
                    key={s.id}
                    onClick={() => switchSeries(s)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left
                      transition-colors hover:bg-stone-50
                      ${activeSeries?.id === s.id
                        ? 'border-stone-400 bg-stone-50'
                        : 'border-stone-200 bg-white'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{GENRE_MAP[s.genre].icon}</span>
                      <div>
                        <p className="text-sm font-medium text-stone-700">{s.title}</p>
                        <p className="text-xs text-stone-400">{s.episodeCount}편</p>
                      </div>
                    </div>
                    {activeSeries?.id === s.id && (
                      <span className="text-xs text-stone-500">선택됨</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 위저드 */}
        {step === 'wizard' && (
          <NovelWizard
            lockedGenre={activeSeries?.genre}
            onGenerate={handleWizardComplete}
            onCancel={() => setStep('home')}
          />
        )}

        {/* NovelViewer */}
        {step === 'viewing' && currentConfig && (
          <NovelViewer
            config={currentConfig}
            recentMoods={recentMoods}
            baseMood={baseMood}
            onSaved={handleNovelSaved}
            onClose={() => setStep('home')}
          />
        )}

        {/* 지난 이야기 — 항상 표시, 현재 시리즈 것만 */}
        {novels.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">
              {activeSeries ? `${activeSeries.title} — 지난 이야기` : '지난 이야기'}
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

      {readingNovel && (
        <NovelReadModal novel={readingNovel} onClose={() => setReadingNovel(null)} />
      )}
    </div>
  );
}