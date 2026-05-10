window.addEventListener('load', async () => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return; // Only run if the sidebar exists

  // Auto-detect the logged-in user's handle from the header links
  let detectedHandle = "";
  const profileLinks = document.querySelectorAll('a[href^="/profile/"]');
  for (let link of profileLinks) {
    const text = link.innerText.trim();
    if (text && text !== 'Register' && text !== 'Login' && text !== 'Enter') {
      detectedHandle = text;
      break;
    }
  }

  // 1. Fetch saved preferences from storage, or fallback to defaults
  const prefsKey = 'cf_picker_prefs';
  const stored = await chrome.storage.local.get([prefsKey]);
  const prefs = stored[prefsKey] || {};
  
  const handleVal = prefs.handle !== undefined ? prefs.handle : detectedHandle;
  const modeVal = prefs.mode || 'rating';
  const minRVal = prefs.minRating || '1200';
  const maxRVal = prefs.maxRating || '1400';
  const tagVal = prefs.tag || '';
  const indexVal = prefs.index || 'A, B';
  
  // Ensure backward compatibility for stored divisions
  let selectedDivs = ['Div. 2'];
  if (Array.isArray(prefs.divs)) {
    selectedDivs = prefs.divs;
  } else if (prefs.div) {
    selectedDivs = [prefs.div];
  }

  const isChecked = (val) => selectedDivs.includes(val) ? 'checked' : '';

  // Build the UI block using the loaded preferences
  const container = document.createElement('div');
  container.id = 'cf-picker-box';
  container.className = 'roundbox sidebox';

  container.innerHTML = `
    <div class="roundbox-lt">&nbsp;</div>
    <div class="roundbox-rt">&nbsp;</div>
    <div class="caption titled cf-ext-header">&rarr; Problem Picker</div>
    <div class="cf-ext-body">
      <div class="cf-ext-field">
        <label>User Handle (for unsolved check):</label>
        <input type="text" id="picker-handle" class="cf-ext-input" value="${handleVal}" placeholder="Codeforces Handle" />
      </div>

      <div class="cf-ext-field">
        <label>Pick Mode:</label>
        <select id="picker-mode" class="cf-ext-select">
          <option value="rating" ${modeVal === 'rating' ? 'selected' : ''}>Rating Range</option>
          <option value="contest" ${modeVal === 'contest' ? 'selected' : ''}>Contest Category</option>
        </select>
      </div>

      <div id="form-rating" class="picker-subform" style="display: ${modeVal === 'rating' ? 'block' : 'none'};">
        <div class="cf-ext-row">
          <div>
            <label>Min Rating:</label>
            <input type="number" id="picker-min-rating" class="cf-ext-input" value="${minRVal}" step="100" />
          </div>
          <div>
            <label>Max Rating:</label>
            <input type="number" id="picker-max-rating" class="cf-ext-input" value="${maxRVal}" step="100" />
          </div>
        </div>
        <div class="cf-ext-field">
          <label>Tags (comma-separated):</label>
          <input type="text" id="picker-tag" class="cf-ext-input" value="${tagVal}" placeholder="e.g. dp, greedy" />
        </div>
      </div>

      <div id="form-contest" class="picker-subform" style="display: ${modeVal === 'contest' ? 'block' : 'none'};">
        <div class="cf-ext-field">
          <label>Categories (select multiple):</label>
          <div class="cf-ext-checkbox-group">
            <label><input type="checkbox" class="picker-div-cb" value="Div. 1" ${isChecked('Div. 1')} /> Div. 1</label>
            <label><input type="checkbox" class="picker-div-cb" value="Div. 2" ${isChecked('Div. 2')} /> Div. 2</label>
            <label><input type="checkbox" class="picker-div-cb" value="Div. 3" ${isChecked('Div. 3')} /> Div. 3</label>
            <label><input type="checkbox" class="picker-div-cb" value="Div. 4" ${isChecked('Div. 4')} /> Div. 4</label>
            <label><input type="checkbox" class="picker-div-cb" value="Div. 1 + Div. 2" ${isChecked('Div. 1 + Div. 2')} /> Div. 1 + Div. 2</label>
            <label><input type="checkbox" class="picker-div-cb" value="Educational" ${isChecked('Educational')} /> Educational</label>
            <label><input type="checkbox" class="picker-div-cb" value="Global" ${isChecked('Global')} /> Global</label>
            <label><input type="checkbox" class="picker-div-cb" value="CodeTON" ${isChecked('CodeTON')} /> CodeTON</label>
            <label><input type="checkbox" class="picker-div-cb" value="Kotlin" ${isChecked('Kotlin')} /> Kotlin</label>
            <label><input type="checkbox" class="picker-div-cb" value="VK Cup" ${isChecked('VK Cup')} /> VK Cup</label>
          </div>
        </div>
        <div class="cf-ext-field">
          <label>Problem Letters (comma-separated):</label>
          <input type="text" id="picker-index" class="cf-ext-input" value="${indexVal}" placeholder="e.g. A, B, C" style="text-transform: uppercase;" />
        </div>
      </div>

      <button id="btn-pick-problem" class="cf-ext-btn" style="margin-top: 10px;">Pick Unsolved Problem</button>
      
      <div id="picker-result" class="cf-ext-result"></div>
    </div>
  `;

  // Inject precisely at the TOP of the right column
  sidebar.insertBefore(container, sidebar.firstChild);

  // DOM Elements
  const handleInput = document.getElementById('picker-handle');
  const modeSelect = document.getElementById('picker-mode');
  const formRating = document.getElementById('form-rating');
  const formContest = document.getElementById('form-contest');
  const minRatingInput = document.getElementById('picker-min-rating');
  const maxRatingInput = document.getElementById('picker-max-rating');
  const tagInput = document.getElementById('picker-tag');
  const indexInput = document.getElementById('picker-index');
  const checkboxes = document.querySelectorAll('.picker-div-cb');

  // 2. Helper function to save current inputs to storage instantly
  const savePreferences = () => {
    const currentDivs = Array.from(document.querySelectorAll('.picker-div-cb:checked')).map(cb => cb.value);
    const currentPrefs = {
      handle: handleInput.value.trim(),
      mode: modeSelect.value,
      minRating: minRatingInput.value,
      maxRating: maxRatingInput.value,
      tag: tagInput.value,
      divs: currentDivs,
      index: indexInput.value.trim().toUpperCase()
    };
    chrome.storage.local.set({ [prefsKey]: currentPrefs });
  };

  // Attach change/input listeners to automatically trigger saving
  handleInput.addEventListener('input', savePreferences);
  minRatingInput.addEventListener('input', savePreferences);
  maxRatingInput.addEventListener('input', savePreferences);
  tagInput.addEventListener('input', savePreferences);
  indexInput.addEventListener('input', savePreferences);
  checkboxes.forEach(cb => cb.addEventListener('change', savePreferences));

  // Form toggling logic (also triggers saving)
  modeSelect.addEventListener('change', () => {
    if (modeSelect.value === 'rating') {
      formRating.style.display = 'block';
      formContest.style.display = 'none';
    } else {
      formRating.style.display = 'none';
      formContest.style.display = 'block';
    }
    savePreferences();
  });

  // Action execution logic
  const btnPick = document.getElementById('btn-pick-problem');
  const resultDiv = document.getElementById('picker-result');

  btnPick.addEventListener('click', async () => {
    const handle = handleInput.value.trim();
    if (!handle) {
      resultDiv.innerHTML = '<span style="color: red;">Please enter a valid handle.</span>';
      return;
    }

    // Force an explicit save right when picking
    savePreferences();

    resultDiv.innerHTML = '<span style="color: #666;">Fetching & filtering pool...</span>';
    btnPick.disabled = true;

    try {
      const [solvedSet, { problems, contestMap }] = await Promise.all([
        getSolvedProblems(handle),
        getCachedProblemsetAndContests()
      ]);

      const mode = modeSelect.value;
      let filteredPool = [];

      if (mode === 'rating') {
        const minR = parseInt(minRatingInput.value, 10) || 0;
        const maxR = parseInt(maxRatingInput.value, 10) || 4000;
        
        const tagsInputArray = tagInput.value
          .split(',')
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0);

        filteredPool = problems.filter(p => {
          if (p.rating === undefined || p.rating < minR || p.rating > maxR) return false;
          
          if (tagsInputArray.length > 0) {
            if (!p.tags || p.tags.length === 0) return false;
            
            const hasAllTags = tagsInputArray.every(inputTag => 
              p.tags.some(probTag => probTag.toLowerCase().includes(inputTag))
            );
            if (!hasAllTags) return false;
          }
          
          if (solvedSet.has(`${p.contestId}-${p.index}`)) return false;

          return true;
        });

      } else {
        const targetDivs = Array.from(document.querySelectorAll('.picker-div-cb:checked')).map(cb => cb.value);
        
        // Split comma-separated letters into a clean array (e.g., ["A", "B", "C"])
        const targetIndexes = indexInput.value
          .split(',')
          .map(idx => idx.trim().toUpperCase())
          .filter(idx => idx.length > 0);

        if (targetDivs.length === 0) {
          resultDiv.innerHTML = '<span style="color: red;">Please select at least one contest category.</span>';
          btnPick.disabled = false;
          return;
        }

        // If the user cleared the field entirely, fallback safely to picking 'A'
        const indexesToMatch = targetIndexes.length > 0 ? targetIndexes : ['A'];

        filteredPool = problems.filter(p => {
          if (!p.index) return false;
          
          // 1. Multi-Index prefix match (matches if problem index starts with ANY of the specified letters)
          const pIdx = p.index.toUpperCase();
          const matchesAnyIndex = indexesToMatch.some(targetIdx => pIdx.startsWith(targetIdx));
          if (!matchesAnyIndex) return false;
          
          // 2. Category match via mapped contest metadata titles
          const cName = contestMap[p.contestId];
          if (!cName) return false;

          const matchesAnyCategory = targetDivs.some(tDiv => cName.includes(tDiv));
          if (!matchesAnyCategory) return false;

          // 3. Unsolved check
          if (solvedSet.has(`${p.contestId}-${p.index}`)) return false;

          return true;
        });
      }

      if (filteredPool.length === 0) {
        resultDiv.innerHTML = '<strong>No unsolved problems found matching criteria.</strong>';
        return;
      }

      // Prioritize recent rounds
      filteredPool.sort((a, b) => (b.contestId || 0) - (a.contestId || 0));

      // Slice out the 10 most recent unsolved matches
      const topRecentPool = filteredPool.slice(0, 10);

      // Pick randomly from those recent 10
      const randomIndex = Math.floor(Math.random() * topRecentPool.length);
      const picked = topRecentPool[randomIndex];

      const problemUrl = `https://codeforces.com/contest/${picked.contestId}/problem/${picked.index}`;
      
      // Spoiler-free output
      resultDiv.innerHTML = `
        <div style="font-size: 10px; color: #777;">Picked from top ${topRecentPool.length} recent unsolved matches:</div>
        <a href="${problemUrl}" target="_blank" class="picked-prob-link">
          <strong>${picked.contestId}${picked.index}</strong>: ${picked.name}
        </a>
      `;

    } catch (err) {
      console.error("Problem Picker Error:", err);
      resultDiv.innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
    } finally {
      btnPick.disabled = false;
    }
  });
});

// Helper: Caches user status for 5 minutes
async function getSolvedProblems(handle) {
  const cacheKey = `cf_solved_${handle.toLowerCase()}`;
  const timeKey = `cf_solved_time_${handle.toLowerCase()}`;
  const now = Date.now();

  const data = await chrome.storage.local.get([cacheKey, timeKey]);
  if (data[cacheKey] && data[timeKey] && (now - data[timeKey] < 5 * 60 * 1000)) {
    return new Set(data[cacheKey]);
  }

  const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
  if (!res.ok) throw new Error("Failed to fetch user submissions");
  const json = await res.json();
  if (json.status !== 'OK') throw new Error(json.comment || "User API Error");

  const solved = new Set();
  json.result.forEach(sub => {
    if (sub.verdict === 'OK' && sub.problem && sub.problem.contestId) {
      solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
    }
  });

  await chrome.storage.local.set({
    [cacheKey]: Array.from(solved),
    [timeKey]: now
  });

  return solved;
}

// Helper: Caches minimized problemset and contest titles for 12 hours
async function getCachedProblemsetAndContests() {
  const probKey = 'cf_full_problems';
  const contKey = 'cf_contest_map';
  const timeKey = 'cf_meta_time';
  const now = Date.now();

  const data = await chrome.storage.local.get([probKey, contKey, timeKey]);
  if (data[probKey] && data[contKey] && data[timeKey] && (now - data[timeKey] < 12 * 3600 * 1000)) {
    return { problems: data[probKey], contestMap: data[contKey] };
  }

  const pRes = await fetch('https://codeforces.com/api/problemset.problems');
  if (!pRes.ok) throw new Error("Problemset API unreachable");
  const pJson = await pRes.json();
  if (pJson.status !== 'OK') throw new Error("Problemset payload failure");

  const problems = pJson.result.problems.map(p => ({
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating,
    tags: p.tags || []
  }));

  const cRes = await fetch('https://codeforces.com/api/contest.list');
  if (!cRes.ok) throw new Error("Contest API unreachable");
  const cJson = await cRes.json();
  if (cJson.status !== 'OK') throw new Error("Contest payload failure");

  const contestMap = {};
  cJson.result.forEach(c => {
    contestMap[c.id] = c.name;
  });

  await chrome.storage.local.set({
    [probKey]: problems,
    [contKey]: contestMap,
    [timeKey]: now
  });

  return { problems, contestMap };
}