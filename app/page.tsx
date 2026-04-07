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
  getTodayMood,
  loadMoodHistory,
  loadNovels,
  deleteNovel,
  saveStoryBible,
  loadStoryBibles,
  saveWorldBible,
  loadWorldBible,
  mergeCharactersIntoWorldBible,
} from '@/lib/storage';
import {
  MoodEmoji, MoodEntry, MoodRecord,
  NovelConfig, NovelOptions, NovelRecord,
  StoryBibleEntry, WorldBible,
  MOOD_MAP,
} from '@/lib/types';

type Step = 'home' | 'wizard' | 'viewing';

export default function HomePage() {
  const [todayMood,   setTodayMood]   = useState<MoodEntry | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);

  const [step,          setStep]          = useState<Step>('home');
  const [currentConfig, setCurrentConfig] = useState<NovelConfig | null>(null);

  const [novels,       setNovels]       = useState<NovelRecord[]>([]);
  const [readingNovel, setReadingNovel] = useState<NovelRecord | null>(null);

  const [storyBibles, setStoryBibles] = useState<StoryBibleEntry[]>([]);
  const [worldBible,  setWorldBible]  = useState<WorldBible | null>(null);

  // ─── 초기 로드 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setTodayMood(getTodayMood());
    setMoodHistory(loadMoodHistory());
    setNovels(loadNovels());
    setStoryBibles(loadStoryBibles());
    setWorldBible(loadWorldBible());
  }, []);

  // ─── 기분 선택 콜백 ────────────────────────────────────────────────────────
  function handleMoodSelect(emoji: MoodEmoji) {
    // MoodSelector 내부에서 moodStorage.saveMood() 이미 호출 → state만 갱신
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    };
    setTodayMood(entry);
    setMoodHistory(loadMoodHistory());
  }

  // ─── 위저드 완료 ───────────────────────────────────────────────────────────
  function handleWizardComplete(options: NovelOptions) {
    const config: NovelConfig = {
      ...options,
      worldBible:  worldBible  ?? null,
      storyBibles: storyBibles ?? [],
    };
    setCurrentConfig(config);
    setStep('viewing');
  }

  // ─── 소설 저장 후 콜백 ─────────────────────────────────────────────────────
  // NovelViewer 내부에서 novelStorage.save() 호출 후 여기로 전달.
  // Story Bible / World Bible 생성을 비동기로 처리한다.
  async function handleNovelSaved(record: NovelRecord) {
    setNovels(loadNovels());

    const isFirstNovel = !worldBible;
    const date = new Date().toISOString().slice(0, 10);
    const moodLabel = todayMood ? MOOD_MAP[todayMood.emoji].label : '';

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId:       record.id,
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
        const { storyBible, worldBible: newWorldBible, newCharacterProfiles } =
          await res.json() as {
            storyBible:           StoryBibleEntry;
            worldBible:           WorldBible | null;
            newCharacterProfiles: WorldBible['characters'];
          };

        saveStoryBible(storyBible);
        setStoryBibles(loadStoryBibles());

        if (isFirstNovel && newWorldBible) {
          saveWorldBible(newWorldBible);
          setWorldBible(newWorldBible);
        } else if (!isFirstNovel && newCharacterProfiles?.length > 0) {
          mergeCharactersIntoWorldBible(newCharacterProfiles);
          setWorldBible(loadWorldBible());
        }
      }
    } catch (err) {
      console.warn('[Story/World Bible] 생성 실패 (저장은 완료됨):', err);
    }
  }

  // ─── 소설 삭제 ─────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    deleteNovel(id);
    setNovels(loadNovels());
  }

  // ─── MoodEntry → MoodRecord 변환 헬퍼 ─────────────────────────────────────
  const recentMoods: MoodRecord[] = moodHistory
    .slice(0, 7)
    .map((e, i) => ({ id: String(i), date: e.date, mood: e.emoji }));

  const baseMood: MoodRecord | null = todayMood
    ? { id: '0', date: todayMood.date, mood: todayMood.emoji }
    : null;

  // ─── 렌더 ──────────────────────────────────────────────────────────────────
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
        </section>

        <div className="text-stone-300 text-center text-2xl select-none">✦</div>

        {/* 소설 생성 진입점 */}
        {step === 'home' && (
          <section className="text-center space-y-2">
            {worldBible && (
              <p className="text-xs text-stone-400">
                연재 중 · {novels.length}편 · 장르: {worldBible.genre}
              </p>
            )}
            <button
              disabled={!todayMood}
              onClick={() => setStep('wizard')}
              className="px-6 py-3 rounded-full bg-stone-800 text-stone-50 text-sm
                         disabled:opacity-40 hover:bg-stone-700 transition-colors"
            >
              {worldBible ? '다음 이야기 이어 쓰기' : '첫 번째 이야기 만들기'}
            </button>
            {!todayMood && (
              <p className="text-xs text-stone-400">기분을 기록하고 이야기를 만들어보세요</p>
            )}
          </section>
        )}

        {/* 위저드 */}
        {step === 'wizard' && (
          <NovelWizard
            lockedGenre={worldBible?.genre}
            onGenerate={handleWizardComplete}
            onCancel={() => setStep('home')}
          />
        )}

        {/* NovelViewer: 스트리밍 + 저장 자체 처리 */}
        {step === 'viewing' && currentConfig && (
          <NovelViewer
            config={currentConfig}
            recentMoods={recentMoods}
            baseMood={baseMood}
            onSaved={handleNovelSaved}
            onClose={() => setStep('home')}
          />
        )}

        {/* 저장된 소설 목록 */}
        {novels.length > 0 && step === 'home' && (
          <section>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">
              지난 이야기
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