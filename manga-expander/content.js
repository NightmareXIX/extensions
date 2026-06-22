let currentWideWidth = 80;
let currentVerticalWidth = 50; 

// Styles for Two-Page Spreads (The Breakout Trick)
function applyWideStyles(img, widthPercentage) {
  const halfWidth = widthPercentage / 2;
  img.style.setProperty('width', `${widthPercentage}vw`, 'important');
  img.style.setProperty('max-width', `${widthPercentage}vw`, 'important');
  img.style.setProperty('height', 'auto', 'important');
  
  img.style.setProperty('margin-left', `calc(-${halfWidth}vw + 50%)`, 'important');
  img.style.setProperty('margin-right', `calc(-${halfWidth}vw + 50%)`, 'important');
  
  img.style.setProperty('transform', 'none', 'important');
  img.style.setProperty('position', 'static', 'important');
  img.style.setProperty('display', 'block', 'important');
  img.style.setProperty('object-fit', 'contain', 'important');
  
  let parent = img.parentElement;
  while(parent && parent !== document.body) {
     parent.style.setProperty('overflow', 'visible', 'important');
     parent = parent.parentElement;
  }
}

// Styles for Standard Vertical Pages
function applyVerticalStyles(img, widthPercentage) {
  img.style.setProperty('width', `${widthPercentage}vw`, 'important');
  img.style.setProperty('max-width', `${widthPercentage}vw`, 'important');
  img.style.setProperty('height', 'auto', 'important');
  
  // Standard centering for normal panels
  img.style.setProperty('display', 'block', 'important');
  img.style.setProperty('margin-left', 'auto', 'important');
  img.style.setProperty('margin-right', 'auto', 'important');
  img.style.setProperty('transform', 'none', 'important');
}

// Sorting images into Wide or Vertical
function resizePanels() {
  const images = document.querySelectorAll('img:not(.processed-panel)');
  
  images.forEach(img => {
    const processImage = () => {
      // SAFEGUARD: Ignore tiny placeholder/loading images
      if (!img.naturalWidth || img.naturalWidth < 150) {
        return; 
      }

      // Check if it's a wide panel AND tall enough to be a real page (ignores short banners)
      if (img.naturalWidth > (img.naturalHeight * 1.15) && img.naturalHeight > 300) {
        img.classList.add('wide-panel'); 
        applyWideStyles(img, currentWideWidth);
      } 
      // If it's a standard vertical panel OR a short horizontal banner
      else {
        img.classList.add('vertical-panel');
        applyVerticalStyles(img, currentVerticalWidth);
      }
      
      img.classList.add('processed-panel'); 
    };

    if (img.complete && img.naturalWidth > 0) {
      processImage();
    } 
    
    img.addEventListener('load', processImage);
  });
}

// 1. Fetch saved widths on page load
chrome.storage.sync.get(['wideWidth', 'verticalWidth'], (data) => {
  if (data.wideWidth) currentWideWidth = data.wideWidth;
  if (data.verticalWidth) currentVerticalWidth = data.verticalWidth;
  resizePanels();
});

// 2. Listen for live updates from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateWidths") {
    currentWideWidth = request.wideWidth;
    currentVerticalWidth = request.verticalWidth;
    
    // Apply live updates to all tagged panels
    document.querySelectorAll('.wide-panel').forEach(img => applyWideStyles(img, currentWideWidth));
    document.querySelectorAll('.vertical-panel').forEach(img => applyVerticalStyles(img, currentVerticalWidth));
  }
});

// 3. Watch for lazy-loaded images as you scroll
const observer = new MutationObserver((mutations) => {
  let newElementsAdded = false;
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      newElementsAdded = true;
    }
  });
  
  if (newElementsAdded) {
    resizePanels();
  }
});

observer.observe(document.body, { childList: true, subtree: true });