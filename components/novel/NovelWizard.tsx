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
    <section className="space-y-5">
      <h2 className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest">
        이야기 설정
      </h2>

      {/* ═══════════════════════════════════════════════════════════════════
          그룹 1 — 시리즈 설정
          ──────────────────
          - 새 시리즈: 카드 전체를 편집 가능한 필드들로 구성
          - 기존 시리즈: 한 줄 요약 배지 하나로 압축. 이어쓰기 때마다 같은
            정보를 큰 카드로 반복 노출하는 것은 공간 낭비.
      ═══════════════════════════════════════════════════════════════════ */}
      {isNewSeries ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-brand-700 flex items-center gap-1.5">
              <span>📘</span>시리즈 설정
            </h3>
            <p className="text-[11px] text-brand-400 mt-0.5">
              한 번 정하면 연재 내내 유지돼요
            </p>
          </div>

          {/* 장르 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">장르</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`${chip(genre === g)} flex items-center gap-1.5`}>
                  <TwEmoji emoji={GENRE_EMOJI[g]} size={13} />{g}
                </button>
              ))}
            </div>
          </div>

          {/* 주인공 이름 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">
              주인공 이름
              <span className="ml-1.5 text-slate-400 font-normal">(선택)</span>
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

          {/* 주인공 성별 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">
              주인공 성별
              <span className="ml-1.5 text-rose-400 font-semibold">*</span>
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

          {/* 총 편수 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500">시리즈 총 편수</label>
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
              선택한 편수에 맞게 기·승·전·결 구조로 이야기가 자동으로 전개되고, 마지막 편에서 자연스럽게 완결됩니다.
            </p>
          </div>
        </div>
      ) : (
        /* 기존 시리즈 — 한 줄 요약 (새 시리즈 카드와 동일한 헤더 스타일 유지) */
        <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-brand-700 flex items-center gap-1.5">
              <span>📘</span>시리즈 설정
            </h3>
            <p className="text-[11px] text-brand-400 mt-0.5">
              이 시리즈의 고정 설정
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-white border border-brand-100
                          px-4 py-2.5 text-xs">
            <TwEmoji emoji={GENRE_EMOJI[lockedGenre!]} size={13} />
            <span className="font-semibold text-brand-700">{lockedGenre}</span>
            <span className="text-brand-300">·</span>
            <span className="text-brand-600">
              {lockedProtagonistName
                ? <>{lockedProtagonistName}<span className="text-brand-400">({lockedGender})</span></>
                : <span className="text-brand-500">{lockedGender}</span>}
            </span>
            <span className="text-brand-300">·</span>
            <span className="text-brand-600">총 {lockedTotalEpisodes}편</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          그룹 2 — 이번 편 설정
          ────────────────────
          편마다 자유롭게 바꿀 수 있는 값들. 분위기, 필체, 분량.
          항상 편집 가능. 배경: 흰색 (시리즈 카드와 대비).
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span>✏️</span>이번 편 설정
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            편마다 자유롭게 바꿀 수 있어요
          </p>
        </div>

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
      </div>

      {/* 액션 */}
      <div className="flex gap-3 pt-1">
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