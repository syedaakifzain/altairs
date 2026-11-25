# Altairs (Argus-X)

A high-performance Multi-Object Tracking (MOT) and computer vision pipeline powered by deep learning detectors (YOLOv8, YOLO11, YOLOX) and state-of-the-art tracking algorithms (ByteTrack, BoT-SORT, DeepOCSORT).

---

## 🚀 Features

- **Multi-Object Tracking (MOT)**: Assigns persistent identities across video frames to follow people, vehicles, and objects.
- **Pluggable Detectors**: Pre-integrated with YOLOv8, YOLO11, and YOLOX.
- **Advanced Trackers**: Built-in support for ByteTrack, BoT-SORT, StrongSORT, and OCSORT.
- **Docker & Docker Compose**: Fully containerized for easy deployment on both CPU and NVIDIA GPU systems.
- **REST Service**: Includes a headless HTTP microservice for web-based or API-driven video processing.

---

## 🛠️ Quick Start with Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- (Optional) NVIDIA GPU with drivers installed for GPU acceleration.

### 1. Run Tracking on a Video

Place your video file in the `data/` folder (e.g., `data/video.mp4`):

```bash
# CPU Execution
docker compose run --rm tracker boxmot track \
  --source data/video.mp4 \
  --detector yolov8n \
  --tracker bytetrack \
  --device cpu \
  --project runs/docker \
  --save \
  --save-json
```

```bash
# GPU Execution (NVIDIA)
docker compose run --rm tracker-gpu boxmot track \
  --source data/video.mp4 \
  --detector yolov8n \
  --tracker bytetrack \
  --device 0 \
  --project runs/docker-gpu \
  --save \
  --save-json
```

---

## 📦 Outputs

Results are automatically saved to `runs/`:
- **`tracks.mp4`**: Annotated video with colored bounding boxes and persistent tracking IDs.
- **`tracks.jsonl`**: Detailed frame-by-frame JSON Lines log containing bounding boxes, track IDs, classes, and detection confidence.

---

## 🌐 Running as a Background HTTP Service

To start the tracking microservice:

```bash
docker compose up -d service
```

- **Health check**:
  ```bash
  curl http://localhost:8000/healthz
  ```
- **Stop service**:
  ```bash
  docker compose down
  ```

---

## 💻 Local Development (Without Docker)

Requires Python 3.10 - 3.13:

```bash
# Install dependencies
pip install -e .

# Run CLI
boxmot track --source path/to/video.mp4 --detector yolov8n --tracker bytetrack --save
```

---

## 📂 Project Structure

```
├── boxmot/             # Core tracking engine & algorithms
│   ├── appearance/     # ReID feature extractors
│   ├── trackers/       # Tracking implementations (ByteTrack, BoT-SORT, etc.)
│   └── engine/         # Pipeline execution & CLI
├── docker/             # Docker build definitions
├── docker-compose.yml  # Docker Compose configuration
├── assets/             # Sample datasets & test frames
└── README.md           # Project documentation
```
