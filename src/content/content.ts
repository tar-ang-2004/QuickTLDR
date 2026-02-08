import { SummaryResponse, ErrorResponse } from '../messaging/messages';

type ExtractRequest = {
  type: 'EXTRACT_TEXT';
};

type SummarizeRequest = {
  type: 'SUMMARIZE_TAB';
};

type OverlayRequest = {
  type: 'TOGGLE_OVERLAY' | 'INIT_OVERLAY' | 'ENABLE_HIGHLIGHTS' | 'DISABLE_HIGHLIGHTS';
};

interface ExtractResponse {
  text: string;
}

chrome.runtime.onMessage.addListener((message: ExtractRequest | SummarizeRequest, sender, sendResponse) => {
  // Handle SUMMARIZE_TAB by forwarding to background
  if ((message as SummarizeRequest).type === 'SUMMARIZE_TAB') {
    chrome.runtime.sendMessage(message, (response: SummaryResponse | ErrorResponse) => {
      sendResponse(response);
    });
    return true;
  }
  
  if ((message as ExtractRequest).type === 'EXTRACT_TEXT') {
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

  // ping for readiness
  if ((message as any).type === 'PING') {
    try {
      // mark ready flag on window for debugging
      try { (window as any).__quicktldr_ready = true; } catch {}
      sendResponse({ ok: true });
    } catch {
      sendResponse({ ok: false });
    }
    return true;
  }
  // handle overlay control messages
  const m2 = message as OverlayRequest;
  if (m2.type === 'INIT_OVERLAY') {
    loadModuleOnce('overlayUI.js').then(() => {
      try { (window as any).quicktldr_overlay?.initOverlayUI(); } catch {}
    }).catch(() => {});
    return false;
  }
  if (m2.type === 'TOGGLE_OVERLAY') {
    loadModuleOnce('overlayUI.js').then(() => {
      try {
        (window as any).quicktldr_overlay?.initOverlayUI();
        const btn = document.getElementById('quicktldr-overlay-toggle');
        if (btn) btn.click();
      } catch {}
    }).catch(() => {});
    return false;
  }
  if (m2.type === 'ENABLE_HIGHLIGHTS') {
    loadModuleOnce('highlight.js').then(() => {
      try { (window as any).quicktldr_highlight?.enableHighlights(); } catch {}
    }).catch(() => {});
    return false;
  }
  if (m2.type === 'DISABLE_HIGHLIGHTS') {
    loadModuleOnce('highlight.js').then(() => {
      try { (window as any).quicktldr_highlight?.disableHighlights(); } catch {}
    }).catch(() => {});
    return false;
  }
});

function extractReadableText(): string {
  if (!document.body) {
    return '';
  }

  // Try to extract a focused article-like body first (heuristic)
  let content = '';

  const article = document.querySelector('article');
  if (article && article.textContent) {
    content = article.textContent;
  }

  if (!content) {
    // Fallback to main element
    const main = document.querySelector('main');
    if (main && main.textContent) {
      content = main.textContent;
    }
  }

  if (!content) {
    content = document.body.innerText || document.body.textContent || '';
  }

  const title = document.title || '';

  const sanitized = (`${title}\n\n` + content)
    .replace(/\s+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  // Increase cap to 20000 chars to preserve more context
  return sanitized.substring(0, 20000);
}

function loadModuleOnce(fileName: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const globalName = fileName.includes('overlay') ? 'quicktldr_overlay' : 'quicktldr_highlight';
      if ((window as any)[globalName]) return resolve();

      // Try dynamic import of extension module into content script context
      try {
        const url = chrome.runtime.getURL(fileName);
        const mod = await import(/* @vite-ignore */ url);
        // attach to window for compatibility if module exports expected functions
        if (fileName.includes('overlay')) {
          if (typeof mod.initOverlayUI === 'function') (window as any).quicktldr_overlay = mod;
        } else {
          if (typeof mod.enableHighlights === 'function') (window as any).quicktldr_highlight = mod;
        }
        return resolve();
      } catch (err) {
        // Fallback to previous script tag injection if import fails
        const script = document.createElement('script');
        script.type = 'module';
        script.src = chrome.runtime.getURL(fileName);
        script.onload = () => setTimeout(resolve, 20);
        script.onerror = (e) => reject(e);
        (document.head || document.documentElement).appendChild(script);
      }
    } catch (e) {
      reject(e);
    }
  });
}

// ensure ready flag when script loads
try { (window as any).__quicktldr_ready = true; } catch {}
