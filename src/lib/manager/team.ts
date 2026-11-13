import { prisma } from "../db/client";
import { AuthError, canViewUser } from "../auth/guards";
import { reportingLineIds } from "../auth/scope";
import type { SessionUser } from "../auth/session";
import { courseProgressPercent } from "../learning/progress";
import { isActive } from "../assessments/certifications";

// Everyone in the manager's reporting line, direct and indirect. Admins see all users.
export async function teamMembers(viewer: SessionUser) {
  const all = await prisma.user.findMany({ select: { id: true, managerId: true, name: true, email: true, department: true, role: true, active: true } });
  const ids = viewer.role === "ADMIN" ? all.map((u) => u.id) : [...reportingLineIds(viewer.id, all)];
  return all
    .filter((u) => ids.includes(u.id))
    .map((u) => ({ id: u.id, name: u.name, email: u.email, department: u.department, role: u.role, active: u.active }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The learning record of one member. Refused with AuthError(403) outside the viewer's scope.
export async function memberDetail(viewer: SessionUser, userId: string) {
  const all = await prisma.user.findMany({ select: { id: true, managerId: true } });
  if (!canViewUser(viewer, userId, all)) throw new AuthError(403);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthError(403);

  const now = new Date();
  const [courses, attempts, certs, periods] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      include: { lessons: { select: { id: true } }, progress: { where: { userId } } },
      orderBy: { title: "asc" },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId },
      include: { period: { include: { assessment: true } } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.certification.findMany({ where: { userId }, include: { subject: true }, orderBy: { issuedAt: "desc" } }),
    prisma.assessmentPeriod.findMany({ where: { userId, status: "OVERDUE" }, include: { assessment: true } }),
  ]);

  const profileRows = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profileSkills: { include: { subject: true } },
      profileEducation: true,
      profileExperience: true,
      profileExternalCerts: true,
      profileLanguages: true,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    profile: {
      skills: (profileRows?.profileSkills ?? []).map((s) => ({ subject: s.subject.name, rating: s.selfRating })),
      education: (profileRows?.profileEducation ?? []).map((e) => ({ institution: e.institution, qualification: e.qualification, fieldOfStudy: e.fieldOfStudy, startYear: e.startYear, endYear: e.endYear })),
      experience: (profileRows?.profileExperience ?? []).map((e) => ({ company: e.company, jobTitle: e.jobTitle, startMonth: e.startMonth, endMonth: e.endMonth, description: e.description })),
      externalCertifications: (profileRows?.profileExternalCerts ?? []).map((c) => ({ name: c.name, issuingBody: c.issuingBody, issuedOn: c.issuedOn, proofUrl: c.proofUrl })),
      languages: (profileRows?.profileLanguages ?? []).map((l) => ({ language: l.language, level: l.level })),
    },
    courses: courses.map((c) => {
      const completed = (c.progress[0]?.completedLessonIds as string[] | undefined) ?? [];
      const lessonIds = c.lessons.map((l) => l.id);
      return { title: c.title, percent: courseProgressPercent(lessonIds.length, completed, lessonIds) };
    }),
    attempts: attempts
      .filter((a) => a.status !== "IN_PROGRESS")
      .map((a) => ({
        assessment: a.period.assessment.title,
        periodKey: a.period.periodKey,
        scorePercent: a.scorePercent,
        passed: a.passed,
        status: a.status,
        proctorFlags: ((a.proctorEvents as unknown[] | null) ?? []).length,
      })),
    certifications: certs.map((c) => ({
      subject: c.subject.name,
      level: c.level,
      expiresAt: c.expiresAt,
      active: isActive({ expiresAt: c.expiresAt }, now),
    })),
    overdue: periods.map((p) => ({ assessment: p.assessment.title, periodKey: p.periodKey })),
  };
}


// Per team member: courses completed out of the published courses, as a percentage.
export async function teamCompletion(viewer: SessionUser) {
  const members = await teamMembers(viewer);
  const published = await prisma.course.count({ where: { status: "PUBLISHED" } });
  const progress = await prisma.courseProgress.findMany({
    where: { userId: { in: members.map((m) => m.id) }, completedAt: { not: null } },
    select: { userId: true },
  });
  return members.map((m) => {
    const completed = progress.filter((p) => p.userId === m.id).length;
    return {
      id: m.id,
      name: m.name,
      completed,
      published,
      percent: published === 0 ? 0 : Math.round((completed / published) * 100),
    };
  });
}
