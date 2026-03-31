@echo off
setlocal enabledelayedexpansion

cd /d %USERPROFILE%\Desktop\Git\SurfView-Browser
npm start
cmd /k
"""
pause
Path("/workspace/project.bat").write_text(batch_content)