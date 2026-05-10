window.addEventListener('load', async () => {
  // 1. Try extracting from DOM first (fast path when tags aren't hidden)
  let rating = null;
  let tags = [];

  const tagBoxes = document.querySelectorAll('.tag-box');
  tagBoxes.forEach(box => {
    const title = box.getAttribute('title');
    const text = box.innerText.trim();
    if (title === 'Difficulty') {
      rating = text;
    } else if (title === 'Tag') {
      tags.push(text);
    }
  });

  // 2. Build the native Sidebar UI block
  const container = document.createElement('div');
  container.id = 'cf-extension-box';
  container.className = 'roundbox sidebox';

  container.innerHTML = `
    <div class="roundbox-lt">&nbsp;</div>
    <div class="roundbox-rt">&nbsp;</div>
    <div class="caption titled cf-ext-header">&rarr; Problem Info</div>
    <div class="cf-ext-body">
      <button id="btn-toggle-rating" class="cf-ext-btn">Show Rating</button>
      <div id="content-rating" class="cf-ext-content">
        <strong>Rating:</strong> <span id="cf-rating-val">${rating || 'Loading...'}</span>
      </div>

      <button id="btn-toggle-tags" class="cf-ext-btn">Show All Tags</button>
      <div id="content-tags" class="cf-ext-content">
        ${tags.length > 0 
          ? tags.map(t => `<span class="cf-ext-tag">${t}</span>`).join('') 
          : '<span id="cf-tags-val">Loading API data...</span>'}
      </div>
    </div>
  `;

  // 3. Inject at the VERY BOTTOM of the right sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    // appendChild naturally places the container as the last element in the column
    sidebar.appendChild(container);
  } else {
    document.body.appendChild(container);
  }

  // Add Toggle Click Listeners
  const btnRating = document.getElementById('btn-toggle-rating');
  const contentRating = document.getElementById('content-rating');
  btnRating.addEventListener('click', () => {
    const isVisible = contentRating.classList.toggle('visible');
    btnRating.innerText = isVisible ? "Hide Rating" : "Show Rating";
  });

  const btnTags = document.getElementById('btn-toggle-tags');
  const contentTags = document.getElementById('content-tags');
  btnTags.addEventListener('click', () => {
    const isVisible = contentTags.classList.toggle('visible');
    btnTags.innerText = isVisible ? "Hide All Tags" : "Show All Tags";
  });

  // 4. Fallback to targeted Contest API if DOM elements were hidden by settings
  if (!rating || tags.length === 0) {
    const ids = getProblemIdentifiers();
    if (ids.contestId && ids.index) {
      const apiData = await fetchProblemDataFromContestAPI(ids.contestId, ids.index);
      
      // Update Rating DOM
      const ratingEl = document.getElementById('cf-rating-val');
      if (ratingEl) {
        ratingEl.innerText = apiData.rating;
      }

      // Update Tags DOM safely overwriting the loading span
      const tagsContainer = document.getElementById('content-tags');
      if (tagsContainer) {
        if (apiData.tags && apiData.tags.length > 0) {
          tagsContainer.innerHTML = apiData.tags.map(t => `<span class="cf-ext-tag">${t}</span>`).join('');
        } else {
          tagsContainer.innerHTML = 'No tags found';
        }
      }
    } else {
      document.getElementById('cf-rating-val').innerText = "Not Found";
      document.getElementById('content-tags').innerHTML = "No tags found";
    }
  }
});

// Helper: Extract contestId and index safely from both standard URLs
function getProblemIdentifiers() {
  const path = window.location.pathname;
  let contestId = null;
  let index = null;

  if (path.includes('/contest/')) {
    const parts = path.split('/');
    const cIdx = parts.indexOf('contest');
    if (cIdx !== -1 && parts.length > cIdx + 3) {
      contestId = parseInt(parts[cIdx + 1], 10);
      index = parts[cIdx + 3];
    }
  } else if (path.includes('/problemset/problem/')) {
    const parts = path.split('/');
    const pIdx = parts.indexOf('problemset');
    if (pIdx !== -1 && parts.length > pIdx + 3) {
      contestId = parseInt(parts[pIdx + 2], 10);
      index = parts[pIdx + 3];
    }
  }
  return { contestId, index };
}

// Helper: Fetch lightweight contest standings API with robust fallback for empty standings
async function fetchProblemDataFromContestAPI(contestId, index) {
  const cacheKey = `cf_contest_${contestId}`;
  let problems = [];

  try {
    const cacheData = await chrome.storage.local.get([cacheKey]);
    
    if (cacheData[cacheKey]) {
      problems = cacheData[cacheKey];
    } else {
      let data = null;

      try {
        const response = await fetch(`https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        data = await response.json();
      } catch (initialError) {
        const fallbackResponse = await fetch(`https://codeforces.com/api/contest.standings?contestId=${contestId}`);
        if (!fallbackResponse.ok) throw new Error(`Fallback HTTP error! status: ${fallbackResponse.status}`);
        data = await fallbackResponse.json();
      }
      
      if (data && data.status === 'OK' && data.result && data.result.problems) {
        problems = data.result.problems.map(p => ({
          index: p.index,
          rating: p.rating ? p.rating.toString() : "Unrated",
          tags: p.tags || []
        }));

        await chrome.storage.local.set({ [cacheKey]: problems });
      }
    }
  } catch (e) {
    console.error(`Error retrieving API data for contest ${contestId}:`, e);
  }

  const found = problems.find(p => p.index.toUpperCase() === index.toUpperCase());

  if (found) {
    return {
      rating: found.rating,
      tags: found.tags
    };
  }

  return { rating: "Not Found", tags: [] };
}