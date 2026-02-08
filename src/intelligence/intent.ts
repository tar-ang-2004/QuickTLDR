export type ReadingIntent =
  | "research"
  | "exam"
  | "decision"
  | "casual"
  | "news"
  | "learning";

export interface IntentRequest {
  originalText: string;
  intent: ReadingIntent;
}

export interface IntentPrompt {
  system: string;
  instruction: string;
  focus: string[];
}

interface IntentStrategy {
  systemMessage: string;
  instructionTemplate: (text: string) => string;
  focus: string[];
}

const INTENT_STRATEGIES: Record<ReadingIntent, IntentStrategy> = {
  research: {
    systemMessage:
      "You are a research assistant helping an academic or professional researcher. " +
      "Your goal is to extract arguments, evidence, claims, and sources from content. " +
      "Prioritize factual accuracy, logical structure, and citation-worthy information. " +
      "Present information in a way that supports rigorous analysis.",
    instructionTemplate: (text: string) =>
      "Summarize the following content for research purposes. " +
      "Focus on:\n" +
      "- Main arguments and claims\n" +
      "- Supporting evidence and data\n" +
      "- Key sources and references\n" +
      "- Methodology or approach (if applicable)\n" +
      "- Conclusions and implications\n\n" +
      "Present information objectively and systematically.\n\n" +
      `Content:\n${text}\n\n` +
      "Research summary:",
    focus: ["arguments", "evidence", "claims", "sources", "methodology", "conclusions"]
  },

  exam: {
    systemMessage:
      "You are a study coach helping a student prepare for an exam. " +
      "Your goal is to extract definitions, key facts, and memorizable points. " +
      "Structure information clearly with emphasis on what's testable. " +
      "Make content easy to review and retain.",
    instructionTemplate: (text: string) =>
      "Summarize the following content for exam preparation. " +
      "Focus on:\n" +
      "- Key definitions and terminology\n" +
      "- Important facts and concepts\n" +
      "- Memorizable points\n" +
      "- Structured learning points\n" +
      "- Relationships between concepts\n\n" +
      "Make it clear, organized, and study-friendly.\n\n" +
      `Content:\n${text}\n\n` +
      "Exam prep summary:",
    focus: ["definitions", "facts", "concepts", "terminology", "key points"]
  },

  decision: {
    systemMessage:
      "You are a strategic advisor helping someone make an informed decision. " +
      "Your goal is to extract pros and cons, risks, benefits, and recommendations. " +
      "Present information in a way that supports clear decision-making. " +
      "Be balanced, objective, and action-oriented.",
    instructionTemplate: (text: string) =>
      "Summarize the following content to support decision-making. " +
      "Focus on:\n" +
      "- Pros and cons\n" +
      "- Risks and benefits\n" +
      "- Key trade-offs\n" +
      "- Recommendations or suggested actions\n" +
      "- Critical factors to consider\n\n" +
      "Present information clearly to enable informed choices.\n\n" +
      `Content:\n${text}\n\n` +
      "Decision summary:",
    focus: ["pros", "cons", "risks", "benefits", "recommendations", "trade-offs"]
  },

  casual: {
    systemMessage:
      "You are a friendly reader helping someone casually browse content. " +
      "Your goal is to provide a light, conversational summary that's easy to digest. " +
      "Keep it simple, engaging, and quick to read. " +
      "No need for deep analysis—just the gist.",
    instructionTemplate: (text: string) =>
      "Summarize the following content in a casual, easy-to-read way. " +
      "Focus on:\n" +
      "- Main idea\n" +
      "- Interesting points\n" +
      "- What makes it worth knowing\n\n" +
      "Keep it light, conversational, and quick to scan.\n\n" +
      `Content:\n${text}\n\n` +
      "Casual summary:",
    focus: ["main idea", "highlights", "key takeaways"]
  },

  news: {
    systemMessage:
      "You are a news analyst helping someone stay informed on current events. " +
      "Your goal is to extract key events, timelines, actors, and developments. " +
      "Present information like a news brief: who, what, when, where, why. " +
      "Be factual, chronological, and context-aware.",
    instructionTemplate: (text: string) =>
      "Summarize the following content as a news brief. " +
      "Focus on:\n" +
      "- Key events and developments\n" +
      "- Timeline (when things happened)\n" +
      "- Main actors or entities involved\n" +
      "- Context and background\n" +
      "- Current status or outcome\n\n" +
      "Present it like a concise news digest.\n\n" +
      `Content:\n${text}\n\n` +
      "News summary:",
    focus: ["events", "timeline", "actors", "context", "developments"]
  },

  learning: {
    systemMessage:
      "You are a patient educator helping someone learn and understand new concepts. " +
      "Your goal is to explain ideas clearly with step-by-step clarity. " +
      "Prioritize explanations, examples, and conceptual understanding. " +
      "Make complex topics accessible and build knowledge progressively.",
    instructionTemplate: (text: string) =>
      "Summarize the following content for learning purposes. " +
      "Focus on:\n" +
      "- Core concepts and ideas\n" +
      "- Clear explanations\n" +
      "- How things work (step-by-step if applicable)\n" +
      "- Examples or analogies\n" +
      "- Building blocks for understanding\n\n" +
      "Make it educational, clear, and easy to grasp.\n\n" +
      `Content:\n${text}\n\n` +
      "Learning summary:",
    focus: ["concepts", "explanations", "examples", "understanding", "clarity"]
  }
};

const AVAILABLE_INTENTS: readonly ReadingIntent[] = [
  "research",
  "exam",
  "decision",
  "casual",
  "news",
  "learning"
] as const;

const INTENT_DESCRIPTIONS: Record<ReadingIntent, string> = {
  research: "Extract arguments, evidence, and sources for analysis",
  exam: "Structured study material with definitions and key facts",
  decision: "Pros, cons, risks, and recommendations for choices",
  casual: "Light, conversational summary for quick reading",
  news: "Key events, timeline, and actors in news-brief format",
  learning: "Clear explanations and concepts for understanding"
};

export function buildIntentPrompt(request: IntentRequest): IntentPrompt {
  const strategy = INTENT_STRATEGIES[request.intent];
  
  if (!strategy) {
    throw new Error(`Invalid reading intent: ${request.intent}`);
  }
  
  return {
    system: strategy.systemMessage,
    instruction: strategy.instructionTemplate(request.originalText),
    focus: [...strategy.focus]
  };
}

export function listIntents(): ReadingIntent[] {
  return [...AVAILABLE_INTENTS];
}

export function describeIntent(intent: ReadingIntent): string {
  return INTENT_DESCRIPTIONS[intent];
}

export function isValidIntent(intent: string): intent is ReadingIntent {
  return intent in INTENT_STRATEGIES;
}

export function getIntentFocus(intent: ReadingIntent): string[] {
  const strategy = INTENT_STRATEGIES[intent];
  return strategy ? [...strategy.focus] : [];
}

export function suggestIntentForContext(context: string): ReadingIntent {
  const lowerContext = context.toLowerCase();
  
  if (lowerContext.includes("study") || lowerContext.includes("test") || lowerContext.includes("exam")) {
    return "exam";
  }
  
  if (lowerContext.includes("research") || lowerContext.includes("paper") || lowerContext.includes("academic")) {
    return "research";
  }
  
  if (lowerContext.includes("decide") || lowerContext.includes("choice") || lowerContext.includes("compare")) {
    return "decision";
  }
  
  if (lowerContext.includes("learn") || lowerContext.includes("understand") || lowerContext.includes("explain")) {
    return "learning";
  }
  
  if (lowerContext.includes("news") || lowerContext.includes("breaking") || lowerContext.includes("update")) {
    return "news";
  }
  
  return "casual";
}
