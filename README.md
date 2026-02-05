# QuickTLDR - AI-Powered Web Page Summarizer
**QuickTLDR** is a privacy-first Chrome Extension that instantly summarizes web pages using AI. Get structured summaries with key facts, action items, numbers, and quotes—without leaving your current tab.

## Features

- **Instant Summaries**: One-click AI-powered page summarization
- **Structured Output**: Get organized summaries with:
  - TL;DR bullet points
  - Key facts
  - Action items
  - Important numbers
  - Notable quotes
- **Privacy-First**: Your API key stays local, no data sent to third parties
- **Daily Limits**: 20 summaries per day to manage API usage
- **Modern UI**: Clean, minimal interface with loading states

## Installation

### From Source

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Setup

1. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Click the QuickTLDR extension icon
3. Enter your API key when prompted
4. Start summarizing!

## Usage

1. Navigate to any web page
2. Click the QuickTLDR extension icon
3. Click "Summarize This Page"
4. View your structured summary in seconds

## Technology Stack

- **TypeScript**: Strict type safety
- **Vite**: Fast build tooling
- **Chrome Extension Manifest V3**: Modern extension architecture
- **Gemini 2.5 Flash**: Fast, accurate AI summarization
- **No Frameworks**: Pure HTML/CSS/TypeScript

## Architecture

```
src/
├── popup/         # Extension UI (HTML/CSS/TypeScript)
├── background/    # Service worker (message orchestration)
├── content/       # Content script (text extraction)
├── summarizer/    # AI layer (Gemini integration)
├── storage/       # Settings & activity management
├── messaging/     # Typed message protocol
├── utils/         # Text sanitization & readability
└── types/         # TypeScript type definitions
```

## Development

### Build Commands

```bash
# Production build
npm run build

# Watch mode (development)
npm run dev

# Clean build artifacts
npm run clean
```

### Project Structure

- `src/` - Source code (TypeScript)
- `public/` - Static assets (manifest, icons, privacy policy)
- `dist/` - Built extension (load this in Chrome)
- `scripts/` - Build scripts (post-build processing)

## Privacy

QuickTLDR is **privacy-first**:

- Your API key is stored locally using `chrome.storage.local`
- No analytics or tracking
- No data collection
- API calls go directly from your browser to Google's Gemini API
- See [privacy.html](public/privacy.html) for details

## Daily Usage Limits

- **Free Tier**: 20 summaries per day
- Resets automatically at midnight
- Counter stored locally

## API Key Security

**Important**: Keep your API key secure
- Never commit your API key to version control
- Don't share your API key publicly
- The extension stores it locally in encrypted Chrome storage
- You can reset your key anytime in Google AI Studio

## Browser Support

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Brave
- Other Chromium browsers

## License

MIT License - See [LICENSE](LICENSE) for details

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Troubleshooting

### Extension not loading
- Ensure you loaded the `dist` folder, not the root directory
- Check for errors in `chrome://extensions/`

### No summary appearing
- Verify your API key is valid
- Check the browser console for errors
- Ensure you haven't exceeded daily limit (20 summaries/day)

### Content extraction issues
- Some websites block content scripts
- Try refreshing the page and clicking again
- Dynamic content may need time to load

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions