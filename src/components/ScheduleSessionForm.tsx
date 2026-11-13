"use client";

import { scheduleSessionAction } from "../app/actions/live";

// The admin types times in their own zone. The browser converts them to UTC instants before
// the form is sent, so the server never guesses the zone.
export function ScheduleSessionForm({ lessonId, instructors }: { lessonId: string; instructors: { id: string; name: string; location: string | null }[] }) {
  function toIso(form: HTMLFormElement, field: string, hidden: string) {
    const raw = (form.elements.namedItem(field) as HTMLInputElement | null)?.value;
    const target = form.elements.namedItem(hidden) as HTMLInputElement | null;
    if (raw && target) target.value = new Date(raw).toISOString();
  }
  return (
    <form
      action={scheduleSessionAction}
      onSubmit={(e) => {
        const form = e.currentTarget;
        toIso(form, "startsAt", "startsAtIso");
        toIso(form, "endsAt", "endsAtIso");
      }}
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="startsAtIso" defaultValue="" />
      <input type="hidden" name="endsAtIso" defaultValue="" />
      <label>Starts (your time) <input name="startsAt" type="datetime-local" required /></label> to{" "}
      <label>Ends (your time) <input name="endsAt" type="datetime-local" required /></label>{" "}
      <label>Meeting link <input name="meetingUrl" type="url" placeholder="https://meeting link" required /></label>{" "}
      <label>Capacity <input name="capacity" type="number" min={0} placeholder="Capacity (optional)" /></label>
      <fieldset>
        <legend>Instructors</legend>
        {instructors.map((i) => (
          <label key={i.id}><input type="checkbox" name="instructorIds" value={i.id} /> {i.name} ({i.location ?? "location not set"})</label>
        ))}
      </fieldset>
      <button type="submit">Save session</button>
    </form>
  );
}
