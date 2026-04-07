import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 1)   return '방금 전';
  if (minutes < 60)  return `${minutes}분 전`;
  if (hours   < 24)  return `${hours}시간 전`;
  if (days    < 7)   return `${days}일 전`;
  return formatDate(timestamp);
}

/** Strip the title line ("# 제목") from streamed novel content */
export function extractTitle(raw: string): { title: string; body: string } {
  const lines = raw.trim().split('\n');
  const titleLine = lines.find(l => l.startsWith('#'));
  const title = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : '이름 없는 이야기';
  const body  = lines.filter(l => l !== titleLine).join('\n').trim();
  return { title, body };
}