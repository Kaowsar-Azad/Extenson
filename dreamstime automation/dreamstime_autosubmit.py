import asyncio
import re
import time
import datetime
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright

def get_dreamstime_page(context):
    """Find the tab with Dreamstime edit page, or any Dreamstime tab."""
    for page in context.pages:
        try:
            u = page.url
            if u and "dreamstime.com/upload/edit" in u:
                return page
        except Exception:
            pass
    for page in context.pages:
        try:
            u = page.url
            if u and "dreamstime.com" in u:
                return page
        except Exception:
            pass
    for page in context.pages:
        try:
            u = page.url
            if u and not u.startswith("chrome://"):
                return page
        except Exception:
            pass
    return context.pages[0] if context.pages else None

def extract_file_id(url: str):
    """Extract file ID from Dreamstime edit URL, e.g. /upload/edit474928681 -> 474928681"""
    if not url:
        return None
    match = re.search(r'edit/?(\d+)', url, re.IGNORECASE)
    if match:
        return match.group(1)
    match = re.search(r'[?&](?:itemid|id|fileid)=(\d+)', url, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

CLICK_SUBMIT_JS = '''() => {
    // 1. Check if Dreamstime is actively submitting / verifying
    const bodyText = document.body.innerText.toLowerCase();
    if (bodyText.includes("verifying data") || bodyText.includes("submitting image")) {
        return { clicked: false, inProgress: true, text: "Submitting..." };
    }

    // 2. Direct fast lookup by ID
    let btn = document.getElementById('submitbutton');
    
    // 3. Fast fallback if ID changed
    if (!btn) {
        const candidates = document.querySelectorAll('input[type="submit"], button, input[type="button"], a.btn, a');
        for (const el of candidates) {
            if (el.disabled) continue;
            if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
            if (el.closest('nav') || el.closest('header') || el.closest('.header') || el.closest('#header')) continue;

            const text = (el.value || el.innerText || el.textContent || "").trim().toLowerCase();
            if (text.includes("submit") && !text.includes("files")) {
                btn = el;
                break;
            }
        }
    }
    
    if (btn) {
        try {
            btn.scrollIntoView({ behavior: 'auto', block: 'center' });
        } catch (e) {}
        
        // Dispatch full mouse event sequence for jQuery event delegation
        try {
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        } catch(e) {}

        btn.click();
        const text = (btn.value || btn.innerText || btn.textContent || "").trim();
        return { clicked: true, inProgress: false, text: text || "Submit" };
    }
    return { clicked: false, inProgress: false, text: null };
}'''

async def run_autosubmit():
    print("=" * 60)
    print("   Dreamstime Auto-Submit (Auto-Retry & Never-Stuck)")
    print("=" * 60)
    print("Connecting to Chrome on port 9222...")

    async with async_playwright() as p:
        try:
            # Connect to manually launched developer Chrome
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            context = browser.contexts[0]
            
            if not context.pages:
                print("No open tabs found in Chrome.")
                return
                
            print("Connected successfully!")
            print("Monitoring Dreamstime upload pages...\n")
        except Exception as e:
            print(f"Failed to connect: {e}")
            print("Make sure Chrome was started with: --remote-debugging-port=9222")
            return

        current_file_id = None
        last_click_time = 0.0
        click_attempts = 0
        submitted_count = 0
        last_status_msg = ""

        while True:
            # Fast polling
            await asyncio.sleep(0.2)
            
            try:
                page = get_dreamstime_page(context)
                if not page:
                    continue

                url = page.url
                file_id = extract_file_id(url)

                if file_id:
                    now = time.time()

                    # Check if a new file ID arrived
                    if file_id != current_file_id:
                        if current_file_id is not None:
                            submitted_count += 1
                        current_file_id = file_id
                        last_click_time = 0.0
                        click_attempts = 0

                    # Decide if we should click:
                    # 1. Not clicked yet (last_click_time == 0)
                    # 2. Or 3.5 seconds passed and still on same page (Auto-Retry!)
                    should_click = (last_click_time == 0.0) or (now - last_click_time >= 3.5)

                    if should_click:
                        try:
                            result = await asyncio.wait_for(page.evaluate(CLICK_SUBMIT_JS), timeout=3.0)
                        except asyncio.TimeoutError:
                            result = None
                            print(f"\n[Notice] Chrome is unresponsive/minimized. Check start_chrome.bat.")
                            await asyncio.sleep(1.0)
                            continue
                        
                        if result:
                            if result.get("inProgress"):
                                # Dreamstime is actively submitting/verifying, give it 3 more seconds
                                last_click_time = now
                                status = f"[{file_id}] Submission in progress on Dreamstime..."
                                if status != last_status_msg:
                                    print(f"{status:<60}", end="\r", flush=True)
                                    last_status_msg = status
                            elif result.get("clicked"):
                                click_attempts += 1
                                last_click_time = now
                                time_str = datetime.datetime.now().strftime("%H:%M:%S")
                                btn_text = result.get("text") or "Submit"

                                if click_attempts == 1:
                                    print(f"[{time_str}] [ID: {file_id}] Clicked '{btn_text}'! (Total Submitted: {submitted_count + 1})")
                                else:
                                    print(f"\n[{time_str}] [ID: {file_id}] Still on page. Auto-retried '{btn_text}' (Attempt {click_attempts})...")

                                last_status_msg = f"waiting_{file_id}"
                            else:
                                status = f"[{file_id}] Waiting for Submit button to appear..."
                                if status != last_status_msg:
                                    print(f"{status:<60}", end="\r", flush=True)
                                    last_status_msg = status
                else:
                    # No edit<ID> in URL currently
                    if url and "unfinished" in url.lower() and submitted_count > 0:
                        status = f"All files completed! (Total submitted: {submitted_count})"
                    else:
                        display_url = url[:50] if url else "loading..."
                        status = f"Waiting for edit page... (URL: {display_url}...)"
                    
                    if status != last_status_msg:
                        print(f"{status:<60}", end="\r", flush=True)
                        last_status_msg = status

            except Exception as e:
                err_str = str(e)
                if "Execution context was destroyed" not in err_str and "Target closed" not in err_str:
                    pass

if __name__ == "__main__":
    asyncio.run(run_autosubmit())
