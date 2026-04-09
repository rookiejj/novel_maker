'use client';

import { useState } from 'react';
import { Genre, Atmosphere, WritingStyle, NovelLength, NovelOptions, SeriesLength, ProtagGender, SeriesLastOptions } from '@/lib/types';
import TwEmoji from '@/components/ui/TwEmoji';

const GENRES: Genre[]       = ['로맨스', 'SF', '판타지', '공포', '미스터리', '일상', '성장', '역사'];
const ATMOSPHERES: Atmosphere[] = ['따뜻한', '서늘한', '몽환적인', '긴장감 있는', '유쾌한', '슬픈', '잔잔한'];
const STYLES: WritingStyle[]    = ['간결한 문체', '서정적 문체', '대화 중심', '묘사 중심'];
const LENGTHS: NovelLength[]    = ['단편 (500자)', '중편 (1500자)', '장편 (3000자)'];
const SERIES_LENGTHS: SeriesLength[] = [10, 20, 30];

const GENRE_EMOJI: Record<Genre, string> = {
  '로맨스': '💕', 'SF': '🚀', '판타지': '🔮', '공포': '👻',
  '미스터리': '🔍', '일상': '☕', '성장': '🌱', '역사': '📜',
};

interface Props {
  lockedGenre?:           Genre;
  lockedProtagonistName?: string;
  lockedTotalEpisodes?:   SeriesLength;
  lockedGender?:          ProtagGender;
  lastOptions?:           SeriesLastOptions; // 직전 설정 (기존 연재)
  onGenerate: (options: NovelOptions) => void;
  onCancel:   () => void;
}

export default function NovelWizard({
  lockedGenre, lockedProtagonistName, lockedGender, lockedTotalEpisodes, lastOptions, onGenerate, onCancel,
}: Props) {
  const [genre,           setGenre]           = useState<Genre>(lockedGenre ?? '일상');
  const [atmosphere,      setAtmosphere]      = useState<Atmosphere>(lastOptions?.atmosphere ?? '잔잔한');
  const [style,           setStyle]           = useState<WritingStyle>(lastOptions?.style ?? '서정적 문체');
  const [length,          setLength]          = useState<NovelLength>(lastOptions?.length ?? '중편 (1500자)');
  const [protagonistName, setProtagonistName] = useState('');
  const [totalEpisodes,   setTotalEpisodes]   = useState<SeriesLength>(10);
  const [gender,          setGender]          = useState<ProtagGender | null>('중성');

  const isNewSeries = !lockedGenre;

  function chip(active: boolean) {
    return `px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
      active
        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
    }`;
  }

  return (
    <section className="space-y-6">
      <h2 className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest">
        이야기 설정
      </h2>

      {/* 장르 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">장르</label>
          {lockedGenre && (
            <span className="text-[11px] font-medium text-brand-400 bg-brand-50 px-2 py-0.5 rounded-full">
              🔒 연재 고정
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(g => (
            <button key={g} disabled={!!lockedGenre} onClick={() => setGenre(g)}
              className={`${chip(genre === g)} flex items-center gap-1.5 ${lockedGenre ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <TwEmoji emoji={GENRE_EMOJI[g]} size={13} />{g}
            </button>
          ))}
        </div>
      </div>

      {/* 주인공 이름 */}
      {isNewSeries ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500">
            주인공 이름
            <span className="ml-1.5 text-slate-400 font-normal">(선택 · 설정 후 변경 불가)</span>
          </label>
          <input
            type="text"
            value={protagonistName}
            onChange={e => setProtagonistName(e.target.value)}
            placeholder="비워두면 AI가 자유롭게 설정해요"
            maxLength={20}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm
                       text-slate-800 placeholder:text-slate-300
                       focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      ) : lockedProtagonistName ? (
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-brand-400 uppercase tracking-widest mb-0.5">주인공</p>
          <p className="text-sm font-semibold text-brand-700">{lockedProtagonistName}</p>
        </div>
      ) : null}


      {/* 성별 — 새 시리즈: 필수 선택 / 기존 시리즈: 잠금 표시 */}
      {isNewSeries ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500">
            주인공 성별
            <span className="ml-1.5 text-rose-400 font-semibold">*</span>
            <span className="ml-1 text-slate-400 font-normal">(필수 · 설정 후 변경 불가)</span>
          </label>
          <div className="flex gap-2">
            {(['남성', '여성', '중성'] as ProtagGender[]).map(g => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  gender === g
                    ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                }`}
              >
                {g === '남성' ? '👦 남성' : g === '여성' ? '👧 여성' : '🧑 중성'}
              </button>
            ))}
          </div>
        </div>
      ) : lockedGender ? (
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-brand-400 uppercase tracking-widest mb-0.5">주인공 성별</p>
          <p className="text-sm font-semibold text-brand-700">{lockedGender}</p>
        </div>
      ) : null}

      {/* 총 편수 — 새 시리즈에서만 선택 */}
      {isNewSeries ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500">
            시리즈 총 편수
            <span className="ml-1.5 text-slate-400 font-normal">(설정 후 변경 불가)</span>
          </label>
          <div className="flex gap-3">
            {SERIES_LENGTHS.map(n => (
              <button
                key={n}
                onClick={() => setTotalEpisodes(n)}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  totalEpisodes === n
                    ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                }`}
              >
                {n}편
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            선택한 편수에 맞게 기·승·전·결 구조로 이야기가 자동으로 전개됩니다.
            마지막 편에서 자연스럽게 완결됩니다.
          </p>
        </div>
      ) : lockedTotalEpisodes ? (
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3">
          <p className="text-[11px] font-semibold text-brand-400 uppercase tracking-widest mb-0.5">시리즈 구성</p>
          <p className="text-sm font-semibold text-brand-700">총 {lockedTotalEpisodes}편으로 완결</p>
        </div>
      ) : null}

      {/* 분위기 */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500">분위기</label>
        <div className="flex flex-wrap gap-2">
          {ATMOSPHERES.map(a => (
            <button key={a} onClick={() => setAtmosphere(a)} className={chip(atmosphere === a)}>{a}</button>
          ))}
        </div>
      </div>

      {/* 필체 */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500">필체</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map(s => (
            <button key={s} onClick={() => setStyle(s)} className={chip(style === s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* 분량 */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-500">분량</label>
        <div className="flex flex-wrap gap-2">
          {LENGTHS.map(l => (
            <button key={l} onClick={() => setLength(l)} className={chip(length === l)}>{l}</button>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
          취소
        </button>
        <button
          onClick={() => {
            if (isNewSeries && !gender) return;
            onGenerate({
              genre, atmosphere, style, length,
              protagonistName:  isNewSeries ? (protagonistName.trim() || undefined) : lockedProtagonistName,
              protagonistGender: isNewSeries ? gender! : lockedGender,
              totalEpisodes:    isNewSeries ? totalEpisodes : lockedTotalEpisodes,
            });
          }}
          className="flex-1 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm">
          이야기 만들기
        </button>
      </div>
    </section>
  );
}
