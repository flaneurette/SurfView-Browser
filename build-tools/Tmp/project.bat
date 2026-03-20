from pathlib import Path

batch_content = r"""@echo off
title SurfView Browser
cd /d %USERPROFILE%\Desktop\Git\SurfView-Browser
npm start
cmd /k
"""

Path("/workspace/project.bat").write_text(batch_content)