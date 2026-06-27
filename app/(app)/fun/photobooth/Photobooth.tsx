"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FRAMES, type FrameId, composeStrip, getFrame } from "@/lib/data/photobooth-frames";
import { saveStrip } from "./actions";

type CaptureMode = "webcam" | "upload";

/**
 * Single-page photobooth (no step-through):
 *   ┌──────────────┬──────────────────────┐
 *   │ FRAMES (left)│  CAMERA VIEW (right) │
 *   │ MODE TOGGLE  │  COUNTDOWN OVERLAY   │
 *   │ ACTIONS      │  4 shot indicators   │
 *   │              │  STRIP (after shoot) │
 *   └──────────────┴──────────────────────┘
 */
export default function Photobooth() {
  const router = useRouter();

  // Setup state
  const [mode, setMode] = useState<CaptureMode>("webcam");
  const [frameId, setFrameId] = useState<FrameId>("lavender_stars");
  const [shareToFeed, setShareToFeed] = useState(false);

  // Capture state
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // Result state
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const photosRef = useRef<Blob[]>([]);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const [savePending, startSaveTransition] = useTransition();
  const frame = getFrame(frameId);
  const hasStrip = photos.length === 4;
  const isReady = webcamReady || mode === "upload";

  // ─── Webcam lifecycle ────────────────────────────────────────
  useEffect(() => {
    if (mode !== "webcam") {
      // Tearing down webcam when switching to upload
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setWebcamReady(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setWebcamError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setWebcamReady(true);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setWebcamError(`Couldn't access camera: ${msg}`);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setWebcamReady(false);
    };
  }, [mode]);

  // ─── Recompose strip when photos or frame changes ────────────
  useEffect(() => {
    if (photos.length === 4 && stripCanvasRef.current) {
      composeStrip(stripCanvasRef.current, photos, frame).catch((e) =>
        setError(String(e)),
      );
    }
  }, [photos, frame]);

  // ─── Capture sequence ────────────────────────────────────────
  async function runShootSequence() {
    if (!videoRef.current || capturing) return;
    photosRef.current = [];
    setPhotos([]);
    setSavedUrl(null);
    setError(null);
    setCapturing(true);

    for (let i = 0; i < 4; i++) {
      for (let n = 3; n >= 1; n--) {
        setCountdown(n);
        await wait(800);
      }
      setCountdown(null);
      setFlash(true);
      const blob = await snapFrame(videoRef.current!);
      photosRef.current.push(blob);
      setPhotos([...photosRef.current]);
      await wait(150);
      setFlash(false);
      await wait(600);
    }
    setCapturing(false);
  }

  // ─── Upload mode: handle file picks ──────────────────────────
  function handleUploadFile(index: number, file: File | null) {
    if (!file) return;
    const next = [...photosRef.current];
    next[index] = file;
    photosRef.current = next;
    setPhotos([...next.filter((p) => p)]);
  }

  // ─── Save ────────────────────────────────────────────────────
  function handleSave() {
    if (!stripCanvasRef.current || !hasStrip) return;
    setError(null);
    stripCanvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setError("Couldn't generate the strip image");
          return;
        }
        const file = new File([blob], "strip.png", { type: "image/png" });
        const fd = new FormData();
        fd.set("strip", file);
        if (shareToFeed) fd.set("share_to_feed", "on");

        startSaveTransition(async () => {
          const res = await saveStrip(fd);
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setSavedUrl(res.url);
          router.refresh();
        });
      },
      "image/png",
      0.92,
    );
  }

  function downloadStrip() {
    if (!stripCanvasRef.current) return;
    const url = stripCanvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsv-photobooth-${Date.now()}.png`;
    a.click();
  }

  function reset() {
    photosRef.current = [];
    setPhotos([]);
    setSavedUrl(null);
    setError(null);
    setShareToFeed(false);
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#F8D5F3] p-5 sm:p-7 mb-8">
      <div className="mb-5">
        <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Photobooth</span>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">Make a strip</h2>
        <p className="text-sm text-ink-soft mt-1">Four shots, one frame, one strip. No points, just vibes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
        {/* ─── LEFT: controls ──────────────────────────────────── */}
        <aside className="space-y-5">
          {/* Mode */}
          <div>
            <h3 className="text-[11px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">Source</h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode("webcam")}
                disabled={capturing}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-full border-[1.5px] border-graphite transition-colors disabled:opacity-50 ${
                  mode === "webcam" ? "bg-graphite text-paper" : "bg-paper text-graphite hover:bg-cream"
                }`}
              >
                📷 Webcam
              </button>
              <button
                onClick={() => setMode("upload")}
                disabled={capturing}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-full border-[1.5px] border-graphite transition-colors disabled:opacity-50 ${
                  mode === "upload" ? "bg-graphite text-paper" : "bg-paper text-graphite hover:bg-cream"
                }`}
              >
                📤 Upload
              </button>
            </div>
          </div>

          {/* Frame picker */}
          <div>
            <h3 className="text-[11px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">Frame</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {FRAMES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFrameId(f.id)}
                  disabled={capturing}
                  className={`border-[1.5px] rounded-y2k p-2.5 text-center transition-all disabled:opacity-50 ${
                    frameId === f.id
                      ? "border-graphite shadow-[2px_2px_0_#272727] -translate-x-px -translate-y-px"
                      : "border-line hover:border-graphite"
                  }`}
                  style={{ background: f.bg }}
                  aria-label={f.label}
                  title={f.label}
                >
                  <div className="text-lg leading-none mb-0.5">{f.emoji}</div>
                  <div className="text-[10px] font-bold text-graphite leading-tight">{f.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Share toggle */}
          {hasStrip && (
            <label className="flex items-start gap-2 p-2.5 bg-cream border-[1.5px] border-line rounded-lg cursor-pointer hover:border-graphite transition-colors">
              <input
                type="checkbox"
                checked={shareToFeed}
                onChange={(e) => setShareToFeed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-lavender"
              />
              <span className="text-xs">
                <strong className="block">Share to team feed</strong>
                <span className="text-ink-soft text-[10px]">Off = only you can see it.</span>
              </span>
            </label>
          )}

          {/* Primary action */}
          <div className="space-y-2">
            {!hasStrip && mode === "webcam" && (
              <button
                onClick={runShootSequence}
                disabled={!isReady || capturing}
                className="btn w-full disabled:opacity-60"
              >
                {capturing
                  ? "📸 Capturing…"
                  : !webcamReady && !webcamError
                  ? "Connecting camera…"
                  : "🎬 Start 4-shot sequence"}
              </button>
            )}

            {hasStrip && !savedUrl && (
              <>
                <button onClick={handleSave} disabled={savePending} className="btn w-full">
                  {savePending ? "Saving…" : "💾 Save to gallery"}
                </button>
                <button onClick={downloadStrip} disabled={savePending} className="btn btn-ghost w-full">
                  📥 Download PNG
                </button>
                <button onClick={reset} disabled={savePending} className="btn btn-ghost w-full">
                  🔄 Start over
                </button>
              </>
            )}

            {savedUrl && (
              <button onClick={reset} className="btn w-full">
                Make another →
              </button>
            )}
          </div>
        </aside>

        {/* ─── RIGHT: live view / strip ─────────────────────────── */}
        <main>
          {/* Camera view OR upload grid (always visible while no strip) */}
          {!hasStrip && (
            <>
              {mode === "webcam" && (
                <div className="relative bg-graphite border-[1.5px] border-graphite rounded-y2k overflow-hidden shadow-[3px_3px_0_#272727]">
                  <video
                    ref={videoRef}
                    className="block w-full aspect-video object-cover"
                    style={{ transform: "scaleX(-1)" }}
                    playsInline
                    muted
                  />
                  {flash && (
                    <div className="absolute inset-0 bg-paper animate-pulse pointer-events-none" />
                  )}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="font-serif text-[140px] sm:text-[180px] font-bold text-paper drop-shadow-[3px_3px_0_#272727]">
                        {countdown}
                      </div>
                    </div>
                  )}
                  {!webcamReady && !webcamError && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-paper text-sm font-medium">Connecting camera…</p>
                    </div>
                  )}
                  {webcamError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-graphite/90">
                      <p className="text-paper text-sm mb-2">🚫 {webcamError}</p>
                      <button
                        onClick={() => setMode("upload")}
                        className="px-3 py-1 text-xs font-bold rounded-full bg-lavender text-graphite border-[1.5px] border-paper"
                      >
                        Switch to upload mode
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === "upload" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <label
                      key={i}
                      className="border-[1.5px] border-graphite rounded-y2k aspect-[3/4] flex items-center justify-center text-sm bg-cream cursor-pointer hover:bg-lavender/30 transition-colors relative overflow-hidden"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadFile(i, e.target.files?.[0] ?? null)}
                      />
                      {photos[i] ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={URL.createObjectURL(photos[i])}
                            alt={`Photo ${i + 1}`}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-graphite text-paper text-[10px] font-bold px-1.5 rounded-full border border-paper">
                            {i + 1}
                          </div>
                        </>
                      ) : (
                        <span className="font-bold text-graphite text-2xl">{i + 1}</span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Shot indicators */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 border-[1.5px] border-graphite rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                      photos[i] ? "bg-lavender" : "bg-cream text-ink-faint"
                    }`}
                  >
                    {photos[i] ? "✓" : i + 1}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Strip preview (replaces camera view once composed) */}
          {hasStrip && !savedUrl && (
            <div className="flex justify-center">
              <canvas
                ref={stripCanvasRef}
                style={{ width: 280, height: 840, imageRendering: "pixelated" }}
                className="block border-[1.5px] border-graphite shadow-[4px_4px_0_#272727]"
              />
            </div>
          )}

          {/* Saved confirmation */}
          {savedUrl && (
            <div className="text-center py-2">
              <div className="text-4xl mb-2">📸</div>
              <h3 className="font-serif text-xl font-semibold mb-1">Strip saved!</h3>
              <p className="text-sm text-ink-soft mb-4">
                {shareToFeed
                  ? "Tucked into your gallery and posted to the team feed."
                  : "Tucked into your gallery. Only you can see it."}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={savedUrl}
                alt="Your strip"
                className="mx-auto max-h-80 border-[1.5px] border-graphite shadow-[3px_3px_0_#272727]"
              />
            </div>
          )}
        </main>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function snapFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas ctx");
  // Mirror so it matches what the user sees on screen
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9,
    );
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
