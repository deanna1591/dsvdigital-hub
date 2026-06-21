/**
 * Streak Timeline — reference pattern for porting mockup features.
 *
 * This is the most complex component in the employee view. It shows each day's
 * activities inline with full context (titles, points, CTAs) instead of just
 * abstract colored boxes.
 *
 * The mockup version is JS-only and renders into innerHTML. This is the
 * React equivalent — keep this pattern in mind when porting other features.
 *
 * Data flow:
 *   - Server component (app/(app)/today/page.tsx) fetches last 14 days
 *     of activity from Supabase, groups by date, and passes the array here
 *   - This component renders the timeline
 *   - "Claim spark" CTAs link to /sparks/claim/[date] (or open a modal)
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

export type DayState = 'today' | 'streak' | 'done' | 'pending' | 'miss';

export type ActivityItem = {
  icon: string;
  title: string;
  subtitle?: string;
  points?: number;
  noPoints?: boolean;
  time?: string;
  status?: 'approved' | 'pending';
  cta?: string;
  ctaHref?: string;
};

export type DayEntry = {
  date: string;          // 'YYYY-MM-DD'
  dayLabel: string;      // 'Mon Jun 9' or 'Today · Sat Jun 13'
  state: DayState;
  items: ActivityItem[];
};

const STATE_STRIPE: Record<DayState, string> = {
  today:   'var(--goldrush)',
  streak:  'var(--lavender)',
  done:    'var(--lavender)',
  pending: 'var(--bubblegum)',
  miss:    'var(--line)',
};

export function StreakTimeline({ days }: { days: DayEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleDays = expanded ? days : days.slice(0, 7);
  const hidden = days.length - 7;

  return (
    <div className="streak-timeline">
      {visibleDays.map(day => (
        <DayCard key={day.date} day={day} />
      ))}
      {!expanded && hidden > 0 && (
        <button
          className="show-more"
          onClick={() => setExpanded(true)}
        >
          Show {hidden} more days ↓
        </button>
      )}
    </div>
  );
}

function DayCard({ day }: { day: DayEntry }) {
  const stripeColor = STATE_STRIPE[day.state];
  return (
    <div className="day-card" style={{ borderLeftColor: stripeColor }}>
      <div className="day-header">
        <span className="day-label">{day.dayLabel}</span>
        {day.state === 'today' && <span className="today-pill">Today</span>}
      </div>
      {day.items.length === 0 ? (
        <p className="empty">{day.state === 'miss' ? 'No activity' : '—'}</p>
      ) : (
        <ul className="items">
          {day.items.map((item, i) => (
            <ActivityRow key={i} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <li className="activity-row">
      <span className="icon">{item.icon}</span>
      <div className="body">
        <div className="title-row">
          <strong>{item.title}</strong>
          {item.time && <span className="time">{item.time}</span>}
        </div>
        {item.subtitle && <div className="subtitle">{item.subtitle}</div>}
      </div>
      <div className="right">
        {item.points != null && !item.noPoints && (
          <span className={`pts ${item.status === 'pending' ? 'pending' : ''}`}>
            +{item.points}
          </span>
        )}
        {item.noPoints && <span className="pts-muted">no pts</span>}
        {item.cta && item.ctaHref && (
          <Link href={item.ctaHref} className="cta">
            {item.cta} →
          </Link>
        )}
      </div>
    </li>
  );
}

/* =====================================================
   Styles — co-located for clarity. Move to CSS module
   or globals.css as you prefer.
   ===================================================== */

// Tailwind alternative: replace this with className utilities throughout.
const _styles = `
.streak-timeline { display: flex; flex-direction: column; gap: 10px; }
.day-card {
  background: var(--paper);
  border: 1.5px solid var(--graphite);
  border-left-width: 6px;
  border-radius: var(--radius);
  padding: 14px 16px;
}
.day-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.day-label { font-weight: 700; font-size: 14px; }
.today-pill {
  background: var(--goldrush);
  color: var(--graphite);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.items { list-style: none; padding: 0; margin: 0; }
.activity-row {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
}
.activity-row:last-child { border-bottom: none; }
.icon { font-size: 18px; }
.body .title-row { display: flex; gap: 8px; align-items: baseline; }
.body .time { font-size: 11px; color: var(--ink-faint); }
.body .subtitle { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
.right { display: flex; align-items: center; gap: 12px; }
.pts {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--goldrush);
  font-size: 15px;
}
.pts.pending { color: var(--ink-faint); }
.pts-muted { font-size: 11px; color: var(--ink-faint); font-style: italic; }
.cta { font-size: 12px; font-weight: 700; color: var(--graphite); text-decoration: underline; }
.show-more {
  text-align: center;
  padding: 12px;
  background: transparent;
  border: 1.5px dashed var(--ink-soft);
  border-radius: var(--radius);
  font-weight: 700;
  cursor: pointer;
  color: var(--ink-soft);
}
.show-more:hover { background: var(--cream); }
.empty { font-size: 12px; color: var(--ink-faint); margin: 0; }
`;
