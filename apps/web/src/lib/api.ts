import { fetchAuthSession } from "aws-amplify/auth";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function authHeader(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = {
    "content-type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = (data && typeof data === "object" && "message" in data && (data as { message?: string }).message) || `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return data as T;
}
