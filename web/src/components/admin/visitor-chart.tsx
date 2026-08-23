"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// 방문자 일별 추이(대표님 — shadcn/recharts 예쁜 그래프). 순방문자 막대 + 툴팁에
// 페이지뷰 병기. 어드민 대시보드에서만 import 되어 recharts 번들은 어드민 청크에
// 격리된다. 크림 브랜드 톤(먹색 막대·옅은 그리드·크림 툴팁), RevenueChart 와 통일.
export type VisitDay = { day: string; views: number; visitors: number };

function dayLabel(day: string): string {
  const weekday = new Date(day).toLocaleDateString("ko-KR", {
    weekday: "short",
    timeZone: "Asia/Seoul",
  });
  return `${day.slice(5).replace("-", "/")} (${weekday})`;
}

type TooltipEntry = { payload: VisitDay };

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
        방문자 <span className="font-medium text-wabi-fg">{d.visitors}명</span>
      </p>
      <p className="text-wabi-fg-muted">
        페이지뷰 <span className="font-medium text-wabi-fg">{d.views}회</span>
      </p>
    </div>
  );
}

export function VisitorChart({ trend }: { trend: VisitDay[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d7cfc1" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => d.slice(5).replace("-", "/")}
            tick={{ fill: "#6b6353", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#d7cfc1" }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#6b6353", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "#423c30", fillOpacity: 0.06 }}
          />
          <Bar
            dataKey="visitors"
            fill="#423c30"
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
