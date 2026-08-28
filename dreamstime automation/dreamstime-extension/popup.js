document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');

  // Load current state
  chrome.storage.local.get(['isAutoSubmitOn'], (result) => {
    updateUI(result.isAutoSubmitOn);
  });

  startBtn.addEventListener('click', () => {
    // Check if on Dreamstime
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0] && !tabs[0].url.includes("dreamstime.com")) {
        alert("দয়া করে Dreamstime পেজে গিয়ে Start বাটন চাপুন।");
        return;
      }
      chrome.storage.local.set({ isAutoSubmitOn: true });
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.storage.local.set({ isAutoSubmitOn: false });
  });

  // Listen to changes in case it is turned off from content.js (like when finished or error)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.isAutoSubmitOn) {
      updateUI(changes.isAutoSubmitOn.newValue);
    }
  });

  function updateUI(isOn) {
    if (isOn) {
      statusDiv.textContent = 'Status: ON (Submitting...)';
      statusDiv.className = 'status status-on';
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      statusDiv.textContent = 'Status: OFF';
      statusDiv.className = 'status status-off';
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
    }
  }
});
