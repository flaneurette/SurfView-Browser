@echo off
setlocal enabledelayedexpansion

:: Define paths (using %USERPROFILE% for flexibility)
set "TOR_DATA_FOLDER=%USERPROFILE%\Desktop\Git\SurfView-Browser\src\tor\tor-data"
set "TOR_DATA_FOLDER2=%USERPROFILE%\Desktop\Git\SurfView-Browser\node_modules\electron-nightly\dist\resources\tor\tor-data"
set "DIST=%USERPROFILE%\Desktop\Git\SurfView-Browser\dist"
set "PROJECT_DIR=%USERPROFILE%\Desktop\Git\SurfView-Browser"

:: Check if TOR_DATA_FOLDER exists
if not exist "%TOR_DATA_FOLDER%\" (
    echo Error: Folder does not exist: "%TOR_DATA_FOLDER%"
    pause
    exit /b 1
)

:: Empty the tor folder (force delete all files and subfolders)
echo Emptying folder: "%TOR_DATA_FOLDER%"
del /q /f "%TOR_DATA_FOLDER%\*" 2>nul
for /d %%x in ("%TOR_DATA_FOLDER%\*") do rd /s /q "%%x" 2>nul

:: Empty the tor 2 folder (force delete all files and subfolders)
echo Emptying folder: "%TOR_DATA_FOLDER2%"
del /q /f "%TOR_DATA_FOLDER2%\*" 2>nul
for /d %%x in ("%TOR_DATA_FOLDER2%\*") do rd /s /q "%%x" 2>nul

:: Empty the /dist/ folder (force delete all files and subfolders)
echo Emptying folder: "%DIST%"
del /q /f "%DIST%\*" 2>nul
for /d %%x in ("%DIST%\*") do rd /s /q "%%x" 2>nul

:: Check if PROJECT_DIR exists
if not exist "%PROJECT_DIR%\" (
    echo Error: Project directory does not exist: "%PROJECT_DIR%"
    pause
    exit /b 1
)

:: Navigate to the project directory
cd /d "%PROJECT_DIR%" || (
    echo Error: Failed to change directory to "%PROJECT_DIR%"
    pause
    exit /b 1
)

:: Run npm build and capture output
echo Running build command: npm run build-win
call npm run build-win || (
    echo Error: Build failed. Check npm logs.
    pause
    exit /b 1
)

echo Build completed successfully.
pause
