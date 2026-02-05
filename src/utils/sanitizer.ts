export function sanitizeText(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncateText(input: string, maxChars = 10000): string {
  if (!input || input.length <= maxChars) {
    return input;
  }

  let truncated = input.substring(0, maxChars);

  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.8) {
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + '...';
}

export function prepareForAI(input: string): string {
  if (!input) {
    return '';
  }

  const sanitized = sanitizeText(input);
  const truncated = truncateText(sanitized);
  return truncated.trim();
}