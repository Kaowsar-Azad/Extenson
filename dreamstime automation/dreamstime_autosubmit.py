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

CHECK_AND_CLICK_JS = '''() => {
    // 1. Check if submission is actively in progress
    const bodyText = document.body.innerText.toLowerCase();
    const isVerifying = bodyText.includes("verifying data for submission");
    const isSubmitting = bodyText.includes("submitting image");
    const progressEl = document.querySelector('.popup__progress, .form-submitting, .loading-spinner');
    
    if (isVerifying || isSubmitting || (progressEl && progressEl.offsetParent !== null)) {
        return { status: "in_progress", message: "Dreamstime is processing submission..." };
    }

    // 2. Check for visible form validation errors on the page
    const errorEls = Array.from(document.querySelectorAll('.error-message, .form-error, .alert-danger, [class*="form-message--error"]'))
                         .filter(el => el.offsetParent !== null && el.innerText.trim());
    if (errorEls.length > 0) {
        const errText = errorEls.map(e => e.innerText.trim()).join(' | ');
        return { status: "error", message: errText };
    }

    // 3. Locate the real submit button
    let btn = document.getElementById('submitbutton');
    if (!btn) {
        const candidates = document.querySelectorAll('a.btn, button, input[type="submit"]');
        for (const el of candidates) {
            if (el.disabled) continue;
            if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
            if (el.closest('nav') || el.closest('header') || el.closest('.header') || el.closest('#header')) continue;

            const text = (el.value || el.innerText || "").trim().toLowerCase();
            if (text.includes("submit") && !text.includes("files")) {
                btn = el;
                break;
            }
        }
    }

    if (btn) {
        // Single, clean, gentle click - exactly like a human click
        try {
            btn.scrollIntoView({ behavior: 'auto', block: 'center' });
        } catch (e) {}
        btn.click();
        
        const btnText = (btn.value || btn.innerText || "").trim() || "Submit commercial";
        return { status: "clicked", text: btnText };
    }

    return { status: "no_button", message: "Submit button not found yet" };
}'''

async def run_autosubmit():
    print("=" * 65)
    print("   Dreamstime Auto-Submit (Accurate, Safe & Real-Time Verified)")
    print("=" * 65)
    print("Connecting to Chrome on port 9222...")

    async with async_playwright() as p:
        try:
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
        confirmed_submitted_count = 0
        last_status_display = ""

        while True:
            # Gentle, realistic 0.5s polling to avoid freezing the browser thread
            await asyncio.sleep(0.5)
            
            try:
                page = get_dreamstime_page(context)
                if not page:
                    continue

                url = page.url
                file_id = extract_file_id(url)

                if file_id:
                    now = time.time()

                    # DETECT REAL SUBMISSION: ID changed!
                    if file_id != current_file_id:
                        if current_file_id is not None:
                            # Only confirm submission when the ID actually changed from a previous ID
                            confirmed_submitted_count += 1
                            time_str = datetime.datetime.now().strftime("%H:%M:%S")
                            print(f"[{time_str}] [ID: {current_file_id}] Successfully submitted! (Confirmed Total: {confirmed_submitted_count})")
                        
                        current_file_id = file_id
                        last_click_time = 0.0
                        click_attempts = 0

                    # Decide if click is needed:
                    # - If never clicked for this ID (last_click_time == 0)
                    # - OR if 6 seconds have passed without redirect and without progress (Gentle Retry)
                    should_click = (last_click_time == 0.0) or (now - last_click_time >= 6.0)

                    if should_click:
                        try:
                            result = await page.evaluate(CHECK_AND_CLICK_JS)
                        except Exception:
                            # Page is in mid-navigation/reloading
                            await asyncio.sleep(0.5)
                            continue

                        if result:
                            res_status = result.get("status")

                            if res_status == "in_progress":
                                # Server is actively saving/verifying, wait gently
                                last_click_time = now
                                status = f"[{file_id}] Server is processing submission... Please wait."
                                if status != last_status_display:
                                    print(f"{status:<65}", end="\r", flush=True)
                                    last_status_display = status

                            elif res_status == "error":
                                # Form has real validation errors!
                                err_msg = result.get("message", "Validation error")
                                print(f"\n[Warning] [ID: {file_id}] Error on form: {err_msg}")
                                print(f"[{file_id}] Please check or fix the field in browser. Pausing 5s...")
                                await asyncio.sleep(5.0)

                            elif res_status == "clicked":
                                click_attempts += 1
                                last_click_time = now
                                time_str = datetime.datetime.now().strftime("%H:%M:%S")
                                btn_name = result.get("text", "Submit")

                                if click_attempts == 1:
                                    print(f"[{time_str}] [ID: {file_id}] Clicked '{btn_name}'. Waiting for server confirmation...")
                                else:
                                    print(f"[{time_str}] [ID: {file_id}] Still on page. Gently retrying click (Attempt {click_attempts})...", end="\r", flush=True)

                                last_status_display = f"waiting_{file_id}"

                            else:
                                status = f"[{file_id}] Waiting for Submit button to be ready..."
                                if status != last_status_display:
                                    print(f"{status:<65}", end="\r", flush=True)
                                    last_status_display = status
                else:
                    # No edit<ID> in URL currently
                    if url and "unfinished" in url.lower() and confirmed_submitted_count > 0:
                        status = f"All files completed! (Confirmed submitted: {confirmed_submitted_count})"
                    else:
                        display_url = url[:45] if url else "loading..."
                        status = f"Waiting for edit page... ({display_url})"
                    
                    if status != last_status_display:
                        print(f"{status:<65}", end="\r", flush=True)
                        last_status_display = status

            except Exception as e:
                err_str = str(e)
                if "Execution context was destroyed" not in err_str and "Target closed" not in err_str:
                    pass

if __name__ == "__main__":
    asyncio.run(run_autosubmit())
