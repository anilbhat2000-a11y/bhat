// Whole seconds from now until the end, never below zero. Used for attempt countdowns.
export function remainingSeconds(end: Date, now: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 1000));
}
