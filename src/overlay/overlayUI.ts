// Simple overlay UI: floating toggle to enable/disable highlights

function createToggle() {
  if (document.getElementById('quicktldr-overlay-toggle')) return;

  const btn = document.createElement('button');
  btn.id = 'quicktldr-overlay-toggle';
  btn.textContent = 'Highlights';
  btn.style.position = 'fixed';
  btn.style.right = '16px';
  btn.style.bottom = '80px';
  btn.style.zIndex = '2147483647';
  btn.style.background = 'rgba(18,20,26,0.9)';
  btn.style.color = 'white';
  btn.style.border = 'none';
  btn.style.padding = '8px 10px';
  btn.style.borderRadius = '8px';
  btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.35)';
  btn.style.cursor = 'pointer';

  let enabled = false;
  btn.addEventListener('click', async () => {
    try {
      // prefer imported functions if present
      const mod = (window as any).quicktldr_highlight;
      if (mod && typeof mod.enableHighlights === 'function') {
        if (!enabled) {
          await mod.enableHighlights();
          btn.style.background = 'linear-gradient(90deg, #7c3fff, #6a22ff)';
          enabled = true;
        } else {
          await mod.disableHighlights();
          btn.style.background = 'rgba(18,20,26,0.9)';
          enabled = false;
        }
        return;
      }

      // fallback: attempt to dynamically import the highlight module
      try {
        const url = chrome.runtime.getURL('highlight.js');
        const imported = await import(url);
        if (!enabled) {
          await imported.enableHighlights();
          btn.style.background = 'linear-gradient(90deg, #7c3fff, #6a22ff)';
          enabled = true;
        } else {
          await imported.disableHighlights();
          btn.style.background = 'rgba(18,20,26,0.9)';
          enabled = false;
        }
      } catch (e) {
        console.error('Failed to import highlight module', e);
      }
    } catch (e) { console.error(e); }
  });

  document.body.appendChild(btn);
}

export function initOverlayUI() {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createToggle);
    } else {
      createToggle();
    }
  } catch (e) {
    console.error('Overlay init error', e);
  }
}

const O: any = { initOverlayUI };

try { (window as any).quicktldr_overlay = O; } catch {}

export {};
