export interface ModelOption {
  id: string;
  label: string;
  note?: string;
}

export interface BackendReadiness {
  status: string;
  execution_mode?: 'local' | 'docker' | 'unavailable';
  detail?: string;
  supports_video_upload?: boolean;
  profile?: string;
  tracker?: string;
  device?: string;
  requires_image?: boolean;
  active_streams?: number;
  max_streams?: number;
  detectors?: ModelOption[];
  trackers?: ModelOption[];
}

export interface BackendConnectionState {
  online: boolean;
  supportsVideoUpload: boolean;
  modeLabel: string;
  detail: string;
  readiness: BackendReadiness | null;
}

export interface TrackItem {
  track_id: number;
  class_id: number;
  detection_index: number;
  geometry: number[];
  geometry_mode: 'aabb' | 'obb' | string;
  score: number;
}

export interface FrameTrackRecord {
  frame_index: number;
  sample_id: string;
  sequence_id: string;
  timestamp_s: number | null;
  tracks: TrackItem[];
}

export interface TrackingSummary {
  total_objects: number;
  total_frames: number;
  tracking_ids: number;
  unique_track_ids: number[];
  avg_track_length: number;
  total_track_observations?: number;
}

export interface TrackingJobResult {
  job_id: string;
  filename: string;
  detector: string;
  tracker: string;
  execution_mode: string;
  summary: TrackingSummary;
  frames: FrameTrackRecord[];
  video_url: string;
  jsonl_url: string;
  download_url: string;
  local_preview_url?: string;
}

export interface SelectedVideoMeta {
  file: File;
  previewUrl: string;
  width: number | null;
  height: number | null;
  duration: number | null;
}
