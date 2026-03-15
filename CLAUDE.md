# coros-cli

CLI and MCP server to access Coros Training Hub data. All commands support `--json` for structured output.

## Commands

```
coros login                          # Authenticate (interactive email/password prompt)
coros activities [--page N --size N] [--json]  # List recent activities
coros activity <LABEL_ID> [--json]   # Detailed activity view (laps, zones, training effect)
coros health [--json]                # Health dashboard (running level, training status, race predictor, HRV)
```

## MCP Server

Also available as an MCP server for Claude Desktop and other MCP clients. Exposes 3 tools: `list_activities`, `get_activity`, `get_health`.

```json
{
  "mcpServers": {
    "coros": {
      "command": "npx",
      "args": ["-y", "coros-cli", "mcp"]
    }
  }
}
```

## Typical agent workflows

- **Get recent activities**: `coros activities --json --size 10`
- **Get activity detail**: First get the `labelId` from the activities list, then `coros activity <labelId> --json`
- **Get health/training overview**: `coros health --json`

## JSON output structure

### `coros activities --json`
Returns `data.dataList[]` with fields: `labelId`, `name`, `sportType`, `distance` (meters), `totalTime` (seconds), `avgHr`, `avgSpeed` (s/km), `ascent`, `date` (YYYYMMDD).

### `coros activity <id> --json`
Returns `data.summary` (distance in cm, totalTime in centiseconds, avgSpeed in s/km, aerobicEffect, anaerobicEffect, trainType), `data.lapList[]`, `data.zoneList[]`.

### `coros health --json`
Returns `analyse.data.dayList[]` (daily ATI/CTI/RHR/fatigue), `dashboard.data.summaryInfo` (running level, race predictor, HRV, threshold pace/HR), `dashboard_detail.data.currentWeekRecord` (weekly distance/duration targets).

## Setup

Requires authentication first: `coros login`. Credentials stored in `~/.config/coros-cli/config.json`. Sessions are refreshed automatically when the token expires.
