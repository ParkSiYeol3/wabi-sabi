"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { won } from "@/lib/orders";

// 최근 7일 매출 차트 (#239) — CSS 막대를 recharts AreaChart 로 교체.
// 그라데이션 채움 + 진입 애니메이션(그려지듯 자라남). 어드민 대시보드에서만
// import 되므로 recharts 번들은 어드민 청크에 격리된다(고객 페이지 무영향).
// 크림 브랜드 톤: 먹색(#423c30) 선/채움, 옅은 그리드, 크림 카드 툴팁.

type TrendDay = { day: string; orders: number; revenue: number };

// 만원 단위 축약 — Y축 눈금용(1,250,000 은 좁은 축에 안 들어간다).
function compactWon(n: number): string {
  if (n === 0) return "0";
  if (n < 10_000) return n.toLocaleString("ko-KR");
  const man = n / 10_000;
  return `${man >= 100 ? Math.round(man).toLocaleString("ko-KR") : man.toFixed(man % 1 === 0 ? 0 : 1)}만`;
}

// "YYYY-MM-DD"(KST 일자) → "MM/DD (요일)". UTC 자정 파싱이라도 KST 로는 같은 날짜.
function dayLabel(day: string): string {
  const weekday = new Date(day).toLocaleDateString("ko-KR", {
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
  return `${day.slice(5).replace("-", "/")} (${weekday})`;
}

type TooltipEntry = { payload: TrendDay };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-wabi-border bg-wabi-bg px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-wabi-fg">{dayLabel(d.day)}</p>
      <p className="mt-1 text-wabi-fg-muted">
        매출 <span className="font-medium text-wabi-fg">{won(d.revenue)}</span>
      </p>
      <p className="text-wabi-fg-muted">
        주문 <span className="font-medium text-wabi-fg">{d.orders}건</span>
      </p>
    </div>
  );
}

export function RevenueChart({ trend }: { trend: TrendDay[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#423c30" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#423c30" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d7cfc1"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
            tick={{ fill: "#6b6353", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#d7cfc1" }}
          />
          <YAxis
            tickFormatter={compactWon}
            tick={{ fill: "#6b6353", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#423c30", strokeOpacity: 0.2 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#423c30"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={{ r: 3, fill: "#423c30" }}
            activeDot={{ r: 5, fill: "#423c30" }}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
