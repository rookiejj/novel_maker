'use client';

import { useState } from 'react';
import { Genre, Atmosphere, WritingStyle, NovelLength, NovelOptions } from '@/lib/types';

const GENRES: Genre[] = ['로맨스', 'SF', '판타지', '공포', '미스터리', '일상', '성장', '역사'];
const ATMOSPHERES: Atmosphere[] = ['따뜻한', '서늘한', '몽환적인', '긴장감 있는', '유쾌한', '슬픈', '잔잔한'];
const STYLES: WritingStyle[] = ['간결한 문체', '서정적 문체', '대화 중심', '묘사 중심'];
const LENGTHS: NovelLength[] = ['단편 (500자)', '중편 (1500자)', '장편 (3000자)'];

interface Props {
  /** World Bible이 이미 존재할 때 전달 — 이 장르로 고정, 변경 불가 */
  lockedGenre?: Genre;
  onGenerate: (options: NovelOptions) => void;
  onCancel: () => void;
}

export default function NovelWizard({ lockedGenre, onGenerate, onCancel }: Props) {
  const [genre, setGenre] = useState<Genre>(lockedGenre ?? '일상');
  const [atmosphere, setAtmosphere] = useState<Atmosphere>('잔잔한');
  const [style, setStyle] = useState<WritingStyle>('서정적 문체');
  const [length, setLength] = useState<NovelLength>('중편 (1500자)');

  function handleSubmit() {
    onGenerate({ genre, atmosphere, style, length });
  }

  return (
    <section className="space-y-6">
      <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-widest">
        이야기 설정
      </h2>

      {/* 장르 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500">장르</label>
          {lockedGenre && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              연재 고정 — 변경 불가
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(g => (
            <button
              key={g}
              disabled={!!lockedGenre}
              onClick={() => setGenre(g)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                ${genre === g
                  ? 'bg-stone-800 text-stone-50 border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}
                ${lockedGenre ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* 분위기 */}
      <div className="space-y-2">
        <label className="text-xs text-stone-500">분위기</label>
        <div className="flex flex-wrap gap-2">
          {ATMOSPHERES.map(a => (
            <button
              key={a}
              onClick={() => setAtmosphere(a)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                ${atmosphere === a
                  ? 'bg-stone-800 text-stone-50 border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* 필체 */}
      <div className="space-y-2">
        <label className="text-xs text-stone-500">필체</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                ${style === s
                  ? 'bg-stone-800 text-stone-50 border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 분량 */}
      <div className="space-y-2">
        <label className="text-xs text-stone-500">분량</label>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map(l => (
            <button
              key={l}
              onClick={() => setLength(l)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors
                ${length === l
                  ? 'bg-stone-800 text-stone-50 border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-full border border-stone-300 text-stone-600 text-sm hover:bg-stone-100 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-2.5 rounded-full bg-stone-800 text-stone-50 text-sm hover:bg-stone-700 transition-colors"
        >
          이야기 만들기
        </button>
      </div>
    </section>
  );
}