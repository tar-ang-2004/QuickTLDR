export type SummaryLevel = 1 | 2 | 3;

export interface ProgressiveRequest {
  originalText: string;
  level: SummaryLevel;
}

export interface ProgressivePrompt {
  system: string;
  instruction: string;
  expectedStructure: "sentence" | "bullets" | "structured";
}

interface LevelStrategy {
  systemMessage: string;
  instructionTemplate: (text: string) => string;
  expectedStructure: "sentence" | "bullets" | "structured";
}

const LEVEL_STRATEGIES: Record<SummaryLevel, LevelStrategy> = {
  1: {
    systemMessage:
      "You are an expert at extreme compression and distillation of information. " +
      "Your specialty is capturing the single most important idea from any content. " +
      "You produce ultra-concise, clear, and accurate one-sentence summaries. " +
      "Every word must count.",
    instructionTemplate: (text: string) =>
      "Summarize the following content in EXACTLY ONE SENTENCE. " +
      "Capture only the core idea. " +
      "Be extremely concise. " +
      "Maximum 20 words. " +
      "No preamble, no introduction, just the summary sentence.\n\n" +
      `Content:\n${text}\n\n` +
      "One-sentence summary:",
    expectedStructure: "sentence"
  },

  2: {
    systemMessage:
      "You are an expert summarizer who creates scannable bullet-point summaries. " +
      "Your summaries are clear, actionable, and readable in under 10 seconds. " +
      "You extract key ideas and present them as concise bullets. " +
      "No fluff, no filler, only substance.",
    instructionTemplate: (text: string) =>
      "Summarize the following content as 3-5 bullet points. " +
      "Each bullet should capture one key idea. " +
      "Be concise and direct. " +
      "No introduction or conclusion, just the bullets. " +
      "Use bullet point format (• or -).\n\n" +
      `Content:\n${text}\n\n` +
      "Bullet summary:",
    expectedStructure: "bullets"
  },

  3: {
    systemMessage:
      "You are an expert analyst who creates comprehensive structured summaries. " +
      "Your summaries follow a strict 5-section format that covers core message, details, data, consequences, and broader impact. " +
      "You organize information logically and extract maximum value from content. " +
      "Your output is thorough yet organized. Aim for 200-400 words to provide comprehensive coverage.",
    instructionTemplate: (text: string) =>
      "Create a comprehensive structured summary using EXACTLY these 5 sections in this order:\n\n" +
      "TL;DR (Short Summary)\n" +
      "One clear sentence capturing the core message\n\n" +
      "Key Points\n" +
      "• 5-8 detailed bullet points covering main ideas and arguments\n\n" +
      "Quantifiables (Date/Number)\n" +
      "• List all dates, numbers, statistics, percentages, or measurable data mentioned\n" +
      "• If none present, write 'None mentioned'\n\n" +
      "Aftermath\n" +
      "• Describe the consequences, results, or what happened as a result\n" +
      "• If this is predictive/future content, describe expected outcomes\n\n" +
      "Influence of this\n" +
      "• Explain the broader impact, significance, or implications\n" +
      "• Why this matters to readers or the wider context\n\n" +
      "IMPORTANT: Do NOT use markdown formatting like ** or __. Write section headers as plain text.\n\n" +
      "Be thorough and detailed. Aim for 200-400 words total. Extract maximum information value.\n\n" +
      `Content:\n${text}\n\n` +
      "Structured summary:",
    expectedStructure: "structured"
  }
};

const SUMMARY_LEVELS: readonly SummaryLevel[] = [1, 2, 3] as const;

const LEVEL_DESCRIPTIONS: Record<SummaryLevel, string> = {
  1: "Ultra-short: One sentence, core idea only",
  2: "Short: 3-5 bullet points, key ideas",
  3: "Full: Structured summary with details"
};

export function buildProgressivePrompt(request: ProgressiveRequest): ProgressivePrompt {
  const strategy = LEVEL_STRATEGIES[request.level];
  
  if (!strategy) {
    throw new Error(`Invalid summary level: ${request.level}`);
  }
  
  return {
    system: strategy.systemMessage,
    instruction: strategy.instructionTemplate(request.originalText),
    expectedStructure: strategy.expectedStructure
  };
}

export function listSummaryLevels(): SummaryLevel[] {
  return [...SUMMARY_LEVELS];
}

export function describeLevel(level: SummaryLevel): string {
  return LEVEL_DESCRIPTIONS[level];
}

export function isValidLevel(level: number): level is SummaryLevel {
  return level in LEVEL_STRATEGIES;
}

export function getMaxLevel(): SummaryLevel {
  return Math.max(...SUMMARY_LEVELS) as SummaryLevel;
}

export function getMinLevel(): SummaryLevel {
  return Math.min(...SUMMARY_LEVELS) as SummaryLevel;
}

export function canExpandLevel(currentLevel: SummaryLevel): boolean {
  return currentLevel < getMaxLevel();
}

export function canCollapseLevel(currentLevel: SummaryLevel): boolean {
  return currentLevel > getMinLevel();
}
