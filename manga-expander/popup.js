const wideSlider = document.getElementById('wideSlider');
const wideDisplay = document.getElementById('wideValue');
const verticalSlider = document.getElementById('verticalSlider');
const verticalDisplay = document.getElementById('verticalValue');

// 1. Load saved values when the popup opens
chrome.storage.sync.get(['wideWidth', 'verticalWidth'], (data) => {
  if (data.wideWidth) {
    wideSlider.value = data.wideWidth;
    wideDisplay.textContent = data.wideWidth;
  }
  if (data.verticalWidth) {
    verticalSlider.value = data.verticalWidth;
    verticalDisplay.textContent = data.verticalWidth;
  }
});

// 2. Function to handle updates when EITHER slider moves
function updateWidths() {
  const wVal = wideSlider.value;
  const vVal = verticalSlider.value;
  
  wideDisplay.textContent = wVal;
  verticalDisplay.textContent = vVal;
  
  // Save both values
  chrome.storage.sync.set({ 
    wideWidth: wVal,
    verticalWidth: vVal
  });

  // Send both values instantly to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      // We use a promise (.catch) to swallow the error if the content script isn't running
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: "updateWidths", 
        wideWidth: wVal,
        verticalWidth: vVal
      }).catch(err => {
        // Silently ignore the error.
        // This just means the user is tweaking settings on a non-manga page.
        // The settings are still saved in storage for the next time they visit a manga site!
      });
    }
  });
}

// 3. Listen for either slider being dragged
wideSlider.addEventListener('input', updateWidths);
verticalSlider.addEventListener('input', updateWidths);