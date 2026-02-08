// Lightweight highlight module for QuickTLDR
// Exposes: window.quicktldr_highlight.enableHighlights(), .disableHighlights()

function injectStyles() {
  if (document.getElementById('quicktldr-highlight-style')) return;
  const s = document.createElement('style');
  s.id = 'quicktldr-highlight-style';
  s.textContent = `
  .quicktldr-highlight {
    background: rgba(124,63,255,0.18);
    border-radius: 4px;
    padding: 0 2px;
    box-decoration-break: clone;
    transition: background-color 180ms ease;
  }
  `;
  (document.head || document.documentElement).appendChild(s);
}

function sentenceSplit(text: string): string[] {
  // crude sentence splitter
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function collectCandidateSentences(limit = 100): string[] {
  const container = document.querySelector('article') || document.querySelector('main') || document.body;
  if (!container) return [];
  const text = (container.textContent || '').replace(/\s+/g, ' ').trim();
  const sentences = sentenceSplit(text);
  return sentences.slice(0, limit);
}

function scoreSentence(idx: number, sentence: string): number {
  // simple heuristic: longer sentences and earlier position score higher
  const len = sentence.length;
  return len * (1 + (1 / (1 + idx * 0.1)));
}

function findTopSentences(n = 8): string[] {
  const candidates = collectCandidateSentences(300);
  const scored = candidates.map((s, i) => ({ s, score: scoreSentence(i, s) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(x => x.s);
}

function wrapMatchesInTextNodes(root: Node, targets: string[]): HTMLElement[] {
  const created: HTMLElement[] = [];
  if (!root) return created;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  } as any);

  const lowerTargets = targets.map(t => t.toLowerCase());

  const nodesToProcess: Text[] = [];
  let node: Text | null = walker.nextNode() as Text | null;
  while (node) {
    nodesToProcess.push(node);
    node = walker.nextNode() as Text | null;
  }

  for (const textNode of nodesToProcess) {
    const val = textNode.nodeValue || '';
    const lower = val.toLowerCase();
    for (let i = 0; i < lowerTargets.length; i++) {
      const t = lowerTargets[i];
      const idx = lower.indexOf(t);
      if (idx !== -1 && t.length > 10) {
        // split and replace
        const before = val.slice(0, idx);
        const match = val.slice(idx, idx + t.length);
        const after = val.slice(idx + t.length);

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        const span = document.createElement('span');
        span.className = 'quicktldr-highlight';
        span.textContent = match;
        frag.appendChild(span);
        if (after) frag.appendChild(document.createTextNode(after));

        const parent = textNode.parentNode;
        if (parent) {
          parent.replaceChild(frag, textNode);
          created.push(span);
        }
        break; // move to next text node
      }
    }
  }

  return created;
}

const H: any = {
  _elements: [] as HTMLElement[],
  _enabled: false
};

export function enableHighlights() {
  try {
    injectStyles();
    if (H._enabled) return;
    H._enabled = true;
    const top = findTopSentences(10);
    H._elements = wrapMatchesInTextNodes(document.body, top);
  } catch (e) {
    console.error('Highlight enable error', e);
  }
}

export function disableHighlights() {
  try {
    if (!H._enabled) return;
    H._enabled = false;
    for (const el of H._elements || []) {
      const parent = el.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
    }
    H._elements = [];
  } catch (e) {
    console.error('Highlight disable error', e);
  }
}

try { (window as any).quicktldr_highlight = { enableHighlights, disableHighlights }; } catch {}

export default { enableHighlights, disableHighlights };
