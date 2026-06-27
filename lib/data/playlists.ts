/**
 * Hand-curated Spotify playlists for the Music room.
 *
 * Each one is a "tape" the user can switch between. No tracking,
 * no points — just vibes.
 *
 * Spotify playlist IDs come from the URL after /playlist/.
 * To swap a playlist, just paste a new id (and update label/vibe).
 */

export type Tape = {
  id: string;            // Spotify playlist ID
  label: string;         // big title on the tape
  vibe: string;          // mood / when to play
  emoji: string;
  color: string;         // background of the cassette body
  spineColor: string;    // tape spine accent
};

export const TAPES: Tape[] = [
  {
    id: "37i9dQZF1DX4sWSpwq3LiO",   // Spotify's Peaceful Piano
    label: "Deep Focus",
    vibe: "Heads down, no lyrics",
    emoji: "🎹",
    color: "var(--lavender)",
    spineColor: "var(--graphite)",
  },
  {
    id: "37i9dQZF1DWWQRwui0ExPn",   // Spotify's Lo-Fi Beats
    label: "Lo-fi Vibes",
    vibe: "Chill while you work",
    emoji: "☕",
    color: "var(--bronze)",
    spineColor: "var(--paper)",
  },
  {
    id: "37i9dQZF1DX6aTaZa0K6VA",   // Spotify's Y2K throwback
    label: "Y2K Hits",
    vibe: "Throwback Friday",
    emoji: "💿",
    color: "var(--bubblegum)",
    spineColor: "var(--graphite)",
  },
  {
    id: "37i9dQZF1DX4WYpdgoIcn6",   // Spotify's Chill Hits
    label: "Wind Down",
    vibe: "End-of-day reset",
    emoji: "🌙",
    color: "var(--goldrush)",
    spineColor: "var(--graphite)",
  },
];
