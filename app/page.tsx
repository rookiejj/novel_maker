'use client';

import { useEffect, useState } from 'react';
import type { MoodType, MoodRecord, NovelConfig, NovelRecord } from '@/lib/types';
import { moodStorage, novelStorage } from '@/lib/storage';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import MoodHistory from '@/components/mood/MoodHistory';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';

type View = 'home' | 'wizard' | 'viewer';

export default function HomePage() {
  const [view,        setView]       = useState<View>('home');
  const [todayMood,   setTodayMood]  = useState<MoodRecord | null>(null);
  const [recentMoods, setRecentMoods]= useState<MoodRecord[]>([]);
  const [novels,      setNovels]     = useState<NovelRecord[]>([]);
  const [novelConfig, setNovelConfig]= useState<NovelConfig | null>(null);
  const [readingNovel,setReadingNovel]= useState<NovelRecord | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setTodayMood(moodStorage.getTodayMood());
    setRecentMoods(moodStorage.getRecent(7));
    setNovels(novelStorage.getAll());
  }, []);

  function handleMoodSelect(mood: MoodType) {
    const record = moodStorage.getTodayMood();
    setTodayMood(record);
    setRecentMoods(moodStorage.getRecent(7));
  }

  function handleWizardStart(config: NovelConfig) {
    setNovelConfig(config);
    setView('viewer');
  }

  function handleNovelSaved(novel: NovelRecord) {
    setNovels(novelStorage.getAll());
  }

  function handleDeleteNovel(id: string) {
    novelStorage.delete(id);
    setNovels(novelStorage.getAll());
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="mx-auto max-w-xl px-4 py-6 space-y-5">

        {/* Mood section */}
        <section>
          <MoodSelector
            todayMood={todayMood?.mood ?? null}
            onSelect={handleMoodSelect}
          />
          <MoodHistory records={recentMoods} />
        </section>

        {/* Novel generation section */}
        {view === 'home' && (
          <section>
            <button
              onClick={() => setView('wizard')}
              className="w-full rounded-2xl border-2 border-dashed border-stone-300 bg-white py-5 text-center transition hover:border-amber-400 hover:bg-amber-50 group"
            >
              <span className="text-2xl">✦</span>
              <p className="mt-1.5 text-sm font-semibold text-stone-700 group-hover:text-amber-700">
                오늘의 이야기 만들기
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {todayMood
                  ? `오늘의 기분이 담긴 이야기를 써드릴게요`
                  : '기분을 기록하고 이야기를 만들어보세요'}
              </p>
            </button>
          </section>
        )}

        {view === 'wizard' && (
          <section>
            <NovelWizard
              onStart={handleWizardStart}
              onCancel={() => setView('home')}
            />
          </section>
        )}

        {view === 'viewer' && novelConfig && (
          <section className="h-[70vh]">
            <NovelViewer
              config={novelConfig}
              recentMoods={recentMoods}
              baseMood={todayMood}
              onSaved={handleNovelSaved}
              onClose={() => setView('home')}
            />
          </section>
        )}

        {/* Past novels */}
        {novels.length > 0 && view === 'home' && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-400">
              지난 이야기들
            </h2>
            <div className="space-y-3">
              {novels.map(novel => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                  onRead={setReadingNovel}
                  onDelete={handleDeleteNovel}
                />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Read modal */}
      {readingNovel && (
        <NovelReadModal
          novel={readingNovel}
          onClose={() => setReadingNovel(null)}
        />
      )}
    </div>
  );
}