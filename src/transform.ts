import { sportName, trainTypeName, isRunSport, trainingLoadStateName, raceTypeName } from "./sport-types.js";

/** Remove keys with null, undefined, or empty string values */
function strip(obj: any): any {
  if (Array.isArray(obj)) return obj.map(strip);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = strip(v);
    }
    return out;
  }
  return obj;
}

function paceStr(sPerKm: number): string | undefined {
  if (!sPerKm) return undefined;
  const m = Math.floor(sPerKm / 60);
  const s = Math.floor(sPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Activities list ---

export function transformActivities(raw: any) {
  const dataList = raw?.data?.dataList ?? [];
  const activities = dataList.map((a: any) => {
    const sport = sportName(a.sportType ?? 0);
    const isRun = isRunSport(a.sportType ?? 0);
    return strip({
      labelId: a.labelId,
      name: a.name,
      sport,
      sportType: a.sportType,
      date: a.date,
      distanceKm: round2((a.distance ?? 0) / 1000),
      durationSeconds: a.totalTime ?? 0,
      avgPace: isRun ? paceStr(a.avgSpeed) : undefined,
      avgPaceSeconds: isRun ? a.avgSpeed : undefined,
      avgHr: a.avgHr,
      ascentM: a.ascent,
      caloriesKcal: a.calorie ? Math.round(a.calorie / 1000) : undefined,
      device: a.device,
      trainingLoad: a.trainingLoad,
    });
  });
  return { count: raw?.data?.count ?? 0, activities };
}

// --- Activity detail ---

interface TransformActivityOptions {
  detailed?: boolean;
}

export function transformActivity(raw: any, opts: TransformActivityOptions = {}) {
  const { detailed = true } = opts;
  const detail = raw?.data ?? {};
  const s = detail.summary ?? {};
  const isRun = isRunSport(s.sportType ?? 0);

  const summary = strip({
    name: s.name,
    sport: sportName(s.sportType ?? 0),
    sportType: s.sportType,
    date: s.startTimestamp ? new Date((s.startTimestamp / 100) * 1000).toISOString() : undefined,
    distanceKm: round2((s.distance ?? 0) / 100_000),
    durationSeconds: round2((s.totalTime ?? 0) / 100),
    avgPace: isRun ? paceStr(s.avgSpeed) : undefined,
    avgPaceSeconds: isRun ? s.avgSpeed : undefined,
    adjustedPace: isRun ? paceStr(s.adjustedPace) : undefined,
    adjustedPaceSeconds: isRun ? s.adjustedPace : undefined,
    bestKmPace: isRun ? paceStr(s.bestKm) : undefined,
    bestKmPaceSeconds: isRun ? s.bestKm : undefined,
    maxPace: isRun ? paceStr(s.maxSpeed) : undefined,
    maxPaceSeconds: isRun ? s.maxSpeed : undefined,
    avgHr: s.avgHr,
    maxHr: s.maxHr,
    avgCadence: s.avgCadence,
    maxCadence: s.maxCadence,
    avgPower: s.avgPower,
    maxPower: s.maxPower,
    avgStepLenCm: s.avgStepLen,
    ascentM: s.elevGain,
    descentM: s.totalDescent,
    caloriesKcal: s.calories ? Math.round(s.calories / 1000) : undefined,
    aerobicEffect: s.aerobicEffect,
    anaerobicEffect: s.anaerobicEffect,
    trainingGoal: s.trainType ? trainTypeName(s.trainType) : undefined,
    trainingLoad: s.trainingLoad,
    vo2Max: s.currentVo2Max,
    performance: s.performance,
  });

  // Zones — normalize time/percentage fields
  const zoneList = (detail.zoneList ?? []).map((group: any) => ({
    zoneType: group.zoneType,
    zoneTypeName: group.zoneType === 2 ? "heartRate" : group.zoneType === 1 ? "pace" : `type${group.zoneType}`,
    zones: (group.zoneItemList ?? []).map((z: any) => {
      const isPace = group.zoneType === 1;
      return strip({
        zone: (z.zoneIndex ?? 0) + 1,
        rangeMin: isPace ? paceStr((z.rightScope ?? 0) / 1000) : z.leftScope,
        rangeMax: isPace ? paceStr((z.leftScope ?? 0) / 1000) : z.rightScope,
        rangeUnit: isPace ? "pace" : "bpm",
        durationSeconds: z.second ?? 0,
        percent: z.percent ?? 0,
      });
    }),
  }));

  if (!detailed) {
    return { summary, zoneList };
  }

  // Laps — normalize units
  const lapList = (detail.lapList ?? [])
    .filter((group: any) => group.type !== -1)
    .map((group: any) => ({
      type: group.type,
      typeName: group.type === 10 ? "autoKm" : group.type === 11 ? "autoMile" : `type${group.type}`,
      laps: (group.lapItemList ?? []).map((lap: any, i: number) =>
        strip({
          index: i + 1,
          distanceKm: round2((lap.distance ?? 0) / 100_000),
          durationSeconds: round2((lap.time ?? 0) / 100),
          avgPace: isRun ? paceStr(lap.avgPace) : undefined,
          avgPaceSeconds: isRun ? lap.avgPace : undefined,
          adjustedPace: isRun ? paceStr(lap.adjustedPace) : undefined,
          avgHr: lap.avgHr,
          maxHr: lap.maxHr,
          avgCadence: lap.avgCadence,
          avgPower: lap.avgPower,
          ascentM: lap.elevGain,
          descentM: lap.totalDescent,
        }),
      ),
    }));

  // Downsample frequencyList to ~80 points in columnar format
  const rawFreq: any[] = detail.frequencyList ?? [];
  const step = Math.max(1, Math.round(rawFreq.length / 80));
  const points = rawFreq.filter((_: any, i: number) => i % step === 0);
  const freqKeys = ["timestamp", "distance", "heart", "speed", "adjustedPace", "cadence", "altitude", "power"];
  const frequencyList: Record<string, any[]> = {};
  for (const key of freqKeys) {
    const vals = points.map((p: any) => p[key] ?? null);
    if (vals.some((v: any) => v !== null)) frequencyList[key] = vals;
  }

  return strip({
    summary,
    lapList,
    zoneList,
    frequencyList: Object.keys(frequencyList).length ? frequencyList : undefined,
  });
}

// --- Health ---


function aggregateDays(days: any[]) {
  if (!days.length) return undefined;
  const avg = (key: string) => {
    const vals = days.map((d) => d[key]).filter((v: number) => v > 0);
    return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
  };
  const sum = (key: string) => Math.round(days.reduce((a: number, d: any) => a + (d[key] ?? 0), 0));
  return { date: days[days.length - 1].date, ati: avg("ati"), cti: avg("cti"), rhr: avg("rhr"), distance: sum("distance"), duration: sum("duration") };
}

function chunkFromEnd(arr: any[], size: number): any[][] {
  const chunks: any[][] = [];
  for (let i = arr.length; i > 0; i -= size) chunks.unshift(arr.slice(Math.max(0, i - size), i));
  return chunks;
}

export function transformHealth(analyse: any, dashboard: any, dashboardDetail: any) {
  const dayList: any[] = analyse?.data?.dayList ?? [];
  const latest = dayList[dayList.length - 1];
  const summary = dashboard?.data?.summaryInfo ?? {};
  const week = dashboardDetail?.data?.currentWeekRecord ?? {};

  // History tiers: daily (7d) → weekly (12w) → monthly (rest)
  const dailyDays = dayList.slice(-7);
  const weeklyDays = dayList.slice(-91, -7);
  const monthlyDays = dayList.slice(0, -91);

  const daily = dailyDays.map((d: any) => ({
    date: d.date, ati: d.ati, cti: d.cti, rhr: d.rhr,
    distance: d.distance, duration: d.duration,
  }));
  const weekly = chunkFromEnd(weeklyDays, 7).map(aggregateDays).filter(Boolean);
  const monthly = chunkFromEnd(monthlyDays, 30).map(aggregateDays).filter(Boolean);

  const hrv = summary.sleepHrvData ?? {};
  const intervals = hrv.sleepHrvAllIntervalList ?? [];

  return strip({
    trainingLoad: latest ? {
      status: trainingLoadStateName(latest.trainingLoadRatioState ?? 0),
      ati: latest.ati,
      cti: latest.cti,
      ratio: latest.trainingLoadRatio,
      rhr: latest.rhr,
      fatigue: latest.fatigue,
    } : undefined,
    history: { daily, weekly, monthly },
    runningLevel: summary.staminaLevel,
    scores: {
      aerobicEndurance: summary.aerobicEnduranceScore,
      lactateThreshold: summary.lactateThresholdCapacityScore,
      anaerobicEndurance: summary.anaerobicEnduranceScore,
      anaerobicCapacity: summary.anaerobicCapacityScore,
    },
    rhr: summary.rhr,
    thresholdHr: summary.lthr,
    thresholdPace: paceStr(summary.ltsp),
    thresholdPaceSeconds: summary.ltsp,
    recoveryPct: summary.recoveryPct,
    hrv: hrv.avgSleepHrv ? {
      avgSleepHrv: hrv.avgSleepHrv,
      normalRange: intervals.length >= 4 ? [intervals[2], intervals[3]] : undefined,
    } : undefined,
    racePredictor: (summary.runScoreList ?? []).map((r: any) => strip({
      race: raceTypeName(r.type),
      durationSeconds: r.duration,
      avgPace: paceStr(r.avgPace),
      avgPaceSeconds: r.avgPace,
    })),
    weeklyDistance: week.distanceRecord,
    weeklyDuration: week.durationRecord,
  });
}
