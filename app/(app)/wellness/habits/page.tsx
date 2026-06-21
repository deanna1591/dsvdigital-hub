import ComingSoon from "@/components/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      emoji="🌱"
      title="Habits"
      description="Build your daily habits with simple one-tap tracking and streak visualization."
      teasers={[
        "Add your own habits (drink water, walk, journal)",
        "One-tap completion — no friction",
        "Streak visualization with 7-day dots",
        "Reflection prompts every 7 days",
      ]}
    />
  );
}
