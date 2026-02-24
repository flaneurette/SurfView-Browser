# Building SurfView from Source

## Prerequisites

- [Node.js](https://nodejs.org) version 18 or higher
- [npm](https://npmjs.com) (comes with Node.js)
- Git
- [NSIS](https://sourceforge.net/projects/nsis/files/NSIS%203/3.11/nsis-3.11-setup.exe/download?use_mirror=altushost-swe&download) (required for installers)

No need to install Chrome or Chromium separately. The build process
downloads a bundled Chromium automatically via Puppeteer.

## Clone the repository

```
git clone https://github.com/flaneurette/SurfView-Browser.git
cd SurfView-Browser
```

## Install dependencies

```
npm install
```

This will take a few minutes on first run as it downloads Electron and
a bundled Chromium binary (~300MB total).

## Run in development

```
npm start
```

The app will launch immediately. No additional configuration needed.

## Build an installer

### Windows (produces a .exe NSIS installer)

```
npm run build-win
```

### macOS (produces a .dmg)

```
npm run build-mac
```

### Linux (produces an .AppImage)

```
npm run build-linux
```

Output is placed in the `dist/` folder.

## Project structure

```
SurfView-Browser/
  src/
    main.js       - Electron main process. Puppeteer rendering pipeline lives here.
    preload.js    - Narrow IPC bridge between main and renderer.
    index.html    - App shell. Renderer entry point.
    renderer.js   - All UI logic. No direct network access.
  package.json
  README.md
  BUILD.md
```

## How the security model works

- The renderer process is fully sandboxed (contextIsolation, sandbox: true)
- All network access happens exclusively in the main process via Puppeteer
- JavaScript is disabled in Puppeteer before the page loads
- Script, XHR, fetch, and WebSocket requests are blocked at the network level
- Each page load spawns a fresh Chromium process that is killed after capture
- The renderer only ever receives a PNG buffer and a structured link list
- javascript: href schemes are dropped during link extraction

## Troubleshooting

**App launches but pages fail to render**
Make sure npm install completed successfully and the Puppeteer Chromium
download finished without errors. Try deleting node_modules and running
npm install again.

**Build fails on Windows**
Make sure you are running the terminal as a normal user, not as Administrator.
electron-builder can behave unexpectedly with elevated permissions.

**Build fails on macOS with code signing errors**
For local/unsigned builds, set the following before building:

```
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build-mac
```