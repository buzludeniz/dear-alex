const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const KEY = "dear-alex-device-id";

function deviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
  return id;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", "X-Device-Id": deviceId(), ...options.headers } });
  if (!response.ok) throw new Error(await response.text() || "Something went wrong.");
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { API, deviceId };
