'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import MoodSelector from '@/components/mood/MoodSelector';
import MoodHistory from '@/components/mood/MoodHistory';
import NovelWizard from '@/components/novel/NovelWizard';
import NovelViewer from '@/components/novel/NovelViewer';
import NovelCard from '@/components/novel/NovelCard';
import NovelReadModal from '@/components/novel/NovelReadModal';
import {
  saveMood,
  loadMoodHistory,
  getTodayMood,
  saveNovel,
  loadNovels,
  saveStoryBible,
  loadStoryBibles,
} from '@/lib/storage';
import {
  MoodEmoji,
  MoodEntry,
  NovelOptions,
  SavedNovel,
  StoryBibleEntry,
  MOOD_MAP,
} from '@/lib/types';
import { extractTitle, generateId } from '@/lib/utils';

type Step = 'home' | 'wizard' | 'generating' | 'done';

export default function HomePage() {
  // ─── 기분 ───────────────────────────────────────────────────────────────────
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);

  // ─── 소설 생성 흐름 ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('home');
  const [streamedText, setStreamedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null); // 현재 생성된 소설 id

  // ─── 저장된 소설 목록 ────────────────────────────────────────────────────────
  const [novels, setNovels] = useState<SavedNovel[]>([]);
  const [readingNovel, setReadingNovel] = useState<SavedNovel | null>(null);

  // ─── Story Bible ─────────────────────────────────────────────────────────────
  const [storyBibles, setStoryBibles] = useState<StoryBibleEntry[]>([]);

  const wizardOptionsRef = useRef<NovelOptions | null>(null);

  // ─── 초기 로드 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setTodayMood(getTodayMood());
    setMoodHistory(loadMoodHistory());
    setNovels(loadNovels());
    setStoryBibles(loadStoryBibles());
  }, []);

  // ─── 기분 선택 ───────────────────────────────────────────────────────────────
  function handleMoodSelect(emoji: MoodEmoji) {
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji],
    };
    saveMood(entry);
    setTodayMood(entry);
    setMoodHistory(loadMoodHistory());
  }

  // ─── 소설 생성 ───────────────────────────────────────────────────────────────
  async function handleGenerate(options: NovelOptions) {
    if (!todayMood) return;

    wizardOptionsRef.current = options;
    setStep('generating');
    setStreamedText('');
    setSavedId(null);

    try {
      const res = await fetch('/api/novel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: todayMood,
          moodHistory,
          options,
          storyBibles, // ← Story Bible 전달 (원문 대신 경량 요약)
        }),
      });

      if (!res.ok || !res.body) throw new Error('소설 생성 실패');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text } = JSON.parse(payload);
            setStreamedText(prev => prev + text);
          } catch { /* skip */ }
        }
      }

      setStep('done');
    } catch (err) {
      console.error(err);
      setStep('home');
      alert('소설 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }

  // ─── 소설 저장 ───────────────────────────────────────────────────────────────
  // 1) 원문을 localStorage에 저장
  // 2) /api/summarize 호출 → Story Bible 생성
  // 3) Story Bible을 localStorage에 저장
  async function handleSave() {
    if (!streamedText || !todayMood || !wizardOptionsRef.current) return;

    setIsSaving(true);

    const id = generateId();
    const title = extractTitle(streamedText);
    const date = new Date().toISOString().slice(0, 10);

    const novel: SavedNovel = {
      id,
      title,
      content: streamedText,
      mood: todayMood.emoji,
      options: wizardOptionsRef.current,
      createdAt: new Date().toISOString(),
    };

    saveNovel(novel);
    setSavedId(id);
    setNovels(loadNovels());

    // Story Bible 비동기 생성 (저장 UX를 막지 않도록 try-catch로 감쌈)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId: id,
          title,
          content: streamedText,
          genre: wizardOptionsRef.current.genre,
          date,
          mood: todayMood.label,
        }),
      });

      if (res.ok) {
        const bible: StoryBibleEntry = await res.json();
        saveStoryBible(bible);
        setStoryBibles(loadStoryBibles());
      }
    } catch (err) {
      // Story Bible 생성 실패는 치명적 오류가 아님 — 조용히 무시
      console.warn('[Story Bible] 생성 실패:', err);
    }

    setIsSaving(false);
  }

  // ─── 렌더 ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-10 space-y-10">

        {/* 기분 선택 */}
        <section>
          <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-3">
            오늘의 기분
          </h2>
          <MoodSelector selected={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
          <MoodHistory history={moodHistory.slice(0, 7)} />
        </section>

        <div className="text-stone-300 text-center text-2xl select-none">✦</div>

        {/* 소설 생성 진입점 */}
        {step === 'home' && (
          <section className="text-center">
            <button
              disabled={!todayMood}
              onClick={() => setStep('wizard')}
              className="px-6 py-3 rounded-full bg-stone-800 text-stone-50 text-sm
                         disabled:opacity-40 hover:bg-stone-700 transition-colors"
            >
              오늘의 이야기 만들기
            </button>
            {!todayMood && (
              <p className="mt-2 text-xs text-stone-400">기분을 기록하고 이야기를 만들어보세요</p>
            )}
          </section>
        )}

        {/* 위저드 */}
        {step === 'wizard' && (
          <NovelWizard
            onGenerate={handleGenerate}
            onCancel={() => setStep('home')}
          />
        )}

        {/* 생성 중 / 완료 */}
        {(step === 'generating' || step === 'done') && (
          <NovelViewer
            text={streamedText}
            isStreaming={step === 'generating'}
            isSaving={isSaving}
            isSaved={!!savedId}
            onSave={handleSave}
            onReset={() => {
              setStep('home');
              setStreamedText('');
              setSavedId(null);
            }}
          />
        )}

        {/* 저장된 소설 목록 */}
        {novels.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest mb-4">
              지난 이야기
            </h2>
            <div className="space-y-3">
              {novels.map(novel => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                  onClick={() => setReadingNovel(novel)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 소설 읽기 모달 */}
      {readingNovel && (
        <NovelReadModal
          novel={readingNovel}
          onClose={() => setReadingNovel(null)}
        />
      )}
    </div>
  );
}