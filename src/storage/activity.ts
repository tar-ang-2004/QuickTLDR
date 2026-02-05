interface ActivityLog {
  timestamp: number;
  domain: string;
  length: number;
}

const STORAGE_KEY = 'activity';
const MAX_ENTRIES = 100;

export async function logActivity(domain: string, length: number): Promise<void> {
  try {
    const logs = await getActivity();
    
    const updated = [...logs, {
      timestamp: Date.now(),
      domain,
      length
    }];

    const trimmed = updated.slice(-MAX_ENTRIES);
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
  } catch {
    // Silent fail
  }
}

export async function getActivity(): Promise<ActivityLog[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];

    if (!Array.isArray(stored)) {
      return [];
    }

    return stored.filter(entry => 
      entry &&
      typeof entry === 'object' &&
      typeof entry.timestamp === 'number' &&
      typeof entry.domain === 'string' &&
      typeof entry.length === 'number'
    );
  } catch {
    return [];
  }
}

export async function clearActivity(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  } catch {
    // Silent fail
  }
}