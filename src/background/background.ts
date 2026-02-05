import { prepareForAI } from '../utils/sanitizer';
import { summarizeWithGemini } from '../summarizer/cloud';
import { getSettings, incrementUsage, resetDailyUsage } from '../storage/settings';
import { logActivity } from '../storage/activity';
import { SummarizeRequest, SummaryResponse, ErrorResponse } from '../messaging/messages';

const GEMINI_API_KEY = 'AIzaSyAjTojZkMP--b85PPgv6nhfu5jxlq4J5V8';
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
});

async function handleSummarizeTab(): Promise<BackgroundResponse> {
  try {
    if (!GEMINI_API_KEY) {
      return {
        type: 'ERROR',
        message: 'AI not configured'
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
      return {
        type: 'ERROR',
        message: 'Could not establish connection. Please refresh the page and try again.'
      };
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

    console.log('[Background] Calling Gemini API...');
    const summary = await summarizeWithGemini(sanitized, GEMINI_API_KEY);

    if (summary.tldr.length > 0) {
      await incrementUsage();
    }

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
