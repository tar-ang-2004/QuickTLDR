export function buildSummaryPrompt(text: string): string {
  return `Analyze the following text and extract key information. Return ONLY a JSON object with no additional text, markdown, or explanation.

The JSON must have this exact structure:
{
  "tldr": ["brief summary point 1", "brief summary point 2"],
  "facts": ["key fact 1", "key fact 2"],
  "actions": ["action item 1", "action item 2"],
  "numbers": ["statistic 1", "statistic 2"],
  "quotes": ["notable quote 1", "notable quote 2"]
}

Rules:
- Return JSON only, no markdown code blocks
- Each array should contain 2-5 concise bullet points
- Keep each point under 100 characters
- Extract only factual information from the text
- Do not hallucinate or add information not present
- If a category has no relevant content, use an empty array

Text to analyze:

${text}`;
}