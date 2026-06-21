"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  icon: string;
  text: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const unreadCount = notifs.filter((n) => !n.read_at).length;

  // Load notifications on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setNotifs((data || []) as Notification[]);
        setLoaded(true);
      });
  }, [userId]);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const markAllRead = async () => {
    const supabase = createClient();
    const unreadIds = notifs.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    setNotifs((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-cream transition-colors border-[1.5px] border-graphite bg-paper"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-goldrush text-graphite text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-[1.5px] border-graphite px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] max-w-[calc(100vw-2rem)] bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#272727] z-50 max-h-[480px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b-[1.5px] border-graphite bg-cream">
              <h3 className="font-serif text-base font-semibold">
                Notifications {isAdmin && <span className="text-xs font-sans font-normal text-ink-soft">· admin</span>}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-ink-soft hover:text-graphite font-semibold underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {!loaded ? (
                <div className="px-4 py-8 text-center text-sm text-ink-soft">Loading…</div>
              ) : notifs.length === 0 ? (
                <div className="px-4 py-12 text-center text-ink-soft">
                  <div className="text-3xl mb-2">🌱</div>
                  <p className="text-sm font-medium mb-1">No notifications yet</p>
                  <p className="text-xs text-ink-faint">
                    You'll see updates here when points are awarded, orders ship, or sparks need claiming.
                  </p>
                </div>
              ) : (
                notifs.map((n) => (
                  <NotificationRow key={n.id} notif={n} />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({ notif }: { notif: Notification }) {
  const isUnread = !notif.read_at;
  const content = (
    <div
      className={`px-4 py-3 border-b border-line flex gap-3 transition-colors ${
        isUnread ? "bg-bubblegum/20" : "bg-paper"
      } hover:bg-cream`}
    >
      <div className="text-xl shrink-0 leading-none mt-0.5">{notif.icon}</div>
      <div className="min-w-0 flex-1">
        <div
          className="text-sm leading-snug text-graphite"
          dangerouslySetInnerHTML={{ __html: notif.text }}
        />
        <div className="text-[10px] text-ink-faint mt-1 font-medium">
          {formatRelative(notif.created_at)}
        </div>
      </div>
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-goldrush shrink-0 mt-2" aria-label="Unread" />
      )}
    </div>
  );

  if (notif.link_url) {
    return (
      <a href={notif.link_url} className="block">
        {content}
      </a>
    );
  }
  return content;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
