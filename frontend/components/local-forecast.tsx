import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Droplets, Sun } from 'lucide-react';
import type { DailyForecast } from '@/lib/meteoswiss';
import { describeWeatherSymbol, type WeatherKind } from '@/lib/weather-symbols';

const ICONS = { sun: Sun, partly: CloudSun, cloud: Cloud, fog: CloudFog, rain: CloudRain, snow: CloudSnow, thunder: CloudLightning } satisfies Record<WeatherKind, typeof Sun>;

const dayFormat = new Intl.DateTimeFormat('de-CH', { weekday: 'short', timeZone: 'UTC' });

function dayLabel(date: string, index: number): string {
  if (index === 0) return 'Heute';
  if (index === 1) return 'Morgen';
  return dayFormat.format(new Date(`${date}T12:00:00Z`));
}

function degrees(value: number | null): string {
  return value === null ? '–' : `${value.toFixed(0)}°`;
}

export function LocalForecast({ days }: { days: DailyForecast[] }) {
  return <div className="forecast">
    <ul className="forecast-list">
      {days.map((day, index) => {
        const symbol = describeWeatherSymbol(day.symbol);
        const Icon = symbol ? ICONS[symbol.kind] : Cloud;
        return <li key={day.date} title={symbol?.label}>
          <time dateTime={day.date}>{dayLabel(day.date, index)}</time>
          {symbol ? <Icon role="img" aria-label={symbol.label} /> : <Icon aria-hidden="true" />}
          <span className="forecast-temp">{degrees(day.minTemp)} / <strong>{degrees(day.maxTemp)}</strong></span>
          {day.precipitationMm !== null && day.precipitationMm >= 0.1 ? <small className="forecast-rain"><Droplets aria-hidden="true" />{day.precipitationMm.toFixed(1)} mm</small> : <small />}
        </li>;
      })}
    </ul>
    <p className="forecast-source">Quelle: <a href="https://www.meteoschweiz.admin.ch/" target="_blank" rel="noreferrer">MeteoSchweiz</a></p>
  </div>;
}
