document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['promptDelay', 'downloadDelay'], (res) => {
    if (res.promptDelay) document.getElementById('promptDelay').value = res.promptDelay;
    if (res.downloadDelay) document.getElementById('downloadDelay').value = res.downloadDelay;
  });

  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'multiple') {
        document.getElementById('multipleMode').style.display = 'block';
        document.getElementById('singleMode').style.display = 'none';
      } else {
        document.getElementById('multipleMode').style.display = 'none';
        document.getElementById('singleMode').style.display = 'block';
      }
    });
  });

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && isFlowUrl(tabs[0].url)) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "get_status" }, function(response) {
        if (chrome.runtime.lastError) return;
        if (response) {
          if (response.isAutomating) {
            showStopButton();
            document.getElementById('status').innerText = `Automating... (${response.progress.current}/${response.progress.total})`;
          } else if (response.isDownloading) {
            showStopButton();
            document.getElementById('status').innerText = 'Downloading images...';
          }
        }
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "update_status") {
    document.getElementById('status').innerText = `Automating... (${request.current}/${request.total})`;
  } else if (request.action === "automation_finished") {
    document.getElementById('status').innerText = 'Automation finished.';
    showStartButtons();
  }
});

function saveSettings() {
  chrome.storage.local.set({
    promptDelay: document.getElementById('promptDelay').value,
    downloadDelay: document.getElementById('downloadDelay').value
  });
}
document.getElementById('promptDelay').addEventListener('change', saveSettings);
document.getElementById('downloadDelay').addEventListener('change', saveSettings);

function showStopButton() {
  document.getElementById('start').style.display = 'none';
  document.getElementById('downloadAll').style.display = 'none';
  document.getElementById('stop').style.display = 'block';
}

function showStartButtons() {
  document.getElementById('start').style.display = 'block';
  document.getElementById('downloadAll').style.display = 'block';
  document.getElementById('stop').style.display = 'none';
}

function isFlowUrl(url) {
  if (!url) return false;
  return url.includes('flow.google.com') || url.includes('labs.google/fx/tools/flow');
}

document.getElementById('start').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  let prompts = [];
  
  if (mode === 'multiple') {
    const promptsText = document.getElementById('prompts').value;
    prompts = promptsText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  } else {
    const singlePrompt = document.getElementById('singlePrompt').value.trim();
    const repeatCount = parseInt(document.getElementById('repeatCount').value, 10) || 1;
    if (singlePrompt.length > 0) {
      for (let i = 0; i < repeatCount; i++) {
        prompts.push(singlePrompt);
      }
    }
  }
  
  if (prompts.length === 0) {
    document.getElementById('status').innerText = 'Please enter at least one prompt.';
    return;
  }

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (activeTab && isFlowUrl(activeTab.url)) {
      document.getElementById('status').innerText = 'Starting automation...';
      showStopButton();
      chrome.tabs.sendMessage(activeTab.id, {
        action: "start_automation",
        prompts: prompts,
        delay: parseFloat(document.getElementById('promptDelay').value) * 1000
      }, function(response) {
        if (chrome.runtime.lastError) {
          document.getElementById('status').innerText = 'Error: Refresh the page and try again.';
          showStartButtons();
        } else {
          document.getElementById('status').innerText = 'Automating...';
        }
      });
    } else {
      document.getElementById('status').innerText = 'Please open Google Flow.';
    }
  });
});

document.getElementById('downloadAll').addEventListener('click', async () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (activeTab && isFlowUrl(activeTab.url)) {
      document.getElementById('status').innerText = 'Starting 2K Downloader...';
      showStopButton();
      chrome.tabs.sendMessage(activeTab.id, {
        action: "start_downloading",
        delay: parseFloat(document.getElementById('downloadDelay').value) * 1000
      }, function(response) {
        if (chrome.runtime.lastError) {
          document.getElementById('status').innerText = 'Error: Refresh the page and try again.';
          showStartButtons();
        } else {
          document.getElementById('status').innerText = 'Downloading images...';
        }
      });
    } else {
      document.getElementById('status').innerText = 'Please open Google Flow.';
    }
  });
});

document.getElementById('stop').addEventListener('click', async () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, { action: "stop_all" });
      document.getElementById('status').innerText = 'Stopped.';
      showStartButtons();
    }
  });
});
