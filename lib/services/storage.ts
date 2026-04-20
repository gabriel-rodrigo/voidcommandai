import AsyncStorage from "@react-native-async-storage/async-storage";
import { MatchHistoryEntry, UserStats } from "@/lib/game/types";

const KEYS = {
  STATS: "vc_user_stats",
  HISTORY: "vc_match_history",
  SETTINGS: "vc_settings",
  CREDITS: "vc_credits",
  POWERUPS: "vc_powerups",
};

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  isMuted: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.5,
  isMuted: false,
};

const DEFAULT_STATS: UserStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  totalDamageDealt: 0,
  totalDamageTaken: 0,
  totalShipsDestroyed: 0,
  totalShipsLost: 0,
};

export async function getSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STATS);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}

export async function saveStats(stats: UserStats): Promise<void> {
  await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
}

export async function getMatchHistory(): Promise<MatchHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addMatchToHistory(entry: MatchHistoryEntry): Promise<void> {
  const history = await getMatchHistory();
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
  await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
}

export async function getCredits(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CREDITS);
    return raw ? parseInt(raw, 10) : 150;
  } catch {
    return 150;
  }
}

export async function saveCredits(credits: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.CREDITS, credits.toString());
}

export async function getPowerups(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.POWERUPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePowerups(powerups: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.POWERUPS, JSON.stringify(powerups));
}
