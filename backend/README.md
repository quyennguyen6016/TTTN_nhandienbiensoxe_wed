# Node.js Backend

Backend API for the license plate recognition system.

## Stack

- Node.js
- Express
- Prisma
- PostgreSQL
- Multer for image upload
- Python AI core through `recognize_image.py`

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
AI_SCRIPT_PATH=../recognize_image.py
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

- The backend currently calls the Python AI core with `child_process`.
- This is good enough for MVP upload recognition.
- For realtime camera, the next upgrade should wrap the Python AI core in a
  long-running Python HTTP service so the model is loaded once instead of once
  per request.
- Database design details are in `../docs/postgresql-design.md`.
- API details are in `../docs/backend-api.md`.
