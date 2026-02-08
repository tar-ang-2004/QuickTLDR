export type ReadingMode =
  | "simple"
  | "student"
  | "professional"
  | "expert"
  | "casual";

export interface RewriteRequest {
  originalSummary: string;
  mode: ReadingMode;
}

export interface RewritePrompt {
  system: string;
  instruction: string;
}

interface ModeStrategy {
  systemMessage: string;
  instructionTemplate: (summary: string) => string;
}

const MODE_STRATEGIES: Record<ReadingMode, ModeStrategy> = {
  simple: {
    systemMessage:
      "You are an expert educator who excels at explaining complex topics to 12-year-olds. " +
      "Use simple words, short sentences, and relatable analogies. " +
      "Avoid jargon and technical terms. " +
      "Your goal is clarity and accessibility above all else.",
    instructionTemplate: (summary: string) =>
      "Rewrite the following summary so that a 12-year-old can easily understand it. " +
      "Use simple language, short sentences, and everyday examples. " +
      "Avoid technical terms unless absolutely necessary, and explain them if you must use them.\n\n" +
      `Original summary:\n${summary}\n\n` +
      "Rewritten summary:"
  },

  student: {
    systemMessage:
      "You are an academic tutor who prepares students for exams. " +
      "Present information in a structured, clear format with bullet points and key definitions. " +
      "Your writing is organized, concise, and exam-friendly. " +
      "Include important terminology with brief explanations.",
    instructionTemplate: (summary: string) =>
      "Rewrite the following summary in a structured, student-friendly format. " +
      "Use bullet points for key concepts, include definitions for important terms, " +
      "and organize information logically for study purposes.\n\n" +
      `Original summary:\n${summary}\n\n` +
      "Rewritten summary:"
  },

  professional: {
    systemMessage:
      "You are a senior executive assistant who writes concise business communications. " +
      "Your style is neutral, direct, and efficient. " +
      "You deliver executive summaries that respect the reader's time. " +
      "Maintain a formal but accessible tone.",
    instructionTemplate: (summary: string) =>
      "Rewrite the following summary as a professional executive brief. " +
      "Be concise, neutral, and direct. " +
      "Focus on key insights and actionable information. " +
      "Use business-appropriate language.\n\n" +
      `Original summary:\n${summary}\n\n` +
      "Rewritten summary:"
  },

  expert: {
    systemMessage:
      "You are a domain expert writing for other experts. " +
      "Use technical terminology freely and assume deep domain knowledge. " +
      "Your writing is dense, precise, and information-rich. " +
      "Prioritize accuracy and technical depth over accessibility.",
    instructionTemplate: (summary: string) =>
      "Rewrite the following summary for an expert audience. " +
      "Use technical language, assume domain expertise, and maximize information density. " +
      "Include relevant technical details and precise terminology.\n\n" +
      `Original summary:\n${summary}\n\n` +
      "Rewritten summary:"
  },

  casual: {
    systemMessage:
      "You are a friendly storyteller who makes information enjoyable and easy to digest. " +
      "Your tone is conversational, warm, and approachable. " +
      "You explain things like you're chatting with a friend over coffee. " +
      "Keep it light, engaging, and fun.",
    instructionTemplate: (summary: string) =>
      "Rewrite the following summary in a casual, conversational tone. " +
      "Imagine you're explaining this to a friend in a relaxed setting. " +
      "Keep it friendly, approachable, and easy to read.\n\n" +
      `Original summary:\n${summary}\n\n` +
      "Rewritten summary:"
  }
};

const AVAILABLE_MODES: readonly ReadingMode[] = [
  "simple",
  "student",
  "professional",
  "expert",
  "casual"
] as const;

export function buildRewritePrompt(request: RewriteRequest): RewritePrompt {
  const strategy = MODE_STRATEGIES[request.mode];
  
  if (!strategy) {
    throw new Error(`Unknown reading mode: ${request.mode}`);
  }
  
  return {
    system: strategy.systemMessage,
    instruction: strategy.instructionTemplate(request.originalSummary)
  };
}

export function listAvailableModes(): ReadingMode[] {
  return [...AVAILABLE_MODES];
}

export function getModeDescription(mode: ReadingMode): string {
  const descriptions: Record<ReadingMode, string> = {
    simple: "Easy to understand, suitable for beginners",
    student: "Structured format, ideal for studying",
    professional: "Concise executive summary style",
    expert: "Technical and information-dense",
    casual: "Friendly and conversational tone"
  };
  
  return descriptions[mode] || "Unknown mode";
}

export function isValidMode(mode: string): mode is ReadingMode {
  return mode in MODE_STRATEGIES;
}
