#!/usr/bin/env node

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AuthError, listActivities, getActivityDetail, resolveSportType, getAnalyse, getDashboard, getDashboardDetail } from "./api.js";
import { transformActivities, transformActivity, transformHealth } from "./transform.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

function toolError(err: unknown): { isError: true; content: [{ type: "text"; text: string }] } {
  const message = err instanceof AuthError
    ? "Not logged in. Run `coros login` in your terminal first."
    : err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text", text: message }] };
}

const server = new McpServer({
  name: "coros",
  version,
  description:
    "Coros Training Hub — access running/cycling/swimming activity data and health metrics. " +
    "Requires prior authentication via `coros login` in the terminal.",
});

server.tool(
  "list_activities",
  "List recent activities from Coros Training Hub. Returns activities with: labelId, name, sport, distanceKm, durationSeconds, avgPace, avgHr, ascentM, date. Use labelId from results to call get_activity.",
  { page: z.number().default(1), size: z.number().default(20) },
  async ({ page, size }) => {
    try {
      const data = await listActivities(page, size);
      return { content: [{ type: "text", text: JSON.stringify(transformActivities(data)) }] };
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  "get_activity",
  "Get info for a specific activity. Default returns full detail (laps, HR timeline, zones). Set detailed=false for summary+zones only — use this when analyzing 3+ runs to avoid context bloat.",
  {
    label_id: z.string().describe("The activity's labelId (from list_activities)"),
    sport_type: z.number().optional().describe("Sport type ID. Auto-detected if omitted."),
    detailed: z.boolean().default(true).describe("Set to false for multi-run analysis (summary + zones only, ~3KB instead of ~30KB)."),
  },
  async ({ label_id, sport_type, detailed }) => {
    try {
      let resolvedSportType = sport_type ?? await resolveSportType(label_id);

      if (resolvedSportType === null) {
        return toolError(new Error("Activity not found. Provide sport_type manually."));
      }

      const data = await getActivityDetail(label_id, resolvedSportType);
      return { content: [{ type: "text", text: JSON.stringify(transformActivity(data, { detailed })) }] };
    } catch (err) {
      return toolError(err);
    }
  },
);

server.tool(
  "get_health",
  "Get health and training metrics dashboard. Returns: running level, race predictor, training load status (ATI/CTI), resting HR, threshold HR/pace, HRV, recovery %, weekly distance. History: daily (7d), weekly (12w), monthly (older).",
  {},
  async () => {
    try {
      const [analyse, dashboard, dashboardDetail] = await Promise.all([
        getAnalyse(),
        getDashboard(),
        getDashboardDetail(),
      ]);

      return { content: [{ type: "text", text: JSON.stringify(transformHealth(analyse, dashboard, dashboardDetail)) }] };
    } catch (err) {
      return toolError(err);
    }
  },
);

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Allow direct execution: node mcp-server.js
const isDirectRun = process.argv[1]?.endsWith("mcp-server.js");
if (isDirectRun) {
  startMcpServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
