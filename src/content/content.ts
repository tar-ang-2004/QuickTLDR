type ExtractRequest = {
  type: 'EXTRACT_TEXT';
};

interface ExtractResponse {
  text: string;
}

chrome.runtime.onMessage.addListener((message: ExtractRequest, sender, sendResponse) => {
  if (message.type === 'EXTRACT_TEXT') {
    setTimeout(() => {
      try {
        const text = extractReadableText();
        sendResponse({ text });
      } catch (error) {
        sendResponse({ text: '' });
      }
    }, 100);
    return true;
  }
});

function extractReadableText(): string {
  if (!document.body) {
    return '';
  }

  const bodyText = document.body.innerText || document.body.textContent || '';
  
  if (bodyText && bodyText.length > 0) {
    const sanitized = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return sanitized.substring(0, 10000);
  }

  return '';
}
