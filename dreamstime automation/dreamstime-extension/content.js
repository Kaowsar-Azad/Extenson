let isRunning = false;
let checkInterval = null;
let noButtonTimer = null;

// State machine variables
let currentFileId = null;
let lastActionTime = 0;
let lastActionType = null; // 'submit' or 'skip'

console.log("Dreamstime Auto Submit: Content script loaded.");

function updateStatusIndicator(customText, bgColor, textColor) {
  let indicator = document.getElementById('dreamstime-auto-submit-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'dreamstime-auto-submit-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '15px';
    indicator.style.left = '15px';
    indicator.style.zIndex = '999999';
    indicator.style.padding = '10px 15px';
    indicator.style.borderRadius = '5px';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '14px';
    indicator.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    indicator.style.transition = '0.3s';
    indicator.style.pointerEvents = 'none'; // Make sure it doesn't block clicks
    document.body.appendChild(indicator);
  }

  if (customText) {
    indicator.textContent = 'Dreamstime Auto Submit: ' + customText;
    indicator.style.backgroundColor = bgColor || '#28a745';
    indicator.style.color = textColor || '#ffffff';
    indicator.style.border = '2px solid #ffffff';
    return;
  }

  if (isRunning) {
    indicator.textContent = 'Dreamstime Auto Submit: RUNNING';
    indicator.style.backgroundColor = '#28a745';
    indicator.style.color = '#ffffff';
    indicator.style.border = '2px solid #ffffff';
  } else {
    indicator.textContent = 'Dreamstime Auto Submit: STOPPED';
    indicator.style.backgroundColor = '#dc3545';
    indicator.style.color = '#ffffff';
    indicator.style.border = '2px solid #ffffff';
  }
}

chrome.storage.local.get(['isAutoSubmitOn'], (result) => {
  if (result.isAutoSubmitOn) {
    isRunning = true;
    startSubmitting();
  }
  updateStatusIndicator();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.isAutoSubmitOn) {
    isRunning = changes.isAutoSubmitOn.newValue;
    updateStatusIndicator();
    if (isRunning) {
      resetState();
      startSubmitting();
    } else {
      if (checkInterval) clearInterval(checkInterval);
      if (noButtonTimer) clearTimeout(noButtonTimer);
      noButtonTimer = null;
    }
  }
});

function resetState() {
  lastActionTime = 0;
  lastActionType = null;
  if (noButtonTimer) clearTimeout(noButtonTimer);
  noButtonTimer = null;
}

function startSubmitting() {
  if (!isRunning) return;

  checkAndSubmit();

  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    if (!isRunning) {
      clearInterval(checkInterval);
      return;
    }
    checkAndSubmit();
  }, 1000);
}

function extractFileId() {
  const match = window.location.href.match(/edit/?(\d+)/i) || 
                window.location.href.match(/[?&](?:itemid|id|fileid)=(\d+)/i);
  return match ? match[1] : null;
}

function findTitleInput() {
  let el = document.querySelector('input[name="title"], input#title, input[name="media_title"], input#media_title, input[name="image_title"], input#image_title, input[name*="title" i]');
  if (el) return el;
  const candidates = document.querySelectorAll('label, div, span, p');
  for (const node of candidates) {
    const text = (node.textContent || '').trim();
    if (/^title\s*\*?$/i.test(text)) {
      const forId = node.getAttribute('for');
      if (forId) {
        const target = document.getElementById(forId);
        if (target) return target;
      }
      const container = node.closest('.form-group, .form-row, div') || node.parentElement;
      if (container) {
        const inp = container.querySelector('input[type="text"], input:not([type])');
        if (inp) return inp;
      }
    }
  }
  return null;
}

function findDescriptionInput() {
  let el = document.querySelector('textarea[name="description"], textarea#description, textarea[name="media_description"], textarea#media_description, textarea[name="image_description"], textarea#image_description, textarea[name*="desc" i], textarea');
  if (el) return el;
  const candidates = document.querySelectorAll('label, div, span, p');
  for (const node of candidates) {
    const text = (node.textContent || '').trim();
    if (/^description\s*\*?$/i.test(text)) {
      const forId = node.getAttribute('for');
      if (forId) {
        const target = document.getElementById(forId);
        if (target) return target;
      }
      const container = node.closest('.form-group, .form-row, div') || node.parentElement;
      if (container) {
        const ta = container.querySelector('textarea, input[type="text"]');
        if (ta) return ta;
      }
    }
  }
  return null;
}

function findNextSkipButton() {
  return document.getElementById('js-next-submit') || 
         document.querySelector('a.popup-nav__btn--next, .popup-nav__btn--next, a#js-next-submit');
}

function findSubmitButton() {
  let btn = document.getElementById('submitbutton');
  if (btn && btn.offsetParent !== null && !btn.disabled) {
    return btn;
  }

  const allInputs = document.querySelectorAll('input[type="submit"], button, input[type="button"], a');
  const submitButtons = Array.from(allInputs).filter(el => {
    if (el.id === 'dreamstime-auto-submit-indicator') return false;
    if (el.disabled) return false;
    if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    if (el.closest('nav') || el.closest('header')) return false;

    const text = (el.value || el.innerText || el.textContent || "").trim().toLowerCase();
    return text.includes("submit") && !text.includes("files");
  });

  return submitButtons.length > 0 ? submitButtons[0] : null;
}

function checkAndSubmit() {
  if (!isRunning) return;

  // 1. Check if page is currently loading next image
  const ml = document.getElementById('js-mainloader');
  if (ml && ml.dataset.state === 'loading') {
    updateStatusIndicator("LOADING NEXT...", "#17a2b8");
    return;
  }

  // 2. Check if currently submitting / verifying
  const sm = document.querySelector('#js-submit-message p');
  if (sm && (sm.innerText || sm.textContent || '').trim()) {
    updateStatusIndicator("SUBMITTING...", "#17a2b8");
    return;
  }

  // 3. Track current File ID
  const fileId = extractFileId();
  if (fileId && fileId !== currentFileId) {
    currentFileId = fileId;
    resetState();
    updateStatusIndicator("RUNNING", "#28a745");
  }

  // 4. Check Title and Description inputs
  const titleEl = findTitleInput();
  const descEl = findDescriptionInput();
  const titleVal = titleEl ? (titleEl.value || titleEl.textContent || "").trim() : "";
  const descVal = descEl ? (descEl.value || descEl.textContent || "").trim() : "";

  // If form fields exist in DOM:
  if (titleEl || descEl) {
    // If either Title or Description is missing -> Skip to next!
    if (!titleVal || !descVal) {
      const nextBtn = findNextSkipButton();
      if (nextBtn && nextBtn.offsetParent !== null && !nextBtn.classList.contains('disabled')) {
        if (noButtonTimer) {
          clearTimeout(noButtonTimer);
          noButtonTimer = null;
        }

        if (Date.now() - lastActionTime > 2500) {
          lastActionTime = Date.now();
          lastActionType = 'skip';
          updateStatusIndicator("SKIPPING (No Title/Desc)...", "#ffc107", "#000000");
          console.log("[Dreamstime Auto Submit] Title or Description missing. Skipping to next image...");
          try {
            nextBtn.click();
          } catch (e) {
            const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            nextBtn.dispatchEvent(evt);
          }
        }
        return;
      }
    }
  }

  // 5. Both Title & Description are present -> Find and click Submit button!
  const btn = findSubmitButton();

  if (!btn) {
    // If neither submit button nor next button is found
    const nextBtn = findNextSkipButton();
    if (!nextBtn) {
      if (!noButtonTimer) {
        noButtonTimer = setTimeout(() => {
          if (!isRunning) return;
          const doubleCheckBtn = findSubmitButton();
          const doubleCheckNext = findNextSkipButton();
          if (!doubleCheckBtn && !doubleCheckNext) {
            chrome.storage.local.set({ isAutoSubmitOn: false });
            isRunning = false;
            if (checkInterval) clearInterval(checkInterval);
            updateStatusIndicator("COMPLETED", "#28a745");
            alert("Dreamstime Auto Submit: সব ফাইল সম্পন্ন হয়েছে!");
          }
        }, 15000);
      }
    }
    return;
  } else {
    if (noButtonTimer) {
      clearTimeout(noButtonTimer);
      noButtonTimer = null;
    }
  }

  // Click submit button with debounce
  if (Date.now() - lastActionTime > 2500) {
    lastActionTime = Date.now();
    lastActionType = 'submit';
    updateStatusIndicator("SUBMITTING...", "#17a2b8");
    console.log("[Dreamstime Auto Submit] Title & Description found. Submitting image...");
    try {
      btn.click();
    } catch (e) {
      const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      btn.dispatchEvent(evt);
    }
  }
}
