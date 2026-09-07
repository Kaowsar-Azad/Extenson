let isRunning = false;
let checkInterval = null;
let noButtonTimer = null;

// State machine variables
let firstClickDone = false;
let submittingDetected = false;
let submittingDetectedTime = null;
let lastClickedButton = null;
let lastActionTime = 0; // Initialize to 0 so it clicks immediately

console.log("Dreamstime Auto Submit: Content script loaded.");

function updateStatusIndicator() {
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
  firstClickDone = false;
  submittingDetected = false;
  submittingDetectedTime = null;
  lastClickedButton = null;
  lastActionTime = 0;
  if (noButtonTimer) clearTimeout(noButtonTimer);
  noButtonTimer = null;
}

function startSubmitting() {
  if (!isRunning) return;

  checkAndSubmit();

  // Check very frequently (every 1 second) to be extremely responsive
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    if (!isRunning) {
      clearInterval(checkInterval);
      return;
    }
    checkAndSubmit();
  }, 1000);
}

function findSubmitButton() {
  const allInputs = document.querySelectorAll('input[type="submit"], button, input[type="button"], a');

  const submitButtons = Array.from(allInputs).filter(el => {
    if (el.id === 'dreamstime-auto-submit-indicator') return false;

    const text = (el.value || el.innerText || "").trim().toLowerCase();
    const inNav = el.closest('nav') || el.closest('header');
    return text.includes("submit") && !inNav;
  });

  return submitButtons.length > 0 ? submitButtons[0] : null;
}

function checkAndSubmit() {
  if (!isRunning) return;

  const btn = findSubmitButton();

  if (!btn) {
    if (!noButtonTimer) {
      noButtonTimer = setTimeout(() => {
        if (!isRunning) return;
        const doubleCheckBtn = findSubmitButton();
        if (!doubleCheckBtn) {
          chrome.storage.local.set({ isAutoSubmitOn: false });
          isRunning = false;
          if (checkInterval) clearInterval(checkInterval);
          alert("Dreamstime Auto Submit: সব ফাইল সফলভাবে সাবমিট করা শেষ হয়েছে!");
        }
      }, 15000);
    }
    return;
  } else {
    if (noButtonTimer) {
      clearTimeout(noButtonTimer);
      noButtonTimer = null;
    }
  }

  if (btn !== lastClickedButton) {
    resetState();
    lastClickedButton = btn;
  }

  const bodyTextLower = document.body.innerText.toLowerCase();
  const hasVerifying = bodyTextLower.includes("verifying data for submission");
  const hasSubmitting = bodyTextLower.includes("submitting image");

  // If verifying, we just wait.
  if (hasVerifying) {
    return;
  }

  // If submitting, we wait 3 seconds, then start forcing clicks
  if (hasSubmitting) {
    if (!submittingDetected) {
      submittingDetected = true;
      submittingDetectedTime = Date.now();
    }

    // 3 seconds have passed since "Submitting image" appeared
    if (Date.now() - submittingDetectedTime >= 1000) {
      // Click every 2 seconds to force it through
      if (Date.now() - lastActionTime > 2000) {
        lastActionTime = Date.now();
        try { btn.click(); } catch (e) { }
      }
    }
    return;
  }

  // Initial state: Click it! And keep clicking every 2 seconds until progress appears.
  if (!firstClickDone || Date.now() - lastActionTime > 2000) {
    firstClickDone = true;
    lastActionTime = Date.now();
    try { btn.click(); } catch (e) { }
  }
}
