"""Non-invasive HTTP video tracking bridge for the existing BoxMOT (argus-x) engine.

This standalone FastAPI adapter wraps ``boxmot.engine.tracking.workflow.run_track``
(or Docker ``boxmot track`` when local Python dependencies are absent) without modifying
any files inside ``argus-x``.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import uuid
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

ROOT_DIR = Path(__file__).resolve().parent.parent
ARGUS_DIR = ROOT_DIR / "argus-x"
JOBS_DIR = Path(os.getenv("PS05_JOBS_DIR", str(ARGUS_DIR / "runs" / "web_jobs"))).resolve()
JOBS_DIR.mkdir(parents=True, exist_ok=True)

if str(ARGUS_DIR) not in sys.path:
    sys.path.insert(0, str(ARGUS_DIR))

SUPPORTED_DETECTORS = (
    {"id": "yolov8n", "label": "YOLOv8n (Ultralytics)"},
    {"id": "yolov8s", "label": "YOLOv8s (Ultralytics)"},
    {"id": "yolo11n", "label": "YOLO11n (Ultralytics)"},
    {"id": "yolo11s", "label": "YOLO11s (Ultralytics)"},
    {"id": "yolox-x-mot17/ablation", "label": "YOLOX-X MOT17"},
    {"id": "rtdetr-l", "label": "RT-DETR-L"},
)
SUPPORTED_DETECTOR_IDS = {item["id"] for item in SUPPORTED_DETECTORS}

SUPPORTED_TRACKERS = (
    {"id": "bytetrack", "label": "ByteTrack"},
    {"id": "botsort", "label": "BoT-SORT"},
    {"id": "ocsort", "label": "OC-SORT"},
    {"id": "deepocsort", "label": "Deep OC-SORT"},
    {"id": "strongsort", "label": "StrongSORT"},
    {"id": "hybridsort", "label": "Hybrid-SORT"},
    {"id": "boosttrack", "label": "BoostTrack"},
    {"id": "occluboost", "label": "OccluBoost"},
    {"id": "sfsort", "label": "SFSORT"},
)
SUPPORTED_TRACKER_IDS = {item["id"] for item in SUPPORTED_TRACKERS}

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
MAX_UPLOAD_BYTES = int(os.getenv("PS05_MAX_UPLOAD_BYTES", str(500 * 1024 * 1024)))

app = FastAPI(
    title="PS05 BoxMOT Video Bridge",
    version="1.0.0",
    description="Additive HTTP video-upload bridge for the BoxMOT tracking engine.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("PS05_ALLOW_ORIGINS", "*").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class ExecutionBackend:
    mode: str  # "local" | "docker" | "unavailable"
    detail: str


def _detect_execution_backend() -> ExecutionBackend:
    try:
        import boxmot.engine.tracking.workflow  # noqa: F401
        import torch  # noqa: F401
        import ultralytics  # noqa: F401

        return ExecutionBackend("local", "Direct Python BoxMOT run_track runtime")
    except Exception:
        pass

    docker_bin = shutil.which("docker")
    if docker_bin:
        try:
            probe = subprocess.run(
                [docker_bin, "image", "inspect", "boxmot/boxmot:latest-cpu"],
                capture_output=True,
                text=True,
                timeout=4,
            )
            if probe.returncode == 0:
                return ExecutionBackend("docker", "Docker Compose boxmot/boxmot:latest-cpu runner")
        except Exception:
            pass

    return ExecutionBackend(
        "unavailable",
        "Neither local BoxMOT+Ultralytics runtime nor Docker boxmot/boxmot:latest-cpu image is accessible.",
    )


def _normalize_video_orientation(video_path: Path) -> Path:
    """If video has rotation metadata (e.g. mobile 90° portrait), bake the rotation into frames.

    This ensures BoxMOT Docker and frontend canvas overlays both operate in the same
    coordinate space and orientation.
    """
    try:
        import cv2

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return video_path

        rotate_meta = cap.get(cv2.CAP_PROP_ORIENTATION_META)
        # Only rewrite if there is a non-zero rotation metadata
        if rotate_meta not in (90.0, 180.0, 270.0):
            cap.release()
            return video_path

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        ret, frame = cap.read()
        if not ret or frame is None:
            cap.release()
            return video_path

        h, w = frame.shape[:2]
        out_path = video_path.with_name(f"normalized_{video_path.name}")
        writer = cv2.VideoWriter(
            str(out_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (w, h),
        )
        if not writer.isOpened():
            cap.release()
            return video_path

        writer.write(frame)
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break
            writer.write(frame)

        cap.release()
        writer.release()
        if out_path.exists() and out_path.stat().st_size > 0:
            return out_path
    except Exception:
        pass
    return video_path


def _summarize_jsonl(jsonl_path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    frames: list[dict[str, Any]] = []
    track_lengths: dict[int, int] = {}
    total_detections = 0

    with jsonl_path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            record = json.loads(stripped)
            frames.append(record)
            for item in record.get("tracks", []):
                tid = int(item["track_id"])
                track_lengths[tid] = track_lengths.get(tid, 0) + 1
                total_detections += 1

    unique_ids = sorted(track_lengths.keys())
    total_frames = len(frames)
    total_objects = len(unique_ids)
    avg_track_length = (
        round(sum(track_lengths.values()) / total_objects, 1) if total_objects > 0 else 0.0
    )
    summary = {
        "total_objects": total_objects,
        "total_frames": total_frames,
        "tracking_ids": total_objects,
        "unique_track_ids": unique_ids,
        "avg_track_length": avg_track_length,
        "total_track_observations": total_detections,
    }
    return frames, summary


def _transcode_browser_h264(raw_video: Path) -> Path:
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        return raw_video
    h264_path = raw_video.with_name("tracks_h264.mp4")
    proc = subprocess.run(
        [
            ffmpeg_bin,
            "-y",
            "-i",
            str(raw_video),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(h264_path),
        ],
        capture_output=True,
        text=True,
    )
    if proc.returncode == 0 and h264_path.exists() and h264_path.stat().st_size > 0:
        return h264_path
    return raw_video


def _run_local_boxmot(
    source_path: Path,
    job_dir: Path,
    detector: str,
    tracker: str,
    conf: float,
) -> tuple[Path, Path]:
    from boxmot.engine.tracking.workflow import run_track

    detector_ref: str | Path = detector
    if detector == "yolov8n" and (ARGUS_DIR / "models" / "yolov8n.pt").is_file():
        detector_ref = ARGUS_DIR / "models" / "yolov8n.pt"
    elif detector == "yolox-x-mot17/ablation" and (ARGUS_DIR / "models" / "yolox_x_MOT17_ablation.pt").is_file():
        detector_ref = ARGUS_DIR / "models" / "yolox_x_MOT17_ablation.pt"

    run = run_track(
        source=source_path,
        detector=detector_ref,
        tracker=tracker,
        conf=conf,
        project=job_dir,
        name="output",
        exist_ok=True,
        save=True,
        save_json=True,
        save_txt=True,
    )
    if run.video_path is None or not run.video_path.is_file():
        raise RuntimeError("BoxMOT completed without producing tracks.mp4.")
    if run.json_path is None or not run.json_path.is_file():
        raise RuntimeError("BoxMOT completed without producing tracks.jsonl.")
    return run.video_path, run.json_path


def _run_docker_boxmot(
    source_rel_to_argus: str,
    job_rel_to_argus: str,
    detector: str,
    tracker: str,
    conf: float,
) -> tuple[Path, Path]:
    docker_bin = shutil.which("docker")
    if not docker_bin:
        raise RuntimeError("Docker executable not found.")

    detector_arg = detector
    if detector == "yolov8n" and (ARGUS_DIR / "models" / "yolov8n.pt").is_file():
        detector_arg = "models/yolov8n.pt"

    target_dir = ARGUS_DIR / job_rel_to_argus

    cmd = [
        docker_bin,
        "compose",
        "-f",
        str(ARGUS_DIR / "docker-compose.yml"),
        "run",
        "--rm",
        "tracker",
        "boxmot",
        "track",
        "--source",
        source_rel_to_argus,
        "--detector",
        detector_arg,
        "--tracker",
        tracker,
        "--conf",
        str(conf),
        "--device",
        "cpu",
        "--project",
        job_rel_to_argus,
        "--save",
        "--save-json",
    ]
    proc = subprocess.run(cmd, cwd=str(ARGUS_DIR), capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or "Docker tracking execution failed.")

    # BoxMOT saves output either directly in the project directory or in a subfolder (e.g., output or exp)
    possible_dirs = [
        target_dir / "output",
        target_dir,
        target_dir / "exp",
    ]
    # Also scan recursively for tracks.mp4 and tracks.jsonl in target_dir
    found_videos = list(target_dir.rglob("tracks.mp4"))
    found_jsons = list(target_dir.rglob("tracks.jsonl"))

    video_path = found_videos[0] if found_videos else (target_dir / "tracks.mp4")
    json_path = found_jsons[0] if found_jsons else (target_dir / "tracks.jsonl")

    if not video_path.is_file() or not json_path.is_file():
        # Fallback check across possible_dirs
        for d in possible_dirs:
            vp = d / "tracks.mp4"
            jp = d / "tracks.jsonl"
            if vp.is_file() and jp.is_file():
                video_path, json_path = vp, jp
                break

    if not video_path.is_file() or not json_path.is_file():
        raise RuntimeError("Docker tracking finished without expected output artifacts.")
    return video_path, json_path


@app.get("/")
def root_index() -> dict[str, Any]:
    return {
        "service": "PS05 BoxMOT Video Bridge",
        "status": "online",
        "endpoints": {
            "health": "/healthz",
            "ready": "/readyz",
            "track": "/v1/track/video",
            "docs": "/docs"
        }
    }


@app.get("/healthz")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def readiness() -> dict[str, Any]:
    backend = _detect_execution_backend()
    return {
        "status": "ready" if backend.mode != "unavailable" else "degraded",
        "execution_mode": backend.mode,
        "detail": backend.detail,
        "supports_video_upload": True,
        "detectors": SUPPORTED_DETECTORS,
        "trackers": SUPPORTED_TRACKERS,
    }


@app.post("/v1/track/video")
async def track_video(
    file: UploadFile = File(...),
    detector: str = Form("yolov8n"),
    tracker: str = Form("bytetrack"),
    conf: float = Form(0.25),
) -> JSONResponse:
    if detector not in SUPPORTED_DETECTOR_IDS:
        raise HTTPException(status_code=422, detail=f"Unsupported detector: {detector}")
    if tracker not in SUPPORTED_TRACKER_IDS:
        raise HTTPException(status_code=422, detail=f"Unsupported tracker: {tracker}")
    if not 0.05 <= conf <= 0.95:
        raise HTTPException(status_code=422, detail="Confidence threshold must be between 0.05 and 0.95.")

    filename = file.filename or "upload.mp4"
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file format '{suffix}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    backend = _detect_execution_backend()
    if backend.mode == "unavailable":
        raise HTTPException(status_code=503, detail=backend.detail)

    job_id = uuid.uuid4().hex[:12]
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    input_path = job_dir / f"input{suffix}"

    written = 0
    try:
        with input_path.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Uploaded video exceeds maximum allowed size.")
                out.write(chunk)
    except HTTPException:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise

    try:
        # Pre-normalize orientation for mobile/portrait videos with metadata tags
        proc_input_path = _normalize_video_orientation(input_path)

        if backend.mode == "local":
            raw_video, jsonl_path = _run_local_boxmot(proc_input_path, job_dir, detector, tracker, conf)
        else:
            src_rel = proc_input_path.relative_to(ARGUS_DIR).as_posix()
            job_rel = job_dir.relative_to(ARGUS_DIR).as_posix()
            raw_video, jsonl_path = _run_docker_boxmot(src_rel, job_rel, detector, tracker, conf)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"BoxMOT tracking failed: {exc}") from exc

    playable_video = _transcode_browser_h264(raw_video)
    frames, summary = _summarize_jsonl(jsonl_path)

    metadata = {
        "job_id": job_id,
        "filename": filename,
        "detector": detector,
        "tracker": tracker,
        "conf": conf,
        "execution_mode": backend.mode,
        "video_file": str(playable_video),
        "jsonl_file": str(jsonl_path),
        "summary": summary,
    }
    (job_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return JSONResponse(
        {
            "job_id": job_id,
            "filename": filename,
            "detector": detector,
            "tracker": tracker,
            "execution_mode": backend.mode,
            "summary": summary,
            "frames": frames,
            "video_url": f"/v1/jobs/{job_id}/video",
            "jsonl_url": f"/v1/jobs/{job_id}/tracks",
            "download_url": f"/v1/jobs/{job_id}/download",
        }
    )


def _load_job_metadata(job_id: str) -> dict[str, Any]:
    if not job_id.isalnum():
        raise HTTPException(status_code=400, detail="Invalid job identifier.")
    meta_path = JOBS_DIR / job_id / "metadata.json"
    if not meta_path.is_file():
        raise HTTPException(status_code=404, detail=f"Job {job_id!r} not found.")
    return json.loads(meta_path.read_text(encoding="utf-8"))


@app.get("/v1/jobs/{job_id}/video")
async def get_job_video(job_id: str) -> FileResponse:
    meta = _load_job_metadata(job_id)
    video_path = Path(meta["video_file"])
    if not video_path.is_file():
        raise HTTPException(status_code=404, detail="Processed video file not found.")
    return FileResponse(video_path, media_type="video/mp4", filename=f"ps05_{job_id}_tracks.mp4")


@app.get("/v1/jobs/{job_id}/tracks")
async def get_job_tracks(job_id: str) -> FileResponse:
    meta = _load_job_metadata(job_id)
    jsonl_path = Path(meta["jsonl_file"])
    if not jsonl_path.is_file():
        raise HTTPException(status_code=404, detail="Tracks JSONL file not found.")
    return FileResponse(jsonl_path, media_type="application/x-ndjson", filename=f"ps05_{job_id}_tracks.jsonl")


@app.get("/v1/jobs/{job_id}/download")
async def download_job_bundle(job_id: str) -> FileResponse:
    meta = _load_job_metadata(job_id)
    job_dir = JOBS_DIR / job_id
    bundle_path = job_dir / f"ps05_{job_id}_results.zip"
    video_path = Path(meta["video_file"])
    jsonl_path = Path(meta["jsonl_file"])
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        if video_path.is_file():
            archive.write(video_path, arcname="tracks.mp4")
        if jsonl_path.is_file():
            archive.write(jsonl_path, arcname="tracks.jsonl")
        archive.write(job_dir / "metadata.json", arcname="summary.json")
    return FileResponse(bundle_path, media_type="application/zip", filename=bundle_path.name)
