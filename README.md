# SurfView Browser

A security-focused browser that renders web pages as static images.
No JavaScript executes. No DOM. No exploits. Just pixels.

<img src="https://github.com/flaneurette/SurfView-Browser/blob/main/src/SurfView-UX.png">

Also features a "live mode", if you want to go insecure, like Firefox, Edge or Chrome.

What it genuinely protects against

- JavaScript execution - fully blocked at the Puppeteer level
- XSS, drive-by downloads, malicious iframes - all dead
- CSS-based tracking and fingerprinting - neutered
- Malicious font/media exploits that need a live DOM - gone
- Cookie theft, session hijacking via scripts - not possible

## Ways to Surf

#### 🏄 Run the installer

Download your preferred version from the Releases page and install it.

Windows x64: https://github.com/flaneurette/SurfView-Browser/releases/tag/v1.0-1

Linux coming soon. (Tip: You might want to build from source anyway. It's easy, promised.)

#### 🏄 Build from source

Or roll your own:

See [BUILD.md](BUILD.md)

## How it works

SurfView fetches a URL using a headless Chromium instance with JavaScript
fully disabled. The page is rendered to a PNG screenshot, all links are
extracted from the DOM, and the Chromium process is immediately killed.
The user sees a static image of the page and a sanitized link list.
No script ever runs in your session.

## Security

It's trivially auditable. Anyone who wants to verify the security claim, can read the ~500 lines in `src/*.js` and either agrees, or finds a bug. No 35 million line Chromium codebase to wade through.

If you do find a bug, please open a issue. Let's have a look.

## Limitations

Where the real risk still is:

The Chromium parser itself. Even with JS disabled, Chromium still has to parse HTML, CSS, and render images. Every one of those parsers has had CVEs. 
A maliciously crafted PNG or CSS file could theoretically exploit the renderer process before the screenshot is even taken. This is the honest weak point.

How much does that matter?

Chromium's renderer already runs in a sandbox. If it gets exploited, the attacker is inside a sandboxed process that we then immediately kill. 
They'd need a sandbox escape on top of the parser exploit to reach your system. That's a much harder attack chain than today's typical JS exploit.

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
