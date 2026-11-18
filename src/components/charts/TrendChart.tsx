"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { shortMonthLabel } from "@/lib/dates";
import { formatMoney, fromPaise } from "@/lib/money";
import type { MonthlyPoint } from "@/lib/types";

export function TrendChart({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((point) => ({
    label: shortMonthLabel(point.month),
    income: fromPaise(point.income),
    expense: fromPaise(point.expense),
  }));

  return (
    <div className="chart chart--trend">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f7d68" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#2f7d68" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d48b3a" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#d48b3a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e6e9e4" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#77827b", fontSize: 11 }}
            dy={6}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMoney(Number(value) * 100),
              name === "income" ? "Income" : "Spent",
            ]}
            contentStyle={{
              border: "1px solid #dfe4dd",
              borderRadius: 8,
              boxShadow: "none",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#2f7d68"
            strokeWidth={2}
            fill="url(#incomeFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#d48b3a"
            strokeWidth={2}
            fill="url(#expenseFill)"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
