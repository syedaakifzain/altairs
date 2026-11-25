import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Loader2,
  Play,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import {
  SUPPORTED_DETECTORS,
  SUPPORTED_TRACKERS,
  TrackingApiError,
  submitVideoTracking,
} from '../services/api';
import type {
  BackendConnectionState,
  SelectedVideoMeta,
  TrackingJobResult,
} from '../types';

const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

interface TrackingWorkspaceSectionProps {
  backendStatus: BackendConnectionState;
  checkingBackend: boolean;
  onRefreshBackend: () => void;
  onJobCompleted: (result: TrackingJobResult) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TrackingWorkspaceSection({
  backendStatus,
  checkingBackend,
  onRefreshBackend,
  onJobCompleted,
}: TrackingWorkspaceSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideoMeta | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const detectors = backendStatus.readiness?.detectors?.length
    ? backendStatus.readiness.detectors
    : SUPPORTED_DETECTORS;
  const trackers = backendStatus.readiness?.trackers?.length
    ? backendStatus.readiness.trackers
    : SUPPORTED_TRACKERS;

  // Default to YOLOv8n + BoT-SORT to match the reference mockup defaults
  const [detector, setDetector] = useState<string>('yolov8n');
  const [tracker, setTracker] = useState<string>('botsort');
  const [confidence, setConfidence] = useState<number>(0.25);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clean up object URL on replace or unmount
  useEffect(() => {
    return () => {
      if (selectedVideo?.previewUrl) {
        URL.revokeObjectURL(selectedVideo.previewUrl);
      }
    };
  }, [selectedVideo?.previewUrl]);

  const validateAndSelectFile = (file: File | undefined | null) => {
    if (!file) return;
    setSubmitError(null);

    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExt && !file.type.startsWith('video/')) {
      setValidationError(
        `Unsupported file "${file.name}". Please select a valid video (${ALLOWED_EXTENSIONS.join(', ')}).`,
      );
      return;
    }

    if (file.size === 0) {
      setValidationError('Selected file is empty (0 bytes).');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setValidationError(
        `File size (${formatBytes(file.size)}) exceeds the 500 MB upload limit.`,
      );
      return;
    }

    if (selectedVideo?.previewUrl) {
      URL.revokeObjectURL(selectedVideo.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setValidationError(null);
    setSelectedVideo({
      file,
      previewUrl,
      width: null,
      height: null,
      duration: null,
    });
  };

  const handleClearFile = () => {
    if (selectedVideo?.previewUrl) {
      URL.revokeObjectURL(selectedVideo.previewUrl);
    }
    setSelectedVideo(null);
    setValidationError(null);
    setSubmitError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRunTracking = async () => {
    if (!selectedVideo) {
      setValidationError('Please upload a video file before running tracking.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await submitVideoTracking(
        selectedVideo.file,
        detector,
        tracker,
        confidence,
        controller.signal,
      );
      onJobCompleted({
        ...result,
        local_preview_url: selectedVideo.previewUrl,
      });

      const resultsEl = document.getElementById('results');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      const msg =
        err instanceof TrackingApiError
          ? err.message
          : 'Unexpected error while submitting video for tracking.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <section id="workspace" className="bg-[#FFFFFF] border-b border-[#E5E5DF] py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <SectionHeading
          title="TRACKING WORKSPACE"
          subtitle="Upload a video, configure tracking, and run the analysis."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Upload Video Area */}
          <div className="lg:col-span-7 flex flex-col">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.mkv,.webm,.m4v,video/*"
              className="hidden"
              onChange={(e) => validateAndSelectFile(e.target.files?.[0])}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                validateAndSelectFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => {
                if (!selectedVideo) fileInputRef.current?.click();
              }}
              className={`flex-1 min-h-[270px] rounded-[10px] border-[1.5px] border-dashed transition-colors p-6 flex flex-col justify-center ${
                isDragging
                  ? 'border-[#151515] bg-[#F5F5F0]'
                  : validationError
                  ? 'border-[#C43D3D] bg-[#FAFAF7]'
                  : 'border-[#D8D8D2] bg-[#FAFAF7] hover:border-[#A8A8A0]'
              } ${!selectedVideo ? 'cursor-pointer items-center text-center' : ''}`}
            >
              {!selectedVideo ? (
                <div className="flex flex-col items-center max-w-[340px]">
                  <UploadCloud
                    className="w-10 h-10 text-[#151515] mb-3.5"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-semibold text-[16px] text-[#151515] mb-1">
                    Upload Video
                  </h3>
                  <p className="text-[12.5px] text-[#666666] mb-5">
                    Drag and drop a video file here, or click to browse
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-[#B7F000] text-[#151515] font-semibold text-[13px] px-5 py-2.5 rounded-[6px] hover:brightness-95 transition-all cursor-pointer"
                  >
                    Choose File
                  </button>
                  <p className="text-[11px] text-[#666666] mt-3.5">
                    MP4, MOV, AVI, MKV, or WEBM (max 500 MB)
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#E5E5DF]">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-[6px] bg-[#FFFFFF] border border-[#D8D8D2] shrink-0">
                        <FileVideo className="w-5 h-5 text-[#151515]" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#151515] truncate">
                          {selectedVideo.file.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#666666] font-mono-tech mt-0.5">
                          <span>{formatBytes(selectedVideo.file.size)}</span>
                          {selectedVideo.width && selectedVideo.height && (
                            <span>
                              {selectedVideo.width}×{selectedVideo.height}
                            </span>
                          )}
                          {selectedVideo.duration !== null && (
                            <span>{formatDuration(selectedVideo.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#237A4B] bg-[#237A4B]/10 px-2.5 py-1 rounded-[4px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valid Video
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="text-[12px] font-medium px-2.5 py-1 rounded-[4px] border border-[#D8D8D2] bg-[#FFFFFF] text-[#151515] hover:border-[#151515] disabled:opacity-50 cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        disabled={isSubmitting}
                        aria-label="Remove file"
                        className="p-1.5 rounded-[4px] border border-[#D8D8D2] bg-[#FFFFFF] text-[#666666] hover:text-[#C43D3D] hover:border-[#C43D3D] disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Native metadata + preview */}
                  <div className="rounded-[8px] overflow-hidden bg-[#151515] border border-[#D8D8D2] max-h-[210px] flex items-center justify-center">
                    <video
                      src={selectedVideo.previewUrl}
                      controls
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        setSelectedVideo((prev) =>
                          prev
                            ? {
                                ...prev,
                                width: vid.videoWidth || null,
                                height: vid.videoHeight || null,
                                duration: Number.isFinite(vid.duration) ? vid.duration : null,
                              }
                            : prev,
                        );
                      }}
                      className="w-full max-h-[210px] object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {validationError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-[6px] border border-[#C43D3D]/40 bg-[#C43D3D]/8 px-3.5 py-2.5 text-[12.5px] text-[#C43D3D]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Right: Tracking Settings Panel */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex-1 bg-[#F5F5F0] border border-[#E5E5DF] rounded-[10px] p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-[16px] text-[#151515] mb-5">
                  Tracking Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="detector-select"
                      className="block text-[12.5px] font-medium text-[#151515] mb-1.5"
                    >
                      Detection Model
                    </label>
                    <select
                      id="detector-select"
                      value={detector}
                      onChange={(e) => setDetector(e.target.value)}
                      disabled={isSubmitting}
                      className="ps05-select w-full bg-[#FFFFFF] border border-[#D8D8D2] rounded-[6px] px-3.5 py-2.5 text-[13.5px] text-[#151515] focus:outline-none focus:border-[#151515] disabled:opacity-60"
                    >
                      {detectors.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="tracker-select"
                      className="block text-[12.5px] font-medium text-[#151515] mb-1.5"
                    >
                      Tracker
                    </label>
                    <select
                      id="tracker-select"
                      value={tracker}
                      onChange={(e) => setTracker(e.target.value)}
                      disabled={isSubmitting}
                      className="ps05-select w-full bg-[#FFFFFF] border border-[#D8D8D2] rounded-[6px] px-3.5 py-2.5 text-[13.5px] text-[#151515] focus:outline-none focus:border-[#151515] disabled:opacity-60"
                    >
                      {trackers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[12.5px] mb-1.5">
                      <label htmlFor="conf-range" className="font-medium text-[#151515]">
                        Confidence Threshold
                      </label>
                      <span className="font-mono-tech text-[12px] text-[#666666]">
                        {confidence.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id="conf-range"
                      type="range"
                      min="0.10"
                      max="0.85"
                      step="0.05"
                      value={confidence}
                      onChange={(e) => setConfidence(parseFloat(e.target.value))}
                      disabled={isSubmitting}
                      className="w-full accent-[#151515] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Truthful Backend Connectivity Row */}
                <div className="mt-5 pt-4 border-t border-[#E2E2DC] flex items-center justify-between gap-2 text-[12px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        backendStatus.supportsVideoUpload
                          ? 'bg-[#237A4B]'
                          : backendStatus.online
                          ? 'bg-[#A56A00]'
                          : 'bg-[#C43D3D]'
                      }`}
                    />
                    <span className="text-[#666666] truncate" title={backendStatus.detail}>
                      {backendStatus.modeLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onRefreshBackend}
                    disabled={checkingBackend}
                    className="inline-flex items-center gap-1 text-[#151515] font-medium hover:underline shrink-0 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${checkingBackend ? 'animate-spin' : ''}`}
                    />
                    <span>Check</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                {!isSubmitting ? (
                  <button
                    type="button"
                    onClick={handleRunTracking}
                    disabled={!selectedVideo}
                    className="w-full bg-[#151515] text-white font-medium text-[13.5px] py-3 px-4 rounded-[6px] hover:bg-[#282828] disabled:opacity-45 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Tracking</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full bg-[#151515] text-white font-medium text-[13.5px] py-3 px-4 rounded-[6px] inline-flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#B7F000]" />
                      <span>Processing video with BoxMOT...</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="w-full text-[12px] font-medium text-[#666666] hover:text-[#151515] py-1 cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  </div>
                )}

                {submitError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-[6px] border border-[#C43D3D]/40 bg-[#C43D3D]/8 px-3 py-2.5 text-[12px] text-[#C43D3D]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
