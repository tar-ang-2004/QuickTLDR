import { prepareForAI } from '../utils/sanitizer';
import { getSettings, incrementUsage, resetDailyUsage, getApiKey, getPreferences } from '../storage/settings';
import { logActivity } from '../storage/activity';
import { SummarizeRequest, SummaryResponse, ErrorResponse } from '../messaging/messages';
import { RecallRequest, RecallResponse } from '../messaging/messages';
import * as timeline from '../memory/timeline';
import * as graph from '../memory/graph';
import { summarizeWithGemini, summarizeWithOpenAI } from '../summarizer/cloud';

// API key is stored in extension settings (do not hardcode keys in source)
const DAILY_LIMIT = 20;

type BackgroundResponse = SummaryResponse | ErrorResponse;

chrome.runtime.onMessage.addListener((message: SummarizeRequest, sender, sendResponse) => {
  if (message.type === 'SUMMARIZE_TAB') {
    handleSummarizeTab()
      .then(response => sendResponse(response))
      .catch(() =>
        sendResponse({
          type: 'ERROR',
          message: 'Failed to process request'
        })
      );
    return true;
  }
  // Memory recall API
  const m = message as RecallRequest;
  if (m.type === 'RECALL_MEMORY') {
    try {
      const results = timeline.searchEntries(m.query || '');
      const payload: RecallResponse = {
        type: 'RECALL_RESPONSE',
        data: results.map(e => ({ id: e.id, url: e.url, title: e.title, summary: e.summary, timestamp: e.timestamp }))
      };
      sendResponse(payload);
    } catch (err) {
      sendResponse({ type: 'ERROR', message: 'Memory recall failed' });
    }
    return true;
  }
});

async function handleSummarizeTab(): Promise<BackgroundResponse> {
  try {
    const apiKey = await getApiKey();

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        type: 'ERROR',
        message: 'AI not configured - API key is missing'
      };
    }

    const settings = await getSettings();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - settings.lastReset > oneDay) {
      await resetDailyUsage();
      settings.dailyUsage = 0;
    }

    if (settings.dailyUsage >= DAILY_LIMIT) {
      return {
        type: 'ERROR',
        message: `Daily limit reached (${DAILY_LIMIT} summaries per day)`
      };
    }

    const tabId = await getActiveTabId();

    if (!tabId) {
      return {
        type: 'ERROR',
        message: 'No active tab found'
      };
    }

    const tab = await chrome.tabs.get(tabId);
    const domain = extractDomain(tab.url || '');
    
    let content;
    try {
      content = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_TEXT'
      });
    } catch (e) {
      // Try to inject the content script dynamically and retry once
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });

        // After injection, ping the content script to ensure listener registered
        let ready = false;
        const maxAttempts = 6;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const res = await new Promise<any>((resolve, reject) => {
              chrome.tabs.sendMessage(tabId, { type: 'PING' }, (r) => {
                if (chrome.runtime.lastError) {
                  return reject(new Error(chrome.runtime.lastError.message));
                }
                resolve(r);
              });
            });
            if (res && res.ok) {
              ready = true;
              break;
            }
          } catch {
            // wait and retry
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (!ready) {
          return {
            type: 'ERROR',
            message: 'Could not establish connection. Please refresh the page and try again.'
          };
        }

        content = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_TEXT' });
      } catch (err) {
        return {
          type: 'ERROR',
          message: 'Could not establish connection. Please refresh the page and try again.'
        };
      }
    }

    if (!content || !content.text) {
      return {
        type: 'ERROR',
        message: 'Failed to extract content from page'
      };
    }

    const sanitized = prepareForAI(content.text);

    if (!sanitized) {
      return {
        type: 'ERROR',
        message: 'No readable content found on page'
      };
    }

    // Get user preferences
    const preferences = await getPreferences();
    
    // Use cloud summarizer with preferences. Choose provider based on settings.useCloudAI
    let summary;
    if (settings.useCloudAI !== false) {
      summary = await summarizeWithGemini(
        sanitized,
        apiKey,
        preferences.readingMode,
        preferences.readingIntent,
        preferences.summaryLevel
      );
    } else {
      summary = await summarizeWithOpenAI(
        sanitized,
        apiKey,
        preferences.readingMode,
        preferences.readingIntent,
        preferences.summaryLevel
      );
    }

    await incrementUsage();
    await logActivity(domain, sanitized.length);

    return {
      type: 'SUMMARY_RESPONSE',
      data: summary
    };
  } catch (error) {
    return {
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Failed to summarize tab'
    };
  }
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
}
