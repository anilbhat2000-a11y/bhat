"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SubjectBarChart({ data }: { data: { subject: string; active: number; expired: number }[] }) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="active" name="Active" fill="#2b6cb0" />
          <Bar dataKey="expired" name="Expired" fill="#a0aec0" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
