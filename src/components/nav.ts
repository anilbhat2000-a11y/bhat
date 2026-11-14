// Menu items for each portal. Icons are drawn by Icon.tsx (inline SVG, no web fonts).
export type IconName =
  | "home" | "chart" | "users" | "book" | "layers" | "check" | "inbox" | "person" | "megaphone"
  | "shield" | "search" | "award" | "grid" | "calendar" | "id" | "list";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: Record<"admin" | "manager" | "learn", NavGroup[]> = {
  admin: [
    { label: "Overview", items: [
      { href: "/admin", label: "Home", icon: "home", exact: true },
      { href: "/admin/dashboard", label: "Dashboard", icon: "chart" },
    ] },
    { label: "Learning", items: [
      { href: "/admin/subjects", label: "Subjects", icon: "layers" },
      { href: "/admin/courses", label: "Courses", icon: "book" },
      { href: "/admin/assessments", label: "Assessments", icon: "check" },
      { href: "/admin/grading", label: "Grading queue", icon: "inbox" },
      { href: "/admin/instructors", label: "Instructors", icon: "person" },
    ] },
    { label: "Organisation", items: [
      { href: "/admin/users", label: "Users", icon: "users" },
      { href: "/admin/announcements", label: "Announcements", icon: "megaphone" },
      { href: "/admin/audit", label: "Audit log", icon: "shield" },
    ] },
  ],
  manager: [
    { label: "My team", items: [
      { href: "/manager/team", label: "Team members", icon: "users", exact: true },
      { href: "/manager/team/summary", label: "Team summary", icon: "grid" },
      { href: "/manager/sessions", label: "Team sessions", icon: "calendar" },
    ] },
  ],
  learn: [
    { label: "Learning", items: [
      { href: "/learn", label: "Home", icon: "home", exact: true },
      { href: "/learn/catalogue", label: "Catalogue", icon: "book" },
      { href: "/learn/assessments", label: "Assessments", icon: "check" },
      { href: "/learn/certifications", label: "Certificates", icon: "award" },
    ] },
    { label: "Me", items: [
      { href: "/learn/search", label: "Search", icon: "search" },
      { href: "/learn/profile", label: "Profile", icon: "id" },
    ] },
  ],
};
