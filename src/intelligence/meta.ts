export interface MetaRequest {
  originalText: string;
}

export interface MetaPrompt {
  system: string;
  instruction: string;
  expectedOutput: MetaOutputSchema;
}

export interface MetaOutputSchema {
  coreArgument: string;
  authorIntent: string;
  stakes: string;
  persuasionSignals: string[];
  missingPerspectives: string[];
}

interface MetaDimension {
  key: keyof MetaOutputSchema;
  name: string;
  description: string;
  prompt: string;
}

const META_DIMENSIONS: readonly MetaDimension[] = [
  {
    key: "coreArgument",
    name: "Core Argument",
    description: "The central claim or thesis the content is making",
    prompt: "What is the single most important claim or argument being made?"
  },
  {
    key: "authorIntent",
    name: "Author Intent",
    description: "What the author wants the reader to believe, feel, or do",
    prompt: "What does the author want the reader to think, believe, or do after reading this?"
  },
  {
    key: "stakes",
    name: "Stakes",
    description: "Why this content matters and what's at stake",
    prompt: "Why does this matter? What are the stakes or consequences discussed?"
  },
  {
    key: "persuasionSignals",
    name: "Persuasion Signals",
    description: "Techniques used to influence the reader (emotional language, framing, selective facts)",
    prompt: "What persuasion techniques are used? (emotional language, framing, selective facts, calls to action, etc.)"
  },
  {
    key: "missingPerspectives",
    name: "Missing Perspectives",
    description: "Viewpoints, counterarguments, or perspectives not represented",
    prompt: "What viewpoints, counterarguments, or perspectives are not represented or addressed?"
  }
] as const;

const SYSTEM_MESSAGE =
  "You are a critical analyst specialized in meta-analysis of written content. " +
  "Your role is to analyze WHY content exists, not just what it says. " +
  "You examine author intent, persuasion techniques, framing, and missing perspectives. " +
  "You maintain a neutral, analytical stance without moral judgment. " +
  "Your analysis is objective, structured, and reasoning-based.";

function buildInstructionMessage(text: string): string {
  return (
    "Perform a meta-analysis of the following content. " +
    "Analyze WHY this content exists and what it's trying to achieve.\n\n" +
    "Return ONLY a valid JSON object with these fields:\n\n" +
    `1. coreArgument: ${META_DIMENSIONS[0].prompt}\n` +
    `2. authorIntent: ${META_DIMENSIONS[1].prompt}\n` +
    `3. stakes: ${META_DIMENSIONS[2].prompt}\n` +
    `4. persuasionSignals: ${META_DIMENSIONS[3].prompt} (return as array of strings)\n` +
    `5. missingPerspectives: ${META_DIMENSIONS[4].prompt} (return as array of strings)\n\n` +
    "Maintain neutrality and analytical rigor. " +
    "Do not make moral judgments. " +
    "Focus on identifying patterns, techniques, and structural elements.\n\n" +
    "Output format example:\n" +
    "{\n" +
    '  "coreArgument": "The main claim...",\n' +
    '  "authorIntent": "To persuade readers...",\n' +
    '  "stakes": "The consequences...",\n' +
    '  "persuasionSignals": ["emotional language", "selective facts"],\n' +
    '  "missingPerspectives": ["counterargument A", "perspective B"]\n' +
    "}\n\n" +
    `Content:\n${text}\n\n` +
    "JSON meta-analysis:"
  );
}

export function buildMetaPrompt(request: MetaRequest): MetaPrompt {
  if (!request.originalText || request.originalText.trim().length === 0) {
    return getEmptyMetaOutput();
  }

  return {
    system: SYSTEM_MESSAGE,
    instruction: buildInstructionMessage(request.originalText),
    expectedOutput: {
      coreArgument: "",
      authorIntent: "",
      stakes: "",
      persuasionSignals: [],
      missingPerspectives: []
    }
  };
}

export function describeMetaDimensions(): string[] {
  return META_DIMENSIONS.map(dim => `${dim.name}: ${dim.description}`);
}

export function getDimensionNames(): string[] {
  return META_DIMENSIONS.map(dim => dim.name);
}

export function getDimensionKeys(): Array<keyof MetaOutputSchema> {
  return META_DIMENSIONS.map(dim => dim.key);
}

export function getDimensionByKey(key: keyof MetaOutputSchema): MetaDimension | undefined {
  return META_DIMENSIONS.find(dim => dim.key === key);
}

export function validateMetaOutput(output: Partial<MetaOutputSchema>): boolean {
  const requiredKeys = getDimensionKeys();
  
  for (const key of requiredKeys) {
    if (!(key in output)) {
      return false;
    }
    
    const value = output[key];
    
    if (key === "persuasionSignals" || key === "missingPerspectives") {
      if (!Array.isArray(value)) return false;
    } else {
      if (typeof value !== "string") return false;
    }
  }
  
  return true;
}

export function getEmptyMetaOutput(): MetaOutputSchema {
  return {
    coreArgument: "",
    authorIntent: "",
    stakes: "",
    persuasionSignals: [],
    missingPerspectives: []
  };
}
