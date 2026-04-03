import { cn } from "@/lib/utils";

/** Shared tooltip style for all charts — CoinGecko / crypto-analytics inspired */
export const aestheticTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 11,
  boxShadow: "0 8px 32px -4px rgba(0,0,0,0.12), 0 2px 8px -2px rgba(0,0,0,0.08)",
  padding: "8px 12px",
};

export const aestheticAxisTick = {
  fontSize: 10,
  fill: "hsl(var(--muted-foreground))",
  fontFamily: "'Inter', sans-serif",
};

export const aestheticGridStyle = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--border))",
  opacity: 0.4,
};

/** Gradient definition helper for consistent chart gradients */
export function ChartGradient({
  id,
  color,
  opacity = 0.35,
}: {
  id: string;
  color: string;
  opacity?: number;
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={opacity} />
      <stop offset="50%" stopColor={color} stopOpacity={opacity * 0.4} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}
