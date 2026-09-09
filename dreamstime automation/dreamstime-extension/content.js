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
    indicator.style.padding = '10px 16px';
    indicator.style.borderRadius = '6px';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '14px';
    indicator.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
    indicator.style.transition = 'background-color 0.2s, color 0.2s';
    indicator.style.pointerEvents = 'none';
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

function safeClick(el) {
  if (!el) return;
  try {
    el.click();
  } catch (e) {}
  try {
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    el.dispatchEvent(evt);
  } catch (e) {}
}

function getFormData() {
  // 1. All textareas and text inputs
  const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => t.offsetParent !== null);
  const textInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
    .filter(i => i.offsetParent !== null && !i.closest('nav, header, #header, #navigation, .header, .search-bar, [role="navigation"]'));

  // Description textarea
  let descEl = document.querySelector('textarea[name*="desc" i], textarea#description, textarea#media_description, textarea#image_description');
  if (!descEl && textareas.length > 0) {
    descEl = textareas[0];
  }

  // Title input
  let titleEl = document.querySelector('input[name="title"], input#title, input[name="media_title"], input#media_title, input[name="image_title"], input#image_title, input[name*="title" i]');
  if (!titleEl && textInputs.length > 0) {
    const byLabel = textInputs.find(inp => {
      const prev = inp.previousElementSibling;
      if (prev && /title/i.test(prev.textContent || '')) return true;
      const parent = inp.parentElement;
      if (parent && /title/i.test(parent.textContent || '')) return true;
      return false;
    });
    titleEl = byLabel || textInputs[0];
  }

  const titleVal = titleEl ? (titleEl.value || '').trim() : '';
  const descVal = descEl ? (descEl.value || '').trim() : '';

  return { titleEl, descEl, titleVal, descVal };
}

function findNextSkipButton() {
  let btn = document.getElementById('js-next-submit');
  if (btn) return btn;
  btn = document.querySelector('a.popup-nav__btn--next, .popup-nav__btn--next, [id="js-next-submit"]');
  if (btn) return btn;
  const allBtns = document.querySelectorAll('.popup-nav__btn, .popup-nav a, a');
  for (const b of allBtns) {
    if (b.classList.contains('popup-nav__btn--next') || b.id.includes('next')) return b;
  }
  return null;
}

function findSubmitButton() {
  let btn = document.getElementById('submitbutton');
  if (btn && btn.offsetParent !== null && !btn.disabled) {
    return btn;
  }

  const allInputs = document.querySelectorAll('input[type="submit"], button, input[type="button"], a');
  const submitButtons = Array.from(allInputs).filter(el => {
    if (el.id === 'dreamstime-auto-submit-indicator') return false;
    if (el.id === 'js-next-submit') return false;
    if (el.classList.contains('popup-nav__btn--next')) return false;
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

  // 1. Check if page is currently loading or verifying submission
  const bodyText = (document.body.innerText || '').toLowerCase();
  const ml = document.getElementById('js-mainloader');
  const isMainLoader = ml && ml.dataset.state === 'loading';
  const isVerifying = bodyText.includes("verifying data for submission") || bodyText.includes("please wait");
  const isSubmitting = bodyText.includes("submitting image");

  if (isMainLoader || isVerifying || isSubmitting) {
    updateStatusIndicator("WAITING / VERIFYING...", "#17a2b8");
    return;
  }

  // 2. Track current File ID
  const fileId = extractFileId();
  if (fileId && fileId !== currentFileId) {
    currentFileId = fileId;
    resetState();
    updateStatusIndicator("RUNNING", "#28a745");
  }

  // 3. Check Title and Description
  const { titleEl, descEl, titleVal, descVal } = getFormData();
  const hasTitle = titleVal.length > 0;
  const hasDesc = descVal.length > 0;

  // 4. CRITICAL: IF TITLE OR DESCRIPTION IS MISSING -> MUST SKIP! NEVER SUBMIT!
  if (!hasTitle || !hasDesc) {
    const nextBtn = findNextSkipButton();
    const reason = !hasTitle && !hasDesc ? "No Title & Desc" : (!hasTitle ? "No Title" : "No Desc");

    if (nextBtn && nextBtn.offsetParent !== null && !nextBtn.classList.contains('disabled')) {
      if (Date.now() - lastActionTime > 2000) {
        lastActionTime = Date.now();
        lastActionType = 'skip';
        updateStatusIndicator(`SKIPPING (${reason})...`, "#ffc107", "#000000");
        console.log(`[Dreamstime Auto Submit] [ID: ${fileId || 'unknown'}] ${reason}. Clicking Next button (#js-next-submit)...`);
        safeClick(nextBtn);
      }
    } else {
      updateStatusIndicator(`WAITING TO SKIP (${reason})...`, "#ffc107", "#000000");
      console.log(`[Dreamstime Auto Submit] [ID: ${fileId || 'unknown'}] ${reason}, but Next button is not ready.`);
    }

    // STRICT STOP: DO NOT PROCEED TO SUBMIT BUTTON!
    return;
  }

  // 5. IF WE REACH HERE, BOTH TITLE AND DESCRIPTION ARE 100% FILLED!
  const btn = findSubmitButton();

  if (!btn) {
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

  // Click Submit button with debounce
  if (Date.now() - lastActionTime > 2000) {
    lastActionTime = Date.now();
    lastActionType = 'submit';
    updateStatusIndicator("SUBMITTING...", "#17a2b8");
    console.log(`[Dreamstime Auto Submit] [ID: ${fileId || 'unknown'}] Title ('${titleVal.slice(0, 20)}') & Description present. Submitting...`);
    safeClick(btn);
  }
}
