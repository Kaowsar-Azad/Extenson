chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autofill") {
        fillForm();
        sendResponse({status: "done"});
    }
});

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function forceClick(element) {
    if (!element) return;
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    events.forEach(type => {
        element.dispatchEvent(new MouseEvent(type, {
            bubbles: true, cancelable: true, view: window
        }));
    });
}

function simulateInput(element, value) {
    if (!element) return;
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
}

async function fillForm() {
    console.log("[PngtreeAutoFill] Starting automation in content script...");

    // 1. Get Title from the "Title" input field
    let title = "";
    const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
    for (let input of allInputs) {
        if (input.value && input.value.length > 15 && input.type !== 'hidden' && !input.placeholder?.includes('Category')) {
            title = input.value;
            console.log("[PngtreeAutoFill] Found title:", title);
            break;
        }
    }

    // 2. Fill "Keywords used to create the image" field with the Title
    if (title) {
        const textAreas = document.querySelectorAll('input, textarea');
        for (let field of textAreas) {
            const ph = (field.placeholder || '').toLowerCase();
            // Match: "Please enter the keywords used when creating images on the AI platform."
            if (ph.includes('keywords used when creating') || (ph.includes('keyword') && ph.includes('create'))) {
                simulateInput(field, title);
                console.log("[PngtreeAutoFill] Filled Keywords with Title.");
                break;
            }
        }
    }

    // 3. Fill AI Platform URL
    const allFields = document.querySelectorAll('input, textarea');
    for (let field of allFields) {
        const ph = (field.placeholder || '').toLowerCase();
        // Match: "Please enter the URL of the AI platform used to create the image."
        if (ph.includes('url of the ai platform') || (ph.includes('url') && !ph.includes('keywords used'))) {
            simulateInput(field, "https://labs.google/fx/tools/flow");
            console.log("[PngtreeAutoFill] Filled AI URL.");
            break;
        }
    }

    // 4. Select Category 1: BACKGROUND
    const ivuSelects = document.querySelectorAll('.ivu-select');
    if (ivuSelects.length >= 1) {
        await clickIvuOption(ivuSelects[0], "BACKGROUND");
        await sleep(1000); // wait for dropdown to close
    }

    // 5. Select Category 2: Texture
    const ivuSelects2 = document.querySelectorAll('.ivu-select');
    if (ivuSelects2.length >= 2) {
        await clickIvuOption(ivuSelects2[1], "Texture");
        await sleep(500);
    }

    // 6. Trim secondary keywords to max 20
    await trimSecondaryKeywords(20);

    // 7. Click Submit then Cancel
    console.log("[PngtreeAutoFill] Looking for Submit/Cancel buttons...");
    await sleep(500);
    
    let submitBtn = null;
    let cancelBtn = null;
    
    // Find only VISIBLE buttons (height > 0)
    const allSpans = document.querySelectorAll('span.ivu-btn, button, .ivu-btn');
    for (let btn of allSpans) {
        const rect = btn.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) { // MUST BE VISIBLE
            const txt = btn.textContent.trim().toLowerCase();
            if (txt === 'submit' || btn.id === 'submit') submitBtn = btn;
            if (txt === 'cancel' || btn.id === 'cancel') cancelBtn = btn;
        }
    }
    
    if (submitBtn) {
        console.log("[PngtreeAutoFill] ★ Clicking Submit...", submitBtn);
        submitBtn.click(); // Native click
        await sleep(2500); // Wait 2.5 seconds for submit to process and animation to finish
    } else {
        console.error("[PngtreeAutoFill] Could NOT find visible Submit button!");
    }
    
    // Re-query Cancel button in case the DOM updated
    cancelBtn = null; // reset
    const updatedSpans = document.querySelectorAll('span.ivu-btn, button, .ivu-btn');
    for (let btn of updatedSpans) {
        const rect = btn.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0) {
            const txt = btn.textContent.trim().toLowerCase();
            if (txt === 'cancel' || btn.id === 'cancel') cancelBtn = btn;
        }
    }

    if (cancelBtn) {
        console.log("[PngtreeAutoFill] ★ Clicking Cancel...", cancelBtn);
        cancelBtn.click(); // Native click
    } else {
        console.error("[PngtreeAutoFill] Could NOT find visible Cancel button!");
    }

    console.log("[PngtreeAutoFill] Finished All Tasks!");
}

async function clickIvuOption(selectEl, optionText) {
    console.log("[PngtreeAutoFill] Opening ivu-select for:", optionText);
    const trigger = selectEl.querySelector('.ivu-select-selection') || selectEl;
    
    for (let attempt = 1; attempt <= 10; attempt++) {
        forceClick(trigger);
        await sleep(800); // wait for dropdown animation
        
        const allDropdowns = document.querySelectorAll('.ivu-select-dropdown');
        for (let dd of allDropdowns) {
            const rect = dd.getBoundingClientRect();
            if (rect.height > 0) { // Only check visible dropdowns
                const items = dd.querySelectorAll('li');
                for (let li of items) {
                    const text = li.textContent.trim();
                    if (text.toLowerCase() === optionText.toLowerCase()) {
                        console.log("[PngtreeAutoFill] ★ Found & clicking:", text);
                        forceClick(li);
                        return true;
                    }
                }
            }
        }
        
        console.log(`[PngtreeAutoFill] Attempt ${attempt} failed, retrying...`);
        // Close dropdown before retry
        document.body.click();
        await sleep(400);
    }
    console.error("[PngtreeAutoFill] Completely failed to find option:", optionText);
    return false;
}

async function trimSecondaryKeywords(maxCount) {
    console.log("[PngtreeAutoFill] Checking secondary keywords...");
    let allTags = document.querySelectorAll('.ivu-tag');
    
    if (allTags.length <= maxCount) return;
    
    // Attempt to target only tags within the secondary keywords area
    const labels = document.querySelectorAll('span, label');
    for (let label of labels) {
        if (label.textContent.includes('Secondary keywords')) {
            const container = label.closest('div') || label.parentElement;
            if (container && container.nextElementSibling) {
                const scopedTags = container.parentElement.querySelectorAll('.ivu-tag');
                if (scopedTags.length > 0) {
                    allTags = scopedTags;
                    break;
                }
            }
        }
    }

    if (allTags.length > maxCount) {
        console.log(`[PngtreeAutoFill] Removing ${allTags.length - maxCount} excess tags`);
        // Remove from the end
        for (let i = allTags.length - 1; i >= maxCount; i--) {
            const tag = allTags[i];
            const closeBtn = tag.querySelector('.ivu-icon-ios-close, .ivu-tag-close, [class*="close"], i');
            if (closeBtn) {
                forceClick(closeBtn);
                await sleep(150);
            } else {
                const icons = tag.querySelectorAll('i, svg, span');
                for (let icon of icons) {
                    if (icon.textContent.includes('×') || icon.textContent.includes('✕')) {
                        forceClick(icon);
                        await sleep(150);
                        break;
                    }
                }
            }
        }
    }
}

// Inject a floating button into the webpage
function injectFloatingButton() {
    if (document.getElementById('pngtree-autofill-floating')) return;
    const btn = document.createElement('button');
    btn.id = 'pngtree-autofill-floating';
    btn.textContent = 'Auto Fill & Submit';
    btn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 999999;
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: background-color 0.3s;
    `;
    
    btn.addEventListener('mouseenter', () => btn.style.backgroundColor = '#45a049');
    btn.addEventListener('mouseleave', () => btn.style.backgroundColor = '#4CAF50');
    
    btn.addEventListener('click', async () => {
        btn.textContent = 'Processing...';
        btn.style.backgroundColor = '#f39c12'; // orange
        
        await fillForm();
        
        btn.textContent = 'Auto Fill & Submit';
        btn.style.backgroundColor = '#4CAF50';
    });
    
    document.body.appendChild(btn);
}

// Check every second to ensure the floating button stays on the screen (in case Vue re-renders the body)
setInterval(injectFloatingButton, 1000);
