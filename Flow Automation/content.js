// Inject the main-world script once when the content script loads
const scriptEl = document.createElement('script');
scriptEl.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(scriptEl);

let isAutomating = false;
let isDownloading = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "start_automation") {
    sendResponse({status: "started"});
    isAutomating = true;
    startAutomation(request.prompts);
  } else if (request.action === "start_downloading") {
    sendResponse({status: "started"});
    isDownloading = true;
    downloadedSrcs = new Set();
    startDownloading();
  } else if (request.action === "stop_all") {
    isAutomating = false;
    isDownloading = false;
    sendResponse({status: "stopped"});
  }
});

// ─── Prompt Automation helpers ───────────────────────────────────────

function findInputBox() {
  return document.querySelector('[data-slate-editor="true"]') ||
         document.querySelector('div[role="textbox"][contenteditable="true"]');
}

function findSendButton(inputBox) {
    if (!inputBox) {
        inputBox = document.querySelector('[data-slate-editor="true"]') ||
                   document.querySelector('div[role="textbox"][contenteditable="true"]');
    }

    if (inputBox) {
        let container = inputBox.parentElement;
        for (let i = 0; i < 15; i++) {
            if (!container || container.tagName === 'BODY') break;
            let btns = Array.from(container.querySelectorAll('button, [role="button"]'));
            for (let btn of btns) {
                if (btn.textContent && btn.textContent.includes('arrow_forward') && btn.textContent.includes('Create')) return btn;
            }
            if (btns.length >= 2) {
               let lastBtn = btns[btns.length - 1];
               if (lastBtn.textContent && lastBtn.textContent.includes('arrow_forward')) return lastBtn;
            }
            container = container.parentElement;
        }
    }

    const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const visibleBtns = allButtons.filter(b => b.getBoundingClientRect().width > 0);
    for (const btn of visibleBtns) {
        if (btn.textContent && btn.textContent.includes('arrow_forward') && btn.textContent.includes('Create')) return btn;
    }
    for (const btn of visibleBtns) {
        if (btn.textContent && btn.textContent.includes('arrow_forward')) return btn;
    }
    return null;
}

// ─── Prompt Automation ──────────────────────────────────────────────

async function startAutomation(prompts) {
  for (let i = 0; i < prompts.length; i++) {
    if (!isAutomating) {
        console.log('[Flow Automator] Stopped by user.');
        return;
    }
    const prompt = prompts[i];
    console.log(`[Flow Automator] Processing prompt ${i + 1}/${prompts.length}: ${prompt}`);
    
    const inputBox = findInputBox();
    if (!inputBox) {
      alert('Could not find the input box. Please make sure you are on Google Flow page.');
      break;
    }

    inputBox.click();
    inputBox.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(inputBox);
    sel.addRange(range);
    
    document.execCommand('selectAll', false, null);
    await new Promise(r => setTimeout(r, 100));

    console.log('[Flow Automator] Dispatching HARDWARE typing via CDP...');
    await new Promise(resolve => {
        try {
            chrome.runtime.sendMessage({ action: 'simulate_type', text: prompt }, resolve);
        } catch (e) { resolve(null); }
    });

    await new Promise(r => setTimeout(r, 2000));
    if (!isAutomating) return;

    const sendButton = findSendButton(inputBox);
    if (sendButton) {
      const rect = sendButton.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);
      
      console.log('[Flow Automator] Sending HARDWARE click+enter to Send button...');
      // Use simulate_click_enter for prompt submission (needs Enter key)
      await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: 'simulate_click_enter', x, y }, resolve);
      });
    } else {
      console.log("[Flow Automator] Could not find the Send button.");
      break;
    }

    let delay = 5000;
    console.log(`[Flow Automator] Waiting ${delay / 1000} seconds before next prompt...`);
    for (let wait = 0; wait < delay; wait += 500) {
        if (!isAutomating) return;
        await new Promise(r => setTimeout(r, 500));
    }
  }

  if (isAutomating) {
      console.log("[Flow Automator] Automation finished.");
      alert("Flow Automation: All prompts have been sent!");
      isAutomating = false;
  }
}

// ─── CDP helpers (used by download automation) ──────────────────────

async function cdpHover(x, y) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'simulate_hover', x, y }, resolve);
    });
}
// Pure click — NO Enter key. Safe for menus.
async function cdpClick(x, y) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'simulate_click', x, y }, resolve);
    });
}

// ─── Download Automation ────────────────────────────────────────────

let downloadedSrcs = new Set();

async function startDownloading() {
    console.log('[Flow DL] === Starting 2K Auto Downloader ===');
    
    let imagesProcessed = 0;
    let consecutiveEmpty = 0;
    
    while (isDownloading) {
        // 1. Gather all large images currently in DOM
        const allImgs = Array.from(document.querySelectorAll('img')).filter(img => {
            const r = img.getBoundingClientRect();
            return r.width > 100 && r.height > 100 && img.src;
        });
        console.log(`[Flow DL] Found ${allImgs.length} large images on screen. Already done: ${downloadedSrcs.size}`);

        // 2. Filter to only unprocessed ones
        const todo = allImgs.filter(img => !downloadedSrcs.has(img.src));
        console.log(`[Flow DL] ${todo.length} images remaining to process.`);

        if (todo.length === 0) {
            consecutiveEmpty++;
            console.log(`[Flow DL] Empty batch #${consecutiveEmpty}. Scrolling...`);
            if (consecutiveEmpty >= 4) {
                console.log('[Flow DL] 4 consecutive empty batches. Done.');
                break;
            }
            window.scrollBy(0, window.innerHeight * 0.7);
            await sleep(1500);
            continue;
        }
        consecutiveEmpty = 0;

        // 3. Process each image
        for (const img of todo) {
            if (!isDownloading) break;

            // Safety: if we got navigated to edit page, go back
            if (location.href.includes('/edit/')) {
                console.log('[Flow DL] Navigated to edit page! Going back...');
                history.back();
                await sleep(2000);
                continue;
            }

            const imgSrc = img.src; // save before DOM changes
            downloadedSrcs.add(imgSrc); // mark immediately to avoid reprocessing
            
            try {
                // Scroll image to center of viewport
                img.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await sleep(400);

                const imgRect = img.getBoundingClientRect();

                // Hover center of image to reveal overlay buttons — with retry
                let threeDotsIcon = null;
                for (let attempt = 0; attempt < 3; attempt++) {
                    await cdpHover(
                        Math.round(imgRect.left + imgRect.width / 2),
                        Math.round(imgRect.top + imgRect.height / 2)
                    );
                    await sleep(attempt === 0 ? 500 : 400);

                    threeDotsIcon = findThreeDotsNear(imgRect);
                    if (threeDotsIcon) break;
                    console.log(`[Flow DL] 3-dot not found, retry ${attempt + 1}...`);
                }

                if (!threeDotsIcon) {
                    console.log('[Flow DL] ⚠ Could not find 3-dot menu after 3 tries. Skipping.');
                    await cdpClick(10, 10);
                    await sleep(200);
                    continue;
                }

                // Click the 3-dot button
                const dotRect = threeDotsIcon.getBoundingClientRect();
                await cdpClick(
                    Math.round(dotRect.left + dotRect.width / 2),
                    Math.round(dotRect.top + dotRect.height / 2)
                );
                await sleep(500);

                // Find "Download" in the dropdown menu
                const dlEl = findMenuText('Download');
                if (!dlEl) {
                    console.log('[Flow DL] ⚠ Could not find "Download" menu item. Dismissing.');
                    await cdpClick(10, 10);
                    await sleep(200);
                    continue;
                }

                // Hover "Download" to open sub-menu
                const dlRect = dlEl.getBoundingClientRect();
                await cdpHover(
                    Math.round(dlRect.left + dlRect.width / 2),
                    Math.round(dlRect.top + dlRect.height / 2)
                );
                await sleep(500);

                // Find "2K" in the sub-menu
                const twoKEl = findMenuText('2K');
                if (!twoKEl) {
                    console.log('[Flow DL] ⚠ Could not find "2K" option. Dismissing.');
                    await cdpClick(10, 10);
                    await sleep(200);
                    continue;
                }

                // Click "2K"
                const tkRect = twoKEl.getBoundingClientRect();
                await cdpClick(
                    Math.round(tkRect.left + tkRect.width / 2),
                    Math.round(tkRect.top + tkRect.height / 2)
                );

                imagesProcessed++;
                console.log(`[Flow DL] ✓ Image #${imagesProcessed} queued for 2K download.`);

                // Wait for upscaling to fully start before moving on
                await sleep(2500);

                // Move mouse away gently — do NOT click, as clicking can cancel the upscaling
                await cdpHover(10, 10);
                await sleep(200);

            } catch (e) {
                console.error('[Flow DL] Error:', e);
                await cdpClick(10, 10);
                await sleep(300);
            }
        }

        if (!isDownloading) break;

        console.log(`[Flow DL] Batch complete. Total downloaded: ${imagesProcessed}. Scrolling...`);
        window.scrollBy(0, window.innerHeight * 0.7);
        await sleep(1200);
    }

    if (isDownloading) {
        alert(`Flow Automator: Finished downloading ${imagesProcessed} images in 2K!`);
        isDownloading = false;
    }
}

// ─── Download helper: find three-dots icon near an image ────────────

function findThreeDotsNear(imgRect) {
    // Look for ALL visible <i> elements with text "more_vert" — these are Google Material Icons
    const icons = Array.from(document.querySelectorAll('i')).filter(el => {
        if (el.textContent.trim() !== 'more_vert') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    });

    if (icons.length === 0) {
        console.log('[Flow DL] No more_vert icons found anywhere on page!');
        return null;
    }
    console.log(`[Flow DL] Found ${icons.length} more_vert icon(s). Picking nearest to image top-right.`);

    // Pick the one closest to the top-right corner of the image
    let best = null;
    let bestDist = Infinity;
    for (const icon of icons) {
        const r = icon.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Must overlap with the image area (with some padding)
        if (cx < imgRect.left - 30 || cx > imgRect.right + 30) continue;
        if (cy < imgRect.top - 30 || cy > imgRect.bottom + 30) continue;
        const dist = Math.hypot(cx - imgRect.right, cy - imgRect.top);
        if (dist < bestDist) {
            bestDist = dist;
            best = icon;
        }
    }
    return best;
}

// ─── Download helper: find a visible menu item by text ──────────────

function findMenuText(text) {
    // Search through menu items, list items, and buttons — from last to first
    // (React Portals append menus at the end of the DOM)
    const candidates = Array.from(document.querySelectorAll(
        '[role="menuitem"], [role="option"], li, [data-radix-collection-item]'
    ));
    for (let i = candidates.length - 1; i >= 0; i--) {
        const el = candidates[i];
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && el.textContent.includes(text)) {
            // Make sure it's not a huge container — it should be a reasonable menu item size
            if (r.height < 100) {
                console.log(`[Flow DL] Found "${text}" as <${el.tagName}> at (${Math.round(r.left)},${Math.round(r.top)}) ${Math.round(r.width)}x${Math.round(r.height)}`);
                return el;
            }
        }
    }
    // Fallback: leaf text nodes
    const allEls = Array.from(document.querySelectorAll('span, div, p, a, button'));
    for (let i = allEls.length - 1; i >= 0; i--) {
        const el = allEls[i];
        if (el.children.length === 0 && el.textContent.trim() === text) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                console.log(`[Flow DL] Fallback: Found "${text}" as <${el.tagName}> at (${Math.round(r.left)},${Math.round(r.top)})`);
                return el;
            }
        }
    }
    console.log(`[Flow DL] ⚠ Could NOT find any visible element with text "${text}"`);
    return null;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
