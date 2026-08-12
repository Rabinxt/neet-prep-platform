import type { TrendPoint } from "@/server/analytics/types";

const WIDTH = 620;
const HEIGHT = 180;
const LEFT = 36;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 34;

export function PerformanceTrend({ points }: { points: TrendPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="mt-6 border-l-2 border-emerald-200 bg-emerald-50/70 px-4 py-5">
        <p className="font-semibold text-emerald-950">A trend needs at least two completed attempts.</p>
        <p className="mt-1 text-sm leading-6 text-emerald-800">Complete another Practice session or Mock Test to see how your accuracy changes over time.</p>
      </div>
    );
  }

  const chartWidth = WIDTH - LEFT - RIGHT;
  const chartHeight = HEIGHT - TOP - BOTTOM;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: LEFT + (index * chartWidth) / (points.length - 1),
    y: TOP + chartHeight - (point.accuracy / 100) * chartHeight,
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const description = coordinates
    .map((point, index) => `Attempt ${index + 1}: ${point.accuracy}%`)
    .join(", ");

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Accuracy trend. ${description}`}
      >
        <defs>
          <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((value) => {
          const y = TOP + chartHeight - (value / 100) * chartHeight;
          return (
            <g key={value}>
              <line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />
              <text x={LEFT - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{value}%</text>
            </g>
          );
        })}
        <path
          d={`M ${coordinates[0].x} ${TOP + chartHeight} L ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${coordinates.at(-1)!.x} ${TOP + chartHeight} Z`}
          fill="url(#trend-area)"
        />
        <polyline className="trend-line" points={polyline} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point, index) => (
          <g key={point.id}>
            <circle className="trend-point" style={{ animationDelay: `${180 + index * 55}ms` }} cx={point.x} cy={point.y} r="5" fill="white" stroke="#059669" strokeWidth="3" />
            <text x={point.x} y={HEIGHT - 10} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold">{index + 1}</text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-2" aria-hidden="true">
        {points.map((point, index) => (
          <span key={point.id} className="text-xs text-slate-500">
            <strong className="text-slate-700">{index + 1}</strong> · {point.type === "PRACTICE" ? "Practice" : "Mock"} · {point.accuracy}%
          </span>
        ))}
      </div>
    </div>
  );
}
