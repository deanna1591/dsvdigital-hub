import ComingSoon from "@/components/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      emoji="💌"
      title="Tasks & Brain Dump"
      description="A simple 4-column kanban for organizing what's swirling in your head."
      teasers={[
        "Columns: Today / Tomorrow / Someday / Brain Dump",
        "Drag tasks between columns",
        "Persists across sessions",
        "Private to you — nobody sees your tasks",
      ]}
    />
  );
}
