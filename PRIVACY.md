## Telemetry

SurfView does NOT send telemetry. You can check in the source. Or use: `tcpview` from sysinternals to confirm.

However, as with **all** Chromium based browsers, Google phones home. We set flags to prevent this, but it might not suffice. You might need a dedicated firewall entries or a `hosts` file for this.

Block puppeteer `chrome.exe` from doing telemetry in Windows Firewall. (Requires locating AppData folder):

```
netsh advfirewall firewall add rule name="Block Chrome Telemetry 142.250" dir=out action=block remoteip=142.250.0.0/16 program="C:\Users\<USERNAME>\.cache\puppeteer\chrome\win64-<NUMERIC.ID>\chrome-win64\chrome.exe"
netsh advfirewall firewall add rule name="Block Chrome Telemetry 142.251" dir=out action=block remoteip=142.251.0.0/16 program="C:\Users\<USERNAME>\.cache\puppeteer\chrome\win64-<NUMERIC.ID>\chrome-win64\chrome.exe"
```

Or globally, which is recomended:

> NOTE: also blocks Google.xxx. No disrespect, but it's better to move away from Google and start using a safer search engine. Like: Ecosia, or something else.

```
netsh advfirewall firewall add rule name="Block Google 142.250" dir=out action=block remoteip=142.250.0.0/16
netsh advfirewall firewall add rule name="Block Google 142.251" dir=out action=block remoteip=142.251.0.0/16
netsh advfirewall firewall add rule name="Block Google IPv6 Telemetry" dir=out action=block remoteip=2a00:1450::/32
```

Or block entire AS:

> NOTE: also blocks Google.xxx. No disrespect, but it's better to move away from Google and start using a safer search engine. Like: Ecosia, or something else.

```
netsh advfirewall firewall add rule name="Block Google AS15169 1" dir=out action=block remoteip=142.250.0.0/15
netsh advfirewall firewall add rule name="Block Google AS15169 2" dir=out action=block remoteip=172.217.0.0/16
netsh advfirewall firewall add rule name="Block Google AS15169 3" dir=out action=block remoteip=173.194.0.0/16
netsh advfirewall firewall add rule name="Block Google AS15169 4" dir=out action=block remoteip=216.58.192.0/19
netsh advfirewall firewall add rule name="Block Google AS15169 5" dir=out action=block remoteip=216.239.32.0/19
netsh advfirewall firewall add rule name="Block Google IPv6 Telemetry" dir=out action=block remoteip=2a00:1450::/32
```

Or alternative hosts file for finegrained control, if you can't live without Google search or their `eco-system`:

```
# Block Chrome phoning home
# ::1 update.googleapis.com
::1 clients1.google.com
::1 safebrowsing.googleapis.com
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