import type { FeedEvent } from "../page";

const AVATAR_COLORS = [
  "#E6ABE1", "#E8B044", "#F8D5F3", "#925F3A", "#5C8C5A",
  "#C7892A", "#B04D45", "#ECEBE7", "#FAF6F0", "#272727"
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedTimeline({ events, currentUserName }: { events: FeedEvent[]; currentUserName: string }) {
  if (events.length === 0) {
    return (
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-16 text-center">
        <div className="text-5xl mb-3">📭</div>
        <p className="font-serif text-xl font-semibold mb-1">No activity yet</p>
        <p className="text-ink-soft text-sm">When teammates complete missions or redeem rewards, you'll see it here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-cream border-[1.5px] border-ink rounded-xl px-5 py-3 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">What's happening</h2>
        <span className="text-xs text-ink-soft">Last {events.length} events</span>
      </div>

      {events.map((event) => (
        <FeedCard key={event.id} event={event} isOwn={event.employee_name === currentUserName} />
      ))}
    </div>
  );
}

function FeedCard({ event, isOwn }: { event: FeedEvent; isOwn: boolean }) {
  const initial = event.employee_name.charAt(0).toUpperCase();
  const color = avatarColor(event.employee_name);
  const firstName = event.employee_name.split(" ")[0];

  return (
    <article className={`bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-5 ${isOwn ? "ring-2 ring-accent-2/30" : ""}`}>
      <header className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: color }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <strong className="font-semibold">
              {isOwn ? "You" : firstName}
              {!isOwn && <span className="text-ink-soft font-normal"> {event.employee_name.split(" ").slice(1).join(" ")}</span>}
            </strong>
            <FeedAction event={event} />
          </div>
          <p className="text-xs text-ink-faint mt-0.5">{timeAgo(event.timestamp)}</p>
        </div>
        <FeedBadge event={event} />
      </header>

      <FeedContent event={event} />
    </article>
  );
}

function FeedAction({ event }: { event: FeedEvent }) {
  switch (event.type) {
    case "mission_completed":
      return (
        <span className="text-ink-soft">
          {" "}completed{" "}
          <span className="font-medium text-ink">
            {event.mission_emoji} {event.mission_title}
          </span>
        </span>
      );
    case "redemption":
      return (
        <span className="text-ink-soft">
          {" "}unlocked{" "}
          <span className="font-medium text-ink">
            {event.item_icon} {event.item_name}
          </span>
          {" "}🎉
        </span>
      );
    case "milestone_birthday":
      return <span className="text-ink-soft">'s birthday is being celebrated 🎂</span>;
    case "milestone_anniversary":
      return <span className="text-ink-soft"> hit a work anniversary 🎊</span>;
    default:
      return null;
  }
}

function FeedBadge({ event }: { event: FeedEvent }) {
  if (event.type === "mission_completed" && event.points) {
    return (
      <span className="bg-good/15 text-good text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
        +{event.points} pts
      </span>
    );
  }
  if (event.type === "redemption" && event.points_spent) {
    return (
      <span className="bg-accent-2/15 text-accent-2 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
        -{event.points_spent} pts
      </span>
    );
  }
  if (event.type.startsWith("milestone") && event.milestone_points) {
    return (
      <span className="bg-amber-500/15 text-amber-700 text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap">
        +{event.milestone_points} pts
      </span>
    );
  }
  return null;
}

function FeedContent({ event }: { event: FeedEvent }) {
  // Mission with text proof — show the story content
  if (event.type === "mission_completed" && event.proof_text && event.mission_type === "custom") {
    return (
      <div className="bg-cream rounded-lg p-4 text-sm italic leading-relaxed border-l-4" style={{ borderColor: event.mission_color || "#E6ABE1" }}>
        "{event.proof_text}"
      </div>
    );
  }

  // Mission with photo proof (Pet Coworker, DSV Checkpoint, etc) — show "View photo" link
  if (event.type === "mission_completed" && event.proof_url && event.mission_type === "custom") {
    return (
      <a
        href={event.proof_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-cream rounded-lg p-4 hover:bg-line transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ background: event.mission_color || "#E6ABE1", color: "white" }}
            >
              📷
            </span>
            <div>
              <p className="text-sm font-medium">View photo</p>
              <p className="text-xs text-ink-soft">{event.proof_url.substring(0, 50)}...</p>
            </div>
          </div>
          <span className="text-ink-soft group-hover:text-ink transition-colors text-xl">↗</span>
        </div>
      </a>
    );
  }

  // Redemption with icon — visual celebration
  if (event.type === "redemption") {
    return (
      <div
        className="rounded-lg p-5 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, var(--cream) 0%, var(--cotton) 100%)" }}
      >
        <div className="text-5xl">{event.item_icon}</div>
        <div>
          <p className="font-serif font-semibold">{event.item_name}</p>
          <p className="text-xs text-ink-soft">Worth ₱{event.peso_value?.toLocaleString()}</p>
        </div>
      </div>
    );
  }

  // Milestone — celebratory banner
  if (event.type === "milestone_birthday") {
    return (
      <div className="rounded-lg p-5 bg-gradient-to-br from-pink-100 to-amber-100 text-center">
        <div className="text-4xl mb-2">🎂🎉</div>
        <p className="font-serif text-lg font-semibold">Happy birthday!</p>
      </div>
    );
  }

  if (event.type === "milestone_anniversary") {
    return (
      <div className="rounded-lg p-5 bg-gradient-to-br from-emerald-100 to-cyan-100 text-center">
        <div className="text-4xl mb-2">🎊✨</div>
        <p className="font-serif text-lg font-semibold">Another year at DSV!</p>
      </div>
    );
  }

  return null;
}
