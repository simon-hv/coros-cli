const SPORT_TYPES: Record<number, string> = {
  100: "Run",
  101: "Indoor Run",
  102: "Trail Run",
  103: "Track Run",
  104: "Treadmill",
  200: "Bike",
  201: "Indoor Bike",
  202: "E-Bike",
  203: "Gravel Bike",
  300: "Swim (Pool)",
  301: "Swim (Open Water)",
  400: "Triathlon",
  401: "Multisport",
  402: "Strength Training",
  500: "Cardio",
  501: "Gym",
  502: "HIIT",
  503: "Jump Rope",
  504: "Rowing",
  600: "Walk",
  601: "Hike",
  700: "Ski",
  701: "Snowboard",
  702: "XC Ski",
  703: "Ski Touring",
  800: "Strength",
  1005: "Tennis",
  10000: "GPS Cardio",
  10001: "Flatwater",
  10002: "Whitewater",
  10003: "Windsurfing",
  10004: "Speedsurfing",
};

const TRAIN_TYPES: Record<number, string> = {
  1: "Base",
  2: "Aerobic Endurance",
  3: "Threshold",
  4: "Interval",
  5: "VO2 Max",
  6: "Anaerobic",
  7: "Sprint",
  8: "Recovery",
};

export function sportName(sportType: number): string {
  return SPORT_TYPES[sportType] ?? `Unknown (${sportType})`;
}

export function trainTypeName(trainType: number): string {
  return TRAIN_TYPES[trainType] ?? `Unknown (${trainType})`;
}

const RUN_SPORT_IDS = new Set([100, 101, 102, 103, 104, 600, 601]);

export function isRunSport(sportType: number): boolean {
  return RUN_SPORT_IDS.has(sportType);
}

const TRAINING_LOAD_STATES: Record<number, string> = {
  1: "Detraining", 2: "Recovery", 3: "Maintaining",
  4: "Optimal", 5: "Overreaching", 6: "Overtraining",
};

export function trainingLoadStateName(state: number): string {
  return TRAINING_LOAD_STATES[state] ?? "";
}

const RACE_TYPES: Record<number, string> = {
  5: "5K", 4: "10K", 2: "Semi Marathon", 1: "Marathon",
};

export function raceTypeName(type: number): string {
  return RACE_TYPES[type] ?? `type${type}`;
}

export const RACE_TYPE_ORDER = [5, 4, 2, 1] as const;
