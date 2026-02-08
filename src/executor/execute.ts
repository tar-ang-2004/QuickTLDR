import type { OrchestratorPlan } from '../intelligence/orchestrator';

export interface ExecutionRequest {
  plan: OrchestratorPlan;
  provider: "gemini" | "openai";
  apiKey: string;
  timeoutMs?: number;
  retries?: number;
}

export interface ExecutionResult {
  summary: string;
  meta?: unknown;
  bias?: unknown;
  warnings: string[];
}

interface PromptRequest {
  system: string;
  instruction: string;
}

interface AIProvider {
  sendPrompt(prompt: PromptRequest, apiKey: string): Promise<string>;
}

export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_RETRIES = 2;

class GeminiProvider implements AIProvider {
  async sendPrompt(prompt: PromptRequest, apiKey: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${prompt.system}\n\n${prompt.instruction}`
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini returned no candidates');
    }

    const text = data.candidates[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return text;
  }
}

class OpenAIProvider implements AIProvider {
  async sendPrompt(prompt: PromptRequest, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.instruction }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenAI returned no choices');
    }

    const text = data.choices[0]?.message?.content;
    
    if (!text) {
      throw new Error('OpenAI returned empty response');
    }

    return text;
  }
}

const PROVIDERS: Record<"gemini" | "openai", AIProvider> = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider()
};

export function getProvider(name: string): AIProvider {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return provider;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Retry failed with unknown error');
}

export async function executeStage(
  prompt: PromptRequest,
  provider: AIProvider,
  apiKey: string,
  timeoutMs: number,
  retries: number
): Promise<string> {
  return await retry(
    () => withTimeout(provider.sendPrompt(prompt, apiKey), timeoutMs),
    retries
  );
}

export function parseJSONSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function buildRewriteInstruction(originalInstruction: string, newSummary: string): string {
  const contentMarker = 'Content:';
  const summaryMarker = 'Original summary:';
  
  if (originalInstruction.includes(summaryMarker)) {
    const beforeMarker = originalInstruction.substring(0, originalInstruction.indexOf(summaryMarker));
    const afterMarker = originalInstruction.substring(originalInstruction.indexOf(summaryMarker));
    
    const summaryEnd = afterMarker.indexOf('\n\n');
    if (summaryEnd !== -1) {
      const afterSummary = afterMarker.substring(summaryEnd);
      return `${beforeMarker}${summaryMarker}\n${newSummary}${afterSummary}`;
    }
  }
  
  if (originalInstruction.includes(contentMarker)) {
    const beforeMarker = originalInstruction.substring(0, originalInstruction.indexOf(contentMarker));
    const afterMarker = originalInstruction.substring(originalInstruction.indexOf(contentMarker));
    
    const contentEnd = afterMarker.indexOf('\n\n');
    if (contentEnd !== -1) {
      const afterContent = afterMarker.substring(contentEnd);
      return `${beforeMarker}${summaryMarker}\n${newSummary}${afterContent}`;
    }
  }
  
  return `${originalInstruction}\n\n${summaryMarker}\n${newSummary}\n\nRewritten summary:`;
}

export async function executePlan(request: ExecutionRequest): Promise<ExecutionResult> {
  const warnings: string[] = [];
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = request.retries ?? DEFAULT_RETRIES;
  
  let provider: AIProvider;
  try {
    provider = getProvider(request.provider);
  } catch (error) {
    warnings.push(`Invalid provider: ${error instanceof Error ? error.message : String(error)}`);
    return {
      summary: '',
      warnings
    };
  }

  if (!request.apiKey || request.apiKey.trim().length === 0) {
    warnings.push('Missing API key');
    return {
      summary: '',
      warnings
    };
  }

  let summary = '';
  let meta: unknown = undefined;
  let bias: unknown = undefined;

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
  } catch (error) {
    warnings.push(`Progressive summary failed: ${error instanceof Error ? error.message : String(error)}`);
    summary = '';
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
    } catch (error) {
      warnings.push(`Rewrite mode failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

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
      meta = parseJSONSafely(metaResult);
    } catch (error) {
      warnings.push(`Meta analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (request.plan.biasPrompt) {
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
      bias = parseJSONSafely(biasResult);
    } catch (error) {
      warnings.push(`Bias analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    summary,
    meta,
    bias,
    warnings
  };
}

export function validateExecutionRequest(request: unknown): request is ExecutionRequest {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const req = request as Record<string, unknown>;

  if (!req.plan || typeof req.plan !== 'object') return false;
  if (typeof req.provider !== 'string') return false;
  if (req.provider !== 'gemini' && req.provider !== 'openai') return false;
  if (typeof req.apiKey !== 'string') return false;
  
  if (req.timeoutMs !== undefined && typeof req.timeoutMs !== 'number') return false;
  if (req.retries !== undefined && typeof req.retries !== 'number') return false;

  return true;
}

export function getDefaultExecutionRequest(plan: OrchestratorPlan, provider: "gemini" | "openai", apiKey: string): ExecutionRequest {
  return {
    plan,
    provider,
    apiKey,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES
  };
}
