/**
 * Streak Timeline — shows the user's recent activity, inline per day.
 *
 * Server-rendered with data prefetched from Supabase in the parent page.
 *
 * Each day shows:
 *   - Day label (Today / yesterday / Mon Jun 9)
 *   - State stripe color (today/streak/done/pending/miss)
 *   - Each activity as a row with icon, title, points, time, optional CTA
 *
 * If you haven't claimed anything yet, you'll see the last 7 days with
 * miss states and prompts to start.
 */

import Link from "next/link";

export type DayState = "today" | "streak" | "done" | "pending" | "miss";

export type ActivityItem = {
  icon: string;
  title: string;
  subtitle?: string;
  points?: number;
  noPoints?: boolean;
  time?: string;
  status?: "approved" | "pending";
  ctaLabel?: string;
  ctaHref?: string;
};

export type DayEntry = {
  date: string;
  dayLabel: string;
  state: DayState;
  items: ActivityItem[];
};

const STATE_STRIPE: Record<DayState, string> = {
  today:   "var(--goldrush)",
  streak:  "var(--lavender)",
  done:    "var(--lavender)",
  pending: "var(--bubblegum)",
  miss:    "var(--line)",
};

const STATE_LABEL: Record<DayState, string | null> = {
  today:   "Today",
  streak:  "Streak day",
  done:    "Done",
  pending: "Pending",
  miss:    null,
};

export function StreakTimeline({ days }: { days: DayEntry[] }) {
  if (days.length === 0) {
    return (
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-8 text-center text-ink-soft">
        <div className="text-4xl mb-3">🌱</div>
        <p className="font-serif text-lg font-semibold mb-1">Your streak starts here</p>
        <p className="text-sm">Claim today's spark, complete a bingo square, or earn from a mission to see your activity timeline appear.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {days.map((day) => (
        <DayCard key={day.date} day={day} />
      ))}
    </div>
  );
}

function DayCard({ day }: { day: DayEntry }) {
  const stripeColor = STATE_STRIPE[day.state];
  const stateLabel = STATE_LABEL[day.state];
  const isToday = day.state === "today";

  return (
    <div
      className="bg-paper border-[1.5px] border-graphite rounded-y2k pl-3 pr-4 py-3 sm:py-4 sm:pl-4 sm:pr-5 shadow-[2px_2px_0_#272727]"
      style={{ borderLeftWidth: 6, borderLeftColor: stripeColor }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className={`font-serif font-semibold text-sm sm:text-base ${isToday ? "text-graphite" : "text-ink-soft"}`}>
          {day.dayLabel}
        </span>
        {stateLabel && (
          <span
            className="text-[10px] tracking-[0.1em] uppercase font-bold px-2.5 py-0.5 rounded-full border-[1.5px] border-graphite shrink-0"
            style={{ background: stripeColor, color: "var(--graphite)" }}
          >
            {stateLabel}
          </span>
        )}
      </div>
      {day.items.length === 0 ? (
        <p className="text-xs text-ink-faint italic m-0 ml-1">
          {day.state === "miss" ? "No activity" : "—"}
        </p>
      ) : (
        <ul className="list-none p-0 m-0">
          {day.items.map((item, i) => (
            <ActivityRow key={i} item={item} isLast={i === day.items.length - 1} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  return (
    <li className={`grid grid-cols-[24px_1fr_auto] gap-2.5 py-2 ${!isLast ? "border-b border-dashed border-line" : ""}`}>
      <span className="text-lg leading-none mt-0.5">{item.icon}</span>
      <div className="min-w-0">
        <div className="flex gap-2 items-baseline flex-wrap">
          <strong className="text-sm font-semibold">{item.title}</strong>
          {item.time && <span className="text-[11px] text-ink-faint font-medium">{item.time}</span>}
        </div>
        {item.subtitle && (
          <div className="text-xs text-ink-soft mt-0.5">{item.subtitle}</div>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {item.points != null && !item.noPoints && (
          <span className={`font-serif font-semibold text-base ${item.status === "pending" ? "text-ink-faint" : "text-goldrush"}`}>
            +{item.points}
          </span>
        )}
        {item.noPoints && <span className="text-[11px] text-ink-faint italic">no pts</span>}
        {item.ctaLabel && item.ctaHref && (
          <Link href={item.ctaHref} className="text-xs font-bold text-graphite underline underline-offset-2">
            {item.ctaLabel} →
          </Link>
        )}
      </div>
    </li>
  );
}
