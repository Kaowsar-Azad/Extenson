@echo off
echo ==========================================
echo Auto Zip Individual Images
echo ==========================================
echo.

setlocal enabledelayedexpansion

REM Count jpg files
set count=0
for %%F in (*.jpg) do (
    set /a count+=1
)

if %count%==0 (
    echo No JPG images found in this folder!
    echo Please put this script in the folder with your images.
    pause
    exit /b
)

echo Found %count% images. Starting to zip...
echo.

REM Loop through each JPG and zip it
for %%I in (*.jpg) do (
    echo Zipping: %%I
    powershell -NoProfile -Command "Compress-Archive -LiteralPath '%%~nxI' -DestinationPath '%%~nI.zip' -Force"
)

echo.
echo ==========================================
echo All %count% images have been successfully zipped!
echo ==========================================
pause
