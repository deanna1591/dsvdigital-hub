"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "Operations", icon: "🛠️" },
    { href: "/admin/team", label: "Team", icon: "👥" },
    { href: "/admin/sparks", label: "Sparks", icon: "✨" },
    { href: "/admin/bingo", label: "Bingo", icon: "🎲" },
    { href: "/admin/missions", label: "Missions", icon: "⚡" },
    { href: "/admin/catalog", label: "Catalog", icon: "💸" },
  ];

  return (
    <div className="flex gap-1 sm:gap-2 border-b-[1.5px] border-graphite -mb-[1.5px] overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 sm:px-5 py-3 text-sm font-bold border-b-[3px] -mb-[1.5px] transition-all whitespace-nowrap ${
              isActive ? "text-graphite border-lavender" : "text-ink-soft border-transparent hover:text-graphite hover:border-line"
            }`}
          >
            {tab.icon} {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
