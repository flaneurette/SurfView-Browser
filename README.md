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

#### v1.3-0 SurfView - Shaka

[Windows x64 executable](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.3-0/SurfView.Setup.1.3.0.exe)

[Windows x64 portable (with source)](https://github.com/flaneurette/SurfView-Browser/releases/download/v1.3-0/SurfView-1.3.0-win.zip)

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

## Telemetry

SurfView does NOT send telemetry. You can check in the source. Or use: `tcpview` from sysinternals to confirm.

However, as with **all** Chromium based browsers, Google phones home. We set flags to prevent this, but it might not suffice. You might need a dedicated firewall entires or a `hosts` file for this.

Block puppeteer `chrome.exe` from doing telemetry in Windows Firewall:

```
netsh advfirewall firewall add rule name="Block Chrome Telemetry 142.250" dir=out action=block remoteip=142.250.0.0/16 program="C:\Users\<USERNAME>\.cache\puppeteer\chrome\win64-<NUMERIC.ID>\chrome-win64\chrome.exe"
netsh advfirewall firewall add rule name="Block Chrome Telemetry 142.251" dir=out action=block remoteip=142.251.0.0/16 program="C:\Users\<USERNAME>\.cache\puppeteer\chrome\win64-<NUMERIC.ID>\chrome-win64\chrome.exe"
```

Or globally, which is recomended:

```
netsh advfirewall firewall add rule name="Block Google 142.250" dir=out action=block remoteip=142.250.0.0/16
netsh advfirewall firewall add rule name="Block Google 142.251" dir=out action=block remoteip=142.251.0.0/16
```

Or block entire AS:

```
netsh advfirewall firewall add rule name="Block Google AS15169 1" dir=out action=block remoteip=142.250.0.0/15
netsh advfirewall firewall add rule name="Block Google AS15169 2" dir=out action=block remoteip=172.217.0.0/16
netsh advfirewall firewall add rule name="Block Google AS15169 3" dir=out action=block remoteip=173.194.0.0/16
netsh advfirewall firewall add rule name="Block Google AS15169 4" dir=out action=block remoteip=216.58.192.0/19
netsh advfirewall firewall add rule name="Block Google AS15169 5" dir=out action=block remoteip=216.239.32.0/19
```

Or alternative hosts file:

```
# Block Chrome phoning home
0.0.0.0 update.googleapis.com
0.0.0.0 clients1.google.com
0.0.0.0 clients2.google.com
0.0.0.0 clients3.google.com
0.0.0.0 clients4.google.com
0.0.0.0 safebrowsing.googleapis.com
0.0.0.0 safebrowsing.google.com
0.0.0.0 ssl.gstatic.com
0.0.0.0 ocsp.pki.goog
0.0.0.0 pki.goog
0.0.0.0 crl.pki.goog
0.0.0.0 chrome.google.com
0.0.0.0 tools.google.com
# handles updates, better comment it.
# 0.0.0.0 dl.google.com
0.0.0.0 optimizationguide-pa.googleapis.com
0.0.0.0 content-autofill.googleapis.com
```

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