const activeTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;

  if (activeTabs.has(tabId)) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "disable" });
    } catch {
      // Content script may have been removed already
    }
    activeTabs.delete(tabId);
    chrome.action.setBadgeText({ tabId, text: "" });
  } else {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["styles.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    activeTabs.add(tabId);
    chrome.action.setBadgeText({ tabId, text: "ON" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#4CAF50" });
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

// Clean up when a tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && activeTabs.has(tabId)) {
    activeTabs.delete(tabId);
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});
