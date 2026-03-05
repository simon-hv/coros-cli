#!/usr/bin/env node

import { program } from "commander";
import { createInterface } from "node:readline";
import { login } from "./auth.js";
import { listActivities, getActivityDetail, resolveSportType, getAnalyse, getDashboard, getDashboardDetail, AuthError, ApiError } from "./api.js";
import { formatActivitiesTable, formatActivityDetail, formatHealth } from "./formatting.js";
import { transformActivities, transformActivity, transformHealth } from "./transform.js";

function handleError(e: unknown): never {
  if (e instanceof AuthError || e instanceof ApiError) {
    console.error(e.message);
  } else {
    console.error(e instanceof Error ? e.message : String(e));
  }
  process.exit(1);
}

function prompt(question: string, hidden = false): Promise<string> {
  if (hidden) {
    return new Promise((resolve) => {
      process.stderr.write(question);
      const stdin = process.stdin;
      if (stdin.isTTY) stdin.setRawMode(true);
      stdin.resume();
      let input = "";
      const onData = (ch: Buffer) => {
        const c = ch.toString();
        if (c === "\n" || c === "\r") {
          if (stdin.isTTY) stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          stdin.pause();
          process.stderr.write("\n");
          resolve(input);
        } else if (c === "\u0003") {
          if (stdin.isTTY) stdin.setRawMode(false);
          process.exit(1);
        } else if (c === "\u007f" || c === "\b") {
          input = input.slice(0, -1);
        } else {
          input += c;
        }
      };
      stdin.on("data", onData);
    });
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

program.name("coros").description("Coros Training Hub CLI");

program
  .command("login")
  .description("Authenticate with your Coros account")
  .action(async () => {
    const email = await prompt("Email: ");
    const password = await prompt("Password: ", true);
    try {
      const config = await login(email, password);
      console.log(`Logged in as ${config.email} (region: ${config.region})`);
    } catch (e: unknown) {
      console.error(`Login failed: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  });

program
  .command("activities")
  .description("List recent activities")
  .option("--page <n>", "Page number", "1")
  .option("--size <n>", "Activities per page", "20")
  .option("--json", "Output JSON")
  .action(async (opts) => {
    try {
      const data = await listActivities(Number(opts.page), Number(opts.size));
      if (opts.json) {
        console.log(JSON.stringify(transformActivities(data), null, 2));
      } else {
        formatActivitiesTable(data);
      }
    } catch (e) { handleError(e); }
  });

program
  .command("activity <labelId>")
  .description("Show detailed activity info by label ID")
  .option("--sport-type <n>", "Sport type ID (auto-detected if omitted)")
  .option("--json", "Output JSON")
  .action(async (labelId: string, opts) => {
    try {
      let sportType = opts.sportType ? Number(opts.sportType) : null;

      if (sportType === null) {
        sportType = await resolveSportType(labelId);
        if (sportType === null) {
          console.error("Could not find activity. Provide --sport-type manually.");
          process.exit(1);
        }
      }

      const data = await getActivityDetail(labelId, sportType);
      if (opts.json) {
        console.log(JSON.stringify(transformActivity(data), null, 2));
      } else {
        formatActivityDetail(data);
      }
    } catch (e) { handleError(e); }
  });

program
  .command("health")
  .description("Show health and training metrics")
  .option("--json", "Output JSON")
  .action(async (opts) => {
    try {
      const [analyse, dashboard, dashboardDet] = await Promise.all([
        getAnalyse(),
        getDashboard(),
        getDashboardDetail(),
      ]);
      if (opts.json) {
        console.log(JSON.stringify(transformHealth(analyse, dashboard, dashboardDet), null, 2));
      } else {
        formatHealth(analyse, dashboard, dashboardDet);
      }
    } catch (e) { handleError(e); }
  });

program
  .command("mcp")
  .description("Start MCP server (for Claude Desktop and other MCP clients)")
  .action(async () => {
    const { startMcpServer } = await import("./mcp-server.js");
    await startMcpServer();
  });

program.parse();
