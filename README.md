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
- EasyOCR
- python-dotenv

## Important files

- `backend/`: Node.js API server with Express, Prisma, and PostgreSQL.
- `frontend/`: React + Vite user interface.
- `chuc_nang.py`: reusable AI recognition service.
- `app_config.py`: environment-based configuration.
- `recognize_image.py`: CLI helper that returns JSON for a recognized image.
- `bien_so_map.py`: province-code map without accents.
- `bien_so_map_dau.py`: province-code map with Vietnamese display names.
- `runs/detect/.../weights/best.pt`: trained YOLO model weights.

Owner names come from PostgreSQL (`Vehicle` → `Owner`). Plates without a registered vehicle are shown as **Vãng lai** in the API/UI.

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` if your model path, camera index, or GPU setting is different.

If the machine does not have a compatible CUDA/GPU setup, set:

```env
EASYOCR_GPU=false
```

## Run image recognition from CLI

```powershell
python recognize_image.py path/to/image.jpg --save-annotated outputs/result.jpg
```

The command prints JSON. In the first Node.js backend version, Node can call this
script through `child_process`. Later, this same core can be wrapped in a small
Python HTTP service if realtime camera performance needs to improve.

## Node.js backend

See `backend/README.md`.
