'use client';

interface Props {
  emoji: string;
  size?: number;
  className?: string;
}

/** emoji 문자를 Twemoji(트위터 스타일) SVG 이미지로 렌더링한다 */
function toUrl(emoji: string): string {
  const cps = [...emoji]
    .map(c => c.codePointAt(0)!)
    .filter(cp => cp !== 0xFE0F); // variation selector 제거
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps.map(cp => cp.toString(16)).join('-')}.svg`;
}

export default function TwEmoji({ emoji, size = 24, className = '' }: Props) {
  return (
    <img
      src={toUrl(emoji)}
      alt={emoji}
      width={size}
      height={size}
      draggable={false}
      className={`inline-block select-none ${className}`}
    />
  );
}
