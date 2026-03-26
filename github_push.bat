@echo off
REM GitHub Push Script
REM Run this script after manually setting up the repository

cd /d "%~dp0"

echo Adding GitHub remote...
git remote add origin https://github.com/GCE20250623/fullstack-nestjs-template.git

echo Pushing to GitHub...
git push -u origin master

echo Done!
pause
