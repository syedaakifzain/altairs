# PS05 Video Tracking Backend Bridge

This standalone FastAPI adapter exposes video-upload tracking endpoints (`POST /v1/track/video`) backed by the untouched `argus-x` BoxMOT engine (`boxmot.engine.tracking.workflow.run_track` or the `boxmot/boxmot:latest-cpu` Docker service).

## Why this adapter exists separately from `argus-x/boxmot/engine/service`

The upstream `boxmot.engine.service` FastAPI application provides stateless/stateful frame-by-frame association from *externally supplied* detections (`POST /v1/streams/{stream_id}/sessions/{session_id}/frames`), and does not expose a browser-compatible video upload + detector + tracker batch endpoint. Keeping this bridge in `../backend` preserves the `argus-x` codebase and all 514 tests completely untouched.

## Running locally

```powershell
# Using Python with BoxMOT + Ultralytics installed (or Docker boxmot/boxmot:latest-cpu available)
pip install -r z:\altairs\backend\requirements.txt
uvicorn app:app --app-dir z:\altairs\backend --host 0.0.0.0 --port 8000
```
