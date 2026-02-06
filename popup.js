const buttons = document.querySelectorAll(".mode-btn");
let activeMode = null;

// On open, query current state from background
chrome.runtime.sendMessage({ action: "getMode" }, (response) => {
  if (response && response.mode) {
    activeMode = response.mode;
    updateButtons();
  }
});

function updateButtons() {
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === activeMode);
  });
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;

    if (activeMode === mode) {
      activeMode = null;
    } else {
      activeMode = mode;
    }

    updateButtons();
    chrome.runtime.sendMessage({ action: "setMode", mode: activeMode });
  });
});

document.getElementById("waterfall-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "waterfall" });
  window.close();
});
