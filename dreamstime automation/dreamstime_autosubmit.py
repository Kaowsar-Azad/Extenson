import asyncio
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright

async def run_autosubmit():
    async with async_playwright() as p:
        # ব্রাউজার ওপেন করা হচ্ছে (headless=False থাকায় আপনি স্ক্রিনে দেখতে পারবেন)
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        print("Dreamstime ওপেন করা হচ্ছে...")
        await page.goto("https://www.dreamstime.com/login.php")
        
        print("দয়া করে আপনার ইউজারনেম এবং পাসওয়ার্ড দিয়ে ম্যানুয়ালি লগইন করুন...")
        
        # ইউজার লগইন না করা পর্যন্ত স্ক্রিপ্টটি অপেক্ষা করবে (সর্বোচ্চ ১২০ সেকেন্ড)
        login_successful = False
        for _ in range(120):
            try:
                # যদি URL-এ আর 'login.php' না থাকে, তবে বুঝতে হবে লগইন সফল হয়েছে
                if "login.php" not in page.url:
                    print("লগইন সফলভাবে সনাক্ত করা হয়েছে!")
                    login_successful = True
                    break
            except Exception:
                # ব্রাউজার বন্ধ করে দিলে যেন স্ক্রিপ্টটি ক্রাশ না করে
                break
            await page.wait_for_timeout(1000)
        
        if not login_successful:
            print("নির্ধারিত সময়ে লগইন করা হয়নি। স্ক্রিপ্টটি বন্ধ করা হচ্ছে।")
            await browser.close()
            return

        print("Unfinished files পেজে যাওয়া হচ্ছে...")
        try:
            await page.goto("https://www.dreamstime.com/unfinished.php")
            await page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"পেজ লোড করতে সমস্যা হয়েছে: {e}")
            await browser.close()
            return

        while True:
            await page.wait_for_timeout(3000) # পেজ লোড হওয়ার জন্য অপেক্ষা
            
            # পেজের সব "Submit" বাটন খোঁজা হচ্ছে
            submit_buttons = await page.locator("input[value='Submit'], button:has-text('Submit'), a:has-text('Submit')").all()
            
            if not submit_buttons:
                print("কোনো Submit বাটন পাওয়া যায়নি! হয়তো সব ফাইল সাবমিট হয়ে গেছে অথবা পেজ পরিবর্তন করতে হবে।")
                break
                
            print(f"এই পেজে {len(submit_buttons)} টি ফাইল সাবমিট করার জন্য পাওয়া গেছে।")
            
            try:
                # যদি ক্যাটাগরি সিলেক্ট করা না থাকে তবে এখানে কোড যোগ করতে হতে পারে
                # উদাহরণ: await page.locator('select.category-dropdown').first.select_option(index=1)
                
                print("একটি ফাইল সাবমিট করা হচ্ছে...")
                # প্রথম সাবমিট বাটনটিতে ক্লিক করা হচ্ছে
                await submit_buttons[0].click()
                
                # সাবমিট হওয়ার পর পেজ রিলোড বা আপডেট হওয়ার জন্য অপেক্ষা
                await page.wait_for_timeout(5000) 
                
            except Exception as e:
                print(f"সাবমিট করার সময় একটি সমস্যা হয়েছে: {e}")
                break

        print("অটো-সাবমিট প্রসেস শেষ হয়েছে।")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_autosubmit())
