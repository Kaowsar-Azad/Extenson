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

document.getElementById('start').addEventListener('click', async () => {
  const promptsText = document.getElementById('prompts').value;
  const prompts = promptsText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  
  if (prompts.length === 0) {
    document.getElementById('status').innerText = 'Please enter at least one prompt.';
    return;
  }

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    if (activeTab && activeTab.url && activeTab.url.includes('labs.google/fx/tools/flow')) {
      document.getElementById('status').innerText = 'Starting automation...';
      showStopButton();
      chrome.tabs.sendMessage(activeTab.id, {
        action: "start_automation",
        prompts: prompts
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
    if (activeTab && activeTab.url && activeTab.url.includes('labs.google/fx/tools/flow')) {
      document.getElementById('status').innerText = 'Starting 2K Downloader...';
      showStopButton();
      chrome.tabs.sendMessage(activeTab.id, {
        action: "start_downloading"
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
