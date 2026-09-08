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

    // 4. Find the real submit button
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
    print("   Dreamstime Auto-Submit (Accurate, Safe & Real-Time Verified)")
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
                                    "clicked": False,
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
                            # If we previously clicked submit for the old ID and the ID has now changed, that's a verified success!
                            if state["current_file_id"] is not None and state["clicked"]:
                                total_confirmed_submitted += 1
                                time_str = datetime.datetime.now().strftime("%H:%M:%S")
                                print(f"\n[{time_str}] [ID: {state['current_file_id']}] Successfully submitted! (Confirmed Total: {total_confirmed_submitted})")

                            state["current_file_id"] = file_id
                            state["clicked"] = False
                            state["last_action_time"] = 0.0
                            state["attempts"] = 0
                            last_global_status = ""

                        # Decide if we need to click or check status:
                        # - Not clicked yet (state["clicked"] == False)
                        # - OR 6 seconds elapsed since click and still on the same ID (auto-retry)
                        should_act = (not state["clicked"]) or (now - state["last_action_time"] >= 6.0)

                        if should_act:
                            try:
                                result = await page.evaluate(CHECK_AND_SUBMIT_JS)
                            except Exception:
                                continue

                            if result:
                                res_status = result.get("status")

                                if res_status == "clicked":
                                    state["clicked"] = True
                                    state["last_action_time"] = now
                                    state["attempts"] += 1
                                    time_str = datetime.datetime.now().strftime("%H:%M:%S")
                                    btn_name = result.get("text", "Submit")

                                    if state["attempts"] == 1:
                                        print(f"\n[{time_str}] [ID: {file_id}] Clicked '{btn_name}'. Processing submission...")
                                    else:
                                        status = f"[{time_str}] [ID: {file_id}] Still on page. Retrying click (Attempt {state['attempts']})..."
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

                                else:  # no_button
                                    state["last_action_time"] = now
                                    status = f"[{file_id}] Waiting for Submit button..."
                                    if status != last_global_status:
                                        print(f"{status:<65}", end="\r", flush=True)
                                        last_global_status = status
                    else:
                        if "unfinished" in url.lower() and total_confirmed_submitted > 0:
                            status = f"All files completed! (Confirmed Total: {total_confirmed_submitted})"
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
