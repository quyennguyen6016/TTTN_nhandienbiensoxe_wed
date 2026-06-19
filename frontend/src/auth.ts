// ─── Auth API ─────────────────────────────────────────────────────────────────
// Thêm file này vào frontend/src/auth.ts

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface AuthUser {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  role: "ADMIN" | "USER" | "PENDING";
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

// ─── Lưu / lấy / xóa token ───────────────────────────────────────────────────
export function saveAuth(token: string, user: AuthUser) {
  sessionStorage.setItem("pv_token", token);
  sessionStorage.setItem("pv_user",  JSON.stringify(user));
}

export function getToken(): string | null {
  return sessionStorage.getItem("pv_token");
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem("pv_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearAuth() {
  sessionStorage.removeItem("pv_token");
  sessionStorage.removeItem("pv_user");
}

export function isLoggedIn(): boolean {
  return Boolean(getToken() && getAuthUser());
}

// ─── API calls ────────────────────────────────────────────────────────────────
export async function apiLogin(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại.");
  return data as LoginResult;
}

export async function apiRegister(payload: {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Đăng ký thất bại.");
  return data;
}
