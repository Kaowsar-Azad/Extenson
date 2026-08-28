chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab.id;

  // Pure mouse click — NO Enter key. Used for download automation.
  if (request.action === "simulate_click") {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error("[BG] attach error:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
        type: "mousePressed", x: request.x, y: request.y, button: "left", clickCount: 1
      }, () => {
        setTimeout(() => {
          chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
            type: "mouseReleased", x: request.x, y: request.y, button: "left", clickCount: 1
          }, () => {
            chrome.debugger.detach({ tabId });
            sendResponse({ success: true });
          });
        }, 50);
      });
    });
    return true;
  }

  // Mouse click + Enter key. Used ONLY for prompt submission.
  if (request.action === "simulate_click_enter") {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error("[BG] attach error:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
        type: "mousePressed", x: request.x, y: request.y, button: "left", clickCount: 1
      }, () => {
        setTimeout(() => {
          chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
            type: "mouseReleased", x: request.x, y: request.y, button: "left", clickCount: 1
          }, () => {
            chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
              type: "keyDown", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: "\r"
            }, () => {
              chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
                type: "keyUp", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13
              }, () => {
                chrome.debugger.detach({ tabId });
                sendResponse({ success: true });
              });
            });
          });
        }, 50);
      });
    });
    return true;
  }

  // Type text into focused element
  if (request.action === "simulate_type") {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error("[BG] attach error:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      chrome.debugger.sendCommand({ tabId }, "Input.insertText", {
        text: request.text
      }, () => {
        chrome.debugger.detach({ tabId });
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // Mouse hover (move)
  if (request.action === "simulate_hover") {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        console.error("[BG] attach error:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", {
        type: "mouseMoved", x: request.x, y: request.y
      }, () => {
        chrome.debugger.detach({ tabId });
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
