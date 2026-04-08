'use client';

import { WEATHER_MAP, type WeatherType } from '@/lib/types';
import { saveWeather } from '@/lib/storage';
import { cn } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  todayWeather: WeatherType | null;
  onSelect:     (weather: WeatherType) => void;
}

export default function WeatherSelector({ todayWeather, onSelect }: Props) {
  function handleSelect(weather: WeatherType) {
    saveWeather({ date: new Date().toISOString().slice(0, 10), weather });
    onSelect(weather);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest">
          오늘의 날씨
        </p>
        {todayWeather && (
          <p className="text-[11px] text-brand-400 font-medium">
            <TwEmoji emoji={WEATHER_MAP[todayWeather].emoji} size={12} className="mr-0.5 align-middle" />
            {WEATHER_MAP[todayWeather].label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {(Object.entries(WEATHER_MAP) as [WeatherType, typeof WEATHER_MAP[WeatherType]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            title={val.label}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-150',
              todayWeather === key
                ? 'ring-2 ring-brand-400 bg-brand-50 scale-105'
                : 'bg-white/60 hover:bg-white hover:scale-105',
            )}
          >
            <TwEmoji emoji={val.emoji} size={20} />
            <span className="text-[9px] font-medium text-slate-500 leading-none">{val.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
