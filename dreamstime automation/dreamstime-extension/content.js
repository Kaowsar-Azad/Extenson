let isRunning = false;
let checkInterval = null;

// Per-file state tracking
let fileState = {
  id: null,
  detectedAt: 0,
  submitAttempts: 0,
  skipAttempts: 0,
  lastActionTime: 0,
  lastActionType: null // 'submit' | 'skip'
};

// Global set of submitted IDs in current session
let submittedFileIds = new Set();
let loaderStuckTimer = null;
let loaderStartTime = 0;

console.log("Dreamstime Auto Submit: Resilient Content script loaded.");

// ----------------------------------------------------
// UI Indicator
// ----------------------------------------------------
function updateStatusIndicator(customText, bgColor, textColor) {
  let indicator = document.getElementById('dreamstime-auto-submit-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'dreamstime-auto-submit-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '15px';
    indicator.style.left = '15px';
    indicator.style.zIndex = '9999999';
    indicator.style.padding = '10px 18px';
    indicator.style.borderRadius = '8px';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '14px';
    indicator.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    indicator.style.boxShadow = '0 6px 18px rgba(0,0,0,0.4)';
    indicator.style.transition = 'all 0.25s ease';
    indicator.style.pointerEvents = 'none';
    indicator.style.letterSpacing = '0.5px';
    document.body.appendChild(indicator);
  }

  if (customText) {
    indicator.textContent = 'Dreamstime Auto Submit: ' + customText;
    indicator.style.backgroundColor = bgColor || '#28a745';
    indicator.style.color = textColor || '#ffffff';
    indicator.style.border = '2px solid rgba(255,255,255,0.85)';
    return;
  }

  if (isRunning) {
    indicator.textContent = 'Dreamstime Auto Submit: RUNNING';
    indicator.style.backgroundColor = '#28a745';
    indicator.style.color = '#ffffff';
    indicator.style.border = '2px solid rgba(255,255,255,0.85)';
  } else {
    indicator.textContent = 'Dreamstime Auto Submit: STOPPED';
    indicator.style.backgroundColor = '#dc3545';
    indicator.style.color = '#ffffff';
    indicator.style.border = '2px solid rgba(255,255,255,0.85)';
  }
}

// ----------------------------------------------------
// Storage & Event Listeners
// ----------------------------------------------------
chrome.storage.local.get(['isAutoSubmitOn'], (result) => {
  if (result.isAutoSubmitOn) {
    isRunning = true;
    startSubmitting();
  }
  updateStatusIndicator();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.isAutoSubmitOn !== undefined) {
    isRunning = changes.isAutoSubmitOn.newValue;
    updateStatusIndicator();
    if (isRunning) {
      resetState();
      startSubmitting();
    } else {
      stopSubmitting();
    }
  }
});

function resetState() {
  fileState = {
    id: null,
    detectedAt: 0,
    submitAttempts: 0,
    skipAttempts: 0,
    lastActionTime: 0,
    lastActionType: null
  };
  loaderStartTime = 0;
}

function stopSubmitting() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function startSubmitting() {
  if (!isRunning) return;
  stopSubmitting();
  checkAndSubmit();
  checkInterval = setInterval(() => {
    if (!isRunning) {
      stopSubmitting();
      return;
    }
    checkAndSubmit();
  }, 1000); // Check every 1.0 second for responsive, fluid execution
}

// ----------------------------------------------------
// Element Helpers
// ----------------------------------------------------
function extractFileId() {
  // 1. From URL
  const urlMatch = window.location.href.match(/edit\/?(\d+)/i);
  if (urlMatch) return urlMatch[1];

  const queryMatch = window.location.href.match(/[?&](?:itemid|id|fileid)=(\d+)/i);
  if (queryMatch) return queryMatch[1];

  // 2. From hidden form inputs
  const inputEl = document.querySelector('input[name="itemid"], input[name="fileid"], input[name="id"]');
  if (inputEl && inputEl.value && /^\d+$/.test(inputEl.value.trim())) {
    return inputEl.value.trim();
  }

  // 3. From form action
  const formEl = document.querySelector('form[action*="edit"]');
  if (formEl) {
    const actMatch = (formEl.getAttribute('action') || '').match(/edit\/?(\d+)/i);
    if (actMatch) return actMatch[1];
  }

  return null;
}

function isElementVisible(el) {
  if (!el) return false;
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  } catch (e) {
    return el.offsetParent !== null;
  }
}

function findNextButton() {
  const selectors = [
    '#js-next-submit',
    'a.popup-nav__btn--next',
    '.popup-nav__btn--next',
    'a[data-action="next"]',
    'button.popup-nav__btn--next'
  ];
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && isElementVisible(el) && !el.classList.contains('disabled')) {
      return el;
    }
  }
  return null;
}

function findSubmitButton() {
  const exact = document.getElementById('submitbutton');
  if (exact && isElementVisible(exact) && !exact.classList.contains('disabled')) {
    return exact;
  }

  const candidates = document.querySelectorAll('a.btn, button.btn, input[type="submit"]');
  for (const el of candidates) {
    if (!isElementVisible(el) || el.disabled || el.classList.contains('disabled')) continue;
    if (el.closest('nav') || el.closest('header')) continue;
    const txt = (el.value || el.innerText || el.textContent || '').trim().toLowerCase();
    if (txt.includes('submit') && !txt.includes('files')) {
      return el;
    }
  }
  return null;
}

function safeClick(el) {
  if (!el) return false;
  try {
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  } catch (e) {}

  try {
    el.focus && el.focus();
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    el.click();
    return true;
  } catch (err) {
    try {
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }
}

// ----------------------------------------------------
// Main Automation Loop
// ----------------------------------------------------
function checkAndSubmit() {
  if (!isRunning) return;

  const now = Date.now();

  // 1. Check if Dreamstime AJAX Main Loader is active
  const ml = document.getElementById('js-mainloader');
  const isLoaderActive = ml && ml.dataset.state === 'loading' && isElementVisible(ml);
  if (isLoaderActive) {
    if (!loaderStartTime) loaderStartTime = now;
    // Don't let a stuck loader freeze the extension forever (max 7s)
    if (now - loaderStartTime < 7000) {
      updateStatusIndicator("LOADING NEXT IMAGE...", "#17a2b8");
      return;
    }
  } else {
    loaderStartTime = 0;
  }

  // 2. Detect Current File ID
  const fileId = extractFileId();
  if (!fileId) {
    if (window.location.href.includes('unfinished')) {
      updateStatusIndicator("ALL COMPLETED! 🎉", "#28a745");
    } else {
      updateStatusIndicator("WAITING FOR EDIT PAGE...", "#6c757d");
    }
    return;
  }

  // 3. New File Arrived!
  if (fileId !== fileState.id) {
    console.log(`[DT AutoSubmit] New file detected: ${fileId}`);
    fileState = {
      id: fileId,
      detectedAt: now,
      submitAttempts: 0,
      skipAttempts: 0,
      lastActionTime: 0,
      lastActionType: null
    };
    updateStatusIndicator(`DETECTED FILE [${fileId}]`, "#17a2b8");
  }

  const timeOnThisFile = now - fileState.detectedAt;

  // 4. Check for Dreamstime Error Messages
  const failMsgEl = document.querySelector('#js-submit-message-fail p, .alert-danger, .form-error');
  const failMsg = failMsgEl ? failMsgEl.innerText.trim() : '';
  if (failMsg && isElementVisible(failMsgEl)) {
    updateStatusIndicator(`ERROR: ${failMsg.slice(0, 30)}...`, "#dc3545");
    // If stuck on error for > 4s, skip to next file to prevent stalling the entire batch
    if (now - fileState.lastActionTime > 4000) {
      const nextBtn = findNextButton();
      if (nextBtn) {
        console.warn(`[DT AutoSubmit] Error encountered: "${failMsg}". Auto-skipping to keep queue moving.`);
        fileState.lastActionTime = now;
        fileState.lastActionType = 'skip';
        updateStatusIndicator("SKIPPING ERRORED FILE...", "#fd7e14");
        safeClick(nextBtn);
        return;
      }
    }
    return;
  }

  // 5. Check if already submitted and waiting for navigation
  if (submittedFileIds.has(fileId)) {
    const timeSinceSubmit = now - fileState.lastActionTime;

    // A. Check if Dreamstime showed success message
    const successMsgEl = document.querySelector('#js-submit-message p');
    const successText = successMsgEl ? successMsgEl.innerText.trim().toLowerCase() : '';
    const isSuccessShowing = successText.includes('submit') || successText.includes('saved') || successText.includes('success');

    // If success message is showing OR if it's been > 4s since submit, force advance via Next button!
    if (isSuccessShowing || timeSinceSubmit >= 4500) {
      const nextBtn = findNextButton();
      if (nextBtn) {
        console.log(`[DT AutoSubmit] [${fileId}] Submitted successfully. Advancing to next image...`);
        fileState.lastActionTime = now;
        updateStatusIndicator("ADVANCING TO NEXT...", "#17a2b8");
        safeClick(nextBtn);
        return;
      }
    }

    // If submit was attempted but 7s passed and page STILL hasn't changed, allow retry if submit button is visible
    if (timeSinceSubmit >= 7000 && fileState.submitAttempts < 3) {
      const submitBtn = findSubmitButton();
      if (submitBtn) {
        console.log(`[DT AutoSubmit] [${fileId}] Still on page after submit. Retrying submit (Attempt ${fileState.submitAttempts + 1})...`);
        fileState.submitAttempts++;
        fileState.lastActionTime = now;
        updateStatusIndicator(`RETRYING SUBMIT (${fileState.submitAttempts}/3)...`, "#17a2b8");
        safeClick(submitBtn);
        return;
      }
    }

    updateStatusIndicator(`SUBMITTED, WAITING FOR NEXT... (${Math.round(timeSinceSubmit / 1000)}s)`, "#17a2b8");
    return;
  }

  // 6. Inspect Form Data (Title and Description)
  const titleEl = document.getElementById('title') || document.querySelector('input[name="title"]');
  const descEl = document.getElementById('description') || document.querySelector('textarea[name="description"]');
  const titleVal = titleEl ? (titleEl.value || '').trim() : '';
  const descVal = descEl ? (descEl.value || '').trim() : '';
  const hasTitle = titleVal.length > 0;
  const hasDesc = descVal.length > 0;

  // 7. Settle Period: When file first loads via AJAX, wait 1.2s before declaring Title/Desc missing
  // (Prevents skipping images whose fields are still populating via AJAX)
  if ((!hasTitle || !hasDesc) && timeOnThisFile < 1200) {
    updateStatusIndicator(`CHECKING METADATA [${fileId}]...`, "#ffc107", "#000000");
    return;
  }

  // 8. MISSING TITLE OR DESCRIPTION → SKIP TO NEXT FILE
  if (!hasTitle || !hasDesc) {
    const reason = !hasTitle && !hasDesc ? "No Title & Desc" : (!hasTitle ? "No Title" : "No Desc");
    const nextBtn = findNextButton();

    if (nextBtn) {
      // Debounce skip clicks (2.2 seconds)
      if (now - fileState.lastActionTime >= 2200) {
        fileState.skipAttempts++;
        fileState.lastActionTime = now;
        fileState.lastActionType = 'skip';
        console.log(`[DT AutoSubmit] [${fileId}] ${reason} → Clicking Skip/Next (Attempt ${fileState.skipAttempts})`);
        updateStatusIndicator(`SKIPPING (${reason}) [${fileState.skipAttempts}]...`, "#ffc107", "#000000");
        safeClick(nextBtn);
      }
    } else {
      updateStatusIndicator(`WAITING TO SKIP (${reason})...`, "#ffc107", "#000000");
    }
    return;
  }

  // 9. BOTH TITLE AND DESCRIPTION ARE PRESENT → SUBMIT FILE
  const submitBtn = findSubmitButton();

  if (!submitBtn) {
    // If submit button not found, check if Next button is there
    const nextBtn = findNextButton();
    if (nextBtn && timeOnThisFile > 4000) {
      // If no submit button after 4s, move to next file
      console.warn(`[DT AutoSubmit] [${fileId}] No submit button found after 4s. Moving to next.`);
      safeClick(nextBtn);
      return;
    }
    updateStatusIndicator("WAITING FOR SUBMIT BUTTON...", "#6c757d");
    return;
  }

  // Ready to submit!
  if (now - fileState.lastActionTime >= 2000) {
    fileState.submitAttempts++;
    fileState.lastActionTime = now;
    fileState.lastActionType = 'submit';
    submittedFileIds.add(fileId); // Mark file as submitted
    console.log(`[DT AutoSubmit] [${fileId}] Submitting: "${titleVal.slice(0, 35)}..." (Attempt ${fileState.submitAttempts})`);
    updateStatusIndicator(`SUBMITTING [${fileId}]...`, "#28a745");
    safeClick(submitBtn);
  }
}
