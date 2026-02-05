interface Settings {
  useCloudAI: boolean;
  dailyUsage: number;
  lastReset: number;
}

const STORAGE_KEY = 'settings';

const DEFAULT_SETTINGS: Settings = {
  useCloudAI: true,
  dailyUsage: 0,
  lastReset: Date.now()
};

export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];

    if (!stored || typeof stored !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      useCloudAI: typeof stored.useCloudAI === 'boolean' ? stored.useCloudAI : DEFAULT_SETTINGS.useCloudAI,
      dailyUsage: typeof stored.dailyUsage === 'number' ? stored.dailyUsage : DEFAULT_SETTINGS.dailyUsage,
      lastReset: typeof stored.lastReset === 'number' ? stored.lastReset : DEFAULT_SETTINGS.lastReset
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setSettings(partial: Partial<Settings>): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
  } catch {
    // Silent fail
  }
}

export async function resetDailyUsage(): Promise<void> {
  try {
    await setSettings({
      dailyUsage: 0,
      lastReset: Date.now()
    });
  } catch {
    // Silent fail
  }
}

export async function incrementUsage(): Promise<void> {
  try {
    const current = await getSettings();
    await setSettings({
      dailyUsage: current.dailyUsage + 1
    });
  } catch {
    // Silent fail
  }
}