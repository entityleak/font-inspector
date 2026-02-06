# Font Inspector

A Chrome extension for QA'ing web typography. Visually highlights text elements by their typographic properties and generates a waterfall view of every unique style combination on a page.

## Features

### Highlight Modes

Click the extension icon to open the popup, then select a mode. Every text element on the page is highlighted with a color-coded overlay based on its computed value for that property. Hover over any element to see a tooltip with the exact value.

- **Letter Spacing** — groups elements by letter-spacing (shown as a percentage of font-size)
- **Font Size** — groups elements by computed font-size
- **Font Family** — groups elements by primary font family
- **Font Weight** — groups elements by font-weight
- **Line Height** — groups elements by line-height (shown as a percentage of font-size)

Click the same mode again to turn off highlighting.

### Typography Waterfall

Click **ANALYZE WATERFALL** to open a new tab showing every unique typographic style combination found on the page, sorted from largest to smallest font-size. Each row displays:

- **Sample text** rendered in the actual font properties (family, size, weight, line-height, letter-spacing)
- **Properties** — a summary line showing the computed values
- **Metadata** — instance count, which HTML elements use that style, and numbered links that scroll the original page to each instance with a brief highlight flash

## Installation

1. Clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select the repository folder

## Usage

1. Navigate to any web page
2. Click the Font Inspector icon in the toolbar
3. Select a highlight mode to inspect individual properties, or click **ANALYZE WATERFALL** for a full typographic audit
