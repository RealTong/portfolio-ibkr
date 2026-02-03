export type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  positiveColor?: string;
  negativeColor?: string;
  className?: string;
};

export function Sparkline({
  data,
  width = 60,
  height = 20,
  positiveColor = "var(--color-hud-success)",
  negativeColor = "var(--color-hud-error)",
}: SparklineProps) {
  if (data.length < 2) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const valueRange = maxValue - minValue || 1;

  const points = data.map((value, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((value - minValue) / valueRange) * chartHeight,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const isPositive = data[data.length - 1] >= data[0];
  const stroke = isPositive ? positiveColor : negativeColor;

  return (
    <svg width={width} height={height} aria-hidden="true">
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

