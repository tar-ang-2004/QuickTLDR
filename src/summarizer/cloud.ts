import { Summary, createEmptySummary, validateSummary } from './schema';
import { buildSummaryPrompt } from './prompt';

export async function summarizeWithGemini(
  text: string,
  apiKey: string
): Promise<Summary> {
  if (!text || !apiKey) {
    console.error('[Gemini] No text or API key');
    return createEmptySummary();
  }

  try {
    console.log('[Gemini] Starting API call, text length:', text.length);
    const prompt = buildSummaryPrompt(text);
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