'use client';

import { useEffect, useRef, useState } from 'react';
import type { NovelConfig, NovelRecord, MoodRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { novelStorage } from '@/lib/storage';
import { extractTitle, formatDate } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

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
  const bodyRef  = useRef<HTMLDivElement>(null);
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
        if (!res.ok || !res.body) { setStatus('error'); return; }

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
                if (text) setRaw(prev => prev + text);
              } catch { /* ignore */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus('error');
      }
    })();

    return () => { controller.abort(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'streaming')
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [raw, status]);

  async function handleSave() {
    if (saved || !raw.trim()) return;
    const { title, body } = extractTitle(raw);
    setSaved(true);
    try {
      // 1) Supabase에 소설 저장 — 이 단계가 성공해야 아래로 진행
      const record = await novelStorage.save({
        title,
        content: body,
        config,
        baseMood: baseMood?.mood ?? '😌',
      });

      // 2) 부모(HomeView.handleNovelSaved)에 알림.
      //    handleNovelSaved는 이제 "동기적 최소 작업(롤백 플래그 해제 + 낙관적 목록 갱신)"만
      //    수행하고 무거운 DB/LLM 후처리는 자체적으로 백그라운드에 던진다.
      //    따라서 이 await는 실질적으로 수 ms 안에 끝나며, 뷰어는 곧바로 닫힌다.
      //
      //    ★ 순서가 중요하다: onSaved → onClose.
      //    반대로 하면 새 시리즈의 첫 화 저장 시 HomeView가 pending 플래그를
      //    해제할 틈 없이 handleViewerClose가 돌아 시리즈가 롤백(삭제)된다.
      await onSaved(record);
      onClose();
    } catch (err) {
      console.error('[NovelViewer] 저장 실패:', err);
      setSaved(false);
    }
  }

  const { title, body } = extractTitle(raw);
  const moodInfo = baseMood ? MOOD_MAP[baseMood.mood] : null;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-brand-100 bg-white shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <TwEmoji emoji={GENRE_MAP[config.genre].icon} size={14} />
          <span className="font-medium">{GENRE_MAP[config.genre].label}</span>
          <span>·</span>
          <span>{ATMOSPHERE_MAP[config.atmosphere].label}</span>
          {moodInfo && (
            <>
              <span>·</span>
              <TwEmoji emoji={moodInfo.emoji} size={14} />
              <span className="text-brand-400">{moodInfo.label} 기분 반영</span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-slate-500 text-xl leading-none transition-colors"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6">
        {title && title !== '이름 없는 이야기' && (
          <h1 className="mb-6 font-serif text-2xl font-bold leading-snug text-slate-900">{title}</h1>
        )}
        <div className="prose prose-slate max-w-none font-serif leading-relaxed text-slate-700">
          {body.split('\n').map((para, i) =>
            para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />,
          )}
        </div>
        {status === 'streaming' && (
          <span className="inline-block h-4 w-0.5 animate-pulse bg-brand-400" />
        )}
        {status === 'error' && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-500">
            이야기를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
        )}
      </div>

      {/* Footer */}
      {status === 'done' && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-400">{formatDate(Date.now())}</span>
          <div className="flex items-center gap-2">
            {!saved && (
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-400
                           border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saved}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
                saved
                  ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
              }`}
            >
              {saved ? '저장됨 ✓' : '저장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}