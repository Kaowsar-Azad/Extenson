// background.js - Image Downloader Background Service Worker

let isBatchDownloading = false;
let shouldCancel = false;
let batchProgress = { current: 0, total: 0, currentFile: "" };

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "download_single") {
    downloadSingle(request.url, request.filename)
      .then(downloadId => sendResponse({ success: true, downloadId }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "start_download_batch") {
    if (isBatchDownloading) {
      sendResponse({ success: false, message: "A download is already in progress." });
      return true;
    }

    isBatchDownloading = true;
    shouldCancel = false;
    sendResponse({ success: true, status: "started" });

    startBatchDownload(request.items, request.folder, request.delayMs || 250);
    return true;
  }

  if (request.action === "cancel_batch") {
    shouldCancel = true;
    isBatchDownloading = false;
    sendResponse({ success: true, status: "cancelled" });
    return true;
  }

  if (request.action === "get_batch_status") {
    sendResponse({
      isDownloading: isBatchDownloading,
      progress: batchProgress
    });
    return true;
  }
});

function downloadSingle(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        conflictAction: "uniquify",
        saveAs: false
      },
      downloadId => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(downloadId);
        }
      }
    );
  });
}

async function startBatchDownload(items, folder, delayMs) {
  batchProgress.total = items.length;
  batchProgress.current = 0;

  const cleanFolder = (folder || "Downloaded_Images").replace(/[<>:"/\\|?*]/g, "").trim();

  for (let i = 0; i < items.length; i++) {
    if (shouldCancel) {
      console.log("[Image Downloader] Batch download cancelled by user.");
      broadcastProgress(i, items.length, "Cancelled", true);
      isBatchDownloading = false;
      return;
    }

    const item = items[i];
    batchProgress.current = i + 1;
    batchProgress.currentFile = item.filename;

    const fullPath = `${cleanFolder}/${item.filename}`;

    try {
      await downloadSingle(item.url, fullPath);
    } catch (e) {
      console.warn(`[Image Downloader] Failed to download ${item.filename}:`, e.message);
      // Try fallback to thumbUrl if highRes failed
      if (item.fallbackUrl && item.fallbackUrl !== item.url) {
        try {
          await downloadSingle(item.fallbackUrl, fullPath);
        } catch (e2) {
          console.error(`[Image Downloader] Fallback failed for ${item.filename}:`, e2.message);
        }
      }
    }

    broadcastProgress(i + 1, items.length, item.filename, false);
    await sleep(delayMs);
  }

  isBatchDownloading = false;
  broadcastProgress(items.length, items.length, "Finished", false, true);
}

function broadcastProgress(current, total, currentFile, cancelled = false, finished = false) {
  chrome.runtime.sendMessage({
    action: "download_progress",
    current: current,
    total: total,
    currentFile: currentFile,
    cancelled: cancelled,
    finished: finished
  }).catch(() => {
    // Popup might be closed, suppress error
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
