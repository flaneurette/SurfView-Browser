# SurfView Browser

A security-focused browser that renders web pages as static images.
No JavaScript executes. No DOM. No exploits. Just pixels.

It does three things very well:

- Spawns a ephemeral process 
- Renders a website as a static image.
- Generates a sidebar with sanitized page links.

<img src="https://github.com/flaneurette/SurfView-Browser/blob/main/src/SurfView-UX.png">

It also features a "live mode" toggle, if you want to go insecure, like Firefox, Edge or Chrome.

SurfView uses 2 sandboxes, and incognito mode for extra security.

What it genuinely protects against

- JavaScript execution - fully blocked at the Puppeteer level
- XSS, XSRF, 3rd party content, drive-by downloads, malicious iframes - all dead
- CSS-based tracking and fingerprinting - neutered
- Malicious font/media exploits that need a live DOM - gone
- Cookie theft, session hijacking via scripts - not possible

## Ways to Surf

#### 🏄 Run the installer

Download your preferred version from the Releases page and install it.

#### v1.2-0 SurfView - Duck Dive

[Windows x64 executable](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.2-6/SurfView.Setup.1.2.6.exe)

[Windows x64 portable (with source)](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.2-6/SurfView-1.2.6-win.zip)

Linux: coming soon. (Tip: You might want to build from source anyway. It's easy, promised.)

#### 🏄 Build from source

Or roll your own:

See [BUILD.md](BUILD.md)

## How it works

SurfView fetches a URL using a headless Chromium instance with JavaScript
fully disabled. The page is rendered to a PNG screenshot, all links are
extracted from the DOM, and the Chromium process is immediately closed.
The user sees a static image of the page and a sanitized link list.
No script ever runs in your session. 

## Security

It's trivially auditable. Anyone who wants to verify the security claim, can read the ~500 lines in `src/*.js` and either agrees, or finds a bug. No 35 million line Chromium codebase to wade through.

If you do find a bug, please open a issue. Let's have a look.

## Recon

SurfView transmits this user-agent: 

`"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"`

Which is nearly indistinguishable from a regular Chromium, or Google Chrome install.

The user-agent can be changed in `main.js`, then rebuild.


## Limitations

Where the real risk still is:

The Chromium parser itself. Even with JS disabled, Chromium still has to parse HTML, CSS, and render images. Every one of those parsers has had CVEs. 
A maliciously crafted PNG or CSS file could theoretically exploit the renderer process before the screenshot is even taken. This is the honest weak point.

How much does that matter? 

Chromium's renderer already runs in a sandbox. If it gets exploited, the attacker is inside a sandboxed process that we then immediately close. 
They'd need a sandbox escape on top of the parser exploit to reach your system. That's a much harder attack chain than today's typical JS exploit.

A successful attack would need to:

- Exploit the Chromium parser through a malicious page
- Then escape Chromium's process sandbox (unlikely)
- Then break through Electron's sandbox (very unlikely)
- Do something useful in a sandbox, before the entire Puppeteer process gets closed (which is immediately) 

That's a four step chain. In practice, that's extremely unlikely.

## Checks

These checks should not reveal anything, except default user-agent.

coveryourtracks.eff.org - by EFF, shows how unique your fingerprint is

browserleaks.com - very detailed, covers WebGL, canvas, fonts, WebRTC leaks

fingerprintjs.com/demo - by the fingerprint.js library authors

amiunique.org/fingerprint - academic project, shows how unique you are among their dataset

deviceinfo.me - broad device/browser info dump

ip.guide - simpler, good for IP + basic browser info


## Motivation

After seeing another 50+ security patches land in Firefox and Chrome -
as happens every few weeks, and has for two decades - it became clear
that patching an execution engine forever is not a sustainable security
model. SurfView takes a different approach: remove execution in the `viewport` entirely.

## Credits

Created with [Claude AI](https://claude.ai)

Built on [Node.js](https://nodejs.org) / [npm](https://npmjs.com) /
[Electron](https://electronjs.org) / [Puppeteer](https://pptr.dev)

## License
MIT