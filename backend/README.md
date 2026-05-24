# Node.js Backend

Backend API for the license plate recognition system.

## Stack

- Node.js
- Express
- Prisma
- PostgreSQL
- Multer for image upload
- Python AI core through `ai/` package (`python -m ai.worker`, `python -m ai.recognize`)

## Setup

```powershell
cd backend
npm install
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/license_plate_db?schema=public"
PYTHON_EXECUTABLE=python
AI_RECOGNIZE_MODULE=ai.recognize
AI_WORKER_MODULE=ai.worker
AI_USE_WORKER=true
```

Create the PostgreSQL database:

```sql
CREATE DATABASE license_plate_db;
```

Run Prisma migration:

```powershell
npx prisma migrate dev --name init
```

Start the API:

```powershell
npm run dev
```

Health check:

```text
GET http://localhost:3000/health
```

## Main endpoints

```text
POST /api/recognitions/image
GET  /api/recognitions

GET  /api/vehicles
POST /api/vehicles

GET  /api/owners
POST /api/owners

GET  /api/cameras
POST /api/cameras
```

## Upload image request

Use `multipart/form-data`:

```text
POST http://localhost:3000/api/recognitions/image
field: image = your_image.jpg
field: cameraId = optional camera id
```

Response shape:

```json
{
  "success": true,
  "data": {
    "recognition": {
      "plate": "51F-123.45",
      "owner": "Temporary owner",
      "location": "TP Ho Chi Minh",
      "province_code": "51F",
      "confidence": 0.92,
      "bbox": [10, 20, 200, 90]
    },
    "log": {}
  }
}
```

## Notes

- The backend calls the Python package from the project root via `python -m ai.worker`
  (persistent, models loaded once) with fallback to `python -m ai.recognize`.
- Database design details are in `../docs/postgresql-design.md`.
- API details are in `../docs/backend-api.md`.
