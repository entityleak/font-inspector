// Per-tab state: { injected: boolean, mode: string | null }
const tabState = new Map();

function getState(tabId) {
  if (!tabState.has(tabId)) {
    tabState.set(tabId, { injected: false, mode: null });
  }
  return tabState.get(tabId);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getMode") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const state = getState(tabs[0].id);
        sendResponse({ mode: state.mode });
      } else {
        sendResponse({ mode: null });
      }
    });
    return true; // async response
  }

  if (msg.action === "setMode") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) return;
      const tabId = tabs[0].id;
      const state = getState(tabId);

      // Inject content script if not yet injected
      if (!state.injected) {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ["styles.css"],
        });
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"],
        });
        state.injected = true;
      }

      // Forward mode to content script
      state.mode = msg.mode;
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "setMode",
          mode: msg.mode,
        });
      } catch {
        // Content script not ready yet, retry once after a short delay
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tabId, {
              action: "setMode",
              mode: msg.mode,
            });
          } catch {
            // give up
          }
        }, 100);
      }

      // Update badge
      if (msg.mode) {
        chrome.action.setBadgeText({ tabId, text: "ON" });
        chrome.action.setBadgeBackgroundColor({ tabId, color: "#4CAF50" });
      } else {
        chrome.action.setBadgeText({ tabId, text: "" });
      }
    });
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

// Clean up when a tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && tabState.has(tabId)) {
    tabState.set(tabId, { injected: false, mode: null });
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});
