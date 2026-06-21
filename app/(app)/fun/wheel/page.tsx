import ComingSoon from "@/components/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      emoji="🪩"
      title="Spin Wheel"
      description="Spin for one of 200 simple things to do today — just for fun, no points."
      teasers={[
        "200 carefully curated micro-activities to spice up the day",
        "No points — just vibes",
        "Different result each time you spin",
        "Some silly, some mindful — surprise yourself",
      ]}
    />
  );
}
