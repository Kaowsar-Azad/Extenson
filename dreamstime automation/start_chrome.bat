@echo off
title Start Chrome (Background Enabled)
echo =======================================================
echo   Starting Chrome with Background Execution Enabled
echo =======================================================
echo.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome_dev_profile" --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-features=CalculateNativeWinOcclusion "https://www.dreamstime.com/unfinished.php"

echo Chrome has been launched successfully!
echo * Profile preserved in: C:\chrome_dev_profile
echo * Background and Minimize freeze are completely disabled!
echo.
pause
