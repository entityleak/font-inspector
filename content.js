(() => {
  // Guard against double-injection
  if (window.__fontInspectorActive) return;
  window.__fontInspectorActive = true;

  const ATTR = "data-fi-ls";
  const ATTR_FS = "data-fi-fs";
  const ATTR_PCT = "data-fi-pct";
  const ATTR_ORIG_BG = "data-fi-orig-bg";
  const ATTR_ORIG_BORDER = "data-fi-orig-border";
  const ATTR_ORIG_OUTLINE = "data-fi-orig-outline";
  const TOOLTIP_ID = "fi-tooltip";

  const colorMap = new Map();
  let hueIndex = 0;
  const HUE_STEP = 47; // Golden-angle-ish step for good distribution

  function getColorForValue(value) {
    if (colorMap.has(value)) return colorMap.get(value);

    const hue = (hueIndex * HUE_STEP) % 360;
    hueIndex++;

    const color = {
      bg: `hsla(${hue}, 70%, 50%, 0.15)`,
      border: `hsl(${hue}, 70%, 50%)`,
      hue,
    };
    colorMap.set(value, color);
    return color;
  }

  // Create tooltip element
  const tooltip = document.createElement("div");
  tooltip.id = TOOLTIP_ID;
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);

  function showTooltip(e) {
    const el = e.currentTarget;
    const value = el.getAttribute(ATTR);
    if (!value) return;

    const pct = el.getAttribute(ATTR_PCT);
    const color = colorMap.get(pct);
    tooltip.textContent = `letter-spacing: ${value} (${pct}%)`;
    tooltip.style.display = "block";
    tooltip.style.borderLeftColor = color ? color.border : "#888";
    positionTooltip(e);
  }

  function positionTooltip(e) {
    const x = e.clientX + 12;
    const y = e.clientY + 12;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;

    // Keep tooltip on screen
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

  // Scan the DOM and highlight elements with letter-spacing
  function scan() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip empty/whitespace-only text nodes
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const processed = new Set();

    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const el = textNode.parentElement;

      if (!el || processed.has(el)) continue;
      processed.add(el);

      // Skip our own tooltip
      if (el.id === TOOLTIP_ID || el.closest(`#${TOOLTIP_ID}`)) continue;

      const style = getComputedStyle(el);
      const ls = style.letterSpacing;
      const fs = style.fontSize;

      // Skip elements with normal/default letter-spacing
      if (ls === "normal" || ls === "0px") continue;

      const pct = ((parseFloat(ls) / parseFloat(fs)) * 100).toFixed(2);
      const color = getColorForValue(pct);

      // Store originals
      el.setAttribute(ATTR, ls);
      el.setAttribute(ATTR_FS, fs);
      el.setAttribute(ATTR_PCT, pct);
      el.setAttribute(ATTR_ORIG_BG, el.style.backgroundColor || "");
      el.setAttribute(ATTR_ORIG_BORDER, el.style.border || "");
      el.setAttribute(ATTR_ORIG_OUTLINE, el.style.outline || "");

      // Apply highlight
      el.style.backgroundColor = color.bg;
      el.style.outline = `1px solid ${color.border}`;

      // Tooltip listeners
      el.addEventListener("mouseenter", showTooltip);
      el.addEventListener("mousemove", moveTooltip);
      el.addEventListener("mouseleave", hideTooltip);
    }

    // Log summary keyed by percentage
    const summary = {};
    colorMap.forEach((color, pct) => {
      const els = document.querySelectorAll(`[${ATTR_PCT}="${pct}"]`);
      const pxValues = new Set();
      els.forEach((el) => pxValues.add(el.getAttribute(ATTR)));
      summary[`${pct}%`] = { count: els.length, pxValues: [...pxValues], color: color.border };
    });
    console.log("[Font Inspector] Letter-spacing values found:", summary);
  }

  function removeHighlights() {
    const highlighted = document.querySelectorAll(`[${ATTR}]`);
    highlighted.forEach((el) => {
      el.style.backgroundColor = el.getAttribute(ATTR_ORIG_BG) || "";
      el.style.border = el.getAttribute(ATTR_ORIG_BORDER) || "";
      el.style.outline = el.getAttribute(ATTR_ORIG_OUTLINE) || "";

      el.removeAttribute(ATTR);
      el.removeAttribute(ATTR_FS);
      el.removeAttribute(ATTR_PCT);
      el.removeAttribute(ATTR_ORIG_BG);
      el.removeAttribute(ATTR_ORIG_BORDER);
      el.removeAttribute(ATTR_ORIG_OUTLINE);

      el.removeEventListener("mouseenter", showTooltip);
      el.removeEventListener("mousemove", moveTooltip);
      el.removeEventListener("mouseleave", hideTooltip);
    });

    tooltip.remove();
    colorMap.clear();
    hueIndex = 0;
    window.__fontInspectorActive = false;
  }

  // Listen for disable message from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "disable") {
      removeHighlights();
    }
  });

  // Run the scan
  scan();
})();
