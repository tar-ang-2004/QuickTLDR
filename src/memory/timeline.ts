export interface MemoryEntry {
  id: string;
  url: string;
  title: string;
  summary: string;
  timestamp: number;
  topics: string[];
}

interface TimelineStore {
  entriesById: Map<string, MemoryEntry>;
  orderedEntries: MemoryEntry[];
  urlTimestampIndex: Set<string>;
}

const store: TimelineStore = {
  entriesById: new Map(),
  orderedEntries: [],
  urlTimestampIndex: new Set()
};

function buildUrlTimestampKey(url: string, timestamp: number): string {
  return `${url}::${timestamp}`;
}

function binaryInsertByTimestamp(entries: MemoryEntry[], entry: MemoryEntry): void {
  let left = 0;
  let right = entries.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (entries[mid].timestamp > entry.timestamp) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  entries.splice(left, 0, entry);
}

export function addEntry(entry: MemoryEntry): void {
  if (!entry.id || !entry.url || entry.timestamp <= 0) {
    throw new Error("Invalid memory entry: id, url, and positive timestamp required");
  }

  const urlTimestampKey = buildUrlTimestampKey(entry.url, entry.timestamp);
  
  if (store.urlTimestampIndex.has(urlTimestampKey)) {
    return;
  }

  if (store.entriesById.has(entry.id)) {
    return;
  }

  store.entriesById.set(entry.id, entry);
  store.urlTimestampIndex.add(urlTimestampKey);
  
  binaryInsertByTimestamp(store.orderedEntries, entry);
}

export function getTimeline(): MemoryEntry[] {
  return [...store.orderedEntries];
}

export function getEntryById(id: string): MemoryEntry | undefined {
  return store.entriesById.get(id);
}

export function searchEntries(query: string): MemoryEntry[] {
  if (!query || query.trim().length === 0) {
    return getTimeline();
  }

  const lowerQuery = query.toLowerCase().trim();
  
  return store.orderedEntries.filter(entry => {
    const titleMatch = entry.title.toLowerCase().includes(lowerQuery);
    const summaryMatch = entry.summary.toLowerCase().includes(lowerQuery);
    const topicsMatch = entry.topics.some(topic => 
      topic.toLowerCase().includes(lowerQuery)
    );
    
    return titleMatch || summaryMatch || topicsMatch;
  });
}

export function clearTimeline(): void {
  store.entriesById.clear();
  store.orderedEntries = [];
  store.urlTimestampIndex.clear();
}

export function getEntryCount(): number {
  return store.orderedEntries.length;
}

export function getEntriesByDateRange(startTime: number, endTime: number): MemoryEntry[] {
  return store.orderedEntries.filter(entry => 
    entry.timestamp >= startTime && entry.timestamp <= endTime
  );
}

export function removeEntry(id: string): boolean {
  const entry = store.entriesById.get(id);
  if (!entry) {
    return false;
  }

  store.entriesById.delete(id);
  
  const urlTimestampKey = buildUrlTimestampKey(entry.url, entry.timestamp);
  store.urlTimestampIndex.delete(urlTimestampKey);
  
  const index = store.orderedEntries.findIndex(e => e.id === id);
  if (index !== -1) {
    store.orderedEntries.splice(index, 1);
  }
  
  return true;
}
