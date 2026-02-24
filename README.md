# SurfView Browser

A security-focused browser that renders web pages as static images.
No JavaScript executes. No DOM. No exploits. Just pixels. Features a "live mode", if you want to go **insecure**, like Firefox, Edge or Chrome.

<img src="https://github.com/flaneurette/SurfView-Browser/blob/main/src/SurfView-UX.png">


## Ways to Surf

#### 🏄 Run the installer

Download your preferred version from the Releases page and install it.

#### 🏄 Build from source

Or roll your own:

See [BUILD.md](BUILD.md)

## How it works

SurfView fetches a URL using a headless Chromium instance with JavaScript
fully disabled. The page is rendered to a PNG screenshot, all links are
extracted from the DOM, and the Chromium process is immediately killed.
The user sees a static image of the page and a sanitized link list.
No script ever runs in your session.

## Motivation

After seeing another 50+ security patches land in Firefox and Chrome -
as happens every few weeks, and has for two decades - it became clear
that patching an execution engine forever is not a sustainable security
model. SurfView takes a different approach: remove execution entirely.

## Credits

Created with [Claude AI](https://claude.ai)

Built on [Node.js](https://nodejs.org) / [npm](https://npmjs.com) /
[Electron](https://electronjs.org) / [Puppeteer](https://pptr.dev)

## License
MIT
