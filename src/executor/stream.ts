import type { ExecutionRequest } from './execute';
import { executeStage, getProvider, buildRewriteInstruction, parseJSONSafely, DEFAULT_TIMEOUT_MS, DEFAULT_RETRIES } from './execute';
import { validateMetaOutput } from '../intelligence/meta';
import { isValidBiasOutput, categorizeBias } from '../intelligence/bias';

export type StreamStage =
  | "progressive"
  | "rewrite"
  | "meta"
  | "bias"
  | "done"
  | "error";

export interface StreamEvent {
  stage: StreamStage;
  data?: unknown;
  warning?: string;
}

export async function* executePlanStream(
  request: ExecutionRequest
): AsyncGenerator<StreamEvent> {
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = request.retries ?? DEFAULT_RETRIES;
  
  let provider;
  try {
    provider = getProvider(request.provider);
  } catch (error) {
    yield {
      stage: "error",
      warning: `Invalid provider: ${error instanceof Error ? error.message : String(error)}`
    };
    yield { stage: "done" };
    return;
  }

  if (!request.apiKey || request.apiKey.trim().length === 0) {
    yield {
      stage: "error",
      warning: "Missing API key"
    };
    yield { stage: "done" };
    return;
  }

  let summary = '';

  try {
    const progressiveResult = await executeStage(
      {
        system: request.plan.progressivePrompt.system,
        instruction: request.plan.progressivePrompt.instruction
      },
      provider,
      request.apiKey,
      timeoutMs,
      retries
    );
    summary = progressiveResult;
    
    yield {
      stage: "progressive",
      data: summary
    };
  } catch (error) {
    yield {
      stage: "error",
      warning: `Progressive summary failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  if (summary) {
    try {
      const rewriteInstruction = buildRewriteInstruction(
        request.plan.rewritePrompt.instruction,
        summary
      );
      
      const rewriteResult = await executeStage(
        {
          system: request.plan.rewritePrompt.system,
          instruction: rewriteInstruction
        },
        provider,
        request.apiKey,
        timeoutMs,
        retries
      );
      summary = rewriteResult;
      
      yield {
        stage: "rewrite",
        data: summary
      };
    } catch (error) {
      yield {
        stage: "error",
        warning: `Rewrite mode failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  let rateLimitHit = false;

  if (request.plan.metaPrompt) {
    try {
      const metaResult = await executeStage(
        {
          system: request.plan.metaPrompt.system,
          instruction: request.plan.metaPrompt.instruction
        },
        provider,
        request.apiKey,
        timeoutMs,
        retries
      );
      const parsed = parseJSONSafely(metaResult);
      if (validateMetaOutput(parsed)) {
        yield {
          stage: "meta",
          data: parsed
        };
      } else {
        yield {
          stage: "meta",
          data: { raw: typeof parsed === 'string' ? parsed : metaResult }
        };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota')) {
        rateLimitHit = true;
        yield {
          stage: "error",
          warning: `Rate limit reached. Skipping advanced analysis.`
        };
      } else {
        yield {
          stage: "error",
          warning: `Meta analysis failed: ${errMsg}`
        };
      }
    }
  }

  if (request.plan.biasPrompt && !rateLimitHit) {
    try {
      const biasResult = await executeStage(
        {
          system: request.plan.biasPrompt.system,
          instruction: request.plan.biasPrompt.instruction
        },
        provider,
        request.apiKey,
        timeoutMs,
        retries
      );
      const parsed = parseJSONSafely(biasResult);
      if (isValidBiasOutput(parsed)) {
        // derive a simple numeric score from categorical assessment
        const category = categorizeBias(parsed as any);
        let score = 0.5;
        if (category === 'low') score = 0.15;
        else if (category === 'moderate') score = 0.5;
        else if (category === 'high') score = 0.9;

        yield {
          stage: "bias",
          data: { ...parsed, _category: category, score }
        };
      } else {
        yield {
          stage: "bias",
          data: { raw: typeof parsed === 'string' ? parsed : biasResult }
        };
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota')) {
        yield {
          stage: "error",
          warning: `Rate limit reached. Skipping bias analysis.`
        };
      } else {
        yield {
          stage: "error",
          warning: `Bias analysis failed: ${errMsg}`
        };
      }
    }
  }

  yield { stage: "done" };
}
