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
  loadMoodHistory,
  getTodayMood,
  saveNovel,
  loadNovels,
  saveStoryBible,
  loadStoryBibles,
  saveWorldBible,
  loadWorldBible,
  mergeCharactersIntoWorldBible,
} from '@/lib/storage';
import {
  MoodEmoji,
  MoodEntry,
  NovelOptions,
  SavedNovel,
  StoryBibleEntry,
  WorldBible,
  MOOD_MAP,
} from '@/lib/types';
import { extractTitle, generateId } from '@/lib/utils';

type Step = 'home' | 'wizard' | 'generating' | 'done';

export default function HomePage() {
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);

  const [step, setStep] = useState<Step>('home');
  const [streamedText, setStreamedText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [novels, setNovels] = useState<SavedNovel[]>([]);
  const [readingNovel, setReadingNovel] = useState<SavedNovel | null>(null);

  const [storyBibles, setStoryBibles] = useState<StoryBibleEntry[]>([]);
  const [worldBible, setWorldBible] = useState<WorldBible | null>(null);

  const wizardOptionsRef = useRef<NovelOptions | null>(null);

  // ─── 초기 로드 ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setTodayMood(getTodayMood());
    setMoodHistory(loadMoodHistory());
    setNovels(loadNovels());
    setStoryBibles(loadStoryBibles());
    setWorldBible(loadWorldBible());
  }, []);

  // ─── 기분 선택 ───────────────────────────────────────────────────────────────
  function handleMoodSelect(emoji: MoodEmoji) {
    // MoodSelector가 내부적으로 moodStorage.saveMood()를 이미 호출하므로
    // 여기서는 state만 갱신한다.
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    };
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
          worldBible,    // ← 고정 세계관 전달 (없으면 null → 첫 편)
          storyBibles,   // ← 편당 경량 요약 전달
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
          } catch { /* skip malformed */ }
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
  // 흐름:
  // 1) 원문 → localStorage 저장
  // 2) /api/summarize 호출 → Story Bible + (첫 편이면 World Bible) 수신
  // 3) Story Bible → localStorage 저장
  // 4) World Bible → 첫 편이면 새로 저장, 후속편이면 신규 인물만 merge
  async function handleSave() {
    if (!streamedText || !todayMood || !wizardOptionsRef.current) return;

    setIsSaving(true);

    const id = generateId();
    const title = extractTitle(streamedText);
    const date = new Date().toISOString().slice(0, 10);
    const isFirstNovel = !worldBible;

    // 1) 원문 저장
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

    // 2~4) Story Bible / World Bible 생성 (실패해도 저장은 완료)
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
          isFirstNovel,
          existingWorld: worldBible ?? undefined,
        }),
      });

      if (res.ok) {
        const { storyBible, worldBible: newWorldBible, newCharacterProfiles } =
          await res.json() as {
            storyBible: StoryBibleEntry;
            worldBible: WorldBible | null;
            newCharacterProfiles: WorldBible['characters'];
          };

        // Story Bible 저장
        saveStoryBible(storyBible);
        setStoryBibles(loadStoryBibles());

        // World Bible 처리
        if (isFirstNovel && newWorldBible) {
          // 첫 편: 새 World Bible 저장
          saveWorldBible(newWorldBible);
          setWorldBible(newWorldBible);
        } else if (!isFirstNovel && newCharacterProfiles?.length > 0) {
          // 후속편: 신규 인물만 기존 World Bible에 누적
          mergeCharactersIntoWorldBible(newCharacterProfiles);
          setWorldBible(loadWorldBible());
        }
      }
    } catch (err) {
      console.warn('[Story/World Bible] 생성 실패 (저장은 완료됨):', err);
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
          <MoodSelector todayMood={todayMood?.emoji ?? null} onSelect={handleMoodSelect} />
          <MoodHistory history={moodHistory.slice(0, 7)} />
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
            lockedGenre={worldBible?.genre}   // ← World Bible이 있으면 장르 잠금
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

      {readingNovel && (
        <NovelReadModal novel={readingNovel} onClose={() => setReadingNovel(null)} />
      )}
    </div>
  );
}