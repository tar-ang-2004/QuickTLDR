import { ReadingMode, buildRewritePrompt, RewritePrompt, isValidMode } from './modes';
import { SummaryLevel, buildProgressivePrompt, ProgressivePrompt, isValidLevel } from './progressive';
import { ReadingIntent, buildIntentPrompt, IntentPrompt, isValidIntent } from './intent';
import { buildMetaPrompt, MetaPrompt } from './meta';
import { buildBiasPrompt, BiasPrompt } from './bias';

export interface OrchestratorRequest {
  text: string;
  intent: ReadingIntent;
  mode: ReadingMode;
  level: SummaryLevel;
  enableMeta: boolean;
  enableBias: boolean;
}

export interface OrchestratorPlan {
  rewritePrompt: RewritePrompt;
  progressivePrompt: ProgressivePrompt;
  intentPrompt: IntentPrompt;
  metaPrompt?: MetaPrompt;
  biasPrompt?: BiasPrompt;
}

export interface OrchestratorResult {
  plan: OrchestratorPlan;
  warnings: string[];
}

export interface PipelineStage {
  name: string;
  description: string;
  required: boolean;
  stage?: string;
}

interface PipelineEngine {
  name: string;
  description: string;
  required: boolean;
  stage: string;
  enabled: (request: OrchestratorRequest) => boolean;
  execute: (request: OrchestratorRequest) => { key: keyof OrchestratorPlan; value: any };
}

const PIPELINE_ENGINES: readonly PipelineEngine[] = Object.freeze([
  {
    name: "Intent Shaping",
    description: "Analyze content based on reading intent (research, exam, decision, etc.)",
    required: true,
    stage: "intent",
    enabled: () => true,
    execute: (request) => ({
      key: "intentPrompt",
      value: buildIntentPrompt({
        originalText: request.text,
        intent: request.intent
      })
    })
  },
  {
    name: "Progressive Compression",
    description: "Generate summary at specified compression level (1-3)",
    required: true,
    stage: "progressive",
    enabled: () => true,
    execute: (request) => ({
      key: "progressivePrompt",
      value: buildProgressivePrompt({
        originalText: request.text,
        level: request.level
      })
    })
  },
  {
    name: "Reading Mode Rewrite",
    description: "Rewrite summary for reading level (simple, student, professional, expert, casual)",
    required: true,
    stage: "mode",
    enabled: () => true,
    execute: (request) => ({
      key: "rewritePrompt",
      value: buildRewritePrompt({
        originalSummary: request.text,
        mode: request.mode
      })
    })
  },
  {
    name: "Meta Analysis",
    description: "Analyze author intent, core argument, and persuasion signals",
    required: false,
    stage: "meta",
    enabled: (request) => request.enableMeta,
    execute: (request) => ({
      key: "metaPrompt",
      value: buildMetaPrompt({
        originalText: request.text
      })
    })
  },
  {
    name: "Bias Scanning",
    description: "Detect rhetorical bias and stance signals",
    required: false,
    stage: "bias",
    enabled: (request) => request.enableBias,
    execute: (request) => ({
      key: "biasPrompt",
      value: buildBiasPrompt({
        originalText: request.text
      })
    })
  }
] as const);

const DEFAULT_REQUEST: OrchestratorRequest = {
  text: "",
  intent: "casual",
  mode: "professional",
  level: 2,
  enableMeta: false,
  enableBias: false
};

function sanitizeRequest(request: Partial<OrchestratorRequest>): { sanitized: OrchestratorRequest; warnings: string[] } {
  const warnings: string[] = [];
  
  let text = typeof request.text === "string" ? request.text : DEFAULT_REQUEST.text;
  if (typeof request.text !== "string" && request.text !== undefined) {
    warnings.push("Invalid text: defaulted to empty string");
  }
  
  let intent = DEFAULT_REQUEST.intent;
  if (typeof request.intent === "string" && isValidIntent(request.intent)) {
    intent = request.intent;
  } else if (request.intent !== undefined) {
    warnings.push(`Invalid intent '${request.intent}': defaulted to '${DEFAULT_REQUEST.intent}'`);
  }
  
  let mode = DEFAULT_REQUEST.mode;
  if (typeof request.mode === "string" && isValidMode(request.mode)) {
    mode = request.mode;
  } else if (request.mode !== undefined) {
    warnings.push(`Invalid mode '${request.mode}': defaulted to '${DEFAULT_REQUEST.mode}'`);
  }
  
  let level = DEFAULT_REQUEST.level;
  if (typeof request.level === "number" && isValidLevel(request.level)) {
    level = request.level;
  } else if (request.level !== undefined) {
    warnings.push(`Invalid level '${request.level}': defaulted to ${DEFAULT_REQUEST.level}`);
  }
  
  let enableMeta = DEFAULT_REQUEST.enableMeta;
  if (typeof request.enableMeta === "boolean") {
    enableMeta = request.enableMeta;
  } else if (request.enableMeta !== undefined) {
    warnings.push(`Invalid enableMeta: defaulted to ${DEFAULT_REQUEST.enableMeta}`);
  }
  
  let enableBias = DEFAULT_REQUEST.enableBias;
  if (typeof request.enableBias === "boolean") {
    enableBias = request.enableBias;
  } else if (request.enableBias !== undefined) {
    warnings.push(`Invalid enableBias: defaulted to ${DEFAULT_REQUEST.enableBias}`);
  }
  
  return {
    sanitized: {
      text,
      intent,
      mode,
      level,
      enableMeta,
      enableBias
    },
    warnings
  };
}

export function buildOrchestratorPlan(request: OrchestratorRequest): OrchestratorResult {
  const { sanitized, warnings } = sanitizeRequest(request);
  
  const plan: Partial<OrchestratorPlan> = {};
  
  for (const engine of PIPELINE_ENGINES) {
    if (engine.enabled(sanitized)) {
      try {
        const { key, value } = engine.execute(sanitized);
        (plan as any)[key] = value;
      } catch (error) {
        warnings.push(`${engine.name} engine failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  return {
    plan: plan as OrchestratorPlan,
    warnings
  };
}

export function describePipeline(): PipelineStage[] {
  return PIPELINE_ENGINES.map(engine => ({
    name: engine.name,
    description: engine.description,
    required: engine.required,
    stage: engine.stage
  }));
}

export function validateRequest(request: unknown): request is OrchestratorRequest {
  if (!request || typeof request !== "object") {
    return false;
  }
  
  const req = request as Record<string, unknown>;
  
  if (typeof req.text !== "string") return false;
  if (typeof req.intent !== "string") return false;
  if (typeof req.mode !== "string") return false;
  if (typeof req.level !== "number") return false;
  if (typeof req.enableMeta !== "boolean") return false;
  if (typeof req.enableBias !== "boolean") return false;
  
  if (!isValidIntent(req.intent)) return false;
  if (!isValidMode(req.mode)) return false;
  if (!isValidLevel(req.level)) return false;
  
  return true;
}

export function getDefaultRequest(): OrchestratorRequest {
  return { ...DEFAULT_REQUEST };
}

export function getPipelineStages(): string[] {
  return PIPELINE_ENGINES.map(engine => engine.name);
}

export function getRequiredStages(): string[] {
  return PIPELINE_ENGINES.filter(engine => engine.required).map(engine => engine.name);
}

export function getOptionalStages(): string[] {
  return PIPELINE_ENGINES.filter(engine => !engine.required).map(engine => engine.name);
}

export function countEnabledStages(request: OrchestratorRequest): number {
  return PIPELINE_ENGINES.filter(engine => engine.enabled(request)).length;
}

export function createMinimalRequest(text: string): OrchestratorRequest {
  return {
    ...DEFAULT_REQUEST,
    text
  };
}

export function createFullRequest(text: string): OrchestratorRequest {
  return {
    ...DEFAULT_REQUEST,
    text,
    enableMeta: true,
    enableBias: true
  };
}
