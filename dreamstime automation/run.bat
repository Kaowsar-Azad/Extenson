@echo off
title Dreamstime Auto Submit
echo Starting Dreamstime Auto Submit...
cd /d "%~dp0"
.\venv\Scripts\python.exe dreamstime_autosubmit.py
pause
