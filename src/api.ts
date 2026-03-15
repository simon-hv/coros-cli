import { getApiBase, getToken } from "./config.js";
import { relogin } from "./auth.js";

const RESULT_SUCCESS = "0000";
const RESULT_TOKEN_EXPIRED = "0102";

export class AuthError extends Error { name = "AuthError" as const; }
export class ApiError extends Error { name = "ApiError" as const; }

function requireToken(): string {
  const token = getToken();
  if (!token) throw new AuthError("Not logged in. Run: coros login");
  return token;
}

function handleResponse(data: any): any {
  const code = data.result ?? data.apiCode;
  if (code === RESULT_TOKEN_EXPIRED) throw new TokenExpiredError();
  if (code !== RESULT_SUCCESS && code != null) throw new ApiError(data.message ?? JSON.stringify(data));
  return data;
}

class TokenExpiredError extends Error {}

async function request(method: string, path: string, params?: Record<string, string | number>): Promise<any> {
  const url = new URL(`${getApiBase()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }

  async function doRequest(token: string) {
    const resp = await fetch(url, { method, headers: { accesstoken: token } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return handleResponse(await resp.json());
  }

  try {
    return await doRequest(requireToken());
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      const newToken = await relogin();
      return await doRequest(newToken);
    }
    throw e;
  }
}

export async function listActivities(page = 1, size = 20): Promise<any> {
  return request("GET", "/activity/query", { size, pageNumber: page });
}

export async function getActivityDetail(labelId: string, sportType: number): Promise<any> {
  return request("POST", "/activity/detail/query", { labelId, sportType });
}

export async function resolveSportType(labelId: string): Promise<number | null> {
  const data = await listActivities(1, 100);
  const match = (data?.data?.dataList ?? []).find((a: any) => a.labelId === labelId);
  return match?.sportType ?? null;
}

export async function getAnalyse(): Promise<any> {
  return request("GET", "/analyse/query");
}

export async function getDashboard(): Promise<any> {
  return request("GET", "/dashboard/query");
}

export async function getDashboardDetail(): Promise<any> {
  return request("GET", "/dashboard/detail/query");
}
