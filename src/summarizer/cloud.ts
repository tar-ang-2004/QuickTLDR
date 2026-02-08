import { Summary, createEmptySummary, validateSummary } from './schema';
import { buildSummaryPrompt, PromptConfig } from './prompt';

export async function summarizeWithGemini(
  text: string,
  apiKey: string,
  mode: string = 'professional',
  intent: string = 'casual',
  level: number = 3
): Promise<Summary> {
  if (!text || !apiKey) {
    console.error('[Gemini] No text or API key');
    return createEmptySummary();
  }

  try {
    console.log('[Gemini] Starting API call, text length:', text.length);
    const promptConfig: PromptConfig = { text, mode, intent, level };
    const prompt = buildSummaryPrompt(promptConfig);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('[Gemini] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', response.status, errorText);
      return createEmptySummary();
    }

    const data = await response.json();
    console.log('[Gemini] Response data:', data);
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[Gemini] Generated text length:', generatedText.length);

    const json = extractJSON(generatedText);
    const summary = validateSummary(json);
    console.log('[Gemini] Final summary:', summary);
    return summary;
  } catch (err) {
    console.error('[Gemini] Exception:', err);
    return createEmptySummary();
  }
}

function extractJSON(text: string): unknown {
  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      return null;
    }

    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function summarizeWithOpenAI(
  text: string,
  apiKey: string,
  mode: string = 'professional',
  intent: string = 'casual',
  level: number = 3
): Promise<Summary> {
  if (!text || !apiKey) {
    console.error('[OpenAI] No text or API key');
    return createEmptySummary();
  }

  try {
    console.log('[OpenAI] Starting API call, text length:', text.length);
    const promptConfig: PromptConfig = { text, mode, intent, level };
    const prompt = buildSummaryPrompt(promptConfig);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI] API error:', response.status, errorText);
      return createEmptySummary();
    }

    const data = await response.json();
    const generatedText = data?.choices?.[0]?.message?.content || '';

    const json = extractJSON(generatedText);
    const summary = validateSummary(json);
    return summary;
  } catch (err) {
    console.error('[OpenAI] Exception:', err);
    return createEmptySummary();
  }
}