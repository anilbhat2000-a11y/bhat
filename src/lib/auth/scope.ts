export type UserRef = { id: string; managerId: string | null };

// Everyone below the manager in the reporting tree: direct and indirect reports.
// The walk never revisits a user, so a manager cycle terminates.
export function reportingLineIds(managerId: string, users: UserRef[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const u of users) {
    if (!u.managerId) continue;
    const list = children.get(u.managerId) ?? [];
    list.push(u.id);
    children.set(u.managerId, list);
  }

  const result = new Set<string>();
  const seen = new Set<string>([managerId]);
  const queue = [managerId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const child of children.get(current) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      result.add(child);
      queue.push(child);
    }
  }
  return result;
}
