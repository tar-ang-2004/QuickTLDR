export function extractReadableText(): string {
  try {
    if (!document.body) {
      return '';
    }

    const rawText = document.body.innerText || document.body.textContent || '';
    return rawText.trim();
  } catch {
    return '';
  }
}