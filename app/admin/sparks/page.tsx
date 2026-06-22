import { createClient } from "@/lib/supabase/server";
import SparksList from "./SparksList";

export const dynamic = "force-dynamic";

type Spark = {
  id: string;
  day_of_year: number;
  title: string;
  prompt: string;
  emoji: string;
  color: string;
  points: number;
  proof_type: string;
  is_active: boolean;
};

export default async function AdminSparksPage() {
  const supabase = await createClient();

  const today = new Date();
  const todayDayOfYear = getDayOfYear(today);

  const { data } = await supabase
    .from("daily_sparks")
    .select("*")
    .order("day_of_year", { ascending: true });

  const sparks = (data ?? []) as Spark[];
  const activeCount = sparks.filter((s) => s.is_active).length;
  const todaysSpark = sparks.find((s) => s.day_of_year === todayDayOfYear && s.is_active);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex justify-between items-baseline mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Sparks</h1>
          <p className="text-sm text-ink-soft mt-1">
            Daily prompts shown on /today. {activeCount} of {sparks.length} active.
          </p>
        </div>
      </div>

      {/* Today's spark callout */}
      <div className="mb-6 bg-paper border-[1.5px] border-graphite rounded-y2k p-4 shadow-[2px_2px_0_#E8B044]">
        <div className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold mb-1">
          Today · day {todayDayOfYear}
        </div>
        {todaysSpark ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl">{todaysSpark.emoji}</span>
            <div>
              <p className="font-serif font-semibold">{todaysSpark.title}</p>
              <p className="text-xs text-ink-soft">{todaysSpark.prompt}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-soft italic">
            No active spark for today. Add one for day {todayDayOfYear} below.
          </p>
        )}
      </div>

      <SparksList sparks={sparks} todayDayOfYear={todayDayOfYear} />
    </main>
  );
}

function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
