import ComingSoon from "@/components/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      emoji="📼"
      title="Music"
      description="Curated playlists for focus, vibes, and Friday energy."
      teasers={[
        "4 Spotify playlists hand-picked by the team",
        "Cassette tape player UI for the full Y2K experience",
        "No points — just vibes",
        "Suggest a track via Slack and we'll add it",
      ]}
    />
  );
}
