"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { NAV } from "./nav";

// The left-hand menu. The current page is highlighted and marked aria-current for screen
// readers. On narrow screens the menu becomes a scrolling row under the top bar.
export function SideNav({ portal }: { portal: keyof typeof NAV }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <nav className="sidenav" aria-label="Portal menu">
      {NAV[portal].map((group) => (
        <div key={group.label} className="sidenav-group">
          <p className="sidenav-label">{group.label}</p>
          <ul>
            {group.items.map((item) => {
              const on = active(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link href={item.href} className={on ? "sidenav-link is-active" : "sidenav-link"} aria-current={on ? "page" : undefined}>
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
