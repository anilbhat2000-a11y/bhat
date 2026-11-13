"use client";

import { useState } from "react";
import { reorderLessonsAction } from "../app/actions/courses";
import { moveLessonAction } from "../app/actions/courses";

type Item = { id: string; title: string; type: string };

// Drag a lesson onto another to move it there. Up and Down buttons remain for keyboard use.
export function LessonReorder({ courseId, lessons }: { courseId: string; lessons: Item[] }) {
  const [items, setItems] = useState(lessons);
  const [dragging, setDragging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function drop(targetId: string) {
    if (!dragging || dragging === targetId) return;
    const from = items.findIndex((i) => i.id === dragging);
    const to = items.findIndex((i) => i.id === targetId);
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragging(null);
    const result = await reorderLessonsAction(courseId, next.map((i) => i.id));
    if (!result.ok) {
      setError(result.error ?? "Could not save the order");
      setItems(lessons);
    }
  }

  return (
    <>
      {error ? <p role="alert">{error}</p> : null}
      <ol data-test="lesson-list">
        {items.map((l) => (
          <li
            key={l.id}
            data-lesson-title={l.title}
            draggable
            onDragStart={() => setDragging(l.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void drop(l.id);
            }}
          >
            {l.title} <small>({l.type})</small>{" "}
            <form action={moveLessonAction} style={{ display: "inline" }}>
              <input type="hidden" name="lessonId" value={l.id} />
              <button name="direction" value="up" type="submit">Up</button>
              <button name="direction" value="down" type="submit">Down</button>
            </form>
          </li>
        ))}
      </ol>
    </>
  );
}
