import { prisma } from "../lib/db/client";
import { assignedUserIds } from "../lib/assessments/open-periods";
import { EmployeePicker } from "./EmployeePicker";
import { addAssignmentsAction, removeAssignmentAction } from "../app/actions/assessments";

// Assign an assessment to employees, departments or everyone, and see or remove current
// assignments. Used on the assessments table (Assign) and on each assessment's page.
export async function AssessmentAssignPanel({ assessmentId, returnTo, cancelHref }: { assessmentId: string; returnTo: string; cancelHref?: string }) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { assignments: true, subject: { select: { name: true } } } });
  if (!assessment) return null;
  const [people, covered] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, department: true, jobTitle: true } }),
    assignedUserIds(assessment.assignments),
  ]);
  const coveredSet = new Set(covered);
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  const departments = [...new Set(people.map((p) => p.department).filter((d): d is string => !!d))].sort();
  const deptAssigned = new Set(assessment.assignments.filter((a) => a.targetType === "DEPARTMENT").map((a) => a.targetValue));
  const everyone = assessment.assignments.some((a) => a.targetType === "ALL");
  const label = (a: (typeof assessment.assignments)[number]) =>
    a.targetType === "ALL" ? "Everyone" : a.targetType === "DEPARTMENT" ? `Department: ${a.targetValue}` : `${nameOf.get(a.targetValue ?? "") ?? "Removed user"}`;

  return (
    <section className="card assign-panel" aria-labelledby={`h-assign-${assessment.id}`} id="assign">
      <div className="assign-head">
        <div>
          <h2 id={`h-assign-${assessment.id}`}>Assign to employees</h2>
          <p className="muted"><strong className="assign-title">{assessment.title}</strong> · {assessment.subject.name} · {covered.length} employee{covered.length === 1 ? "" : "s"} assigned now.{assessment.published ? " New employees get the assessment straight away on their home page." : " This assessment is a draft: employees see it once it is published."}</p>
        </div>
        {cancelHref ? <a href={cancelHref} className="btn-outline">Close</a> : null}
      </div>

      <div className="assign-current">
        <h3>Currently assigned</h3>
        {assessment.assignments.length === 0 ? <p className="muted">Nobody yet.</p> : (
          <ul className="assign-chips">
            {assessment.assignments.map((a) => (
              <li key={a.id}>
                <span>{label(a)}</span>
                <form action={removeAssignmentAction} className="inline-form">
                  <input type="hidden" name="assessmentId" value={assessment.id} />
                  <input type="hidden" name="assignmentId" value={a.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button type="submit" className="chip-x" aria-label={`Remove ${label(a)}`} title="Remove">×</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={addAssignmentsAction} data-test="assign-assessment" className="assign-form">
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <div className="assign-cols">
          <fieldset className="assign-people">
            <legend>Employees</legend>
            <EmployeePicker people={people.map((p) => ({ ...p, assigned: coveredSet.has(p.id) }))} />
          </fieldset>
          <fieldset className="assign-groups">
            <legend>Or whole groups</legend>
            <div className="check-grid" style={{ gridTemplateColumns: "1fr" }}>
              {departments.map((d) => (
                <label key={d}><input type="checkbox" name="department" value={d} disabled={deptAssigned.has(d) || everyone} defaultChecked={deptAssigned.has(d)} /> {d}{deptAssigned.has(d) ? " (assigned)" : ""}</label>
              ))}
              <label className="assign-everyone"><input type="checkbox" name="everyone" disabled={everyone} defaultChecked={everyone} /> Everyone in the company{everyone ? " (assigned)" : ""}</label>
            </div>
            <p className="muted small-note">Department assignments include people who join that department later.</p>
          </fieldset>
        </div>
        <div className="form-actions"><button type="submit" className="btn-primary">Assign</button></div>
      </form>
    </section>
  );
}
