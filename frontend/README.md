# PlateVision AI Frontend

React + Vite frontend for the license plate recognition system.

## Setup

```powershell
cd frontend
npm install
copy .env.example .env
```

Default API URL:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Run

Start backend first:

```powershell
cd ../backend
npm run dev
```

Start frontend:

```powershell
cd ../frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## Features

- Dashboard overview with metrics and recent recognition history.
- Dedicated **Nhận diện ảnh** screen: upload or drag-drop, call `POST /api/recognitions/image`, show annotated result.
- Dedicated **Camera realtime** screen: laptop webcam, manual frame scan, and slow auto scan.
- Full recognition history table with plate, camera, and date filters.
- Vehicle CRUD screen.
- Owner CRUD screen.
- Camera/settings screen with active toggle.
