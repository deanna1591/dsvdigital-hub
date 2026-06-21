import ComingSoon from "@/components/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      emoji="🌷"
      title="Mood Wheel"
      description="Track your emotional baseline. Private by default. No points."
      teasers={[
        "Pick from 6 primary moods (happy, sad, anxious, etc.)",
        "Drill down to specific sub-emotions",
        "Optional note — totally private to you",
        "Opt-in to share to the team feed when you want",
      ]}
    />
  );
}
