type ChartVariant = "cyan" | "blue" | "green" | "yellow" | "red" | "purple" | "primary";

type LineChartSeries = {
  label: string;
  data: number[];
  variant?: ChartVariant;
};

export type LineChartProps = {
  series: LineChartSeries[];
  labels?: string[];
  variant?: ChartVariant;
  height?: number;
  showDots?: boolean;
  showGrid?: boolean;
  showArea?: boolean;
  formatValue?: (value: number) => string;
};

const variantColors: Record<ChartVariant, { stroke: string; fill: string }> = {
  cyan: { stroke: "var(--color-hud-cyan)", fill: "var(--color-hud-cyan)" },
  blue: { stroke: "var(--color-hud-blue)", fill: "var(--color-hud-blue)" },
  green: { stroke: "var(--color-hud-green)", fill: "var(--color-hud-green)" },
  yellow: { stroke: "var(--color-hud-yellow)", fill: "var(--color-hud-yellow)" },
  red: { stroke: "var(--color-hud-red)", fill: "var(--color-hud-red)" },
  purple: { stroke: "var(--color-hud-purple)", fill: "var(--color-hud-purple)" },
  primary: { stroke: "var(--color-hud-primary)", fill: "var(--color-hud-primary)" },
};

export function LineChart({
  series,
  labels,
  variant = "cyan",
  height,
  showDots = false,
  showGrid = true,
  showArea = true,
  formatValue,
}: LineChartProps) {
  const viewBoxWidth = 800;
  const viewBoxHeight = height || 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 56 };
  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.data).filter((v) => Number.isFinite(v));
  const dataMin = allValues.length ? Math.min(...allValues) : 0;
  const dataMax = allValues.length ? Math.max(...allValues) : 1;
  const range = dataMax - dataMin || 1;
  const minValue = dataMin - range * 0.05;
  const maxValue = dataMax + range * 0.05;
  const valueRange = maxValue - minValue || 1;

  const maxPoints = Math.max(...series.map((s) => s.data.length), 1);

  const getX = (index: number) =>
    padding.left + (index / (maxPoints - 1 || 1)) * chartWidth;
  const getY = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const gridLines = 4;
  const gridValues = Array.from(
    { length: gridLines },
    (_, i) => minValue + (valueRange / (gridLines - 1)) * i,
  );

  const formatLabel =
    formatValue ||
    ((v: number) => {
      if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
      return v.toFixed(0);
    });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="block"
      aria-hidden="true"
    >
      {showGrid && (
        <g>
          {gridValues.map((value, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={getY(value)}
                x2={viewBoxWidth - padding.right}
                y2={getY(value)}
                stroke="currentColor"
                className="text-hud-border"
                strokeWidth={0.5}
                opacity={0.3}
              />
              <text
                x={padding.left - 8}
                y={getY(value)}
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
                className="text-hud-text-dim"
                fontSize={12}
              >
                {formatLabel(value)}
              </text>
            </g>
          ))}
        </g>
      )}

      {labels && (
        <g>
          {labels
            .filter((_, i) => i % Math.ceil(labels.length / 5) === 0)
            .map((label, i) => {
              const actualIndex = i * Math.ceil(labels.length / 5);
              return (
                <text
                  key={i}
                  x={getX(actualIndex)}
                  y={viewBoxHeight - 8}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-hud-text-dim"
                  fontSize={12}
                >
                  {label}
                </text>
              );
            })}
        </g>
      )}

      {series.map((s, seriesIndex) => {
        const colors = variantColors[s.variant ?? variant];
        const points = s.data
          .map((value, i) => ({ x: getX(i), y: getY(value) }))
          .filter((p) => Number.isFinite(p.y) && Number.isFinite(p.x));

        if (points.length === 0) return null;

        const pathD = points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ");
        const areaD = `${pathD} L ${points[points.length - 1]?.x ?? 0} ${padding.top + chartHeight} L ${points[0]?.x ?? 0} ${padding.top + chartHeight} Z`;

        return (
          <g key={seriesIndex}>
            {showArea && (
              <defs>
                <linearGradient
                  id={`hud-area-gradient-${seriesIndex}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={colors.fill} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
            )}

            {showArea && (
              <path
                d={areaD}
                fill={`url(#hud-area-gradient-${seriesIndex})`}
              />
            )}

            <path
              d={pathD}
              fill="none"
              stroke={colors.stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />

            {showDots &&
              points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={2}
                  fill={colors.fill}
                  opacity={0.8}
                />
              ))}
          </g>
        );
      })}
    </svg>
  );
}

