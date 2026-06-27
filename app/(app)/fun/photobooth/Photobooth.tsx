"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FRAMES, type Frame, type FrameId, composeStrip, getFrame } from "@/lib/data/photobooth-frames";
import { saveStrip } from "./actions";

type Stage = "frame" | "capture" | "review" | "saving" | "saved";
type CaptureMode = "webcam" | "upload";

export default function Photobooth() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("frame");
  const [mode, setMode] = useState<CaptureMode>("webcam");
  const [frameId, setFrameId] = useState<FrameId>("lavender_stars");
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Webcam refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stripCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const frame = getFrame(frameId);

  // Stop webcam on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Compose strip once we have all 4 photos
  useEffect(() => {
    if (photos.length === 4 && stripCanvasRef.current) {
      composeStrip(stripCanvasRef.current, photos, frame).catch((e) =>
        setError(String(e)),
      );
    }
  }, [photos, frame, stage]);

  function reset() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhotos([]);
    setError(null);
    setSavedUrl(null);
    setShareToFeed(false);
    setStage("frame");
  }

  function startCapture() {
    setPhotos([]);
    setError(null);
    setStage("capture");
  }

  function handleAllPhotosCaptured(blobs: Blob[]) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhotos(blobs);
    setStage("review");
  }

  function handleSave() {
    if (!stripCanvasRef.current) return;
    setError(null);
    setStage("saving");

    stripCanvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setError("Couldn't generate the strip image");
          setStage("review");
          return;
        }
        const file = new File([blob], "strip.png", { type: "image/png" });
        const fd = new FormData();
        fd.set("strip", file);
        if (shareToFeed) fd.set("share_to_feed", "on");

        startTransition(async () => {
          const res = await saveStrip(fd);
          if (!res.ok) {
            setError(res.error);
            setStage("review");
            return;
          }
          setSavedUrl(res.url);
          setStage("saved");
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

  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#F8D5F3] p-6 sm:p-8 mb-8">
      {/* Header */}
      <div className="mb-6">
        <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Photobooth</span>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">Make a strip</h2>
        <p className="text-sm text-ink-soft mt-1">
          Four shots, one frame, one strip. No points, just vibes.
        </p>
      </div>

      {/* Step 1: pick a frame */}
      {stage === "frame" && (
        <FrameStep
          selectedId={frameId}
          onSelect={setFrameId}
          mode={mode}
          onModeChange={setMode}
          onStart={startCapture}
        />
      )}

      {/* Step 2: capture photos */}
      {stage === "capture" && mode === "webcam" && (
        <WebcamStep
          videoRef={videoRef}
          streamRef={streamRef}
          onError={(e) => {
            setError(e);
            setMode("upload");
            setStage("frame");
          }}
          onComplete={handleAllPhotosCaptured}
          onCancel={reset}
        />
      )}

      {stage === "capture" && mode === "upload" && (
        <UploadStep onComplete={handleAllPhotosCaptured} onCancel={reset} />
      )}

      {/* Step 3: review the strip */}
      {(stage === "review" || stage === "saving") && (
        <ReviewStep
          canvasRef={stripCanvasRef}
          shareToFeed={shareToFeed}
          onShareChange={setShareToFeed}
          onRetake={reset}
          onSave={handleSave}
          onDownload={downloadStrip}
          pending={pending || stage === "saving"}
        />
      )}

      {/* Step 4: success */}
      {stage === "saved" && savedUrl && (
        <SavedStep url={savedUrl} shareToFeed={shareToFeed} onNew={reset} />
      )}

      {error && (
        <div className="mt-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}

// ====================================================================
// Step 1: Frame picker
// ====================================================================
function FrameStep({
  selectedId,
  onSelect,
  mode,
  onModeChange,
  onStart,
}: {
  selectedId: FrameId;
  onSelect: (id: FrameId) => void;
  mode: CaptureMode;
  onModeChange: (m: CaptureMode) => void;
  onStart: () => void;
}) {
  return (
    <div>
      <h3 className="font-serif text-lg font-semibold mb-3">Pick a frame</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6">
        {FRAMES.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={`border-[1.5px] rounded-y2k p-3 text-center transition-all ${
              selectedId === f.id
                ? "border-graphite shadow-[3px_3px_0_#272727] -translate-x-px -translate-y-px"
                : "border-line hover:border-graphite"
            }`}
            style={{ background: f.bg }}
          >
            <div className="text-2xl mb-1 leading-none">{f.emoji}</div>
            <div className="text-[11px] font-bold text-graphite">{f.label}</div>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <h3 className="font-serif text-lg font-semibold mb-2">How do you want to take photos?</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onModeChange("webcam")}
            className={`px-4 py-2 text-sm font-bold rounded-full border-[1.5px] border-graphite transition-colors ${
              mode === "webcam" ? "bg-graphite text-paper" : "bg-paper text-graphite hover:bg-cream"
            }`}
          >
            📷 Webcam
          </button>
          <button
            onClick={() => onModeChange("upload")}
            className={`px-4 py-2 text-sm font-bold rounded-full border-[1.5px] border-graphite transition-colors ${
              mode === "upload" ? "bg-graphite text-paper" : "bg-paper text-graphite hover:bg-cream"
            }`}
          >
            📤 Upload 4 photos
          </button>
        </div>
      </div>

      <button onClick={onStart} className="btn">
        {mode === "webcam" ? "Start the booth →" : "Choose photos →"}
      </button>
    </div>
  );
}

// ====================================================================
// Step 2a: Webcam capture (4 shots with countdown)
// ====================================================================
function WebcamStep({
  videoRef,
  streamRef,
  onError,
  onComplete,
  onCancel,
}: {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  onError: (e: string) => void;
  onComplete: (blobs: Blob[]) => void;
  onCancel: () => void;
}) {
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const photosRef = useRef<Blob[]>([]);

  // Start webcam on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
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
          setReady(true);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        onError(`Couldn't access camera: ${msg}. Try upload mode instead.`);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function takeAllShots() {
    if (!ready || !videoRef.current) return;
    photosRef.current = [];
    setPhotos([]);

    for (let i = 0; i < 4; i++) {
      // Countdown 3-2-1
      for (let n = 3; n >= 1; n--) {
        setCountdown(n);
        await wait(800);
      }
      setCountdown(null);
      // Flash + snap
      setFlash(true);
      const blob = await snapFrame(videoRef.current);
      photosRef.current.push(blob);
      setPhotos([...photosRef.current]);
      await wait(150);
      setFlash(false);
      await wait(700);
    }
    onComplete(photosRef.current);
  }

  return (
    <div>
      <div className="relative mb-4">
        <video
          ref={videoRef}
          className="w-full max-w-md mx-auto block aspect-video bg-cream border-[1.5px] border-graphite rounded-y2k object-cover"
          playsInline
          muted
        />
        {flash && (
          <div className="absolute inset-0 bg-paper rounded-y2k animate-pulse pointer-events-none" />
        )}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-serif text-[120px] font-bold text-paper drop-shadow-[3px_3px_0_#272727]">
              {countdown}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-12 h-12 border-[1.5px] border-graphite rounded-lg flex items-center justify-center text-xs font-bold ${
              photos[i] ? "bg-lavender" : "bg-cream text-ink-faint"
            }`}
          >
            {photos[i] ? "✓" : i + 1}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={takeAllShots}
          disabled={!ready || countdown !== null || photos.length === 4}
          className="btn disabled:opacity-60"
        >
          {photos.length === 0 ? (ready ? "🎬 Start 4-shot sequence" : "Connecting camera…") : "📸 Capturing…"}
        </button>
        <button onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

function snapFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas ctx");
  // Mirror the video so it feels like a selfie booth
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

// ====================================================================
// Step 2b: Upload mode
// ====================================================================
function UploadStep({
  onComplete,
  onCancel,
}: {
  onComplete: (blobs: Blob[]) => void;
  onCancel: () => void;
}) {
  const [photos, setPhotos] = useState<(Blob | null)[]>([null, null, null, null]);

  function handleFile(index: number, file: File | null) {
    const next = [...photos];
    next[index] = file;
    setPhotos(next);
  }

  const allFilled = photos.every((p) => p !== null);

  return (
    <div>
      <p className="text-sm text-ink-soft mb-4">
        Pick 4 photos in the order you want them stacked (top to bottom).
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <label
            key={i}
            className="border-[1.5px] border-graphite rounded-y2k aspect-square flex items-center justify-center text-sm bg-cream cursor-pointer hover:bg-lavender/30 transition-colors relative overflow-hidden"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(i, e.target.files?.[0] ?? null)}
            />
            {photos[i] ? (
              <img
                src={URL.createObjectURL(photos[i]!)}
                alt={`Photo ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span className="font-bold text-graphite text-2xl">{i + 1}</span>
            )}
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => onComplete(photos.filter((p): p is Blob => p !== null))}
          disabled={!allFilled}
          className="btn disabled:opacity-60"
        >
          {allFilled ? "Compose strip →" : "Pick all 4 photos"}
        </button>
        <button onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ====================================================================
// Step 3: Review composed strip
// ====================================================================
function ReviewStep({
  canvasRef,
  shareToFeed,
  onShareChange,
  onRetake,
  onSave,
  onDownload,
  pending,
}: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  shareToFeed: boolean;
  onShareChange: (v: boolean) => void;
  onRetake: () => void;
  onSave: () => void;
  onDownload: () => void;
  pending: boolean;
}) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Strip preview */}
        <div className="mx-auto">
          <canvas
            ref={canvasRef}
            style={{
              width: 220,
              height: 660,
              imageRendering: "pixelated",
            }}
            className="block border-[1.5px] border-graphite shadow-[4px_4px_0_#272727]"
          />
        </div>

        {/* Controls */}
        <div className="flex-1 w-full">
          <h3 className="font-serif text-xl font-semibold mb-2">Your strip</h3>
          <p className="text-sm text-ink-soft mb-4">
            Looks good? Save it to your gallery. Want a redo? No worries.
          </p>

          <label className="flex items-start gap-3 p-3 bg-cream border-[1.5px] border-line rounded-lg cursor-pointer hover:border-graphite transition-colors mb-4">
            <input
              type="checkbox"
              checked={shareToFeed}
              onChange={(e) => onShareChange(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-lavender"
            />
            <span className="text-sm">
              <strong className="block">Share to team feed</strong>
              <span className="text-ink-soft text-xs">
                Off by default. Turn on to share with your team.
              </span>
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <button onClick={onSave} disabled={pending} className="btn">
              {pending ? "Saving…" : "💾 Save to my gallery"}
            </button>
            <button onClick={onDownload} disabled={pending} className="btn btn-ghost">
              📥 Download PNG
            </button>
            <button onClick={onRetake} disabled={pending} className="btn btn-ghost">
              🔄 Start over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// Step 4: Saved!
// ====================================================================
function SavedStep({
  url,
  shareToFeed,
  onNew,
}: {
  url: string;
  shareToFeed: boolean;
  onNew: () => void;
}) {
  return (
    <div className="text-center py-2">
      <div className="text-4xl mb-2">📸</div>
      <h3 className="font-serif text-xl font-semibold mb-1">Strip saved!</h3>
      <p className="text-sm text-ink-soft mb-4">
        {shareToFeed
          ? "Tucked into your gallery and posted to the team feed."
          : "Tucked into your gallery. Only you can see it."}
      </p>
      <img
        src={url}
        alt="Your strip"
        className="mx-auto max-h-80 border-[1.5px] border-graphite shadow-[3px_3px_0_#272727] mb-4"
      />
      <button onClick={onNew} className="btn">
        Make another →
      </button>
    </div>
  );
}
