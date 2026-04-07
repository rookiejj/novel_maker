import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** timestamp(ms) 또는 ISO 문자열 모두 처리 */
export function formatDate(value: number | string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeDate(value: number | string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return '방금 전';
  if (hours <  1) return `${mins}분 전`;
  if (days  <  1) return `${hours}시간 전`;
  if (days  <  7) return `${days}일 전`;
  return formatDate(value);
}

/**
 * 소설 원문에서 제목과 본문을 분리.
 * 「제목」 형식 우선, 없으면 첫 줄을 제목으로.
 */
export function extractTitle(content: string): { title: string; body: string } {
  const match = content.match(/^「(.+?)」\s*/);
  if (match) {
    return { title: match[1], body: content.slice(match[0].length).trim() };
  }
  const lines = content.split('\n');
  const first = lines[0].trim();
  return {
    title: first.slice(0, 30) || '이름 없는 이야기',
    body: lines.slice(1).join('\n').trim(),
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}