import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 소설 본문에서 「제목」 형식의 제목을 추출, 없으면 첫 줄을 반환 */
export function extractTitle(content: string): string {
  const match = content.match(/「(.+?)」/);
  if (match) return match[1];
  const firstLine = content.split('\n').find(l => l.trim());
  return firstLine?.slice(0, 20) ?? '무제';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}