// popup.js - Image Downloader Popup Logic

let scannedImages = [];
let activeTabId = null;
let isDownloading = false;
let cancelZip = false;

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    showEmptyState("No active webpage found.");
    return;
  }
  activeTabId = tab.id;

  // Restore saved delay setting
  chrome.storage.local.get(["downloadDelay"], res => {
    if (res.downloadDelay) {
      document.getElementById("delaySelect").value = res.downloadDelay;
    }
  });

  // Check background batch download status
  chrome.runtime.sendMessage({ action: "get_batch_status" }, response => {
    if (response && response.isDownloading) {
      isDownloading = true;
      setDownloadingUI(true);
      updateProgress(response.progress.current, response.progress.total, response.progress.currentFile);
    }
  });

  // Scan current page
  await requestScan();

  // Attach event listeners
  document.getElementById("btnSelectAll").addEventListener("click", selectAll);
  document.getElementById("btnDeselectAll").addEventListener("click", deselectAll);
  document.getElementById("btnScrollMore").addEventListener("click", scrollMore);
  document.getElementById("btnDownloadBatch").addEventListener("click", startBatchFilesDownload);
  document.getElementById("btnDownloadZip").addEventListener("click", startZipDownload);
  document.getElementById("btnCancel").addEventListener("click", cancelDownload);
  document.getElementById("delaySelect").addEventListener("change", e => {
    chrome.storage.local.set({ downloadDelay: e.target.value });
  });
});

// Listen for background download progress
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "download_progress") {
    if (msg.cancelled) {
      setDownloadingUI(false);
      setProgressText("Download cancelled.");
    } else if (msg.finished) {
      setDownloadingUI(false);
      setProgress(100);
      setProgressText(`Finished downloading all ${msg.total} files!`);
      notifyPage(`All ${msg.total} images have been saved to your Downloads folder!`, "success");
    } else {
      updateProgress(msg.current, msg.total, msg.currentFile);
    }
  }
});

async function requestScan() {
  showEmptyState("Scanning page for images...");

  try {
    const response = await sendMessageToTab(activeTabId, { action: "scan_images" });
    if (response && response.success) {
      handleScanResult(response);
    } else {
      // Content script might need injection
      await injectContentScript(activeTabId);
      const retryResponse = await sendMessageToTab(activeTabId, { action: "scan_images" });
      if (retryResponse && retryResponse.success) {
        handleScanResult(retryResponse);
      } else {
        showEmptyState("No stock images detected on this page.");
      }
    }
  } catch (err) {
    console.warn("Scan failed, attempting script injection:", err);
    try {
      await injectContentScript(activeTabId);
      const retryResponse = await sendMessageToTab(activeTabId, { action: "scan_images" });
      if (retryResponse && retryResponse.success) {
        handleScanResult(retryResponse);
      } else {
        showEmptyState("Could not find images. Please refresh the page.");
      }
    } catch (e2) {
      showEmptyState("Please open a valid website with images and try again.");
    }
  }
}

function handleScanResult(data) {
  scannedImages = data.images || [];

  // Update site badge
  const siteBadge = document.getElementById("siteBadge");
  if (data.isDreamstime) {
    siteBadge.textContent = "Supported Site";
    siteBadge.className = "badge badge-site dreamstime";
  } else {
    siteBadge.textContent = "Web Page";
    siteBadge.className = "badge badge-site";
  }

  // Update Folder input
  const folderInput = document.getElementById("folderInput");
  if (!folderInput.value || folderInput.dataset.autoFilled === "true") {
    const folderName = `Images_${data.keyword}`;
    folderInput.value = folderName;
    folderInput.dataset.autoFilled = "true";
  }

  renderImageGrid();
  updateCounts();
}

function renderImageGrid() {
  const grid = document.getElementById("imageGrid");
  grid.innerHTML = "";

  if (scannedImages.length === 0) {
    showEmptyState("No stock photos found. Try scrolling down to load more images.");
    return;
  }

  scannedImages.forEach((img, idx) => {
    const card = document.createElement("div");
    card.className = `image-card ${img.selected ? "selected" : ""}`;
    card.dataset.id = img.id;

    // Checkbox
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "card-checkbox";
    cb.checked = img.selected;
    cb.addEventListener("click", e => {
      e.stopPropagation();
      toggleImageSelection(idx, cb.checked);
    });

    // Thumbnail Image
    const imgEl = document.createElement("img");
    imgEl.src = img.thumbUrl;
    imgEl.alt = img.title;
    imgEl.loading = "lazy";

    // Index badge
    const badge = document.createElement("span");
    badge.className = "card-index";
    badge.textContent = `#${String(idx + 1).padStart(2, "0")}`;

    card.appendChild(cb);
    card.appendChild(imgEl);
    card.appendChild(badge);

    card.addEventListener("click", () => {
      const newState = !img.selected;
      cb.checked = newState;
      toggleImageSelection(idx, newState);
    });

    grid.appendChild(card);
  });
}

function toggleImageSelection(index, isSelected) {
  if (scannedImages[index]) {
    scannedImages[index].selected = isSelected;
    const card = document.querySelector(`.image-card[data-id="${scannedImages[index].id}"]`);
    if (card) {
      card.classList.toggle("selected", isSelected);
    }
    updateCounts();
  }
}

function selectAll() {
  scannedImages.forEach((img, idx) => {
    img.selected = true;
  });
  document.querySelectorAll(".image-card").forEach(c => c.classList.add("selected"));
  document.querySelectorAll(".card-checkbox").forEach(cb => (cb.checked = true));
  updateCounts();
}

function deselectAll() {
  scannedImages.forEach((img, idx) => {
    img.selected = false;
  });
  document.querySelectorAll(".image-card").forEach(c => c.classList.remove("selected"));
  document.querySelectorAll(".card-checkbox").forEach(cb => (cb.checked = false));
  updateCounts();
}

function updateCounts() {
  const total = scannedImages.length;
  const selected = scannedImages.filter(i => i.selected).length;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("selectedCount").textContent = selected;
  document.getElementById("batchBtnCount").textContent = selected;

  const btnBatch = document.getElementById("btnDownloadBatch");
  const btnZip = document.getElementById("btnDownloadZip");

  btnBatch.disabled = selected === 0 || isDownloading;
  btnZip.disabled = selected === 0 || isDownloading;
}

async function scrollMore() {
  const btn = document.getElementById("btnScrollMore");
  btn.disabled = true;
  btn.textContent = "Loading...";

  try {
    const response = await sendMessageToTab(activeTabId, { action: "scroll_and_scan" });
    if (response && response.success) {
      handleScanResult(response);
    }
  } catch (e) {
    console.error("Scroll scan failed:", e);
  } finally {
    btn.disabled = false;
    btn.textContent = "+ More";
  }
}

// ----------------------------------------------------
// Download as Separate Files
// ----------------------------------------------------
function startBatchFilesDownload() {
  const selectedImages = scannedImages.filter(i => i.selected);
  if (selectedImages.length === 0) return;

  const folderName = document.getElementById("folderInput").value.trim() || "Images";
  const delayMs = parseInt(document.getElementById("delaySelect").value, 10) || 300;

  const items = selectedImages.map(img => ({
    url: img.highResUrl,
    fallbackUrl: img.thumbUrl,
    filename: img.filename
  }));

  setDownloadingUI(true);
  setProgress(0);
  setProgressText(`Starting download of ${items.length} files...`);

  chrome.runtime.sendMessage(
    {
      action: "start_download_batch",
      items: items,
      folder: folderName,
      delayMs: delayMs
    },
    response => {
      if (!response || !response.success) {
        setDownloadingUI(false);
        alert(response ? response.message : "Failed to start batch download.");
      }
    }
  );
}

// ----------------------------------------------------
// Download as Single ZIP Archive
// ----------------------------------------------------
async function startZipDownload() {
  if (typeof JSZip === "undefined") {
    alert("JSZip library not found. Please use separate files download.");
    return;
  }

  const selectedImages = scannedImages.filter(i => i.selected);
  if (selectedImages.length === 0) return;

  const folderName = document.getElementById("folderInput").value.trim() || "Images";

  setDownloadingUI(true);
  cancelZip = false;

  const zip = new JSZip();
  const folder = zip.folder(folderName);

  let successCount = 0;
  const total = selectedImages.length;

  for (let i = 0; i < total; i++) {
    if (cancelZip) {
      setDownloadingUI(false);
      setProgressText("ZIP download cancelled.");
      return;
    }

    const img = selectedImages[i];
    const percent = Math.round(((i + 1) / total) * 90);
    setProgress(percent);
    setProgressText(`Fetching image ${i + 1} of ${total}: ${img.filename}...`);

    try {
      const blob = await fetchImageBlob(img.highResUrl, img.thumbUrl);
      folder.file(img.filename, blob);
      successCount++;
    } catch (err) {
      console.warn(`[ZIP] Failed to fetch ${img.filename}:`, err);
    }
  }

  if (successCount === 0) {
    setDownloadingUI(false);
    alert("Failed to fetch images for ZIP. Try the 'Download Files' button instead.");
    return;
  }

  setProgress(95);
  setProgressText("Compressing images into ZIP archive...");

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 4 }
  });

  const zipUrl = URL.createObjectURL(zipBlob);
  const zipFilename = `${folderName}.zip`;

  setProgress(100);
  setProgressText(`Saving ${zipFilename}...`);

  chrome.downloads.download(
    {
      url: zipUrl,
      filename: zipFilename,
      saveAs: false,
      conflictAction: "uniquify"
    },
    downloadId => {
      setDownloadingUI(false);
      setProgressText(`ZIP download started: ${zipFilename}`);
      notifyPage(`ZIP archive created with ${successCount} images!`, "success");
      setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    }
  );
}

async function fetchImageBlob(highResUrl, fallbackUrl) {
  try {
    const res = await fetch(highResUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  } catch (e) {
    if (fallbackUrl && fallbackUrl !== highResUrl) {
      const resFallback = await fetch(fallbackUrl);
      if (!resFallback.ok) throw new Error(`HTTP ${resFallback.status}`);
      return await resFallback.blob();
    }
    throw e;
  }
}

function cancelDownload() {
  cancelZip = true;
  chrome.runtime.sendMessage({ action: "cancel_batch" });
  setDownloadingUI(false);
  setProgressText("Cancelling...");
}

// ----------------------------------------------------
// UI Helpers
// ----------------------------------------------------
function setDownloadingUI(downloading) {
  isDownloading = downloading;

  document.getElementById("btnDownloadBatch").style.display = downloading ? "none" : "flex";
  document.getElementById("btnDownloadZip").style.display = downloading ? "none" : "flex";
  document.getElementById("btnCancel").style.display = downloading ? "flex" : "none";
  document.getElementById("progressSection").style.display = downloading ? "block" : "none";

  document.getElementById("btnSelectAll").disabled = downloading;
  document.getElementById("btnDeselectAll").disabled = downloading;
  document.getElementById("btnScrollMore").disabled = downloading;
  document.getElementById("folderInput").disabled = downloading;
}

function updateProgress(current, total, currentFile) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  setProgress(percent);
  setProgressText(`Downloading ${current} of ${total} (${percent}%) - ${currentFile || ""}`);
}

function setProgress(percent) {
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function setProgressText(text) {
  const status = document.getElementById("progressStatus");
  if (status) status.textContent = text;
}

function showEmptyState(msg) {
  const grid = document.getElementById("imageGrid");
  grid.innerHTML = `<div class="empty-state">${msg}</div>`;
  document.getElementById("totalCount").textContent = "0";
  document.getElementById("selectedCount").textContent = "0";
  document.getElementById("batchBtnCount").textContent = "0";
}

function notifyPage(message, type = "info") {
  if (activeTabId) {
    sendMessageToTab(activeTabId, {
      action: "show_toast",
      message: message,
      type: type
    }).catch(() => {});
  }
}

function sendMessageToTab(tabId, msg) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

function injectContentScript(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["content.js"]
  });
}
