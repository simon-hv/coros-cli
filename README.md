# coros-cli

CLI and MCP server for [Coros Training Hub](https://t.coros.com) — extract your activity data and health metrics from the command line. Designed for both humans and AI agents (Claude Desktop, Claude Code, scripts).

All commands produce rich terminal output for humans and structured JSON (`--json`) for agents and automation.

## Install

```sh
npm install -g coros-cli
```

Or run directly with npx:

```sh
npx -y coros-cli activities
```

## Setup

Authenticate with your Coros account:

```sh
coros login
```

This stores a session token in `~/.config/coros-cli/config.json`. No password is saved. EU accounts are auto-detected.

## Usage

### List activities

```
$ coros activities
                             Activities (191 total)
┌────────────┬────────────────┬───────────┬──────────┬──────────┬────────┬───────────┐
│ Date       │ Name           │ Type      │ Distance │ Duration │ Avg HR │ Elevation │
├────────────┼────────────────┼───────────┼──────────┼──────────┼────────┼───────────┤
│ 2026-03-04 │ Morning Run    │ Run       │ 6.58 km  │    41:29 │    174 │     +83m  │
│ 2026-03-03 │ Easy Run       │ Run       │ 3.80 km  │    29:12 │    151 │     +47m  │
└────────────┴────────────────┴───────────┴──────────┴──────────┴────────┴───────────┘
```

Options: `--page`, `--size`, `--json`

### Activity detail

```
$ coros activity 475835095599579138
╭──────────────────────────── Morning Run ─────────────────────────────╮
│ Sport:          Run                                                   │
│ Distance:       6.58 km                                               │
│ Avg Pace:       6:17/km                                               │
│ Best Lap Pace:  4:44/km                                               │
│ Duration:       41:29                                                 │
│ Avg HR:         174 bpm                                               │
│ Aerobic Effect: 3.0                                                   │
│ Training Goal:  VO2 Max                                               │
╰───────────────────────────────────────────────────────────────────────╯
```

Includes laps, HR zones, and pace zones. The label ID comes from `coros activities`.

### Health dashboard

```
$ coros health
 Running Level: 75.0
┌───────────┬───────┐
│ Category  │ Score │
├───────────┼───────┤
│ Endurance │  77.3 │
│ Threshold │  70.8 │
│ Speed     │  71.1 │
│ Sprint    │  70.7 │
└───────────┴───────┘
╭────────────────── Training Level ──────────────────╮
│ Status:        Optimal                              │
│ Load (ATI):    69                                   │
│ Fitness (CTI): 63                                   │
│ Trend:         109%                                 │
╰─────────────────────────────────────────────────────╯
            Race Predictor
┌───────────────┬─────────┬──────────┐
│ Distance      │    Time │ Avg Pace │
├───────────────┼─────────┼──────────┤
│ 5K            │   23:59 │  4:48/km │
│ 10K           │   50:00 │  5:00/km │
│ Semi Marathon │ 1:52:54 │  5:21/km │
│ Marathon      │ 4:00:17 │  5:42/km │
└───────────────┴─────────┴──────────┘
```

Also shows: resting HR, threshold HR/pace, recovery %, night HRV, weekly distance progress.

### JSON output

All commands support `--json` for raw API data — useful for scripting or AI agents:

```sh
coros activities --json | jq '.data.dataList[0].name'
coros health --json | jq '.dashboard.data.summaryInfo.staminaLevel'
```

## MCP Server (Claude Desktop)

coros-cli includes a built-in [MCP](https://modelcontextprotocol.io/) server, so Claude Desktop (or any MCP client) can access your Coros data directly.

### Setup

1. Run `coros login` in your terminal first
2. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

3. Restart Claude Desktop — the Coros tools will appear automatically

### Available tools

| Tool | Description |
|------|-------------|
| `list_activities` | List recent activities (paginated) |
| `get_activity` | Activity detail — full by default (laps, HR timeline, zones), or `detailed=false` for lightweight summary (multi-run analysis) |
| `get_health` | Health dashboard (running level, training status, race predictor, HRV) |

## How authentication works

When you run `coros login`, your password is **never stored**. Here's what happens:

1. Your password is hashed locally before leaving your machine
2. The hash is sent to Coros's login endpoint to obtain a session token
3. Only this token is saved in `~/.config/coros-cli/config.json`

The token expires over time — when it does, just run `coros login` again. You can inspect or delete the config file at any time.

## Disclaimer

This is an unofficial tool, not affiliated with or endorsed by COROS. It accesses your own data using your own credentials. APIs may change at any time, which could break this tool. Use at your own risk.
