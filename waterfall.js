const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";
const MAX_CHIPS = 10;

async function init() {
  const { waterfallData, waterfallTabId } = await chrome.storage.local.get([
    "waterfallData",
    "waterfallTabId",
  ]);

  if (!waterfallData || !waterfallData.length) {
    document.getElementById("waterfall").textContent =
      "No typographic styles found on the page.";
    return;
  }

  document.getElementById("summary").textContent =
    `${waterfallData.length} unique style${waterfallData.length === 1 ? "" : "s"} found`;

  const container = document.getElementById("waterfall");

  for (const entry of waterfallData) {
    const row = document.createElement("div");
    row.className = "wf-row";

    // Sample text rendered in the actual style
    const sample = document.createElement("div");
    sample.className = "wf-sample";
    sample.textContent = SAMPLE_TEXT;
    sample.style.fontFamily = entry.fontFamily;
    sample.style.fontSize = entry.fontSize;
    sample.style.fontWeight = entry.fontWeight;
    sample.style.lineHeight = entry.lineHeight;
    sample.style.letterSpacing = entry.letterSpacing;
    row.appendChild(sample);

    // Properties line
    const primaryFont = entry.fontFamily
      .split(",")[0]
      .trim()
      .replace(/['"]/g, "");

    const fsVal = parseFloat(entry.fontSize);
    const lhDisplay =
      entry.lineHeight === "normal"
        ? "normal"
        : `${((parseFloat(entry.lineHeight) / fsVal) * 100).toFixed(0)}%`;
    const lsDisplay =
      entry.letterSpacing === "normal" || entry.letterSpacing === "0px"
        ? "0"
        : `${((parseFloat(entry.letterSpacing) / fsVal) * 100).toFixed(2)}%`;

    const props = document.createElement("div");
    props.className = "wf-props";
    props.textContent = `${primaryFont} — ${entry.fontSize} — ${entry.fontWeight} — line-height: ${lhDisplay} — letter-spacing: ${lsDisplay}`;
    row.appendChild(props);

    // Metadata line
    const meta = document.createElement("div");
    meta.className = "wf-meta";

    const countSpan = document.createElement("span");
    countSpan.className = "wf-count";
    countSpan.textContent = `${entry.count} instance${entry.count === 1 ? "" : "s"}`;
    meta.appendChild(countSpan);

    meta.appendChild(document.createTextNode(" | "));

    const tagsSpan = document.createElement("span");
    tagsSpan.className = "wf-tags";
    tagsSpan.textContent = entry.tags.map((t) => `<${t}>`).join(", ");
    meta.appendChild(tagsSpan);

    meta.appendChild(document.createTextNode(" | "));

    // Clickable chips
    const chips = document.createElement("span");
    chips.className = "wf-chips";

    const visibleIds = entry.elementIds.slice(0, MAX_CHIPS);
    for (let i = 0; i < visibleIds.length; i++) {
      const chip = document.createElement("span");
      chip.className = "wf-chip";
      chip.textContent = i + 1;
      chip.title = `Scroll to instance ${i + 1}`;
      chip.addEventListener("click", () => {
        chrome.runtime.sendMessage({
          action: "scrollTo",
          wfId: visibleIds[i],
          tabId: waterfallTabId,
        });
      });
      chips.appendChild(chip);
    }

    if (entry.elementIds.length > MAX_CHIPS) {
      const more = document.createElement("span");
      more.className = "wf-more";
      more.textContent = `+${entry.elementIds.length - MAX_CHIPS} more`;
      chips.appendChild(more);
    }

    meta.appendChild(chips);
    row.appendChild(meta);

    container.appendChild(row);
  }
}

init();
