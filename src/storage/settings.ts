interface Settings {
  useCloudAI: boolean;
  dailyUsage: number;
  lastReset: number;
  apiKey?: string;
  readingMode?: string;
  readingIntent?: string;
  summaryLevel?: number;
}

const STORAGE_KEY = 'settings';

const DEFAULT_SETTINGS: Settings = {
  useCloudAI: true,
  dailyUsage: 0,
  lastReset: Date.now()
  ,
  apiKey: ''
  ,
  readingMode: 'professional',
  readingIntent: 'casual',
  summaryLevel: 3
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
      ,
      apiKey: typeof stored.apiKey === 'string' ? stored.apiKey : DEFAULT_SETTINGS.apiKey
      ,
      readingMode: typeof stored.readingMode === 'string' ? stored.readingMode : DEFAULT_SETTINGS.readingMode,
      readingIntent: typeof stored.readingIntent === 'string' ? stored.readingIntent : DEFAULT_SETTINGS.readingIntent,
      summaryLevel: typeof stored.summaryLevel === 'number' ? stored.summaryLevel : DEFAULT_SETTINGS.summaryLevel
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

export async function getApiKey(): Promise<string> {
  try {
    const s = await getSettings();
    return s.apiKey || '';
  } catch {
    return '';
  }
}

export async function setApiKey(key: string): Promise<void> {
  try {
    await setSettings({ apiKey: key });
  } catch {
    // Silent fail
  }
}

export async function getPreferences(): Promise<{ readingMode: string; readingIntent: string; summaryLevel: number }> {
  try {
    const s = await getSettings();
    return {
      readingMode: s.readingMode || DEFAULT_SETTINGS.readingMode!,
      readingIntent: s.readingIntent || DEFAULT_SETTINGS.readingIntent!,
      summaryLevel: s.summaryLevel || DEFAULT_SETTINGS.summaryLevel!
    };
  } catch {
    return {
      readingMode: DEFAULT_SETTINGS.readingMode!,
      readingIntent: DEFAULT_SETTINGS.readingIntent!,
      summaryLevel: DEFAULT_SETTINGS.summaryLevel!
    };
  }
}

export async function setPreferences(partial: Partial<{ readingMode: string; readingIntent: string; summaryLevel: number }>): Promise<void> {
  try {
    const payload: Partial<Settings> = {};
    if (partial.readingMode !== undefined) payload.readingMode = partial.readingMode;
    if (partial.readingIntent !== undefined) payload.readingIntent = partial.readingIntent;
    if (partial.summaryLevel !== undefined) payload.summaryLevel = partial.summaryLevel;
    await setSettings(payload);
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
