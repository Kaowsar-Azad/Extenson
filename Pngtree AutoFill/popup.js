document.getElementById('fillBtn').addEventListener('click', async () => {
    try {
        // Get active tab in current window
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Ensure we are on pngtree
        if (!tab.url.includes('upload.pngtree.com')) {
            alert("Please use this extension only on upload.pngtree.com");
            return;
        }

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, { action: "autofill" }, (response) => {
            if (chrome.runtime.lastError) {
                alert("Error: Please REFRESH the Pngtree page first! (F5)");
            } else {
                console.log("Autofill triggered successfully");
                // The popup will now stay open until the user clicks outside or clicks the close button
            }
        });
    } catch (e) {
        alert("An error occurred. Please refresh the page.");
    }
});

document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
});
