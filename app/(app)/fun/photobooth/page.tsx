import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import Photobooth from "./Photobooth";
import PhotoboothGallery from "./PhotoboothGallery";

export const dynamic = "force-dynamic";

export default async function PhotoboothPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("photobooth_strips")
    .select("id, image_url, share_to_feed, created_at")
    .eq("employee_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const strips = (data ?? []) as Array<{
    id: string;
    image_url: string;
    share_to_feed: boolean;
    created_at: string;
  }>;

  return (
    <div className="max-w-3xl mx-auto">
      <Photobooth />
      <PhotoboothGallery strips={strips} />
    </div>
  );
}
