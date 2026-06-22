/**
 * Mood Wheel data — 6 primary moods, each with 4-5 sub-emotions.
 *
 * Picked deliberately to be:
 *   - Approachable (no clinical jargon)
 *   - Inclusive (covers both pleasant and unpleasant)
 *   - Granular enough to feel seen, not so much that picking is exhausting
 *
 * Used by both /wellness/mood (full check-in) and the Today page mini widget.
 */

export type MoodKey = "happy" | "sad" | "anxious" | "angry" | "calm" | "energized";

export type MoodConfig = {
  key: MoodKey;
  label: string;
  emoji: string;
  color: string;        // background tint
  border: string;       // border + active state
  submoods: { key: string; label: string; emoji: string }[];
};

export const MOODS: MoodConfig[] = [
  {
    key: "happy",
    label: "Happy",
    emoji: "😊",
    color: "var(--goldrush)",
    border: "var(--graphite)",
    submoods: [
      { key: "content",    label: "Content",    emoji: "🙂" },
      { key: "joyful",     label: "Joyful",     emoji: "😄" },
      { key: "grateful",   label: "Grateful",   emoji: "🙏" },
      { key: "proud",      label: "Proud",      emoji: "🎖️" },
      { key: "excited",    label: "Excited",    emoji: "🎉" },
    ],
  },
  {
    key: "calm",
    label: "Calm",
    emoji: "🌿",
    color: "var(--frost)",
    border: "var(--graphite)",
    submoods: [
      { key: "peaceful",   label: "Peaceful",   emoji: "🕊️" },
      { key: "relaxed",    label: "Relaxed",    emoji: "😌" },
      { key: "settled",    label: "Settled",    emoji: "🌱" },
      { key: "focused",    label: "Focused",    emoji: "🎯" },
    ],
  },
  {
    key: "energized",
    label: "Energized",
    emoji: "⚡",
    color: "var(--bubblegum)",
    border: "var(--graphite)",
    submoods: [
      { key: "motivated",  label: "Motivated",  emoji: "🚀" },
      { key: "inspired",   label: "Inspired",   emoji: "💡" },
      { key: "ambitious",  label: "Ambitious",  emoji: "🏔️" },
      { key: "alive",      label: "Alive",      emoji: "🔥" },
    ],
  },
  {
    key: "sad",
    label: "Sad",
    emoji: "😔",
    color: "var(--lavender)",
    border: "var(--graphite)",
    submoods: [
      { key: "lonely",        label: "Lonely",       emoji: "💭" },
      { key: "disappointed",  label: "Disappointed", emoji: "😞" },
      { key: "melancholy",    label: "Melancholy",   emoji: "🌧️" },
      { key: "heartbroken",   label: "Heartbroken",  emoji: "💔" },
      { key: "tired",         label: "Tired",        emoji: "😴" },
    ],
  },
  {
    key: "anxious",
    label: "Anxious",
    emoji: "😰",
    color: "var(--cream)",
    border: "var(--graphite)",
    submoods: [
      { key: "worried",      label: "Worried",      emoji: "😟" },
      { key: "overwhelmed",  label: "Overwhelmed",  emoji: "🌊" },
      { key: "nervous",      label: "Nervous",      emoji: "😬" },
      { key: "stressed",     label: "Stressed",     emoji: "😣" },
      { key: "uncertain",    label: "Uncertain",    emoji: "❓" },
    ],
  },
  {
    key: "angry",
    label: "Angry",
    emoji: "😠",
    color: "rgba(176, 77, 69, 0.15)",
    border: "var(--graphite)",
    submoods: [
      { key: "frustrated",   label: "Frustrated",   emoji: "😤" },
      { key: "irritated",    label: "Irritated",    emoji: "😒" },
      { key: "resentful",    label: "Resentful",    emoji: "💢" },
      { key: "annoyed",      label: "Annoyed",      emoji: "🙄" },
    ],
  },
];

export function getMood(key: string): MoodConfig | undefined {
  return MOODS.find((m) => m.key === key);
}
