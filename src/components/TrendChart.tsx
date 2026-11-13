"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Course completions per month. The same numbers are in the table beside it.
export function TrendChart({ data }: { data: { month: string; completions: number }[] }) {
  return (
    <div style={{ width: "100%", maxWidth: 640, height: 240 }} aria-hidden="true">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="completions" name="Completions" stroke="#2b6cb0" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
