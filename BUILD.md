# Building SurfView from Source

## Prerequisites

- [Node.js](https://nodejs.org) version 18 or higher
- [npm](https://npmjs.com) (comes with Node.js)
- Git (+Git bash)
- [Tor Expert Bundle](https://torproject.org/download/tor/)
- [NSIS](https://sourceforge.net/projects/nsis/) (required for installers)
- Windows CMD console.

No need to install Chrome or Chromium separately. The build process
downloads a bundled Chromium automatically via Puppeteer.

## Clone the repository

```
git clone https://github.com/flaneurette/SurfView-Browser.git
cd SurfView-Browser
```

- Clean everything first (prevents conflicts)

```Delete: node_modules, package-lock.json, dist/, .electron-builder/```

- Install dependencies exactly as you specified

```npm install puppeteer@^24.39.1 puppeteer-extra@^3.3.6 puppeteer-extra-plugin-stealth@^2.11.2```

- Install electron-nightly as devDependency

```npm install electron-nightly@42.0.0-nightly.20260313 --save-dev```

- Install electron-nightly's native binaries

```node node_modules/electron-nightly/install.js```

- Check installed versions

```npm ls puppeteer electron-nightly```

- Verify electron-nightly installation

```npx electron-nightly --version```

```
Then set:
```

```
In build:
    "electronDist": "node_modules/electron-nightly/dist",
    "electronVersion": "42.0.0-nightly.20260313",
    
In devDependencies:    
"devDependencies": {
    "electron-builder": "^26.8.1",
    "electron-nightly": "^42.0.0-nightly.20260313"
},
```

In `package.json`

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