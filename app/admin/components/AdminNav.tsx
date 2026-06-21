"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "Operations" },
    { href: "/admin/missions", label: "Missions" },
    { href: "/admin/catalog", label: "Catalog" },
  ];

  return (
    <div className="flex gap-1 border-b-[1.5px] border-ink -mb-[1.5px]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-5 py-3 text-sm font-semibold border-b-[3px] -mb-[1.5px] transition-colors ${
              isActive ? "text-ink border-accent-2" : "text-ink-soft border-transparent hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
