export interface Summary {
  tldr: string[];
  facts: string[];
  actions: string[];
  numbers: string[];
  quotes: string[];
}

export function createEmptySummary(): Summary {
  return {
    tldr: [],
    facts: [],
    actions: [],
    numbers: [],
    quotes: []
  };
}

export function validateSummary(obj: unknown): Summary {
  if (!obj || typeof obj !== 'object') {
    return createEmptySummary();
  }

  const data = obj as Record<string, unknown>;

  const sanitizeArray = (field: unknown): string[] => {
    if (!Array.isArray(field)) {
      return [];
    }

    return field
      .filter(item => typeof item === 'string')
      .map(item => item.trim().substring(0, 300))
      .filter(item => item.length > 0)
      .slice(0, 10);
  };

  return {
    tldr: sanitizeArray(data.tldr),
    facts: sanitizeArray(data.facts),
    actions: sanitizeArray(data.actions),
    numbers: sanitizeArray(data.numbers),
    quotes: sanitizeArray(data.quotes)
  };
}