import type {
  BackendConnectionState,
  BackendReadiness,
  ModelOption,
  TrackingJobResult,
} from '../types';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
export const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/+$/, '') : '/api';

// Verified detectors & trackers actually supported in argus-x (BoxMOT v26)
export const SUPPORTED_DETECTORS: ModelOption[] = [
  { id: 'yolov8n', label: 'YOLOv8n' },
  { id: 'yolov8s', label: 'YOLOv8s' },
  { id: 'yolo11n', label: 'YOLO11n' },
  { id: 'yolo11s', label: 'YOLO11s' },
  { id: 'yolox-x-mot17/ablation', label: 'YOLOX-X (MOT17)' },
  { id: 'rtdetr-l', label: 'RT-DETR-L' },
];

export const SUPPORTED_TRACKERS: ModelOption[] = [
  { id: 'botsort', label: 'BoT-SORT' },
  { id: 'bytetrack', label: 'ByteTrack' },
  { id: 'ocsort', label: 'OC-SORT' },
  { id: 'deepocsort', label: 'Deep OC-SORT' },
  { id: 'strongsort', label: 'StrongSORT' },
  { id: 'hybridsort', label: 'Hybrid-SORT' },
  { id: 'boosttrack', label: 'BoostTrack' },
  { id: 'occluboost', label: 'OccluBoost' },
  { id: 'sfsort', label: 'SFSORT' },
];

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export async function fetchBackendStatus(): Promise<BackendConnectionState> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);

  try {
    const healthRes = await fetch(resolveApiUrl('/healthz'), {
      signal: controller.signal,
    });
    if (!healthRes.ok) {
      return {
        online: false,
        supportsVideoUpload: false,
        modeLabel: 'Backend Error',
        detail: `Health endpoint returned HTTP ${healthRes.status}.`,
        readiness: null,
      };
    }

    const readyRes = await fetch(resolveApiUrl('/readyz'), {
      signal: controller.signal,
    });
    if (!readyRes.ok) {
      return {
        online: true,
        supportsVideoUpload: false,
        modeLabel: 'Service Online (No Readiness Metadata)',
        detail: `Readiness endpoint returned HTTP ${readyRes.status}.`,
        readiness: null,
      };
    }

    const readiness = (await readyRes.json()) as BackendReadiness;

    if (readiness.supports_video_upload) {
      const ready = readiness.execution_mode !== 'unavailable' && readiness.status === 'ready';
      return {
        online: true,
        supportsVideoUpload: ready,
        modeLabel: ready
          ? `BoxMOT Video Bridge (${readiness.execution_mode === 'docker' ? 'Docker' : 'Python'})`
          : 'Bridge Degraded (Runner Unavailable)',
        detail:
          readiness.detail ||
          (ready
            ? 'Ready for video upload and BoxMOT tracking.'
            : 'Video bridge is running, but BoxMOT runtime is unavailable.'),
        readiness,
      };
    }

    // Upstream boxmot.engine.service only supports frame-level detection payloads
    return {
      online: true,
      supportsVideoUpload: false,
      modeLabel: `BoxMOT Frame Service (${readiness.tracker || 'bytetrack'})`,
      detail:
        'Upstream boxmot.engine.service accepts pre-detected frame matrices (/v1/streams/.../frames). Start the PS05 Video Bridge (backend/app.py) to enable direct video file uploads.',
      readiness,
    };
  } catch {
    return {
      online: false,
      supportsVideoUpload: false,
      modeLabel: 'Backend Offline',
      detail:
        'Tracking backend is unreachable. Start backend/app.py on port 8000 (or configure VITE_API_BASE_URL) to run BoxMOT video tracking.',
      readiness: null,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export class TrackingApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'TrackingApiError';
    this.status = status;
  }
}

export async function submitVideoTracking(
  file: File,
  detector: string,
  tracker: string,
  conf = 0.25,
  signal?: AbortSignal,
): Promise<TrackingJobResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('detector', detector);
  formData.append('tracker', tracker);
  formData.append('conf', String(conf));

  let response: Response;
  try {
    response = await fetch(resolveApiUrl('/v1/track/video'), {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TrackingApiError('Tracking request was cancelled.', 0);
    }
    throw new TrackingApiError(
      'Unable to connect to the BoxMOT tracking backend. Ensure the video tracking service is running and reachable.',
      0,
    );
  }

  if (!response.ok) {
    let detail = `Backend returned HTTP ${response.status}.`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload?.detail) detail = payload.detail;
    } catch {
      // Keep status message
    }
    if (response.status === 404) {
      detail =
        'The connected service does not expose /v1/track/video. Start backend/app.py to process uploaded videos through BoxMOT.';
    }
    throw new TrackingApiError(detail, response.status);
  }

  return (await response.json()) as TrackingJobResult;
}
