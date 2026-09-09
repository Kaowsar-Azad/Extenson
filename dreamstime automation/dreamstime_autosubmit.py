import asyncio
import re
import time
import datetime
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright

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

CHECK_AND_SUBMIT_JS = '''() => {
    // 1. Check if Dreamstime is actively loading the next image via its AJAX loader
    const ml = document.getElementById('js-mainloader');
    if (ml && ml.dataset.state === 'loading') {
        return { status: "loading", message: "Loading next image..." };
    }

    // 2. Check if actively verifying data or submitting image
    const sm = document.querySelector('#js-submit-message p');
    if (sm && sm.innerText.trim()) {
        return { status: "submitting", message: sm.innerText.trim() };
    }

    // 3. Check for submission failure / validation error messages
    const sf = document.querySelector('#js-submit-message-fail p');
    if (sf && sf.innerText.trim()) {
        return { status: "error", message: sf.innerText.trim() };
    }

    // 4. Infallible detection for Title and Description
    function getFormData() {
        const textareas = Array.from(document.querySelectorAll('textarea')).filter(t => t.offsetParent !== null);
        const textInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
            .filter(i => i.offsetParent !== null && !i.closest('nav, header, #header, #navigation, .header, .search-bar, [role="navigation"]'));

        let descEl = document.querySelector('textarea[name*="desc" i], textarea#description, textarea#media_description, textarea#image_description');
        if (!descEl && textareas.length > 0) {
            descEl = textareas[0];
        }

        let titleEl = document.querySelector('input[name="title"], input#title, input[name="media_title"], input#media_title, input[name="image_title"], input#image_title, input[name*="title" i]');
        if (!titleEl && textInputs.length > 0) {
            const byLabel = textInputs.find(inp => {
                const prev = inp.previousElementSibling;
                if (prev && /title/i.test(prev.textContent || '')) return true;
                const parent = inp.parentElement;
                if (parent && /title/i.test(parent.textContent || '')) return true;
                return false;
            });
            titleEl = byLabel || textInputs[0];
        }

        const titleVal = titleEl ? (titleEl.value || '').trim() : '';
        const descVal = descEl ? (descEl.value || '').trim() : '';

        return { titleEl, descEl, titleVal, descVal };
    }

    const { titleEl, descEl, titleVal, descVal } = getFormData();
    const hasTitle = titleVal.length > 0;
    const hasDesc = descVal.length > 0;

    // IF EITHER TITLE OR DESCRIPTION IS EMPTY -> MUST SKIP, NEVER SUBMIT!
    if (!hasTitle || !hasDesc) {
        const nextBtn = document.getElementById('js-next-submit') || 
                        document.querySelector('a.popup-nav__btn--next, .popup-nav__btn--next');
        if (nextBtn && nextBtn.offsetParent !== null && !nextBtn.classList.contains('disabled')) {
            try { nextBtn.click(); } catch(e) {}
            return { 
                status: "skipped", 
                message: "Title or Description missing. Clicked Skip (Next) button.",
                titleMissing: !hasTitle,
                descMissing: !hasDesc
            };
        }
        return { status: "missing_meta_no_next", message: "Title or Description missing, but Next button unavailable." };
    }

    // 5. Both Title and Description are present -> Find the real submit button
    let btn = document.getElementById('submitbutton');
    if (!btn) {
        // Fallback for custom or varied submit buttons
        const candidates = document.querySelectorAll('a.btn, button, input[type="submit"]');
        for (const el of candidates) {
            if (el.disabled) continue;
            if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
            if (el.closest('nav') || el.closest('header')) continue;
            const text = (el.value || el.innerText || el.textContent || "").trim().toLowerCase();
            if (text.includes("submit") && !text.includes("files")) {
                btn = el;
                break;
            }
        }
    }

    if (btn && btn.offsetParent !== null && !btn.disabled) {
        btn.click();
        const btnText = (btn.value || btn.innerText || btn.textContent || "").trim() || "Submit";
        return { status: "clicked", text: btnText };
    }

    return { status: "no_button", message: "Submit button not found yet" };
}'''

async def run_autosubmit():
    print("=" * 65)
    print("   Dreamstime Auto-Submit & Smart Skip (Real-Time Verified)")
    print("=" * 65)
    print("Connecting to Chrome on port 9222...")

    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            context = browser.contexts[0]
            print("Connected successfully!")
            print("Monitoring Dreamstime upload tabs...\n")
        except Exception as e:
            print(f"Failed to connect: {e}")
            print("Make sure Chrome was started with: --remote-debugging-port=9222")
            return

        page_states = {}
        total_confirmed_submitted = 0
        total_skipped = 0
        last_global_status = ""

        while True:
            await asyncio.sleep(0.5)

            try:
                active_dreamstime_pages = []
                for page in context.pages:
                    try:
                        u = page.url
                        if u and ("dreamstime.com/upload/edit" in u or "dreamstime.com/upload" in u):
                            active_dreamstime_pages.append(page)
                            if page not in page_states:
                                page_states[page] = {
                                    "current_file_id": None,
                                    "last_action": None,  # "submitted" or "skipped"
                                    "last_action_time": 0.0,
                                    "attempts": 0
                                }
                    except Exception:
                        pass

                closed_pages = [p for p in page_states if p not in context.pages]
                for p in closed_pages:
                    del page_states[p]

                if not active_dreamstime_pages:
                    status = "Waiting for Dreamstime upload page to open..."
                    if status != last_global_status:
                        print(f"{status:<65}", end="\r", flush=True)
                        last_global_status = status
                    continue

                for page in active_dreamstime_pages:
                    state = page_states[page]

                    try:
                        url = page.url
                    except Exception:
                        continue

                    file_id = extract_file_id(url)
                    now = time.time()

                    if file_id:
                        # New ID arrived on this page!
                        if file_id != state["current_file_id"]:
                            time_str = datetime.datetime.now().strftime("%H:%M:%S")
                            if state["current_file_id"] is not None and state["last_action"] == "submitted":
                                total_confirmed_submitted += 1
                                print(f"\n[{time_str}] [ID: {state['current_file_id']}] Successfully submitted! (Confirmed Total: {total_confirmed_submitted})")
                            elif state["current_file_id"] is not None and state["last_action"] == "skipped":
                                total_skipped += 1
                                print(f"\n[{time_str}] [ID: {state['current_file_id']}] Skipped to next file. (Total Skipped: {total_skipped})")

                            state["current_file_id"] = file_id
                            state["last_action"] = None
                            state["last_action_time"] = 0.0
                            state["attempts"] = 0
                            last_global_status = ""

                        # Decide if we need to act:
                        # - Not acted yet (state["last_action"] is None)
                        # - OR 6 seconds elapsed since last action and still on the same ID (auto-retry)
                        should_act = (state["last_action"] is None) or (now - state["last_action_time"] >= 6.0)

                        if should_act:
                            try:
                                result = await page.evaluate(CHECK_AND_SUBMIT_JS)
                            except Exception:
                                continue

                            if result:
                                res_status = result.get("status")

                                if res_status == "clicked":
                                    state["last_action"] = "submitted"
                                    state["last_action_time"] = now
                                    state["attempts"] += 1
                                    time_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    btn_name = result.get("text", "Submit")

                                    if state["attempts"] == 1:
                                        print(f"\n[{time_str}] [ID: {file_id}] Title & Description present. Clicked '{btn_name}'. Processing submission...")
                                    else:
                                        status = f"[{time_str}] [ID: {file_id}] Still on page. Retrying click (Attempt {state['attempts']})..."
                                        if status != last_global_status:
                                            print(f"{status:<65}", end="\r", flush=True)
                                            last_global_status = status

                                elif res_status == "skipped":
                                    state["last_action"] = "skipped"
                                    state["last_action_time"] = now
                                    state["attempts"] += 1
                                    time_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    t_miss = result.get("titleMissing", False)
                                    d_miss = result.get("descMissing", False)
                                    reason = []
                                    if t_miss: reason.append("Title")
                                    if d_miss: reason.append("Description")
                                    reason_str = " & ".join(reason) if reason else "Title/Description"

                                    if state["attempts"] == 1:
                                        print(f"\n[{time_str}] [ID: {file_id}] ⏭ Missing {reason_str} -> Clicked Next (Skip) button.")
                                    else:
                                        status = f"[{time_str}] [ID: {file_id}] Waiting for next image after skip (Attempt {state['attempts']})..."
                                        if status != last_global_status:
                                            print(f"{status:<65}", end="\r", flush=True)
                                            last_global_status = status

                                elif res_status in ("submitting", "loading"):
                                    state["last_action_time"] = now
                                    msg = result.get("message", "Processing...")
                                    status = f"[{file_id}] {msg}"
                                    if status != last_global_status:
                                        print(f"{status:<65}", end="\r", flush=True)
                                        last_global_status = status

                                elif res_status == "error":
                                    err_msg = result.get("message", "Validation error")
                                    print(f"\n[Warning] [ID: {file_id}] Form Error: {err_msg}")
                                    print(f"[{file_id}] Please resolve the issue in your browser. Pausing 8s...")
                                    state["last_action_time"] = now + 4.0
                                    last_global_status = ""

                                elif res_status == "missing_meta_no_next":
                                    state["last_action_time"] = now + 3.0
                                    status = f"[{file_id}] Title/Description missing, but Next button not available."
                                    if status != last_global_status:
                                        print(f"{status:<65}", end="\r", flush=True)
                                        last_global_status = status

                                else:  # no_button
                                    state["last_action_time"] = now
                                    status = f"[{file_id}] Waiting for Submit or Next button..."
                                    if status != last_global_status:
                                        print(f"{status:<65}", end="\r", flush=True)
                                        last_global_status = status
                    else:
                        if "unfinished" in url.lower() and (total_confirmed_submitted > 0 or total_skipped > 0):
                            status = f"All files completed! (Submitted: {total_confirmed_submitted}, Skipped: {total_skipped})"
                        else:
                            display_url = url[:45] if url else "loading..."
                            status = f"Waiting for edit page... ({display_url})"

                        if status != last_global_status:
                            print(f"{status:<65}", end="\r", flush=True)
                            last_global_status = status

            except Exception as e:
                err_str = str(e)
                if "Execution context was destroyed" not in err_str and "Target closed" not in err_str:
                    pass

if __name__ == "__main__":
    asyncio.run(run_autosubmit())
