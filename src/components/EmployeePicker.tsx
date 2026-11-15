"use client";

import { useMemo, useState } from "react";

type Person = { id: string; name: string; email: string; department: string | null; jobTitle: string | null; assigned: boolean };

// A searchable list of employees with tick boxes. Without JavaScript the full list still
// shows and works; the search box only filters what is visible.
export function EmployeePicker({ people, name = "userId" }: { people: Person[]; name?: string }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const needle = q.trim().toLowerCase();
  const visible = useMemo(
    () => people.filter((p) => !needle || `${p.name} ${p.email} ${p.department ?? ""} ${p.jobTitle ?? ""}`.toLowerCase().includes(needle)),
    [people, needle],
  );
  const toggle = (id: string, on: boolean) => setPicked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const selectVisible = () => setPicked((s) => { const n = new Set(s); for (const p of visible) if (!p.assigned) n.add(p.id); return n; });

  return (
    <div className="picker">
      <div className="picker-bar">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, department or job title" aria-label="Search employees" />
        <button type="button" className="btn-ghost" onClick={selectVisible}>Select all shown</button>
        <button type="button" className="btn-ghost" onClick={() => setPicked(new Set())}>Clear</button>
        <span className="picker-count" aria-live="polite">{picked.size} selected</span>
      </div>
      <ul className="picker-list" role="list">
        {people.map((p) => {
          const shown = visible.includes(p);
          return (
            <li key={p.id} hidden={!shown}>
              <label className={p.assigned ? "picker-item is-assigned" : "picker-item"}>
                <input type="checkbox" name={name} value={p.id} disabled={p.assigned} checked={p.assigned || picked.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} />
                <span className="picker-who">
                  <strong>{p.name}</strong>
                  <span>{[p.jobTitle, p.department].filter(Boolean).join(" · ") || p.email}</span>
                </span>
                {p.assigned ? <span className="picker-tag">Already assigned</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 ? <p className="muted">No employees match “{q}”.</p> : null}
    </div>
  );
}
