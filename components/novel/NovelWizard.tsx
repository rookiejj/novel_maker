'use client';

import { useState } from 'react';
import {
  GENRE_MAP, ATMOSPHERE_MAP, WRITING_STYLE_MAP, NOVEL_LENGTH_MAP,
  type Genre, type Atmosphere, type WritingStyle, type NovelLength, type NovelConfig,
} from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  onStart: (config: NovelConfig) => void;
  onCancel: () => void;
}

type Step = 0 | 1 | 2 | 3;

const STEPS = ['장르', '분위기', '필체', '분량'] as const;

export default function NovelWizard({ onStart, onCancel }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [genre,      setGenre]      = useState<Genre | null>(null);
  const [atmosphere, setAtmosphere] = useState<Atmosphere | null>(null);
  const [style,      setStyle]      = useState<WritingStyle | null>(null);
  const [length,     setLength]     = useState<NovelLength>('short');

  function next() { setStep(s => Math.min(s + 1, 3) as Step); }
  function prev() { setStep(s => Math.max(s - 1, 0) as Step); }

  function handleStart() {
    if (!genre || !atmosphere || !style) return;
    onStart({ genre, atmosphere, writingStyle: style, length });
  }

  const canNext = (
    (step === 0 && genre      !== null) ||
    (step === 1 && atmosphere !== null) ||
    (step === 2 && style      !== null) ||
    step === 3
  );

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-stone-700">새 이야기 만들기</h2>
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-stone-100">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'flex-1 py-2.5 text-center text-xs font-medium transition-colors',
              i === step ? 'border-b-2 border-stone-800 text-stone-800'
                : i < step  ? 'text-stone-400'
                : 'text-stone-300',
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="p-5">
        {step === 0 && (
          <OptionGrid
            items={Object.entries(GENRE_MAP).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon }))}
            selected={genre}
            onSelect={k => { setGenre(k as Genre); }}
          />
        )}
        {step === 1 && (
          <OptionGrid
            items={Object.entries(ATMOSPHERE_MAP).map(([k, v]) => ({ key: k, label: v.label, icon: v.icon }))}
            selected={atmosphere}
            onSelect={k => { setAtmosphere(k as Atmosphere); }}
          />
        )}
        {step === 2 && (
          <div className="grid grid-cols-1 gap-2">
            {(Object.entries(WRITING_STYLE_MAP) as [WritingStyle, typeof WRITING_STYLE_MAP[WritingStyle]][]).map(
              ([key, val]) => (
                <button
                  key={key}
                  onClick={() => setStyle(key)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                    style === key
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-stone-100 hover:border-stone-300',
                  )}
                >
                  <span className="font-medium text-sm">{val.label}</span>
                  <span className={cn('text-xs', style === key ? 'text-stone-300' : 'text-stone-400')}>
                    {val.desc}
                  </span>
                </button>
              ),
            )}
          </div>
        )}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(NOVEL_LENGTH_MAP) as [NovelLength, typeof NOVEL_LENGTH_MAP[NovelLength]][]).map(
              ([key, val]) => (
                <button
                  key={key}
                  onClick={() => setLength(key)}
                  className={cn(
                    'flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all',
                    length === key
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-stone-100 hover:border-stone-300',
                  )}
                >
                  <span className="font-semibold">{val.label}</span>
                  <span className={cn('text-xs', length === key ? 'text-stone-300' : 'text-stone-400')}>
                    {val.desc}
                  </span>
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-stone-100 px-5 py-4">
        <button
          onClick={step === 0 ? onCancel : prev}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          {step === 0 ? '취소' : '← 이전'}
        </button>

        {step < 3 ? (
          <button
            onClick={next}
            disabled={!canNext}
            className={cn(
              'rounded-xl px-5 py-2 text-sm font-medium transition-all',
              canNext
                ? 'bg-stone-800 text-white hover:bg-stone-700 active:scale-95'
                : 'cursor-not-allowed bg-stone-100 text-stone-300',
            )}
          >
            다음 →
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-amber-400 active:scale-95 transition-all"
          >
            이야기 시작 ✦
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

interface OptionGridProps {
  items: { key: string; label: string; icon: string }[];
  selected: string | null;
  onSelect: (key: string) => void;
}

function OptionGrid({ items, selected, onSelect }: OptionGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all',
            selected === item.key
              ? 'border-stone-800 bg-stone-800 text-white scale-105 shadow'
              : 'border-stone-100 hover:border-stone-300',
          )}
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-[11px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}