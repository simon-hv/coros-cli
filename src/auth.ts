import { createHash } from "node:crypto";
import { API_BASES, loadConfig, saveConfig, type Config } from "./config.js";

const RESULT_SUCCESS = "0000";
const RESULT_WRONG_REGION = "1019";

function hashPassword(password: string): string {
  return createHash("md5").update(password).digest("hex");
}

async function detectRegion(token: string): Promise<string> {
  for (const [region, base] of Object.entries(API_BASES)) {
    const resp = await fetch(`${base}/account/query`, {
      headers: { accesstoken: token },
    });
    const data = await resp.json();
    const code = data.result ?? data.apiCode;
    if (code !== RESULT_WRONG_REGION) return region;
  }
  return "global";
}

export async function login(email: string, password: string): Promise<Config> {
  const pwdHash = hashPassword(password);

  const resp = await fetch(`${API_BASES.global}/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: email, accountType: 2, pwd: pwdHash }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  if (data.result !== RESULT_SUCCESS && data.apiCode !== RESULT_SUCCESS) {
    throw new Error(`Login failed: ${data.message ?? JSON.stringify(data)}`);
  }

  const accessToken: string = data.data.accessToken;
  const region = await detectRegion(accessToken);

  const config: Config = {
    access_token: accessToken,
    region,
    email,
    pwd_hash: pwdHash,
  };
  saveConfig(config);
  return config;
}

export async function relogin(): Promise<string> {
  const config = loadConfig();
  if (!config.email || !config.pwd_hash) {
    throw new Error("No stored credentials. Run: coros login");
  }

  const resp = await fetch(`${API_BASES.global}/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account: config.email, accountType: 2, pwd: config.pwd_hash }),
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();

  if (data.result !== RESULT_SUCCESS && data.apiCode !== RESULT_SUCCESS) {
    throw new Error("Auto-relogin failed. Run: coros login");
  }

  const accessToken: string = data.data.accessToken;
  saveConfig({ ...config, access_token: accessToken });
  return accessToken;
}
