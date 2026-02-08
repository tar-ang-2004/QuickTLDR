// Settings management
import { getSettings, setSettings, getPreferences, setPreferences } from '../storage/settings';

// Theme controls
const html = document.documentElement;
const themeButtons = document.querySelectorAll('[data-theme-btn]');

// Load initial settings
let currentProvider = 'gemini';
let currentApiKey = '';

async function loadSettings() {
  const settings = await getSettings();
  const prefs = await getPreferences();
  
  // Load API key
  currentApiKey = settings.apiKey || '';
  const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
  if (apiKeyInput && currentApiKey) {
    apiKeyInput.value = currentApiKey;
  }
  
  // Load theme from chrome.storage instead of localStorage
  try {
    const result = await chrome.storage.local.get('theme');
    const savedTheme = result.theme || 'dark';
    html.setAttribute('data-theme', savedTheme);
    themeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme-btn') === savedTheme);
    });
  } catch {
    html.setAttribute('data-theme', 'dark');
  }
  
  // Load provider (from useCloudAI or default)
  currentProvider = settings.useCloudAI !== false ? 'gemini' : 'openai';
  document.querySelectorAll('[data-provider]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-provider') === currentProvider);
  });
  
  // Load reading preferences
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === prefs.readingMode);
  });
  document.querySelectorAll('[data-intent]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-intent') === prefs.readingIntent);
  });
  document.querySelectorAll('[data-level]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-level') === String(prefs.summaryLevel));
  });
}

loadSettings();

// Attempt to initialize overlay on the active tab so the floating toggle is available
async function initOverlayOnActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || typeof tab.id !== 'number') return;
    chrome.tabs.sendMessage(tab.id, { type: 'INIT_OVERLAY' });
  } catch (e) {
    // ignore — content script may not be ready or page may block injection
    console.debug('INIT_OVERLAY failed', e);
  }
}

// call after a short delay to allow popup to finish rendering
setTimeout(() => initOverlayOnActiveTab(), 150);

themeButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const theme = btn.getAttribute('data-theme-btn');
    if (theme) {
      html.setAttribute('data-theme', theme);
      await chrome.storage.local.set({ theme: theme });
      themeButtons.forEach(b => b.classList.toggle('active', b === btn));
    }
  });
});

// Collapsible sections with smooth measured-height animations
const COLLAPSE_MS = 420;

function animateOpen(body: HTMLElement) {
  if ((body as any)._animating) return;
  (body as any)._animating = true;
  body.classList.remove('hidden');
  // start from 0 height
  body.style.height = '0px';
  body.style.opacity = '0';
  // force reflow
  void body.offsetHeight;
  const target = body.scrollHeight;
  body.style.transition = `height ${COLLAPSE_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${Math.max(240, COLLAPSE_MS - 80)}ms ease`;
  body.style.height = `${target}px`;
  body.style.opacity = '1';

  const cleanup = () => {
    body.style.height = '';
    body.style.transition = '';
    body.style.opacity = '';
    (body as any)._animating = false;
    body.removeEventListener('transitionend', onEnd);
  };

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'height') cleanup();
  };

  body.addEventListener('transitionend', onEnd);
  // safety cleanup
  setTimeout(cleanup, COLLAPSE_MS + 50);
}

function animateClose(body: HTMLElement) {
  if ((body as any)._animating) return;
  (body as any)._animating = true;
  // set explicit start height
  const start = body.scrollHeight;
  body.style.height = `${start}px`;
  body.style.opacity = '1';
  // force reflow
  void body.offsetHeight;
  body.style.transition = `height ${COLLAPSE_MS}ms cubic-bezier(.2,.8,.2,1), opacity ${Math.max(240, COLLAPSE_MS - 80)}ms ease`;
  body.style.height = '0px';
  body.style.opacity = '0';

  const cleanup = () => {
    body.classList.add('hidden');
    body.style.height = '';
    body.style.transition = '';
    body.style.opacity = '';
    (body as any)._animating = false;
    body.removeEventListener('transitionend', onEnd);
  };

  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'height') cleanup();
  };

  body.addEventListener('transitionend', onEnd);
  // safety cleanup
  setTimeout(cleanup, COLLAPSE_MS + 50);
}

// Toggle handlers
document.querySelectorAll('[data-toggle]').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const targetId = toggle.getAttribute('data-toggle');
    const targetBody = document.getElementById(`${targetId}Body`) as HTMLElement | null;
    if (!targetBody) return;

    const isHidden = targetBody.classList.contains('hidden');
    if (isHidden) animateOpen(targetBody);
    else animateClose(targetBody);

    toggle.setAttribute('aria-expanded', String(!isHidden));
  });
});

// Initialize aria-expanded on load
document.querySelectorAll('[data-toggle]').forEach(toggle => {
  const targetId = toggle.getAttribute('data-toggle');
  const targetBody = document.getElementById(`${targetId}Body`);
  if (targetBody) {
    toggle.setAttribute('aria-expanded', String(!targetBody.classList.contains('hidden')));
  }
});

// Dropdown with click-outside guard and keyboard support
const translateBtn = document.getElementById('translateBtn') as HTMLButtonElement;
const translateMenu = document.getElementById('translateMenu') as HTMLDivElement;
const dropdownItems = document.querySelectorAll('.dropdown-item');

let isDropdownOpen = false;

const openDropdown = () => {
  translateMenu?.classList.remove('hidden');
  isDropdownOpen = true;
  const firstItem = translateMenu?.querySelector('.dropdown-item') as HTMLElement;
  firstItem?.focus();
};

const closeDropdown = () => {
  translateMenu?.classList.add('hidden');
  isDropdownOpen = false;
  translateBtn?.focus();
};

translateBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isDropdownOpen) {
    closeDropdown();
  } else {
    openDropdown();
  }
});

// Click outside to close
document.addEventListener('click', (e) => {
  if (isDropdownOpen && !translateMenu?.contains(e.target as Node) && e.target !== translateBtn) {
    closeDropdown();
  }
});

// Keyboard navigation in dropdown
translateMenu?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeDropdown();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const currentItem = document.activeElement;
    const nextItem = currentItem?.nextElementSibling as HTMLElement;
    nextItem?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const currentItem = document.activeElement;
    const prevItem = currentItem?.previousElementSibling as HTMLElement;
    prevItem?.focus();
  }
});

// Enter to select dropdown item and translate
let selectedLanguage = 'en';

dropdownItems.forEach(item => {
  item.addEventListener('click', async () => {
    const lang = item.getAttribute('data-lang');
    if (lang && summaryContent?.textContent) {
      selectedLanguage = lang;
      const originalText = summaryContent.textContent;
      
      // Update button text to show selected language
      const langNames: Record<string, string> = {
        en: 'English',
        hi: 'Hindi',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        ja: 'Japanese'
      };
      
      if (translateBtn) {
        const btnText = translateBtn.querySelector('span') || translateBtn.childNodes[0];
        if (btnText && btnText.nodeType === Node.TEXT_NODE) {
          btnText.textContent = `Translate to ${langNames[lang] || lang}`;
        }
      }
      
      // Simple translation via Google Translate API (free tier)
      try {
        const apiKey = currentApiKey;
        if (!apiKey) {
          summaryContent.textContent = 'Translation requires API key to be set';
          closeDropdown();
          return;
        }
        
        // Use Gemini for translation
        const translatePrompt = `Translate the following text to ${langNames[lang] || lang}. Return ONLY the translated text, no explanations:\n\n${originalText}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: translatePrompt }] }]
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || originalText;
          summaryContent.textContent = translatedText;
        }
      } catch (error) {
        console.error('Translation error:', error);
      }
    }
    closeDropdown();
  });
  
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (item as HTMLElement).click();
    }
  });
});

// Auto-close parent collapsible when option selected
function closeParentCollapsible(element: Element) {
  const card = element.closest('.card.collapsible');
  if (!card) return;
  const cardBody = card.querySelector('.card-body');
  const cardTitle = card.querySelector('.card-title');
  if (cardBody && !cardBody.classList.contains('hidden')) {
    // animate close for a smooth experience
    animateClose(cardBody as HTMLElement);
    cardTitle?.setAttribute('aria-expanded', 'false');
  }
}

// Segment group toggles
document.querySelectorAll('.segment-group').forEach(group => {
  group.querySelectorAll('.segment-button').forEach(btn => {
    btn.addEventListener('click', async () => {
      group.querySelectorAll('.segment-button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Save provider preference
      const provider = btn.getAttribute('data-provider');
      if (provider) {
        currentProvider = provider;
        await setSettings({ useCloudAI: provider === 'gemini' });
        // Reset daily usage when provider changes to avoid hitting stale developer limits
        await setSettings({ dailyUsage: 0, lastReset: Date.now() });
      }
      
      // Save reading mode
      const mode = btn.getAttribute('data-mode');
      if (mode) {
        await setPreferences({ readingMode: mode });
      }
      
      // Save reading intent
      const intent = btn.getAttribute('data-intent');
      if (intent) {
        await setPreferences({ readingIntent: intent });
      }
      
      // Save summary level
      const level = btn.getAttribute('data-level');
      if (level) {
        await setPreferences({ summaryLevel: parseInt(level) });
      }
      
      // Auto-close the collapsible section after brief delay for visual feedback
      setTimeout(() => closeParentCollapsible(btn), 150);
    });
  });
});

// API Key input save (save on change, Enter, or Save button)
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const apiKeySaveBtn = document.getElementById('apiKeySaveBtn') as HTMLButtonElement | null;

async function saveApiKeyFromInput() {
  if (!apiKeyInput) return;
  const key = apiKeyInput.value.trim();
  currentApiKey = key;
  await setSettings({ apiKey: key });
  // If the user provides their own API key, reset daily usage so their quota starts fresh
  await setSettings({ dailyUsage: 0, lastReset: Date.now() });
}

apiKeyInput?.addEventListener('change', saveApiKeyFromInput);
apiKeyInput?.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    await saveApiKeyFromInput();
  }
});
apiKeySaveBtn?.addEventListener('click', async () => {
  await saveApiKeyFromInput();
  apiKeySaveBtn.textContent = 'Saved';
  setTimeout(() => { apiKeySaveBtn.textContent = 'Save'; }, 1500);
});

// Summarize button
const summarizeBtn = document.getElementById('summarizeBtn');
const skeletonLoader = document.getElementById('skeletonLoader');
const summaryContainer = document.getElementById('summaryContainer');
const summaryContent = document.getElementById('summaryContent');

summarizeBtn?.addEventListener('click', async () => {
  skeletonLoader?.classList.remove('hidden');
  summaryContainer?.classList.add('hidden');
  
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.runtime.sendMessage({ type: 'SUMMARIZE_TAB' });
    
    if (response?.type === 'SUMMARY_RESPONSE' && response.data) {
      const summary = response.data;
      
      // Calculate and display metadata
      if (activeTab) {
        // Extract domain/author from URL
        try {
          const url = new URL(activeTab.url || '');
          const metaAuthor = document.getElementById('metaAuthor');
          if (metaAuthor) metaAuthor.textContent = url.hostname;
        } catch {}
        
        // Set current date as published
        const metaPublished = document.getElementById('metaPublished');
        if (metaPublished) metaPublished.textContent = new Date().toLocaleDateString();
      }
      
      if (summaryContent) {
        // Combine all summary sections into readable format
        const sections = [];
        
        if (summary.tldr && summary.tldr.length > 0) {
          sections.push('**TL;DR**\n' + summary.tldr.join(' '));
        }
        
        if (summary.keyPoints && summary.keyPoints.length > 0) {
          sections.push('**Key Points**\n• ' + summary.keyPoints.join('\n• '));
        }
        
        if (summary.quantifiables && summary.quantifiables.length > 0) {
          sections.push('**Quantifiables**\n• ' + summary.quantifiables.join('\n• '));
        }
        
        if (summary.actionItems && summary.actionItems.length > 0) {
          sections.push('**Action Items**\n• ' + summary.actionItems.join('\n• '));
        }
        
        if (summary.influence && summary.influence.length > 0) {
          sections.push('**Influence**\n• ' + summary.influence.join('\n• '));
        }
        
        if (summary.notableQuotes && summary.notableQuotes.length > 0) {
          sections.push('**Notable Quotes**\n• ' + summary.notableQuotes.join('\n• '));
        }
        
        const fullText = sections.join('\n\n');
        summaryContent.textContent = sections.length > 0 
          ? fullText
          : 'No summary generated.';
        
        // Calculate word count and reading time
        const wordCount = fullText.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
        
        const metaWordCount = document.getElementById('metaWordCount');
        const metaReadingTime = document.getElementById('metaReadingTime');
        
        if (metaWordCount) metaWordCount.textContent = wordCount.toLocaleString();
        if (metaReadingTime) metaReadingTime.textContent = `${readingTime} min`;
      }
      
      summaryContainer?.classList.remove('hidden');
    } else if (response?.type === 'ERROR') {
      throw new Error(response.message || 'Failed to generate summary');
    } else {
      throw new Error('Invalid response from background script');
    }
  } catch (error) {
    console.error('Summarization error:', error);
    if (summaryContent) {
      summaryContent.textContent = `Error: ${error instanceof Error ? error.message : 'Failed to generate summary'}`;
    }
    summaryContainer?.classList.remove('hidden');
  } finally {
    skeletonLoader?.classList.add('hidden');
  }
});

// Copy button
const copyBtn = document.getElementById('copyBtn');
copyBtn?.addEventListener('click', () => {
  if (summaryContent) {
    navigator.clipboard.writeText(summaryContent.textContent || '');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '✓ Copied';
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
    }, 2000);
  }
});

// Small popup animation on (top-level) buttons when clicked.
// Excludes sub-buttons like `.segment-button` and `.dropdown-item`.
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  // Find the nearest button element (handles clicks on SVG or inner spans)
  const btn = target.closest('button') as HTMLElement | null;
  if (!btn) return;

  // Exclude sub buttons
  if (btn.classList.contains('segment-button') || btn.classList.contains('dropdown-item')) return;

  // Add temporary animation class
  btn.classList.remove('btn-pop');
  // Force reflow to restart animation
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void btn.offsetWidth;
  btn.classList.add('btn-pop');

  // Remove class after animation ends to keep DOM clean
  setTimeout(() => btn.classList.remove('btn-pop'), 300);
});
