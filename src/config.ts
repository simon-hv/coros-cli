import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "coros-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const API_BASES: Record<string, string> = {
  global: "https://teamapi.coros.com",
  eu: "https://teameuapi.coros.com",
};

export interface Config {
  access_token?: string;
  region?: string;
  email?: string;
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getToken(): string | undefined {
  return loadConfig().access_token;
}

export function getApiBase(): string {
  const region = loadConfig().region ?? "global";
  return API_BASES[region] ?? API_BASES.global;
}
