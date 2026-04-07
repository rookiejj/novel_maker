'use client';

import { useEffect, useRef, useState } from 'react';
import type { NovelConfig, NovelRecord, MoodRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { novelStorage } from '@/lib/storage';
import { extractTitle, formatDate } from '@/lib/utils';

type Status = 'streaming' | 'done' | 'error';

interface Props {
  config:      NovelConfig;
  recentMoods: MoodRecord[];
  baseMood:    MoodRecord | null;
  onSaved:     (novel: NovelRecord) => void;
  onClose:     () => void;
}

export default function NovelViewer({ config, recentMoods, baseMood, onSaved, onClose }: Props) {
  const [raw,    setRaw]    = useState('');
  const [status, setStatus] = useState<Status>('streaming');
  const [saved,  setSaved]  = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch('/api/novel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config, recentMoods }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setStatus('error');
          return;
        }

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event: done'))  { setStatus('done'); }
            if (line.startsWith('event: error')) { setStatus('error'); }
            if (line.startsWith('data: ')) {
              try {
                const { text } = JSON.parse(line.slice(6));
                setRaw(prev => prev + text);
              } catch { /* ignore malformed */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus('error');
      }
    })();

    return () => { controller.abort(); };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll while streaming
  useEffect(() => {
    if (status === 'streaming') {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [raw, status]);

  function handleSave() {
    if (saved || !raw.trim()) return;
    const { title, body } = extractTitle(raw);
    const record = novelStorage.save({
      title,
      content: body,
      config,
      baseMood: baseMood?.mood ?? 'peaceful',
    });
    setSaved(true);
    onSaved(record);
  }

  const { title, body } = extractTitle(raw);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white shadow-lg">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>{GENRE_MAP[config.genre].icon}</span>
          <span>{GENRE_MAP[config.genre].label}</span>
          <span>·</span>
          <span>{ATMOSPHERE_MAP[config.atmosphere].label}</span>
          {baseMood && (
            <>
              <span>·</span>
              <span>{MOOD_MAP[baseMood.mood].emoji}</span>
            </>
          )}
        </div>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
      </div>

      {/* Content */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6">
        {title && title !== '이름 없는 이야기' && (
          <h1 className="mb-6 font-serif text-2xl font-bold leading-snug text-stone-800">
            {title}
          </h1>
        )}

        <div className="prose prose-stone max-w-none font-serif leading-relaxed text-stone-700">
          {body.split('\n').map((para, i) =>
            para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />,
          )}
        </div>

        {status === 'streaming' && (
          <span className="inline-block h-4 w-0.5 animate-pulse bg-stone-400" />
        )}

        {status === 'error' && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-500">
            이야기를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
        )}
      </div>

      {/* Footer */}
      {status === 'done' && (
        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3">
          <span className="text-xs text-stone-400">{formatDate(Date.now())}</span>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${
              saved
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : 'bg-stone-800 text-white hover:bg-stone-700 active:scale-95'
            }`}
          >
            {saved ? '저장됨 ✓' : '저장하기'}
          </button>
        </div>
      )}
    </div>
  );
}