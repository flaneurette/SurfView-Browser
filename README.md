# SurfView Browser

Updates: `March 15th 2026: Updated to latest nightly Chrome/147.0.7727.0` *

SurfView is a security-focused browser, that has 3 security modes.

- `Image mode`: default. No JavaScript, no code. Sandboxed. It makes a screenshot, and extracts links into a sidebar.
- `Live mode`: user toggled. No JavaScript, only HTML. Sandboxed.
- `JS mode`: user toggled. HTML + JavaScript. Sandboxed.

It also bundles `tor.exe` with it, and it has a `tor toggle`, so you can surf freely and secure.

<img src="https://github.com/flaneurette/SurfView-Browser/blob/main/src/img/SurfView-FirstRun.png">

SurfView uses 2 sandboxes, and incognito mode for extra security.

What `Image mode` genuinely protects against:

- JavaScript execution - fully blocked at the Puppeteer level
- XSS, XSRF, 3rd party content, drive-by downloads, malicious iframes - all dead
- CSS-based tracking and fingerprinting - neutered
- Malicious font/media exploits that need a live DOM - gone
- Cookie theft, session hijacking via scripts - not possible

## Ways to Surf

### 🏄 Run the installer

Download your preferred version from the Releases page and install it.

#### v1.6-0 SurfView - Glassy

`March 15th 2026: Updated to latest nightly Chrome/147.0.7727.0` *

[Windows x64 executable](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.6-3/SurfView.Setup.1.6.3.exe)
 
[Windows x64 portable (with source)](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.6-3/SurfView-1.6.3-win.zip)

`*` We set fake chrome spoofed UA, but actually run a nightly build to prevent finger printing the headless chrome.

Linux: coming soon. (Tip: You might want to build from source anyway. It's easy, promised.)

### 🏄 Build from source

Or roll your own:

See [BUILD.md](BUILD.md)

### Updates

New in SurfView v1.6-3:

- Tor onion routing is now available inside SurfView. Just toggle the switch, and your're using Tor! It uses the main `tor.exe`.
If for some reason you don't trust it, just replace it with your own `tor.exe`. As simple as that. Download it from torproject -> expert-package.

- Javascript is now allowed through a switch. Just toggle it `on/off`, in case you need it. It's turned off by default.
When enabled it runs in a webview sandbox, which is very restricted by default. 

- WebRTC is now detected when JavaScript is `on` and blocked. 

- SurfView passes all `browserleaks` JavaScript test, except for font fingerprinting. We assume you have default fonts anyway.

## How it works

SurfView fetches a URL using a headless Chromium instance with JavaScript
fully disabled. The page is rendered to a PNG screenshot, all links are
extracted from the DOM, and the Chromium process is immediately closed.
The user sees a static image of the page and a sanitized link list.
No script ever runs in your session. 

## Security

It's trivially auditable. Anyone who wants to verify the security claim, can read the ~500 lines in `src/*.js` and either agrees, or finds a bug. No 35 million line Chromium codebase to wade through.

If you do find a bug, please open a issue. Let's have a look.

## Tor use

If using Tor, try to prevent toggling JavaScript on. While SurfView does detect `WebRTC` and blocks it before it can run, it cannot detect it 100% bulletproof. The nature of JavaScript, is, that it's extremely difficult to cover all edgecases.
A persistent attacker could write a sophisticated script, enabling WebRTC and unmasking your real ip.

To be 100% sure: use a extra `tailscale`, `wireguard` or `VPN` tunnel, and then use Tor as the extra `hop`. If Tor breaks, only the tunnel IP is then known.

## Recon

SurfView transmits this user-agent: 

`"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.80 Safari/537.36"`

Which is nearly indistinguishable from a regular Chromium, or Google Chrome install.

The user-agent can be changed in `main.js`, then rebuild.

- SurfView does show `JA3`, just like any Chrome instance.

This is not really a problem, as it's shared amongst countless other chrome users.

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

https://coveryourtracks.eff.org - by EFF, shows how unique your fingerprint is

https://browserleaks.com - very detailed, covers WebGL, canvas, fonts, WebRTC leaks

https://fingerprintjs.com/demo - by the fingerprint.js library authors

https://amiunique.org/fingerprint - academic project, shows how unique you are among their dataset

https://deviceinfo.me - broad device/browser info dump


## Motivation

After seeing another 50+ security patches land in Firefox and Chrome -
as happens every few weeks, and has for two decades - it became clear
that patching an execution engine forever is not a sustainable security
model. SurfView takes a different approach: remove execution in the `viewport` entirely.

## Credits

Created by Flaneurette, together with [Claude AI](https://claude.ai) for baseline, code review, analysis, refactoring and second-opinion.

Built on [Node.js](https://nodejs.org) / [npm](https://npmjs.com) /
[Electron](https://electronjs.org) / [Puppeteer](https://pptr.dev)

## License
MIT