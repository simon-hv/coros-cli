import chalk from "chalk";
import Table from "cli-table3";
import { sportName, trainTypeName, isRunSport, trainingLoadStateName, raceTypeName, RACE_TYPE_ORDER } from "./sport-types.js";

function mToKm(meters: number): number {
  return meters / 1000;
}

function cmToKm(cm: number): number {
  return cm / 100_000;
}

function secondsToHms(seconds: number): string {
  seconds = Math.floor(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function csToHms(centiseconds: number): string {
  return secondsToHms(centiseconds / 100);
}

function paceFromSPerKm(paceSec: number): string {
  if (!paceSec) return "-";
  const m = Math.floor(paceSec / 60);
  const s = Math.floor(paceSec % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function paceFromMsPerKm(paceMs: number): string {
  if (!paceMs) return "-";
  return paceFromSPerKm(paceMs / 1000);
}

function formatDate(dateVal: number | string): string {
  const s = String(dateVal);
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function formatTimestamp(ts: number): string {
  if (!ts) return "-";
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function panel(title: string, lines: string[]): string {
  const content = lines.join("\n");
  const maxLen = Math.max(title.length + 4, ...lines.map((l) => l.length));
  const w = maxLen + 4;
  const top = `╭${"─".repeat(Math.floor((w - title.length - 2) / 2))} ${title} ${"─".repeat(Math.ceil((w - title.length - 2) / 2))}╮`;
  const bot = `╰${"─".repeat(w)}╯`;
  const rows = lines.map((l) => `│ ${l.padEnd(w - 2)} │`);
  return [top, ...rows, bot].join("\n");
}

export function formatActivitiesTable(data: any): void {
  const activities = data?.data?.dataList ?? [];
  const count = data?.data?.count ?? 0;

  const table = new Table({
    head: ["Date", "Name", "Type", "Distance", "Duration", "Avg HR", "Elevation", "Label ID"],
    style: { head: ["cyan"] },
  });

  for (const a of activities) {
    const distance = mToKm(a.distance ?? 0);
    const distStr = distance > 0 ? `${distance.toFixed(2)} km` : "-";
    const duration = secondsToHms(a.totalTime ?? 0);
    const avgHr = a.avgHr ? String(a.avgHr) : "-";
    const ascent = a.ascent ?? 0;
    const elevStr = ascent ? `+${ascent}m` : "-";

    table.push([
      formatDate(a.date ?? ""),
      a.name ?? "",
      sportName(a.sportType ?? 0),
      distStr,
      duration,
      avgHr,
      elevStr,
      a.labelId ?? "",
    ]);
  }

  console.log(`\n  Activities (${count} total)`);
  console.log(table.toString());
}

function getBestLapPace(detail: any): number | null {
  for (const lapSet of detail.lapList ?? []) {
    if (lapSet.type === 10) {
      const paces = (lapSet.lapItemList ?? [])
        .map((item: any) => item.avgPace)
        .filter((p: number) => p > 0);
      return paces.length ? Math.min(...paces) : null;
    }
  }
  return null;
}

export function formatActivityDetail(data: any): void {
  const detail = data?.data ?? {};
  const summary = detail.summary ?? {};

  const name = summary.name ?? "Activity";
  const sport = sportName(summary.sportType ?? 0);
  const isRun = isRunSport(summary.sportType ?? 0);
  const startTs = summary.startTimestamp ?? 0;
  const date = startTs ? formatTimestamp(startTs / 100) : "-";
  const distance = cmToKm(summary.distance ?? 0);
  const duration = csToHms(summary.totalTime ?? 0);
  const avgHr = summary.avgHr ?? 0;
  const maxHr = summary.maxHr ?? 0;
  const calories = summary.calories ? `${Math.round(summary.calories / 1000)}` : "0";
  const ascent = summary.elevGain ?? 0;
  const descent = summary.totalDescent ?? summary.descent ?? 0;
  const avgSpeed = summary.avgSpeed ?? 0;
  const avgCadence = summary.avgCadence ?? 0;
  const trainingLoad = summary.trainingLoad ?? 0;
  const aerobicEffect = summary.aerobicEffect ?? 0;
  const anaerobicEffect = summary.anaerobicEffect ?? 0;
  const trainType = summary.trainType ?? 0;

  const bestPace = getBestLapPace(detail);

  const lines: string[] = [
    `Sport:          ${sport}`,
    `Date:           ${date}`,
    `Distance:       ${distance.toFixed(2)} km`,
  ];
  if (avgSpeed && isRun) lines.push(`Avg Pace:       ${paceFromSPerKm(avgSpeed)}`);
  if (bestPace && isRun) lines.push(`Best Lap Pace:  ${paceFromSPerKm(bestPace)}`);
  lines.push(
    `Duration:       ${duration}`,
    `Avg HR:         ${avgHr} bpm`,
    `Max HR:         ${maxHr} bpm`,
    `Calories:       ${calories} kcal`,
    `Ascent:         +${ascent}m`,
    `Descent:        -${descent}m`,
    `Avg Cadence:    ${avgCadence} spm`,
    `Training Load:  ${trainingLoad}`,
  );
  if (aerobicEffect) lines.push(`Aerobic Effect: ${aerobicEffect}`);
  if (anaerobicEffect) lines.push(`Anaerobic Effect: ${anaerobicEffect}`);
  if (trainType) lines.push(`Training Goal:  ${trainTypeName(trainType)}`);

  console.log(chalk.green(panel(name, lines)));

  // Laps
  const lapSets = detail.lapList ?? [];
  const kmLaps = lapSets.find((ls: any) => ls.type === 10) ?? lapSets[0];

  if (kmLaps?.lapItemList?.length) {
    const head = ["#", "Distance", "Duration", "Avg HR"];
    if (isRun) head.push("Avg Pace");

    const lapTable = new Table({ head, style: { head: ["cyan"] } });

    for (let i = 0; i < kmLaps.lapItemList.length; i++) {
      const item = kmLaps.lapItemList[i];
      const row = [
        String(i + 1),
        `${cmToKm(item.distance ?? 0).toFixed(2)} km`,
        csToHms(item.time ?? 0),
        item.avgHr ? String(item.avgHr) : "-",
      ];
      if (isRun) row.push(item.avgPace ? paceFromSPerKm(item.avgPace) : "-");
      lapTable.push(row);
    }

    console.log(`\n  Laps`);
    console.log(lapTable.toString());
  }

  // HR Zones
  const zoneSets = detail.zoneList ?? [];
  const hrZones = zoneSets.find((zs: any) => zs.zoneType === 2) ?? zoneSets[0];

  if (hrZones?.zoneItemList?.length) {
    const zoneTable = new Table({
      head: ["Zone", "Range", "Time", "%"],
      style: { head: ["cyan"] },
    });

    for (const z of hrZones.zoneItemList) {
      zoneTable.push([
        String((z.zoneIndex ?? 0) + 1),
        `${z.leftScope ?? ""}-${z.rightScope ?? ""} bpm`,
        secondsToHms(z.second ?? 0),
        `${z.percent ?? 0}%`,
      ]);
    }

    console.log(`\n  Heart Rate Zones`);
    console.log(zoneTable.toString());
  }

  // Pace Zones
  const paceZones = zoneSets.find((zs: any) => zs.zoneType === 1);
  if (paceZones?.zoneItemList?.length && isRun) {
    const paceTable = new Table({
      head: ["Zone", "Range", "Time", "%"],
      style: { head: ["cyan"] },
    });

    for (const z of paceZones.zoneItemList) {
      const left = paceFromMsPerKm(z.leftScope ?? 0);
      const right = paceFromMsPerKm(z.rightScope ?? 0);
      paceTable.push([
        String((z.zoneIndex ?? 0) + 1),
        `${left} - ${right}`,
        secondsToHms(z.second ?? 0),
        `${z.percent ?? 0}%`,
      ]);
    }

    console.log(`\n  Pace Zones`);
    console.log(paceTable.toString());
  }
}

export function formatHealth(analyse: any, dashboard: any, dashboardDetail: any): void {
  const analyseData = analyse?.data ?? {};
  const dashboardData = dashboard?.data ?? {};
  const detailData = dashboardDetail?.data ?? {};

  const dayList = analyseData.dayList ?? [];
  const latest = dayList[dayList.length - 1] ?? {};
  const summary = dashboardData.summaryInfo ?? {};

  // Running Level
  const stamina = summary.staminaLevel;
  if (stamina) {
    const scoreNames: Record<string, string> = {
      aerobicEnduranceScore: "Endurance",
      lactateThresholdCapacityScore: "Threshold",
      anaerobicEnduranceScore: "Speed",
      anaerobicCapacityScore: "Sprint",
    };

    const levelTable = new Table({
      head: ["Category", "Score"],
      style: { head: ["cyan"] },
    });

    for (const [key, label] of Object.entries(scoreNames)) {
      if (summary[key]) levelTable.push([label, String(summary[key])]);
    }

    console.log(`\n  Running Level: ${stamina}`);
    console.log(levelTable.toString());
  }

  // Training Level
  const state = trainingLoadStateName(latest.trainingLoadRatioState ?? 0);
  const ati = latest.ati ?? 0;
  const cti = latest.cti ?? 0;
  const ratio = latest.trainingLoadRatio ?? 0;

  if (state || ati || cti) {
    const lines: string[] = [];
    if (state) lines.push(`Status:        ${state}`);
    if (ati) lines.push(`Load (ATI):    ${Math.round(ati)}`);
    if (cti) lines.push(`Fitness (CTI): ${Math.round(cti)}`);
    if (ratio) lines.push(`Trend:         ${Math.round(ratio * 100)}%`);
    console.log(chalk.cyan(panel("Training Level", lines)));
  }

  // Key Metrics
  const metricsTable = new Table({
    head: ["Metric", "Value"],
    style: { head: ["cyan"] },
  });

  let metricsCount = 0;
  const addMetric = (label: string, value: string) => { metricsTable.push([label, value]); metricsCount++; };

  const rhr = summary.rhr ?? latest.rhr;
  if (rhr) addMetric("Resting HR", `${rhr} bpm`);
  if (summary.lthr) addMetric("Threshold HR", `${summary.lthr} bpm`);
  if (summary.ltsp) addMetric("Threshold Pace", paceFromSPerKm(summary.ltsp));
  if (summary.recoveryPct != null) addMetric("Recovery", `${summary.recoveryPct}%`);

  const hrv = summary.sleepHrvData ?? {};
  if (hrv.avgSleepHrv) {
    addMetric("Night HRV (last)", `${hrv.avgSleepHrv} ms`);
    const intervals = hrv.sleepHrvAllIntervalList ?? [];
    if (intervals.length >= 4) {
      addMetric("HRV Normal Range", `${intervals[2]}-${intervals[3]} ms`);
    }
  }

  if (metricsCount > 0) {
    console.log(`\n  Key Metrics`);
    console.log(metricsTable.toString());
  }

  // Weekly Distance
  const week = detailData.currentWeekRecord ?? {};
  const distRec = week.distanceRecord ?? {};
  if (distRec.totalValue) {
    const total = distRec.totalValue / 1000;
    const target = (distRec.totalTarget ?? 0) / 1000;
    const pct = distRec.percentage ?? 0;
    const targetStr = target ? ` / ${target.toFixed(1)} km (${Math.round(pct)}%)` : "";
    console.log(chalk.bold(`\n  Weekly Distance: ${total.toFixed(1)} km${targetStr}`));
  }

  // Race Predictor
  const runScores = summary.runScoreList ?? [];
  if (runScores.length) {
    const raceTable = new Table({
      head: ["Distance", "Time", "Avg Pace"],
      style: { head: ["cyan"] },
    });

    for (const rtype of RACE_TYPE_ORDER) {
      const entry = runScores.find((r: any) => r.type === rtype);
      if (entry) {
        raceTable.push([
          raceTypeName(rtype),
          secondsToHms(entry.duration),
          paceFromSPerKm(entry.avgPace),
        ]);
      }
    }

    console.log(`\n  Race Predictor`);
    console.log(raceTable.toString());
  }
}
