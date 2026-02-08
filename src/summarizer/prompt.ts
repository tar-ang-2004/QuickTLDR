export interface PromptConfig {
  text: string;
  mode: string;
  intent: string;
  level: number;
}

export function buildSummaryPrompt(config: PromptConfig): string {
  const { text, mode, intent, level } = config;
  
  // Determine word count based on level
  let wordLimit = '';
  let detailLevel = '';
  let sectionsRequired = true;
  
  if (level === 1) {
    wordLimit = '50 words maximum';
    detailLevel = 'extremely brief, single paragraph';
    sectionsRequired = false;
  } else if (level === 2) {
    wordLimit = '100 words maximum';
    detailLevel = 'concise yet detailed';
  } else {
    wordLimit = '200-300 words';
    detailLevel = 'fully detailed and comprehensive';
  }
  
  // Mode-specific instructions
  const modeInstructions: Record<string, string> = {
    simple: 'Use simple, everyday language. Avoid jargon and technical terms. Explain concepts clearly as if to a general audience.',
    student: 'Use clear academic language. Include context and explanations. Emphasize learning points and understanding.',
    professional: 'Use professional business language. Focus on actionable insights, implications, and strategic value.',
    expert: 'Use technical and domain-specific terminology. Assume deep subject knowledge. Focus on nuance and complexity.'
  };
  
  // Intent-specific instructions
  const intentInstructions: Record<string, string> = {
    research: 'Focus on methodology, findings, data, and evidence. Highlight research questions and conclusions.',
    exam: 'Emphasize key concepts, definitions, important facts, and testable information. Structure for memorization.',
    decision: 'Focus on options, trade-offs, recommendations, and actionable next steps. Highlight pros/cons.',
    casual: 'Capture the main ideas and interesting points. Keep it engaging and easy to digest.'
  };
  
  const modeGuide = modeInstructions[mode] || modeInstructions.professional;
  const intentGuide = intentInstructions[intent] || intentInstructions.casual;
  
  if (level === 1) {
    // Level 1: Single paragraph, no sections
    return `You are summarizing content for a ${mode} reader with ${intent} intent.

Create a ${wordLimit} summary that is ${detailLevel}.

Mode guidance: ${modeGuide}
Intent guidance: ${intentGuide}

Return ONLY valid JSON (no markdown, no explanation):
{
  "tldr": ["single concise paragraph summary in ${wordLimit}"]
}

IMPORTANT:
- Do NOT hallucinate or invent information
- Extract only what is explicitly present in the text
- Keep to ${wordLimit}
- Return valid JSON only

Text to analyze:

${text}`;
  }
  
  // Level 2 & 3: Full structured format
  return `You are summarizing content for a ${mode} reader with ${intent} intent.

Create a ${detailLevel} summary with ${wordLimit} total across all sections.

Mode guidance: ${modeGuide}
Intent guidance: ${intentGuide}

Return ONLY valid JSON (no markdown, no explanation):
{
  "tldr": ["1-2 sentence core summary"],
  "keyPoints": ["key point 1", "key point 2", ...],
  "quantifiables": ["dates, numbers, statistics, percentages from the text"],
  "actionItems": ["recommended actions or next steps"],
  "influence": ["impact, significance, or implications"],
  "notableQuotes": ["direct quotes from the text"]
}

IMPORTANT:
- Do NOT hallucinate or invent information
- Extract only what is explicitly present in the text
- If a section has no relevant content, return an empty array for that field
- Skip sections that don't apply (e.g., if no quotes exist, return empty array)
- Total word count across ALL sections must not exceed ${wordLimit}
- Return valid JSON only

Text to analyze:

${text}`;
}