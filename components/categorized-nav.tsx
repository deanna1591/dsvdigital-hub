"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SubTab = { href: string; label: string };
type Category = {
  key: string;
  label: string;
  href: string;        // default landing route for this category
  subtabs: SubTab[];
};

const CATEGORIES: Category[] = [
  {
    key: "today",
    label: "✨ Today",
    href: "/today",
    subtabs: [], // no sub-tabs, just the one page
  },
  {
    key: "fun",
    label: "💿 Fun Stuff",
    href: "/fun/slots",
    subtabs: [
      { href: "/fun/slots",      label: "💿 Slots" },
      { href: "/fun/wheel",      label: "🪩 Spin Wheel" },
      { href: "/fun/photobooth", label: "📸 Photobooth" },
      { href: "/fun/music",      label: "📼 Music" },
    ],
  },
  {
    key: "wellness",
    label: "🪩 Wellness",
    href: "/wellness/mood",
    subtabs: [
      { href: "/wellness/mood",   label: "🌷 Mood" },
      { href: "/wellness/habits", label: "🌱 Habits" },
      { href: "/wellness/tasks",  label: "💌 Tasks" },
    ],
  },
  {
    key: "achievements",
    label: "⭐ Achievements",
    href: "/achievements/bingo",
    subtabs: [
      { href: "/achievements/bingo",    label: "🎲 Bingo" },
      { href: "/achievements/missions", label: "⚡ Missions" },
      { href: "/achievements/feed",     label: "📺 Feed" },
    ],
  },
  {
    key: "rewards",
    label: "💸 Rewards",
    href: "/rewards/catalog",
    subtabs: [
      { href: "/rewards/catalog", label: "🛍️ Catalog" },
      { href: "/rewards/orders",  label: "📦 Orders" },
      { href: "/rewards/points",  label: "📊 My Points" },
    ],
  },
];

export default function CategorizedNav() {
  const pathname = usePathname();

  // Figure out the active category based on the URL prefix
  const activeCategory = CATEGORIES.find((c) =>
    c.key === "today"
      ? pathname === "/today"
      : pathname.startsWith(`/${c.key}/`) || pathname === `/${c.key}`,
  );

  return (
    <div className="bg-paper border-b-[1.5px] border-graphite sticky top-[58px] sm:top-[68px] z-40">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Top row: categories */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory?.key === cat.key;
            return (
              <Link
                key={cat.key}
                href={cat.href}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border-[1.5px] ${
                  isActive
                    ? "bg-graphite text-paper border-graphite"
                    : "bg-transparent text-ink-soft border-transparent hover:text-graphite hover:bg-cream"
                }`}
              >
                {cat.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom row: sub-tabs for the active category */}
        {activeCategory && activeCategory.subtabs.length > 0 && (
          <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 -mt-1 scrollbar-thin border-t border-line pt-2">
            {activeCategory.subtabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border-[1.5px] ${
                    isActive
                      ? "bg-lavender text-graphite border-graphite shadow-[2px_2px_0_#272727]"
                      : "bg-transparent text-ink-soft border-transparent hover:text-graphite hover:bg-cream"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
