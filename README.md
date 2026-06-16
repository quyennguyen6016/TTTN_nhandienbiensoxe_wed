# License Plate Recognition AI Core

Python AI core for Vietnamese license plate recognition. The old Tkinter desktop
UI has been removed because the project is being migrated to:

- React + Vite frontend
- Node.js backend
- PostgreSQL database
- Python AI recognition core

## Current stack

- Python
- OpenCV
- Ultralytics YOLO
- PaddleOCR
- python-dotenv

## Important files

- `backend/`: Node.js API server with Express, Prisma, and PostgreSQL.
- `frontend/`: React + Vite user interface.
- `ai/`: Python AI package (config, service, worker, CLI, province maps).
- `runs/detect/.../weights/best.pt`: trained YOLO model weights.

### Python AI layout

```text
ai/
  config.py          # .env settings (model path, GPU, inference size)
  service.py         # PlateRecognitionService (YOLO + PaddleOCR)
  worker.py          # long-running worker for Node.js backend
  recognize.py       # one-shot CLI (JSON output)
  data/
    bien_so_map.py       # province codes without accents
    bien_so_map_dau.py   # province codes with Vietnamese diacritics
```

Owner names come from PostgreSQL (`Vehicle` → `Owner`). Plates without a registered vehicle are shown as **Vãng lai** in the API/UI.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` if your model path, camera index, or GPU setting is different.

PaddleOCR uses CPU by default in this project. To enable GPU, install the
matching GPU PaddlePaddle package for your CUDA setup and set:

```env
PADDLEOCR_USE_GPU=true
```

## Run image recognition from CLI

```powershell
python -m ai.recognize path/to/image.jpg --save-annotated outputs/result.jpg
```

The command prints JSON. The Node.js backend calls `python -m ai.worker` (persistent)
or `python -m ai.recognize` (fallback) from the project root.

## Node.js backend

See `backend/README.md`.
