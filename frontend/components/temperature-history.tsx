'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import {
  DEFAULT_RANGE_DAYS,
  RANGE_OPTIONS,
  defaultPoolIds,
  formatLongDate,
  formatShortDate,
  hasReadings,
  sliceRange,
  type RangeDays,
  type TemperatureTimeseries,
} from '@/lib/timeseries';

const COLORS = ['#006c78', '#e4411c', '#c99a00', '#3f9b4a', '#7b4bb7', '#2a7fd4', '#d6338a', '#6b7b80'];

const round1 = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

export function TemperatureHistory({ series, mainPoolIds }: { series: TemperatureTimeseries; mainPoolIds: string[] }) {
  const { pools, points } = series;
  const [days, setDays] = useState<RangeDays>(DEFAULT_RANGE_DAYS);
  const [selected, setSelected] = useState<string[]>(() => defaultPoolIds(pools, mainPoolIds));

  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(pools.map((pool, index) => [pool.beckenid, { label: pool.name, color: COLORS[index % COLORS.length] }])),
    [pools],
  );
  const visiblePoints = useMemo(() => sliceRange(points, days), [points, days]);
  const chartData = useMemo(
    () => visiblePoints.map((point) => ({ date: point.date, ...Object.fromEntries(selected.map((id) => [id, round1(point.temperatures[id] ?? null)])) })),
    [visiblePoints, selected],
  );
  const shownPools = pools.filter((pool) => selected.includes(pool.beckenid));
  const first = visiblePoints[0]?.date;
  const last = visiblePoints.at(-1)?.date;

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return <div className="history">
    <div className="history-controls">
      <fieldset className="history-control">
        <legend>Zeitraum</legend>
        <div className="history-chips">
          {RANGE_OPTIONS.map((option) => <button key={option} type="button" className="history-chip" aria-pressed={days === option} onClick={() => setDays(option)}>{option} Tage</button>)}
        </div>
      </fieldset>
      {pools.length > 1 ? <fieldset className="history-control">
        <legend>Becken</legend>
        <div className="history-chips">
          {pools.map((pool, index) => <label key={pool.beckenid} className="history-chip history-pool" data-checked={selected.includes(pool.beckenid)}>
            <input type="checkbox" checked={selected.includes(pool.beckenid)} onChange={() => toggle(pool.beckenid)} />
            <span className="history-swatch" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />{pool.name}
          </label>)}
        </div>
      </fieldset> : null}
    </div>

    {shownPools.length === 0
      ? <p className="muted-copy history-empty">Bitte wähle mindestens ein Becken aus.</p>
      : !hasReadings(visiblePoints, selected)
        ? <p className="muted-copy history-empty">Keine Messwerte im gewählten Zeitraum.</p>
        : <>
          <p className="sr-only">Temperaturverlauf der Becken {shownPools.map((pool) => pool.name).join(', ')}.</p>
          <ChartContainer config={config} className="history-chart">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tickMargin={8} minTickGap={24} />
              <YAxis unit="°" width={44} domain={['auto', 'auto']} allowDecimals={false} tickMargin={4} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatLongDate(String(value))} />} />
              {shownPools.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
              {shownPools.map((pool) => <Line key={pool.beckenid} dataKey={pool.beckenid} name={pool.name} stroke={`var(--color-${pool.beckenid})`} strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
            </LineChart>
          </ChartContainer>
          <p className="history-note">Tagesdurchschnitt in °C{first && last ? ` · ${formatLongDate(first)} bis ${formatLongDate(last)}` : ''}. Lücken bedeuten: keine Messung an diesem Tag.</p>
        </>}
  </div>;
}
