export interface Summary {
  tldr: string[];
  keyPoints: string[];
  quantifiables: string[];
  actionItems: string[];
  influence: string[];
  notableQuotes: string[];
}

export function createEmptySummary(): Summary {
  return {
    tldr: [],
    keyPoints: [],
    quantifiables: [],
    actionItems: [],
    influence: [],
    notableQuotes: []
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
    keyPoints: sanitizeArray(data.keyPoints),
    quantifiables: sanitizeArray(data.quantifiables),
    actionItems: sanitizeArray(data.actionItems),
    influence: sanitizeArray(data.influence),
    notableQuotes: sanitizeArray(data.notableQuotes)
  };
}