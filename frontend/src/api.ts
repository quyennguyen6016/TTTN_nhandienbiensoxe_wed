const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export { API_BASE_URL };

export type Owner = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicles?: Vehicle[];
  createdAt: string;
  updatedAt: string;
};

export type Vehicle = {
  id: number;
  plateNumber: string;
  normalizedPlateNumber: string;
  ownerId: number | null;
  owner: Owner | null;
  vehicleType: string | null;
  brand: string | null;
  color: string | null;
  province: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CameraRecord = {
  id: number;
  name: string;
  sourceUrl: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecognitionLog = {
  id: number;
  plateNumber: string;
  normalizedPlateNumber: string;
  province: string | null;
  provinceCode: string | null;
  ownerNameSnapshot: string | null;
  confidence: number | null;
  imagePath: string | null;
  annotatedImagePath: string | null;
  recognizedAt: string;
  source: "IMAGE_UPLOAD" | "CAMERA_FRAME" | "CAMERA_STREAM";
  vehicle: {
    id: number;
    plateNumber: string;
    owner?: { fullName: string } | null;
  } | null;
  camera: { id: number; name: string } | null;
};

export type RecognitionSummary = {
  totalLogs: number;
  totalVehicles: number;
  totalOwners: number;
  totalCameras: number;
  recentLogs: RecognitionLog[];
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PaginatedLogs = {
  logs: RecognitionLog[];
  pagination: Pagination;
};

export type UploadRecognitionResponse = {
  recognition: {
    plate: string;
    location: string;
    province_code: string;
    time: string;
    confidence: number | null;
    bbox: number[] | null;
  };
  log: RecognitionLog;
  duplicateSkipped?: boolean;
};

export type OwnerPayload = {
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type VehiclePayload = {
  plateNumber: string;
  ownerId?: number | "";
  vehicleType?: string;
  brand?: string;
  color?: string;
  province?: string;
  note?: string;
};

export type CameraPayload = {
  name: string;
  sourceUrl?: string;
  location?: string;
  isActive: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

// ─── Lấy token từ sessionStorage (dùng chung với auth.ts) ────────────────────
function getAuthToken(): string | null {
  return sessionStorage.getItem("pv_token");
}

function assetUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

function normalizeLog(log: RecognitionLog): RecognitionLog {
  return {
    ...log,
    imagePath: assetUrl(log.imagePath),
    annotatedImagePath: assetUrl(log.annotatedImagePath),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  // Token hết hạn hoặc không hợp lệ → reload về trang login
  if (response.status === 401) {
    sessionStorage.removeItem("pv_token");
    sessionStorage.removeItem("pv_user");
    window.location.reload();
    throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Yêu cầu không thành công.");
  }
  return payload.data;
}

// ─── Hàm request trung tâm — tự động gắn token vào mọi request ───────────────
async function request<T>(path: string, init?: RequestInit) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      // Không set Content-Type cho FormData (browser tự set boundary)
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      // Tự động gắn token nếu có
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Cho phép override từ bên ngoài nếu cần
      ...init?.headers,
    },
  });

  return parseResponse<T>(response);
}

// ─── Như request() nhưng giữ lại field "pagination" từ response ──────────────
async function requestWithPagination<T>(path: string, init?: RequestInit): Promise<{ data: T; pagination: Pagination }> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    sessionStorage.removeItem("pv_token");
    sessionStorage.removeItem("pv_user");
    window.location.reload();
    throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
  }

  const payload = (await response.json()) as ApiEnvelope<T> & { pagination?: Pagination };
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Yêu cầu không thành công.");
  }

  return {
    data: payload.data,
    pagination: payload.pagination || { page: 1, pageSize: 50, totalCount: 0, totalPages: 1 },
  };
}

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

// ─── API functions — giữ nguyên signature, không cần truyền token ─────────────

export async function checkHealth() {
  return request<{ status: string; service: string }>("/health");
}

export async function fetchRecognitionSummary() {
  const summary = await request<RecognitionSummary>("/api/recognitions/summary");
  return {
    ...summary,
    recentLogs: summary.recentLogs.map(normalizeLog),
  };
}

export async function fetchRecognitionHistory(
  filters: {
    plateNumber?: string;
    cameraId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { data: logs, pagination } = await requestWithPagination<RecognitionLog[]>(
    `/api/recognitions${queryString({ page: 1, pageSize: 50, ...filters })}`
  );
  return { logs: logs.map(normalizeLog), pagination };
}

export async function deleteRecognition(id: number) {
  return request<void>(`/api/recognitions/${id}`, { method: "DELETE" });
}

// ─── USER: lịch sử nhận diện xe của riêng mình ────────────────────────────────
// Dùng chung request() + normalizeLog() để imagePath/annotatedImagePath
// được chuyển thành URL đầy đủ giống các hàm fetch khác.
export async function fetchMyHistory(page = 1, pageSize = 50) {
  const { data: logs, pagination } = await requestWithPagination<RecognitionLog[]>(
    `/api/me/history${queryString({ page, pageSize })}`
  );
  return { logs: logs.map(normalizeLog), pagination };
}

export async function uploadPlateImage(
  file: File,
  cameraId?: number | "",
  source: "IMAGE_UPLOAD" | "CAMERA_FRAME" = "IMAGE_UPLOAD"
) {
  const formData = new FormData();
  formData.append("image", file);
  if (cameraId) formData.append("cameraId", String(cameraId));
  formData.append("source", source);

  const data = await request<UploadRecognitionResponse>("/api/recognitions/image", {
    method: "POST",
    body: formData,
  });

  return { ...data, log: normalizeLog(data.log) };
}

export async function fetchOwners(search = "") {
  return request<Owner[]>(`/api/owners${queryString({ search })}`);
}

export async function saveOwner(payload: OwnerPayload, id?: number) {
  return request<Owner>(id ? `/api/owners/${id}` : "/api/owners", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteOwner(id: number) {
  return request<void>(`/api/owners/${id}`, { method: "DELETE" });
}

export async function fetchVehicles(search = "") {
  return request<Vehicle[]>(`/api/vehicles${queryString({ search })}`);
}

export async function saveVehicle(payload: VehiclePayload, id?: number) {
  return request<Vehicle>(id ? `/api/vehicles/${id}` : "/api/vehicles", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify({
      ...payload,
      ownerId: payload.ownerId || null,
      vehicleType: payload.vehicleType || "Xe máy",
    }),
  });
}

export async function deleteVehicle(id: number) {
  return request<void>(`/api/vehicles/${id}`, { method: "DELETE" });
}

export async function fetchCameras(search = "") {
  return request<CameraRecord[]>(`/api/cameras${queryString({ search })}`);
}

export async function saveCamera(payload: CameraPayload, id?: number) {
  return request<CameraRecord>(id ? `/api/cameras/${id}` : "/api/cameras", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
}

export async function setCameraActive(id: number, isActive: boolean) {
  return request<CameraRecord>(`/api/cameras/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteCamera(id: number) {
  return request<void>(`/api/cameras/${id}`, { method: "DELETE" });
}