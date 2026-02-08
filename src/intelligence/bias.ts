export interface BiasRequest {
  originalText: string;
}

export interface BiasPrompt {
  system: string;
  instruction: string;
  expectedOutput: BiasOutputSchema;
}

export interface BiasOutputSchema {
  stance: string;
  emotionalTone: string;
  loadedLanguageExamples: string[];
  persuasionTechniques: string[];
  evidenceBalance: string;
  neutralityAssessment: string;
}

interface BiasDimension {
  key: keyof BiasOutputSchema;
  name: string;
  description: string;
  prompt: string;
}

const BIAS_DIMENSIONS: readonly BiasDimension[] = [
  {
    key: "stance",
    name: "Stance",
    description: "The overall position of the content (neutral, supportive, critical)",
    prompt: "What is the overall stance? (neutral, supportive, critical, or mixed)"
  },
  {
    key: "emotionalTone",
    name: "Emotional Tone",
    description: "The emotional register used (calm, urgent, alarmist, persuasive)",
    prompt: "What is the emotional tone? (calm, urgent, alarmist, persuasive, etc.)"
  },
  {
    key: "loadedLanguageExamples",
    name: "Loaded Language Examples",
    description: "Specific examples of emotionally charged or biased phrasing",
    prompt: "Identify specific examples of loaded or emotionally charged language"
  },
  {
    key: "persuasionTechniques",
    name: "Persuasion Techniques",
    description: "Rhetorical devices used to influence the reader (fear appeal, authority appeal, framing, etc.)",
    prompt: "What persuasion techniques are used? (fear appeal, authority appeal, emotional appeal, framing, selective emphasis, bandwagon, etc.)"
  },
  {
    key: "evidenceBalance",
    name: "Evidence Balance",
    description: "Whether evidence is presented in a balanced or one-sided manner",
    prompt: "How is evidence presented? (balanced, one-sided, selective, unclear, etc.)"
  },
  {
    key: "neutralityAssessment",
    name: "Neutrality Assessment",
    description: "Overall assessment of rhetorical balance and neutrality",
    prompt: "Overall, how neutral or balanced is this content rhetorically?"
  }
] as const;

const SYSTEM_MESSAGE =
  "You are a neutral rhetoric analyst specialized in identifying persuasion patterns and bias signals. " +
  "Your role is to analyze HOW content attempts to influence readers, not to judge whether that influence is right or wrong. " +
  "You examine emotional framing, loaded language, persuasion techniques, and evidence presentation. " +
  "You maintain a neutral, analytical stance focused on rhetorical structure. " +
  "You do not make moral or political judgments—only rhetorical observations.";

function buildInstructionMessage(text: string): string {
  return (
    "Perform a bias and persuasion analysis of the following content. " +
    "Analyze the rhetorical strategies and persuasion patterns used.\n\n" +
    "Provide a structured analysis covering:\n\n" +
    `1. ${BIAS_DIMENSIONS[0].prompt}\n\n` +
    `2. ${BIAS_DIMENSIONS[1].prompt}\n\n` +
    `3. ${BIAS_DIMENSIONS[2].prompt}\n\n` +
    `4. ${BIAS_DIMENSIONS[3].prompt}\n\n` +
    `5. ${BIAS_DIMENSIONS[4].prompt}\n\n` +
    `6. ${BIAS_DIMENSIONS[5].prompt}\n\n` +
    "Focus on rhetorical patterns, not political correctness. " +
    "Maintain analytical neutrality. " +
    "Do not make moral judgments about the content.\n\n" +
    `Content:\n${text}\n\n` +
    "Bias analysis:"
  );
}

export function buildBiasPrompt(request: BiasRequest): BiasPrompt {
  if (!request.originalText || request.originalText.trim().length === 0) {
    return {
      system: SYSTEM_MESSAGE,
      instruction: "No content provided for analysis.",
      expectedOutput: getEmptyBiasOutput()
    };
  }

  return {
    system: SYSTEM_MESSAGE,
    instruction: buildInstructionMessage(request.originalText),
    expectedOutput: {
      stance: "",
      emotionalTone: "",
      loadedLanguageExamples: [],
      persuasionTechniques: [],
      evidenceBalance: "",
      neutralityAssessment: ""
    }
  };
}

export function describeBiasDimensions(): string[] {
  return BIAS_DIMENSIONS.map(dim => `${dim.name}: ${dim.description}`);
}

export function isValidBiasOutput(obj: unknown): obj is BiasOutputSchema {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const output = obj as Record<string, unknown>;

  if (typeof output.stance !== "string") return false;
  if (typeof output.emotionalTone !== "string") return false;
  if (typeof output.evidenceBalance !== "string") return false;
  if (typeof output.neutralityAssessment !== "string") return false;

  if (!Array.isArray(output.loadedLanguageExamples)) return false;
  if (!output.loadedLanguageExamples.every(item => typeof item === "string")) return false;

  if (!Array.isArray(output.persuasionTechniques)) return false;
  if (!output.persuasionTechniques.every(item => typeof item === "string")) return false;

  return true;
}

export function getDimensionNames(): string[] {
  return BIAS_DIMENSIONS.map(dim => dim.name);
}

export function getDimensionKeys(): Array<keyof BiasOutputSchema> {
  return BIAS_DIMENSIONS.map(dim => dim.key);
}

export function getDimensionByKey(key: keyof BiasOutputSchema): BiasDimension | undefined {
  return BIAS_DIMENSIONS.find(dim => dim.key === key);
}

export function getEmptyBiasOutput(): BiasOutputSchema {
  return {
    stance: "",
    emotionalTone: "",
    loadedLanguageExamples: [],
    persuasionTechniques: [],
    evidenceBalance: "",
    neutralityAssessment: ""
  };
}

export function categorizeBias(output: BiasOutputSchema): "low" | "moderate" | "high" | "unclear" {
  if (!output.stance || !output.neutralityAssessment) {
    return "unclear";
  }

  const assessmentLower = output.neutralityAssessment.toLowerCase();

  const hasKeyword = (keywords: string[]): boolean => {
    return keywords.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(assessmentLower);
    });
  };

  const neutralKeywords = ["neutral", "balanced", "objective", "fair"];
  const moderateKeywords = ["somewhat", "leans", "tends", "slight"];
  const highKeywords = ["very", "extremely", "heavily", "strongly", "one-sided"];

  if (hasKeyword(neutralKeywords)) {
    return "low";
  }

  if (hasKeyword(highKeywords)) {
    return "high";
  }

  if (hasKeyword(moderateKeywords)) {
    return "moderate";
  }

  const hasLoadedLanguage = output.loadedLanguageExamples.length > 0;
  const hasPersuasionTechniques = output.persuasionTechniques.length > 0;

  if (hasLoadedLanguage && hasPersuasionTechniques) {
    return output.loadedLanguageExamples.length > 3 ? "high" : "moderate";
  }

  return "unclear";
}
