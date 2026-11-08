import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useColors } from '@/theme/colors';

const AXIS_W = 40;
const FONT = 11;
// SVG text falls back to a serif font on web; match the app's sans-serif.
const FONT_FAMILY = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

/** Nice round tick step for a max value. */
function niceStep(max: number, ticks = 3): number {
  const raw = max / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function useWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return { width, onLayout };
}

/** Column path with a 4px rounded top and a square base. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, h, w / 2);
  if (h <= 0) return '';
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/* ---------- Weekly calories: columns + target line ---------- */

export interface BarDatum {
  label: string;
  value: number | null;
  /** Shown when the bar is tapped. */
  detail: string;
  highlight?: boolean;
}

export function WeekBars({
  data,
  target,
  targetLabel,
  formatTick,
}: {
  data: BarDatum[];
  target: number;
  targetLabel: string;
  formatTick: (n: number) => string;
}) {
  const c = useColors();
  const { width, onLayout } = useWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const height = 170;
  const top = 18;
  const bottom = 22;
  const plotH = height - top - bottom;

  const max = Math.max(target * 1.15, ...data.map((d) => d.value ?? 0));
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  const y = (v: number) => top + plotH - (v / yMax) * plotH;
  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step);

  const plotW = Math.max(0, width - AXIS_W);
  const band = plotW / data.length;
  const barW = Math.min(24, band * 0.6);

  return (
    <View onLayout={onLayout} accessibilityLabel={data.map((d) => d.detail).join(', ')}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((tv) => (
            <Line key={tv} x1={AXIS_W} x2={width} y1={y(tv)} y2={y(tv)} stroke={c.grid} strokeWidth={1} />
          ))}
          {ticks.map((tv) => (
            <SvgText fontFamily={FONT_FAMILY} key={`l${tv}`} x={AXIS_W - 6} y={y(tv) + 4} fontSize={FONT} fill={c.textSecondary} textAnchor="end">
              {formatTick(tv)}
            </SvgText>
          ))}
          {data.map((d, i) => {
            const x = AXIS_W + band * i + (band - barW) / 2;
            const v = d.value ?? 0;
            return (
              <Path
                key={i}
                d={columnPath(x, y(v), barW, y(0) - y(v))}
                fill={c.chart}
                opacity={selected === null || selected === i ? 1 : 0.45}
              />
            );
          })}
          <Line x1={AXIS_W} x2={width} y1={y(target)} y2={y(target)} stroke={c.text} strokeWidth={1} opacity={0.6} />
          <SvgText fontFamily={FONT_FAMILY} x={width} y={y(target) - 5} fontSize={FONT} fill={c.textSecondary} textAnchor="end">
            {targetLabel}
          </SvgText>
          {data.map((d, i) => (
            <SvgText
              fontFamily={FONT_FAMILY}
              key={`x${i}`}
              x={AXIS_W + band * i + band / 2}
              y={height - 6}
              fontSize={FONT}
              fontWeight={d.highlight ? '700' : '400'}
              fill={d.highlight ? c.text : c.textSecondary}
              textAnchor="middle">
              {d.label}
            </SvgText>
          ))}
          {selected !== null && data[selected] && (
            <SvgText
              fontFamily={FONT_FAMILY}
              x={AXIS_W + band * selected + band / 2}
              y={Math.max(FONT, y(data[selected].value ?? 0) - 6)}
              fontSize={12}
              fontWeight="700"
              fill={c.text}
              textAnchor="middle">
              {data[selected].value === null ? '—' : formatTick(Math.round(data[selected].value!))}
            </SvgText>
          )}
        </Svg>
      )}
      {/* Tap targets: the whole column band, bigger than the bar itself. */}
      <View style={[StyleSheet.absoluteFill, styles.hitRow, { left: AXIS_W }]}>
        {data.map((d, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={d.detail}
            style={styles.hit}
            onPress={() => setSelected(selected === i ? null : i)}
          />
        ))}
      </View>
    </View>
  );
}

/* ---------- Weight over time: line + goal line ---------- */

export interface WeightPoint {
  date: Date;
  kg: number;
  detail: string;
}

export function WeightLine({
  points,
  goal,
  goalLabel,
  formatKg,
  formatDate,
}: {
  points: WeightPoint[];
  goal: number;
  goalLabel: string;
  formatKg: (n: number) => string;
  formatDate: (d: Date) => string;
}) {
  const c = useColors();
  const { width, onLayout } = useWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const height = 180;
  const top = 20;
  const bottom = 22;
  const right = 16;
  const plotH = height - top - bottom;

  const values = [...points.map((p) => p.kg), goal];
  const lo = Math.floor(Math.min(...values) - 1);
  const hi = Math.ceil(Math.max(...values) + 1);
  const step = niceStep(hi - lo);
  const yMin = Math.floor(lo / step) * step;
  const yMax = Math.ceil(hi / step) * step;
  const y = (v: number) => top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10);

  const t0 = points[0]?.date.getTime() ?? 0;
  const t1 = points[points.length - 1]?.date.getTime() ?? 0;
  const plotW = Math.max(0, width - AXIS_W - right);
  const x = (d: Date) => (t1 === t0 ? AXIS_W + plotW / 2 : AXIS_W + ((d.getTime() - t0) / (t1 - t0)) * plotW);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date)},${y(p.kg)}`).join(' ');
  const last = points[points.length - 1];
  const sel = selected !== null ? points[selected] : null;

  return (
    <View onLayout={onLayout} accessibilityLabel={points.map((p) => p.detail).join(', ')}>
      {width > 0 && last && (
        <Svg width={width} height={height}>
          {ticks.map((tv) => (
            <Line key={tv} x1={AXIS_W} x2={width - right} y1={y(tv)} y2={y(tv)} stroke={c.grid} strokeWidth={1} />
          ))}
          {ticks.map((tv) => (
            <SvgText fontFamily={FONT_FAMILY} key={`l${tv}`} x={AXIS_W - 6} y={y(tv) + 4} fontSize={FONT} fill={c.textSecondary} textAnchor="end">
              {formatKg(tv)}
            </SvgText>
          ))}
          <Line x1={AXIS_W} x2={width - right} y1={y(goal)} y2={y(goal)} stroke={c.text} strokeWidth={1} opacity={0.6} />
          <SvgText fontFamily={FONT_FAMILY} x={AXIS_W + 4} y={y(goal) - 5} fontSize={FONT} fill={c.textSecondary}>
            {goalLabel}
          </SvgText>
          {points.length > 1 && (
            <Path d={path} stroke={c.chart} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {/* End dot with a surface-colored ring, plus its value. */}
          <Circle cx={x(last.date)} cy={y(last.kg)} r={6} fill={c.card} />
          <Circle cx={x(last.date)} cy={y(last.kg)} r={4.5} fill={c.chart} />
          <SvgText
              fontFamily={FONT_FAMILY}
            x={Math.min(x(last.date), width - right)}
            y={y(last.kg) - 10}
            fontSize={12}
            fontWeight="700"
            fill={c.text}
            textAnchor="end">
            {formatKg(last.kg)} kg
          </SvgText>
          {sel && sel !== last && (
            <>
              <Circle cx={x(sel.date)} cy={y(sel.kg)} r={6} fill={c.card} />
              <Circle cx={x(sel.date)} cy={y(sel.kg)} r={4.5} fill={c.chart} />
              <SvgText fontFamily={FONT_FAMILY} x={x(sel.date)} y={y(sel.kg) - 10} fontSize={12} fontWeight="700" fill={c.text} textAnchor="middle">
                {formatKg(sel.kg)} kg
              </SvgText>
            </>
          )}
          <SvgText fontFamily={FONT_FAMILY} x={AXIS_W} y={height - 6} fontSize={FONT} fill={c.textSecondary}>
            {formatDate(points[0].date)}
          </SvgText>
          {points.length > 1 && (
            <SvgText fontFamily={FONT_FAMILY} x={width - right} y={height - 6} fontSize={FONT} fill={c.textSecondary} textAnchor="end">
              {formatDate(last.date)}
            </SvgText>
          )}
        </Svg>
      )}
      {width > 0 && points.length > 1 && (
        <View style={[StyleSheet.absoluteFill, styles.hitRow, { left: AXIS_W, right }]}>
          {points.map((p, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={p.detail}
              style={styles.hit}
              onPress={() => setSelected(selected === i ? null : i)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hitRow: { flexDirection: 'row' },
  hit: { flex: 1 },
});
