(() => {
  // Guard against double-injection
  if (window.__fontInspectorInjected) return;
  window.__fontInspectorInjected = true;

  const ATTR_VALUE = "data-fi-value";
  const ATTR_KEY = "data-fi-key";
  const ATTR_LABEL = "data-fi-label";
  const ATTR_ORIG_BG = "data-fi-orig-bg";
  const ATTR_ORIG_OUTLINE = "data-fi-orig-outline";
  const TOOLTIP_ID = "fi-tooltip";

  // Mode configurations
  const modes = {
    letterSpacing: {
      extract(style) {
        const ls = style.letterSpacing;
        if (ls === "normal" || ls === "0px") return null;
        const fs = parseFloat(style.fontSize);
        const pct = ((parseFloat(ls) / fs) * 100).toFixed(2);
        return {
          value: ls,
          colorKey: pct,
          label: `letter-spacing: ${ls} (${pct}%)`,
        };
      },
    },
    fontSize: {
      extract(style) {
        const fs = style.fontSize;
        return {
          value: fs,
          colorKey: fs,
          label: `font-size: ${fs}`,
        };
      },
    },
    fontFamily: {
      extract(style) {
        const ff = style.fontFamily;
        // Use the first font in the stack as the key
        const primary = ff.split(",")[0].trim().replace(/['"]/g, "");
        return {
          value: ff,
          colorKey: primary,
          label: `font-family: ${primary}`,
        };
      },
    },
    fontWeight: {
      extract(style) {
        const fw = style.fontWeight;
        return {
          value: fw,
          colorKey: fw,
          label: `font-weight: ${fw}`,
        };
      },
    },
    lineHeight: {
      extract(style) {
        const lh = style.lineHeight;
        const fs = style.fontSize;
        const fsVal = parseFloat(fs);
        if (lh === "normal") {
          return {
            value: lh,
            colorKey: "normal",
            label: `line-height: normal | font-size: ${fs}`,
          };
        }
        const pct = ((parseFloat(lh) / fsVal) * 100).toFixed(0);
        return {
          value: lh,
          colorKey: pct,
          label: `line-height: ${lh} (${pct}%) | font-size: ${fs}`,
        };
      },
    },
  };

  // Color assignment
  const colorMap = new Map();
  let hueIndex = 0;
  const HUE_STEP = 47;

  function getColorForKey(key) {
    if (colorMap.has(key)) return colorMap.get(key);

    const hue = (hueIndex * HUE_STEP) % 360;
    hueIndex++;

    const color = {
      bg: `hsla(${hue}, 70%, 50%, 0.15)`,
      border: `hsl(${hue}, 70%, 50%)`,
      hue,
    };
    colorMap.set(key, color);
    return color;
  }

  // Tooltip
  let tooltip = document.getElementById(TOOLTIP_ID);
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = TOOLTIP_ID;
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);
  }

  function showTooltip(e) {
    const el = e.currentTarget;
    const label = el.getAttribute(ATTR_LABEL);
    const key = el.getAttribute(ATTR_KEY);
    if (!label) return;

    const color = colorMap.get(key);
    tooltip.textContent = label;
    tooltip.style.display = "block";
    tooltip.style.borderLeftColor = color ? color.border : "#888";
    positionTooltip(e);
  }

  function positionTooltip(e) {
    tooltip.style.left = `${e.clientX + 12}px`;
    tooltip.style.top = `${e.clientY + 12}px`;

    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = `${e.clientX - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = `${e.clientY - rect.height - 8}px`;
    }
  }

  function hideTooltip() {
    tooltip.style.display = "none";
  }

  function moveTooltip(e) {
    if (tooltip.style.display === "block") {
      positionTooltip(e);
    }
  }

  // Scan DOM with given mode config
  function scan(modeConfig) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const processed = new Set();

    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (!el || processed.has(el)) continue;
      processed.add(el);

      if (el.id === TOOLTIP_ID || el.closest(`#${TOOLTIP_ID}`)) continue;

      const style = getComputedStyle(el);
      const result = modeConfig.extract(style);
      if (!result) continue;

      const color = getColorForKey(result.colorKey);

      el.setAttribute(ATTR_VALUE, result.value);
      el.setAttribute(ATTR_KEY, result.colorKey);
      el.setAttribute(ATTR_LABEL, result.label);
      el.setAttribute(ATTR_ORIG_BG, el.style.backgroundColor || "");
      el.setAttribute(ATTR_ORIG_OUTLINE, el.style.outline || "");

      el.style.backgroundColor = color.bg;
      el.style.outline = `1px solid ${color.border}`;

      el.addEventListener("mouseenter", showTooltip);
      el.addEventListener("mousemove", moveTooltip);
      el.addEventListener("mouseleave", hideTooltip);
    }

    // Console summary
    const summary = {};
    colorMap.forEach((color, key) => {
      const count = document.querySelectorAll(
        `[${ATTR_KEY}="${CSS.escape(key)}"]`
      ).length;
      summary[key] = { count, color: color.border };
    });
    console.log("[Font Inspector] Values found:", summary);
  }

  function removeHighlights() {
    const highlighted = document.querySelectorAll(`[${ATTR_VALUE}]`);
    highlighted.forEach((el) => {
      el.style.backgroundColor = el.getAttribute(ATTR_ORIG_BG) || "";
      el.style.outline = el.getAttribute(ATTR_ORIG_OUTLINE) || "";

      el.removeAttribute(ATTR_VALUE);
      el.removeAttribute(ATTR_KEY);
      el.removeAttribute(ATTR_LABEL);
      el.removeAttribute(ATTR_ORIG_BG);
      el.removeAttribute(ATTR_ORIG_OUTLINE);

      el.removeEventListener("mouseenter", showTooltip);
      el.removeEventListener("mousemove", moveTooltip);
      el.removeEventListener("mouseleave", hideTooltip);
    });

    tooltip.style.display = "none";
    colorMap.clear();
    hueIndex = 0;
  }

  // Waterfall: collect unique style combinations
  let wfIdCounter = 0;

  function collectStyles() {
    const styleMap = new Map();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const processed = new Set();

    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (!el || processed.has(el)) continue;
      processed.add(el);

      if (el.id === TOOLTIP_ID || el.closest(`#${TOOLTIP_ID}`)) continue;

      const style = getComputedStyle(el);
      const fontFamily = style.fontFamily;
      const fontSize = style.fontSize;
      const fontWeight = style.fontWeight;
      const lineHeight = style.lineHeight;
      const letterSpacing = style.letterSpacing;

      const key = `${fontFamily}|${fontSize}|${fontWeight}|${lineHeight}|${letterSpacing}`;

      if (!styleMap.has(key)) {
        styleMap.set(key, {
          fontFamily,
          fontSize,
          fontWeight,
          lineHeight,
          letterSpacing,
          count: 0,
          tags: new Set(),
          elementIds: [],
        });
      }

      const entry = styleMap.get(key);
      entry.count++;
      entry.tags.add(el.tagName.toLowerCase());

      const wfId = `wf-${wfIdCounter++}`;
      el.setAttribute("data-fi-wf-id", wfId);
      entry.elementIds.push(wfId);
    }

    // Collect font-face rules and external stylesheet URLs
    const fontFaceRules = [];
    const externalStylesheetUrls = [];

    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule) {
            // Resolve relative URLs to absolute so they work from the extension page
            const baseUrl = sheet.href || document.baseURI;
            const cssText = rule.cssText.replace(
              /url\(["']?([^"')]+)["']?\)/g,
              (match, url) => {
                try {
                  return `url("${new URL(url, baseUrl).href}")`;
                } catch {
                  return match;
                }
              }
            );
            fontFaceRules.push(cssText);
          }
        }
      } catch {
        // Cross-origin stylesheet — grab the URL so waterfall can link it
        if (sheet.href) {
          externalStylesheetUrls.push(sheet.href);
        }
      }
    }

    // Convert to serializable array, sorted by fontSize descending
    const styles = Array.from(styleMap.values())
      .map((entry) => ({
        ...entry,
        tags: Array.from(entry.tags),
      }))
      .sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize));

    return { styles, fontFaceRules, externalStylesheetUrls };
  }

  // Waterfall: scroll to element and flash it
  function scrollToElement(wfId) {
    const el = document.querySelector(`[data-fi-wf-id="${wfId}"]`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    el.style.outline = "3px solid #4a9af5";
    el.style.outlineOffset = "2px";
    el.style.transition = "outline-color 0.3s ease";

    setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.transition = "";
    }, 1500);
  }

  // Listen for mode changes from background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "setMode") {
      removeHighlights();
      if (msg.mode && modes[msg.mode]) {
        scan(modes[msg.mode]);
      }
    }

    if (msg.action === "collectStyles") {
      const data = collectStyles();
      sendResponse(data);
      return true;
    }

    if (msg.action === "scrollTo") {
      scrollToElement(msg.wfId);
    }
  });
})();
