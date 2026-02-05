# Installation & Testing Guide

## Fixed Issues

✅ Content script connection errors  
✅ Message protocol mismatches  
✅ Text extraction regex bugs  
✅ Response handling in popup  
✅ Added missing `tabs` permission  
✅ Content script loading timing  

## Install Extension

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `dist` folder

3. **Reload extension after changes:**
   - After making code changes, run `npm run build`
   - Go to `chrome://extensions/`
   - Click the reload icon on the ClearTab AI extension

## Testing

1. **Navigate to any webpage** (e.g., a news article, blog post)
2. **Click the extension icon** in Chrome toolbar
3. **Click "Summarize This Tab"**
4. Wait for the AI summary

## Troubleshooting

### "Could not establish connection"
- **Fix:** Reload the webpage after installing/updating the extension
- Content scripts only inject on page load

### "Failed to extract content"
- **Fix:** Make sure you're on a normal webpage (not chrome://, about:, file://)
- Content scripts can't run on Chrome system pages

### "AI not configured"
- **Fix:** The Gemini API key is already set in the code
- If you see this, there's a code issue

### Infinite "Analyzing content..."
- **Fix:** Check browser console (F12) for errors
- Open background worker console: `chrome://extensions/` → Service Worker (inspect views)

## Dev Mode

Watch for changes:
```bash
npm run dev
```

After each build, remember to reload the extension in Chrome!
