import ComingSoon from "@/components/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      emoji="📸"
      title="Photobooth"
      description="4-shot strip generator with cute Y2K frames. Just for fun, no points."
      teasers={[
        "Take 4 selfies in a row, like the mall photobooth",
        "Pick a frame and theme — cassette, sticker, vapor",
        "Download as PNG or share to the team feed",
        "Strips persist in your private gallery",
      ]}
    />
  );
}
