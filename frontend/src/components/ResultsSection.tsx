import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Film,
  Maximize2,
  Pause,
  Play,
  Tag,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { resolveApiUrl } from '../services/api';
import type { FrameTrackRecord, TrackingJobResult } from '../types';

interface ResultsSectionProps {
  result: TrackingJobResult | null;
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ResultsSection({ result }: ResultsSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  const [useFallbackPreview, setUseFallbackPreview] = useState(false);

  // Reset player state when a new tracking result arrives
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUseFallbackPreview(false);
  }, [result?.job_id]);

  // Build trajectory history map up to each frame index for O(1) lookup
  const frameIndexMap = useMemo(() => {
    const map = new Map<number, FrameTrackRecord>();
    if (!result) return map;
    for (const frame of result.frames) {
      map.set(frame.frame_index, frame);
    }
    return map;
  }, [result]);

  const activeVideoSrc = useMemo(() => {
    if (!result) return undefined;
    if (useFallbackPreview && result.local_preview_url) {
      return result.local_preview_url;
    }
    return resolveApiUrl(result.video_url);
  }, [result, useFallbackPreview]);

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!result || !showOverlay || result.frames.length === 0) return;

    const vidW = video.videoWidth || 1;
    const vidH = video.videoHeight || 1;
    // Account for letterbox / aspect-ratio fit inside container
    const scale = Math.min(rect.width / vidW, rect.height / vidH);
    const drawnW = vidW * scale;
    const drawnH = vidH * scale;
    const offsetX = (rect.width - drawnW) / 2;
    const offsetY = (rect.height - drawnH) / 2;

    const totalFrames = result.summary.total_frames || result.frames.length;
    const ratio = duration > 0 ? Math.min(1, Math.max(0, video.currentTime / duration)) : 0;
    const currentFrameIdx = Math.min(totalFrames - 1, Math.floor(ratio * totalFrames));

    // Draw trajectory history trails over the trailing 30 frames
    const trailWindow = 30;
    const startIdx = Math.max(0, currentFrameIdx - trailWindow);
    const trailPoints = new Map<number, Array<{ x: number; y: number }>>();

    for (let f = startIdx; f <= currentFrameIdx; f++) {
      const rec = frameIndexMap.get(f);
      if (!rec) continue;
      for (const item of rec.tracks) {
        if (item.geometry.length < 4) continue;
        const [x1, , x2, y2] = item.geometry;
        const cx = offsetX + ((x1 + x2) / 2) * scale;
        const cy = offsetY + y2 * scale; // bottom center ground contact
        const list = trailPoints.get(item.track_id) ?? [];
        list.push({ x: cx, y: cy });
        trailPoints.set(item.track_id, list);
      }
    }

    trailPoints.forEach((pts) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = '#B7F000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw current frame bounding boxes & ID tags (especially helpful if browser falls back to raw preview)
    const activeFrame = frameIndexMap.get(currentFrameIdx);
    if (!activeFrame) return;

    for (const item of activeFrame.tracks) {
      if (item.geometry.length < 4) continue;
      const [x1, y1, x2, y2] = item.geometry;
      const bx = offsetX + x1 * scale;
      const by = offsetY + y1 * scale;
      const bw = (x2 - x1) * scale;
      const bh = (y2 - y1) * scale;

      ctx.strokeStyle = '#B7F000';
      ctx.lineWidth = 1.75;
      ctx.strokeRect(bx, by, bw, bh);

      const label = `ID ${String(item.track_id).padStart(2, '0')}`;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      const textW = ctx.measureText(label).width;
      const tagW = textW + 10;
      const tagH = 17;
      const tagY = Math.max(0, by - tagH);

      ctx.fillStyle = '#B7F000';
      ctx.fillRect(bx, tagY, tagW, tagH);
      ctx.fillStyle = '#151515';
      ctx.fillText(label, bx + 5, tagY + 12);
    }
  }, [duration, frameIndexMap, result, showOverlay]);

  useEffect(() => {
    let rafId: number | null = null;
    const renderLoop = () => {
      drawOverlay();
      if (isPlaying) {
        rafId = requestAnimationFrame(renderLoop);
      }
    };
    drawOverlay();
    if (isPlaying) {
      rafId = requestAnimationFrame(renderLoop);
    }
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [drawOverlay, isPlaying, currentTime]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !result) return;
    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (ratio: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = ratio * duration;
    setCurrentTime(video.currentTime);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <section id="results" className="bg-[#FFFFFF] py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <SectionHeading
          title="RESULTS & VISUALIZATION"
          subtitle="Track objects with unique IDs and analyze their movement."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Processed Video Player & Trajectory Visualization */}
          <div className="lg:col-span-8 flex flex-col">
            <div
              ref={containerRef}
              className="flex-1 bg-[#151515] border border-[#D8D8D2] rounded-[10px] overflow-hidden flex flex-col justify-between min-h-[280px] sm:min-h-[340px]"
            >
              <div className="relative flex-1 flex items-center justify-center bg-[#1A1A18] min-h-[240px]">
                {result && activeVideoSrc ? (
                  <>
                    <video
                      ref={videoRef}
                      src={activeVideoSrc}
                      muted={isMuted}
                      playsInline
                      onLoadedMetadata={(e) => {
                        setDuration(e.currentTarget.duration || 0);
                        drawOverlay();
                      }}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onEnded={() => setIsPlaying(false)}
                      onError={() => {
                        if (!useFallbackPreview && result.local_preview_url) {
                          setUseFallbackPreview(true);
                        }
                      }}
                      onClick={togglePlay}
                      className="w-full h-full max-h-[380px] object-contain cursor-pointer"
                    />
                    <canvas
                      ref={canvasRef}
                      className="pointer-events-none absolute inset-0 w-full h-full"
                    />
                  </>
                ) : (
                  <div className="px-6 py-12 text-center max-w-[380px]">
                    <p className="text-[13.5px] font-medium text-[#E5E5DF]">
                      No processed output available yet
                    </p>
                    <p className="text-[12px] text-[#9A9A94] mt-1.5 leading-relaxed">
                      Upload a video in the workspace above and click{' '}
                      <span className="text-white font-medium">Run Tracking</span> to view the
                      tracked output video and BoxMOT trajectory statistics.
                    </p>
                  </div>
                )}
              </div>

              {/* Clean Video Control Bar matching reference */}
              <div className="bg-[#151515] border-t border-white/10 px-4 py-2.5 flex items-center gap-3 text-white">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!result}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="p-1 text-white hover:text-[#B7F000] disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>

                <span className="font-mono-tech text-[11.5px] text-[#D8D8D2] tabular-nums shrink-0">
                  {formatClock(currentTime)} / {formatClock(duration)}
                </span>

                {/* Scrubber */}
                <div
                  onClick={(e) => {
                    if (!result || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                    handleSeek(ratio);
                  }}
                  className={`flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden ${
                    result ? 'cursor-pointer' : 'opacity-40'
                  }`}
                >
                  <div
                    className="h-full bg-[#B7F000] transition-[width] duration-75"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {result && (
                  <button
                    type="button"
                    onClick={() => setShowOverlay((prev) => !prev)}
                    className={`text-[11px] font-mono-tech px-2 py-0.5 rounded-[4px] border transition-colors cursor-pointer ${
                      showOverlay
                        ? 'border-[#B7F000] text-[#B7F000]'
                        : 'border-white/25 text-[#A8A8A2]'
                    }`}
                  >
                    Overlay {showOverlay ? 'ON' : 'OFF'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsMuted((prev) => !prev)}
                  disabled={!result}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1 text-white/80 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  disabled={!result}
                  aria-label="Fullscreen"
                  className="p-1 text-white/80 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Tracking Summary Card */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="flex-1 bg-[#F5F5F0] border border-[#E5E5DF] rounded-[10px] p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-[16px] text-[#151515] mb-4">
                  Tracking Summary
                </h3>

                <div className="divide-y divide-[#E2E2DC] bg-[#FFFFFF] border border-[#E5E5DF] rounded-[8px] px-4">
                  <div className="py-3.5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5 text-[13px] text-[#151515]">
                      <User className="w-4 h-4 text-[#666666]" strokeWidth={1.75} />
                      Total Objects
                    </span>
                    <span className="font-mono-tech font-semibold text-[14px] text-[#151515] tabular-nums">
                      {result ? result.summary.total_objects : '—'}
                    </span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5 text-[13px] text-[#151515]">
                      <Film className="w-4 h-4 text-[#666666]" strokeWidth={1.75} />
                      Total Frames
                    </span>
                    <span className="font-mono-tech font-semibold text-[14px] text-[#151515] tabular-nums">
                      {result ? result.summary.total_frames : '—'}
                    </span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5 text-[13px] text-[#151515]">
                      <Tag className="w-4 h-4 text-[#666666]" strokeWidth={1.75} />
                      Tracking IDs
                    </span>
                    <span className="font-mono-tech font-semibold text-[14px] text-[#151515] tabular-nums">
                      {result ? result.summary.tracking_ids : '—'}
                    </span>
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2.5 text-[13px] text-[#151515]">
                      <TrendingUp className="w-4 h-4 text-[#666666]" strokeWidth={1.75} />
                      Avg. Track Length
                    </span>
                    <span className="font-mono-tech font-semibold text-[14px] text-[#151515] tabular-nums">
                      {result ? Math.round(result.summary.avg_track_length) : '—'}
                    </span>
                  </div>
                </div>

                {result && (
                  <p className="mt-3 text-[11.5px] font-mono-tech text-[#666666]">
                    {result.detector} · {result.tracker} · job {result.job_id}
                  </p>
                )}
              </div>

              <div className="mt-6">
                {result ? (
                  <a
                    href={resolveApiUrl(result.download_url)}
                    download
                    className="w-full bg-[#B7F000] text-[#151515] font-semibold text-[13.5px] py-3 px-4 rounded-[6px] hover:brightness-95 transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Results</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-[#B7F000] text-[#151515] font-semibold text-[13.5px] py-3 px-4 rounded-[6px] opacity-45 cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Results</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
