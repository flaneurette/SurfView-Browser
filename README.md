# SurfView Browser

SurfView is a security-focused browser, that has 3 security modes.

- `Image mode`: default. No JavaScript, no code. Sandboxed. 
- `Live mode`: user toggled. No JavaScript, only HTML. Sandboxed.
- `JS mode`: user toggled. HTML + JavaScript. Sandboxed.

It also bundles tor.exe with it, and it has a tor toggle, so you can surf freely and secure.

<img src="https://github.com/flaneurette/SurfView-Browser/blob/main/src/img/SurfView-FirstRun.png">

SurfView uses 2 sandboxes, and incognito mode for extra security.

What Image mode genuinely protects against:

- JavaScript execution - fully blocked at the Puppeteer level
- XSS, XSRF, 3rd party content, drive-by downloads, malicious iframes - all dead
- CSS-based tracking and fingerprinting - neutered
- Malicious font/media exploits that need a live DOM - gone
- Cookie theft, session hijacking via scripts - not possible

## Ways to Surf

### 🏄 Run the installer

Download your preferred version from the Releases page and install it.

#### v1.7-8 SurfView - Rainbow

[Windows x64 executable](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.7.8/SurfView.Setup.1.7.8.exe)
 
[Windows x64 portable (with source)](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.7.8/SurfView-1.7.8-win.zip)

### 🏄 Build from source

Roll your own:

See [BUILD.md](BUILD.md)

### Updates

New in SurfView v1.7-8:

- Tor onion routing is now available inside SurfView. Just toggle the switch, and your're using Tor! It uses the main tor.exe.
You can also download it from torproject -> expert-package.

- Javascript is now allowed through a switch. Just toggle it on/off, in case you need it. It's turned off by default.
When enabled it runs in a webview sandbox, which is very restricted by default. 

- WebRTC is now detected when JavaScript is on and blocked. 

- SurfView passes all browserleaks.com JavaScript tests

- Integrated a vault password manager.

### SurfView browser Changelog

- Integrated Tor into SurfView browser, now Onion routing is available for Surfview! 
- Webview loading of live websites (with JavaScript blocked)
- Now allowing JavaScript through a toggle switch. (use at your own risk)
- Stricter Content-Security-Policy on both viewport and webview.
- Limit screenshot buffer to 15MB to prevent overflow.
- Additional chrome flags, for very strict policy.
- Better security and tightening of code
- Bookmark adjustments.
- Much code overhaul.
- Thorough testing, AI peer reviewing.
- Webview is no longer persistent, but temporary for each request. (better privacy)
- Updated to Chrome nightly 147.0.7727.0 (will not show, as we spoof user-agent)
- March 15th: fingerprinting is now made very difficult, even with JavaScript enabled. webgl, geolocation, network, battery, mediaDevices are disabled.
- March 15th: not leaking through canvas.
- March 15th: custom surfview browser locale and timezone headers are injected before requests, spoofing them correctly.
- March 15th: added spoof.js where you can set your own spoofed profile. (randomized every session)
- March 15th: WebRTC is now detected when JavaScript is on and blocked before it can execute.
- March 15th: SurfView passed all browserleaks.com JavaScript tests, except for font fingerprinting. We assume you have default fonts anyway.
- Mach 15th: When JavaScript is enabled, SurfView inspects JavaScript before it executes and renders, and also runs deobfuscation routines to prevent JavaScript obfuscation and encoding, to hide payloads, or complex RegExp bypassing.  It is also possible to block additional JavaScript tags in strict.js
- Mach 15th: It is now very difficult to fingerprint SurfView as it emits no detectable prints (passed many tests), but remember: JavaScript comes with a risk. Only enable/toggle it, if you need it in a specific website. If disabled, it's next to impossible to fingerprint.
- March 16th: all internal nodejs requests also proxy over Tor, if enabled/toggled. No leaking of requests over different IP's
- March 16th: better proxy management internals.
- March 16th: webrtc.js updated with better detection signatures.
- March 16th: deeper reverse engineering of obfuscated JavaScript to detect attacks or unmasking when JS is enabled.
- March 18th: Its now possible to search with Ctrl+F
- March 18th: Its now possible to save webpages.
- March 18th: New menu.
- March 18th: When JavaScript is enabled: file reconnaissance is done much more optimized and is much faster now. It scans for signatures of unsafe code, and blocks it before any page render, and displays a security report. It especially tries to find WebRTC signatures, but also iframes, objects and does reverse-engineering in real time to detect obfuscated scripts.
- March 18th: When JS enabled, SurfView file recon, scans all files before render. It computes a unique sha hash, and stores it in memory. This prevents re-scanning each file for the same session. If a hash changes, the page render will be blocked.
- April: integrated the SurfView password vault and password manager, many optimizations, code overhaul.
- April: generates a first-run vault initialization, with a unique salt for every instance.
- April: password vault is AES encrypted with a master password, additionally, every entry into that vault is also encrypted with a PIN.
- April: many security enhancements, custom privacy script injected before every page-load, to ensure privacy.
- April: better mode toggling for Image, Live and JavaScript mode.
- April: integrated website scanner: which analyzes the code of every file on that website and generates a report, this is useful if you want to inspect the safety of that website. If something malicious is found, the scanner blocks access. Can be toggled on/off.
- April 23rd: finalized version 1.7.8

## Tor use

If using Tor, try to prevent toggling JavaScript on. While SurfView does detect WebRTC and blocks it before it can run, it cannot detect it 100% bulletproof. The nature of JavaScript, is, that it's extremely difficult to cover all edgecases.
A persistent attacker could write a sophisticated script, enabling WebRTC and unmasking your real ip.

To be 100% sure: use a extra tailscale, wireguard or VPN tunnel, and then use Tor as the extra hop. If Tor breaks, only the tunnel IP is then known. This is layered redundancy.

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
model. SurfView takes a different approach: remove execution in the viewport entirely.

## Credits

Created by Flaneurette, together with [Claude AI](https://claude.ai) for baseline, code review, analysis, refactoring and second-opinion.

Built on [Node.js](https://nodejs.org) / [npm](https://npmjs.com) /
[Electron](https://electronjs.org) / [Puppeteer](https://pptr.dev)

## License

SurfView is free to use, modify, adapt. SurfView is without warranty. 
The authors cannot be held responsibile for any damage or liability, 
especially occuring with the use of the SurfView browser, it's code, 
modifications, uses, browsing and surfing, etc. Use at your own risk.

Tor.exe licended under GNU General Public License (GPL). 
Visit the original website for more information.