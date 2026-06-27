import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import TasksKanban from "./TasksKanban";
import type { Bucket } from "./actions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("personal_tasks")
    .select("id, text, bucket, position, completed_at, created_at")
    .eq("employee_id", userId)
    .order("position", { ascending: true });

  const tasks = (data ?? []) as Array<{
    id: string;
    text: string;
    bucket: Bucket;
    position: number;
    completed_at: string | null;
    created_at: string;
  }>;

  return <TasksKanban tasks={tasks} />;
}
