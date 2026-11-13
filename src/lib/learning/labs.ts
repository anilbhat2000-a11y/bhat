import { prisma } from "../db/client";
import { completeLessonForUser } from "./progress";

export type LabItem = { id: string; text: string };

// Each '- [ ] text' line in a lab body is one checklist item, numbered from 1.
export function parseLabChecklist(body: string): LabItem[] {
  const items: LabItem[] = [];
  for (const line of body.split(/\r?\n/)) {
    const match = /^\s*-\s\[\s\]\s+(.+?)\s*$/.exec(line);
    if (match) items.push({ id: `item-${items.length + 1}`, text: match[1] });
  }
  return items;
}

// A lab is complete when every item is checked. Unknown ids are ignored, and a lab with
// no items is never complete.
export function labComplete(items: LabItem[], checkedIds: string[]): boolean {
  if (items.length === 0) return false;
  const checked = new Set(checkedIds);
  return items.every((i) => checked.has(i.id));
}

// Stores the learner's checks. When the last item is checked, the lesson completes
// under the usual order rule.
export async function saveLabProgress(
  lessonId: string,
  userId: string,
  checkedIds: string[],
): Promise<{ complete: boolean; error?: string }> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.type !== "LAB") return { complete: false, error: "Not a lab lesson" };
  const items = parseLabChecklist(lesson.body ?? "");
  const known = new Set(items.map((i) => i.id));
  const kept = [...new Set(checkedIds)].filter((id) => known.has(id));

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, checkedItemIds: kept },
    update: { checkedItemIds: kept },
  });

  const complete = labComplete(items, kept);
  if (complete) {
    const result = await completeLessonForUser(userId, lessonId);
    if (!result.ok) return { complete: false, error: result.error };
  }
  return { complete };
}
