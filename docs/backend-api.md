# Backend API

Base URL:

```text
http://localhost:3000
```

All JSON responses use:

```json
{
  "success": true,
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Health

```text
GET /health
```

## Owners

```text
GET    /api/owners?search=
GET    /api/owners/:id
POST   /api/owners
PUT    /api/owners/:id
DELETE /api/owners/:id
```

Create/update body:

```json
{
  "fullName": "Nguyen Van A",
  "phone": "0900000000",
  "email": "a@example.com",
  "address": "Ho Chi Minh City"
}
```

## Vehicles

```text
GET    /api/vehicles?search=
GET    /api/vehicles/:id
POST   /api/vehicles
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
```

Create/update body:

```json
{
  "plateNumber": "51F-123.45",
  "ownerId": 1,
  "vehicleType": "car",
  "brand": "Toyota",
  "color": "White",
  "province": "TP Ho Chi Minh",
  "note": "VIP"
}
```

The backend automatically creates `normalizedPlateNumber`, for example:

```text
51F-123.45 -> 51F12345
```

## Cameras

```text
GET    /api/cameras?search=
GET    /api/cameras/:id
POST   /api/cameras
PUT    /api/cameras/:id
PATCH  /api/cameras/:id/active
DELETE /api/cameras/:id
```

Create/update body:

```json
{
  "name": "Gate 1",
  "sourceUrl": "browser-webcam",
  "location": "Main gate",
  "isActive": true
}
```

Active toggle body:

```json
{
  "isActive": false
}
```

## Recognitions

```text
GET    /api/recognitions
GET    /api/recognitions/summary
GET    /api/recognitions/:id
POST   /api/recognitions/image
DELETE /api/recognitions/:id
```

List filters:

```text
GET /api/recognitions?plateNumber=51F12345&cameraId=1&vehicleId=1&source=IMAGE_UPLOAD&from=2026-05-01&to=2026-05-21&limit=50
```

Upload image request:

```text
multipart/form-data
field image: image file
field cameraId: optional camera id
```

Example:

```powershell
curl.exe -X POST http://localhost:3000/api/recognitions/image `
  -F "image=@F:\path\to\image.jpg"
```
