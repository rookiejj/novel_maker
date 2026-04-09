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

  // ─── 부드러운 스트리밍 버퍼 ───────────────────────────────────────────────
  //
  // 문제: Anthropic SSE 청크는 크기·간격이 들쑥날쑥해 곧바로 setRaw에 붙이면
  //       "멈춤 → 뭉텅이 → 멈춤"이 반복되며 끊기는 느낌을 준다.
  //
  // 해결: 수신 텍스트를 pendingBufferRef에 쌓고, requestAnimationFrame 루프에서
  //       매 프레임마다 고정량씩 꺼내 setRaw로 흘려보낸다.
  //       적응형 속도: 버퍼가 클수록 더 많이 꺼내 따라잡는다.
  //       (perFrame = max(2, ceil(pending / 30)) — 60fps 기준 기본 초당 ~120자)
  //
  //       서버 `event: done`을 받아도 즉시 status='done'으로 전이하지 않고
  //       streamDoneRef만 세운다. rAF가 버퍼를 모두 비운 뒤에야 'done'으로 바뀌어
  //       "마지막 문장이 뚝 나타나고 바로 저장 버튼" 현상을 방지한다.
  //
  // ★ Strict Mode 안전성:
  //   rAF 루프와 fetch 스트리밍을 "하나의 useEffect"로 묶고, effect 진입 시점에
  //   pendingBufferRef / streamDoneRef를 명시적으로 리셋한다. 두 로직이 같은
  //   생명주기를 공유하므로 개발 모드 이중 실행에서도 상태가 꼬이지 않는다.
  // ------------------------------------------------------------------------
  const pendingBufferRef = useRef<string>('');
  const streamDoneRef    = useRef<boolean>(false);

  useEffect(() => {
    // ★ 이전 run의 잔존 상태 제거 — Strict Mode 이중 실행 대응
    pendingBufferRef.current = '';
    streamDoneRef.current    = false;

    const controller = new AbortController();
    let rafId: number | null = null;
    let cancelled = false;

    // rAF 타자기 루프
    const tick = () => {
      if (cancelled) return;

      const pending = pendingBufferRef.current;

      if (pending.length > 0) {
        // 적응형: 버퍼가 크면 빠르게 따라잡음. 최소 2자/프레임.
        const perFrame = Math.max(2, Math.ceil(pending.length / 30));
        const chunk    = pending.slice(0, perFrame);
        pendingBufferRef.current = pending.slice(perFrame);
        setRaw(prev => prev + chunk);
      } else if (streamDoneRef.current) {
        // 버퍼 비었고 서버 스트리밍 종료됨 → 완료 전이, 루프 정지
        setStatus(prev => (prev === 'error' ? prev : 'done'));
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // SSE fetch
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
          streamDoneRef.current = true;
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
            if (line.startsWith('event: done')) {
              // 서버 종료 신호 — 상태 전이는 rAF가 버퍼를 비운 뒤 담당
              streamDoneRef.current = true;
            }
            if (line.startsWith('event: error')) {
              setStatus('error');
              streamDoneRef.current = true;
            }
            if (line.startsWith('data: ')) {
              try {
                const { text } = JSON.parse(line.slice(6));
                // ★ setRaw를 직접 호출하지 않고 버퍼에만 쌓는다
                if (text) pendingBufferRef.current += text;
              } catch { /* ignore */ }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setStatus('error');
          streamDoneRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'streaming')
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [raw, status]);

  async function handleSave() {
    // 가드: 이미 저장됐거나, 완료 상태가 아니거나, 본문이 비었으면 무시.
    // 버튼에 disabled도 걸어두지만 혹시 모를 클릭 이벤트까지 방어한다.
    if (saved || status !== 'done' || !raw.trim()) return;
    const { title, body } = extractTitle(raw);
    setSaved(true);
    try {
      const record = await novelStorage.save({
        title,
        content: body,
        config,
        baseMood: baseMood?.mood ?? '😌',
      });
      // ★ 순서 중요: onSaved → onClose. 반대로 하면 새 시리즈 첫 화에서
      //   시리즈가 롤백(삭제)된다.
      await onSaved(record);
      onClose();
    } catch (err) {
      console.error('[NovelViewer] 저장 실패:', err);
      setSaved(false);
    }
  }

  const { title, body } = extractTitle(raw);
  const moodInfo = baseMood ? MOOD_MAP[baseMood.mood] : null;

  // 저장 가능 여부: 스트리밍이 완전히 끝났고, 아직 저장 전이며, 본문이 존재할 때만.
  const canSave = status === 'done' && !saved && raw.trim().length > 0;

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

      {/* Footer — 항상 표시.
          스트리밍 중에는 저장 버튼을 시각적·기능적으로 모두 비활성화해,
          "눌리는 것처럼 보이는데 동작하지 않는" UX 결함을 방지한다. */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <span className="text-xs text-slate-400">
          {status === 'streaming' ? '작성 중…' : formatDate(Date.now())}
        </span>
        <div className="flex items-center gap-2">
          {!saved && (
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500
                         border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            aria-disabled={!canSave}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all
              ${saved
                ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed'
                : canSave
                  ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
                  // 스트리밍/에러 등 저장 불가 상태: 눌리지 않는다는 걸 시각·커서로 명확히.
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
          >
            {saved
              ? '저장됨 ✓'
              : status === 'streaming'
                ? '작성 중…'
                : status === 'error'
                  ? '저장 불가'
                  : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
