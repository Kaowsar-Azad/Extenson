// inject.js — runs in the MAIN WORLD (page's own JS context)
// Slate.js + React automation for Google Flow

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getReactFiber(el) {
    if (!el) return null;
    const key = Object.keys(el).find(k =>
        k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    return key ? el[key] : null;
}

function getReactProps(el) {
    if (!el) return null;
    const key = Object.keys(el).find(k => k.startsWith('__reactProps'));
    return key ? el[key] : null;
}

// Trigger all React event handlers directly on element and its fiber tree
function triggerReactHandlers(el) {
    if (!el) return false;
    let triggered = false;

    const syntheticEvent = {
        preventDefault: function() { this.defaultPrevented = true; },
        stopPropagation: function() { this.isPropagationStopped = true; },
        isPropagationStopped: false,
        defaultPrevented: false,
        nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true }),
        type: 'click',
        target: el,
        currentTarget: el,
        bubbles: true,
        isTrusted: true
    };

    // 1. Direct __reactProps on element
    const directProps = getReactProps(el);
    if (directProps) {
        if (typeof directProps.onClick === 'function') {
            try { directProps.onClick(syntheticEvent); triggered = true; } catch(e) {}
        }
        if (typeof directProps.onPointerDown === 'function') {
            try { directProps.onPointerDown(syntheticEvent); triggered = true; } catch(e) {}
        }
        if (typeof directProps.onMouseDown === 'function') {
            try { directProps.onMouseDown(syntheticEvent); triggered = true; } catch(e) {}
        }
    }

    // 2. Direct __reactProps on children (i, span, svg)
    el.querySelectorAll('*').forEach(child => {
        const childProps = getReactProps(child);
        if (childProps) {
            if (typeof childProps.onClick === 'function') {
                try { childProps.onClick({ ...syntheticEvent, target: child, currentTarget: child }); triggered = true; } catch(e) {}
            }
            if (typeof childProps.onPointerDown === 'function') {
                try { childProps.onPointerDown({ ...syntheticEvent, target: child, currentTarget: child }); triggered = true; } catch(e) {}
            }
        }
    });

    // 3. React Fiber tree upwards
    let fiber = getReactFiber(el);
    let current = fiber;
    let depth = 0;
    while (current && depth < 20) {
        const props = current.memoizedProps;
        if (props) {
            if (typeof props.onClick === 'function') {
                try { props.onClick(syntheticEvent); triggered = true; } catch(e) {}
            }
            if (typeof props.onPointerDown === 'function') {
                try { props.onPointerDown(syntheticEvent); triggered = true; } catch(e) {}
            }
            if (typeof props.onMouseDown === 'function') {
                try { props.onMouseDown(syntheticEvent); triggered = true; } catch(e) {}
            }
        }
        current = current.return;
        depth++;
    }

    return triggered;
}

// Find Slate Editor instance from React Fiber tree
function getSlateEditorInstance(inputBox) {
    let fiber = getReactFiber(inputBox);
    let current = fiber;
    let depth = 0;
    while (current && depth < 30) {
        if (current.memoizedProps && current.memoizedProps.editor) {
            return current.memoizedProps.editor;
        }
        if (current.stateNode && current.stateNode.props && current.stateNode.props.editor) {
            return current.stateNode.props.editor;
        }
        current = current.return;
        depth++;
    }
    return null;
}

// Select innermost text node
function selectInnerSlateText(inputBox) {
    let target = inputBox.querySelector('[data-slate-string="true"]') ||
                 inputBox.querySelector('[data-slate-leaf="true"]') ||
                 inputBox.querySelector('[data-slate-node="text"]') ||
                 inputBox.querySelector('p') ||
                 inputBox;

    target.focus && target.focus();

    let textNode = target;
    while (textNode && textNode.nodeType !== Node.TEXT_NODE && textNode.firstChild) {
        textNode = textNode.firstChild;
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();

    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, textNode.nodeValue ? textNode.nodeValue.length : 0);
    } else {
        range.selectNodeContents(target);
    }
    sel.addRange(range);
    return target;
}

// Find the send button
function findSendButton(inputBox) {
    if (!inputBox) {
        inputBox = document.querySelector('[data-slate-editor="true"]') ||
                   document.querySelector('div[role="textbox"][contenteditable="true"]');
    }

    // 1. Local DOM Hierarchy Search (Near input box)
    if (inputBox) {
        let container = inputBox.parentElement;
        for (let i = 0; i < 15; i++) {
            if (!container || container.tagName === 'BODY') break;
            
            let btns = Array.from(container.querySelectorAll('button, [role="button"]'));
            
            for (let btn of btns) {
                if (btn.textContent && btn.textContent.includes('arrow_forward') && btn.textContent.includes('Create')) {
                    return btn;
                }
            }
            
            if (btns.length >= 2) {
               let lastBtn = btns[btns.length - 1];
               if (lastBtn.textContent && lastBtn.textContent.includes('arrow_forward')) {
                   return lastBtn;
               }
            }
            
            container = container.parentElement;
        }
    }

    // 2. Global Search
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

// Realistic mouse & pointer click
async function clickButtonCompletely(btn) {
    if (!btn) return;
    btn.focus && btn.focus();

    const rect = btn.getBoundingClientRect();
    const opts = {
        bubbles: true, cancelable: true, composed: true, view: window,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        button: 0, buttons: 1
    };

    const targetChild = btn.querySelector('i, svg, span') || btn;

    targetChild.dispatchEvent(new PointerEvent('pointerdown', opts));
    targetChild.dispatchEvent(new MouseEvent('mousedown', opts));
    await sleep(40);
    targetChild.dispatchEvent(new PointerEvent('pointerup', opts));
    targetChild.dispatchEvent(new MouseEvent('mouseup', opts));
    targetChild.dispatchEvent(new MouseEvent('click', opts));

    await sleep(40);
    btn.dispatchEvent(new PointerEvent('pointerdown', opts));
    btn.dispatchEvent(new MouseEvent('mousedown', opts));
    await sleep(40);
    btn.dispatchEvent(new PointerEvent('pointerup', opts));
    btn.dispatchEvent(new MouseEvent('mouseup', opts));
    btn.dispatchEvent(new MouseEvent('click', opts));

    await sleep(40);
    try { btn.click(); } catch(e) {}
}

window.addEventListener('message', async function(event) {
    if (event.source !== window || !event.data) return;

    // INJECT PROMPT
    if (event.data.type === 'FLOW_AUTOMATOR_INJECT_PROMPT') {
        const prompt = event.data.prompt;
        try {
            const inputBox = document.querySelector('[data-slate-editor="true"]') ||
                             document.querySelector('div[role="textbox"][contenteditable="true"]');

            if (!inputBox) {
                window.postMessage({ type: 'FLOW_AUTOMATOR_INJECT_ERROR', msg: 'Input box not found' }, '*');
                return;
            }

            // 1. Select ALL text in the entire input box and clear it
            inputBox.focus();
            const sel = window.getSelection();
            sel.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(inputBox);
            sel.addRange(range);
            await sleep(50);
            
            document.execCommand('delete', false, null); // Clear existing text
            await sleep(50);

            // 2. ONLY use Paste event to insert text so Slate internal model updates correctly
            const pasteEvent = new Event('paste', { bubbles: true, cancelable: true, composed: true });
            Object.defineProperty(pasteEvent, 'clipboardData', {
                value: {
                    getData: (type) => type === 'text/plain' ? prompt : '',
                    types: ['text/plain']
                }
            });
            inputBox.dispatchEvent(pasteEvent);
            await sleep(150);
            
            // 3. Fallback: If paste event didn't work (box still empty), try Slate API directly
            if ((inputBox.textContent || '').trim().length === 0) {
                const editor = getSlateEditorInstance(inputBox);
                if (editor && typeof editor.insertText === 'function') {
                    try { editor.insertText(prompt); } catch(e) {}
                }
                await sleep(50);
            }

            const hasText = (inputBox.textContent || '').trim().length > 0;
            window.postMessage({
                type: 'FLOW_AUTOMATOR_INJECT_SUCCESS',
                hasText: hasText
            }, '*');

        } catch(e) {
            window.postMessage({ type: 'FLOW_AUTOMATOR_INJECT_ERROR', msg: e.message }, '*');
        }
    }

    // CLICK SEND
    if (event.data.type === 'FLOW_AUTOMATOR_CLICK_SEND') {
        try {
            const inputBox = document.querySelector('[data-slate-editor="true"]') ||
                             document.querySelector('div[role="textbox"][contenteditable="true"]');
            
            const sendBtn = findSendButton(inputBox);

            if (sendBtn) {
                sendBtn.style.border = '4px solid #00e676';
                sendBtn.style.backgroundColor = '#1b5e20';
                sendBtn.style.transition = 'all 0.3s';
                
                sendBtn.removeAttribute('aria-disabled');
                sendBtn.disabled = false;

                // 1. Direct React Props/Fiber invocation on button and children
                triggerReactHandlers(sendBtn);

                // 2. Realistic Pointer/Mouse Event dispatch & native click
                await clickButtonCompletely(sendBtn);
            }

            // 3. Trigger Enter key on inputBox directly via React props
            if (inputBox) {
                inputBox.focus();
                
                const boxProps = getReactProps(inputBox);
                if (boxProps && typeof boxProps.onKeyDown === 'function') {
                    try {
                        boxProps.onKeyDown({
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            shiftKey: false,
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            nativeEvent: { preventDefault: () => {} }
                        });
                    } catch(e) {}
                }

                const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true, composed: true };
                inputBox.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
                inputBox.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
                inputBox.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
            }

            window.postMessage({ type: 'FLOW_AUTOMATOR_SEND_SUCCESS' }, '*');
        } catch(e) {
            window.postMessage({ type: 'FLOW_AUTOMATOR_SEND_ERROR', msg: e.message }, '*');
        }
    }
});
