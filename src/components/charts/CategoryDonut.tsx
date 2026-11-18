"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colorForCategory } from "@/lib/categories";
import { formatCompact, formatMoney, fromPaise } from "@/lib/money";
import type { CategoryTotal } from "@/lib/types";

export function CategoryDonut({ data, total }: { data: CategoryTotal[]; total: number }) {
  const chartData = data.map((item) => ({ ...item, value: fromPaise(item.amount) }));

  if (chartData.length === 0) {
    return <div className="chart chart--empty">Add an expense to see the split.</div>;
  }

  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((item) => (
                <Cell key={item.category} fill={colorForCategory(item.category)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, entry) => [
                formatMoney(Number(value) * 100),
                (entry?.payload as { category?: string })?.category ?? "",
              ]}
              contentStyle={{
                border: "1px solid #dfe4dd",
                borderRadius: 8,
                boxShadow: "none",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut__center">
          <span>Total spent</span>
          <strong>{formatCompact(total)}</strong>
        </div>
      </div>
      <ul className="legend">
        {chartData.slice(0, 6).map((item) => (
          <li key={item.category}>
            <span className="legend__dot" style={{ background: colorForCategory(item.category) }} />
            <span className="legend__name">{item.category}</span>
            <strong>{formatCompact(item.amount)}</strong>
          </li>
        ))}
        {chartData.length > 6 && (
          <li className="legend__more">+ {chartData.length - 6} more categories</li>
        )}
      </ul>
    </div>
  );
}
