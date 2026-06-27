/**
 * Photobooth strip frame definitions.
 *
 * Each frame defines the visual treatment around the 4 photos:
 *   - Background color of the strip
 *   - Spacer color between photos
 *   - Outer border + caption styling
 *   - Optional decorative elements drawn on the canvas
 *
 * All frames produce a 400 × 1200 px PNG (300 dpi feels chunky-Y2K).
 */

export type FrameId = "lavender_stars" | "cassette" | "bubblegum" | "heart" | "minimal";

export type Frame = {
  id: FrameId;
  label: string;
  emoji: string;
  bg: string;          // strip background
  spacer: string;      // between-photo divider color
  caption: string;     // caption color
  border: string;      // outer border color
  decorations: ("stars" | "hearts" | "tape" | "sparkles" | null)[];
};

export const FRAMES: Frame[] = [
  {
    id: "lavender_stars",
    label: "Lavender Stars",
    emoji: "✨",
    bg: "#E6ABE1",
    spacer: "#272727",
    caption: "#272727",
    border: "#272727",
    decorations: ["stars"],
  },
  {
    id: "cassette",
    label: "Cassette Tape",
    emoji: "📼",
    bg: "#925F3A",
    spacer: "#F4EBE8",
    caption: "#F4EBE8",
    border: "#272727",
    decorations: ["tape"],
  },
  {
    id: "bubblegum",
    label: "Bubblegum",
    emoji: "🎀",
    bg: "#F8D5F3",
    spacer: "#E8B044",
    caption: "#272727",
    border: "#272727",
    decorations: ["sparkles"],
  },
  {
    id: "heart",
    label: "Heart Shop",
    emoji: "💞",
    bg: "#F4EBE8",
    spacer: "#E6ABE1",
    caption: "#272727",
    border: "#272727",
    decorations: ["hearts"],
  },
  {
    id: "minimal",
    label: "Mall Booth",
    emoji: "🪞",
    bg: "#F5F5F5",
    spacer: "#272727",
    caption: "#272727",
    border: "#272727",
    decorations: [null],
  },
];

export function getFrame(id: string): Frame {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

/**
 * Composite a strip onto a canvas.
 * @param canvas - target canvas (will be sized to 400x1200)
 * @param photos - 4 image blobs (in order: top to bottom)
 * @param frame - frame to use
 * @param caption - optional caption text (defaults to today's date)
 */
export async function composeStrip(
  canvas: HTMLCanvasElement,
  photos: Blob[],
  frame: Frame,
  caption?: string,
): Promise<void> {
  const W = 400;
  const H = 1200;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // 1. Fill background
  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, W, H);

  // 2. Draw outer border
  ctx.strokeStyle = frame.border;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // 3. Layout for 4 photos
  const PHOTO_W = 340;
  const PHOTO_H = 240;
  const SIDE_PAD = (W - PHOTO_W) / 2; // 30
  const TOP_PAD = 30;
  const GAP = 12;
  const CAPTION_BAND = 90;

  // 4. Load the 4 photos in parallel
  const imgs = await Promise.all(photos.map(blobToImage));

  // 5. Draw each photo with a thin black border, separated by a spacer band
  for (let i = 0; i < 4; i++) {
    const y = TOP_PAD + i * (PHOTO_H + GAP);
    // Black border behind photo
    ctx.fillStyle = frame.border;
    ctx.fillRect(SIDE_PAD - 2, y - 2, PHOTO_W + 4, PHOTO_H + 4);
    // Photo
    drawCover(ctx, imgs[i], SIDE_PAD, y, PHOTO_W, PHOTO_H);
    // Spacer underneath each photo (except the last)
    if (i < 3) {
      ctx.fillStyle = frame.spacer;
      ctx.fillRect(0, y + PHOTO_H + 2, W, GAP - 4);
    }
  }

  // 6. Caption band at the bottom
  const captionY = TOP_PAD + 4 * PHOTO_H + 3 * GAP + 10;
  ctx.fillStyle = frame.spacer;
  ctx.fillRect(SIDE_PAD - 2, captionY, PHOTO_W + 4, CAPTION_BAND - 20);
  ctx.fillStyle = frame.caption;
  ctx.font = "bold 22px 'DM Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const captionText = caption ?? formatDate();
  ctx.fillText(captionText.toUpperCase(), W / 2, captionY + (CAPTION_BAND - 20) / 2);

  // 7. DSV mark at very bottom
  ctx.fillStyle = frame.caption;
  ctx.font = "10px 'DM Sans', system-ui, sans-serif";
  ctx.fillText("DSV PHOTOBOOTH", W / 2, H - 18);

  // 8. Decorations (optional)
  for (const deco of frame.decorations) {
    if (!deco) continue;
    drawDecoration(ctx, deco, W, H, frame);
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  // object-fit: cover behavior
  const srcRatio = img.width / img.height;
  const dstRatio = dw / dh;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcRatio > dstRatio) {
    // source is wider — crop horizontally
    sw = img.height * dstRatio;
    sx = (img.width - sw) / 2;
  } else {
    // source is taller — crop vertically
    sh = img.width / dstRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawDecoration(
  ctx: CanvasRenderingContext2D,
  type: "stars" | "hearts" | "tape" | "sparkles",
  W: number,
  H: number,
  frame: Frame,
): void {
  ctx.fillStyle = frame.caption;
  ctx.font = "20px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const symbols = {
    stars: ["★", "✦"],
    hearts: ["♡", "♥"],
    tape: ["▰", "▱"],
    sparkles: ["✧", "✦"],
  }[type];
  // Sprinkle in the corners
  ctx.fillText(symbols[0], 8, 8);
  ctx.textAlign = "right";
  ctx.fillText(symbols[1], W - 8, 8);
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(symbols[1], 8, H - 40);
  ctx.textAlign = "right";
  ctx.fillText(symbols[0], W - 8, H - 40);
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
