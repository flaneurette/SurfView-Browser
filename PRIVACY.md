# Privacy tips.

## Unbound

Consider using `Unbound DNS` and get control back over what leaves/enters your machine. As all DNS requests are opaque, even if you use a VPN, DNS requests can be seen.

## Telemetry

SurfView does not send telemetry. You can check in the source. Or use: `tcpview` from sysinternals to confirm.

However, as with **all** Chromium based browsers, Google phones home. We set flags to prevent this, but it might not suffice. You might need a dedicated firewall entries or a `hosts` file for this.

Block puppeteer `chrome.exe` from doing telemetry in Windows Firewall. (Requires locating AppData folder):

```
netsh advfirewall firewall add rule name="Block Chrome Telemetry 142.250" dir=out action=block remoteip=142.250.0.0/16 program="C:\Users\<USERNAME>\.cache\puppeteer\chrome\win64-<NUMERIC.ID>\chrome-win64\chrome.exe"
netsh advfirewall firewall add rule name="Block Chrome Telemetry 142.251" dir=out action=block remoteip=142.251.0.0/16 program="C:\Users\<USERNAME>\.cache\puppeteer\chrome\win64-<NUMERIC.ID>\chrome-win64\chrome.exe"
```

Or globally, which is recomended:

> NOTE: also blocks Google.xxx. No disrespect, but it's better to move away from Google and start using a safer search engine if you are worried about privacy. Like: Ecosia, or Brave, DuckDuckGo

```
netsh advfirewall firewall add rule name="Block Google 142.250" dir=out action=block remoteip=142.250.0.0/16
netsh advfirewall firewall add rule name="Block Google 142.251" dir=out action=block remoteip=142.251.0.0/16
netsh advfirewall firewall add rule name="Block Google IPv6 Telemetry" dir=out action=block remoteip=2a00:1450::/32
```

Or block entire AS:

> NOTE: also blocks Google.xxx. No disrespect, but it's better to move away from Google and start using a safer search engine if you are worried about privacy. Like: Ecosia, or Brave, DuckDuckGo

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
::1 update.googleapis.com
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

And monitor it for changes with `tcpview` or `wireshark`.

## Disable STUN/TURN WebRTC.

Security is about layering. Not all methods, browsers, apps, embedds, windows can successfully block WebRTC a 100%, so we want redundancy.

## Whitelist 

There is a even better way: just deny all `outbound`, except for what you actually use. (the whitelist approach)

Carefully check, and add your allowed ports that you actually use. You can always whitelist additional ports later.

I would even go so far as blocking `port 80` also, as it's often used in malware, where it contacts a compromised `IP`.

```
# Set default outbound policy to BLOCK

netsh advfirewall set allprofiles firewallpolicy blockinbound,blockoutbound

# ALLOW ONLY WHAT YOU NEED

# SSH
netsh advfirewall firewall add rule name="OUT: SSH" dir=out action=allow protocol=TCP remoteport=22

# DNS
netsh advfirewall firewall add rule name="OUT: DNS UDP" dir=out action=allow protocol=UDP remoteport=53
netsh advfirewall firewall add rule name="OUT: DNS TCP" dir=out action=allow protocol=TCP remoteport=53

# DHCP
netsh advfirewall firewall add rule name="OUT: DHCP" dir=out action=allow protocol=UDP remoteport=67-68

# NTP
netsh advfirewall firewall add rule name="OUT: NTP" dir=out action=allow protocol=UDP remoteport=123

# HTTP/HTTPS
netsh advfirewall firewall add rule name="OUT: HTTP" dir=out action=allow protocol=TCP remoteport=80
netsh advfirewall firewall add rule name="OUT: HTTPS" dir=out action=allow protocol=TCP remoteport=443

# Loopback (essential for local services)
netsh advfirewall firewall add rule name="OUT: Loopback" dir=out action=allow remoteip=127.0.0.1
netsh advfirewall firewall add rule name="OUT: Loopback IPv6" dir=out action=allow remoteip=::1

# Local network (adjust your subnet)
netsh advfirewall firewall add rule name="OUT: LAN" dir=out action=allow remoteip=192.168.0.0/16
netsh advfirewall firewall add rule name="OUT: LAN 10.x" dir=out action=allow remoteip=10.0.0.0/8
netsh advfirewall firewall add rule name="OUT: LAN 172.x" dir=out action=allow remoteip=172.16.0.0/12

# Windows Update
netsh advfirewall firewall add rule name="OUT: svchost" dir=out action=allow program="%SystemRoot%\System32\svchost.exe" protocol=TCP remoteport=80,443

# ICMP Ping (optional)
netsh advfirewall firewall add rule name="OUT: Ping" dir=out action=allow protocol=ICMPv4
```

## Blacklist

Add to your windows Firewall through `Powershell`, as extra precaution against `WebRTC`:


```
# Run as Administrator

Write-Host "Blocking WebRTC STUN/TURN ports..." -ForegroundColor Yellow

# STUN standard port
netsh advfirewall firewall add rule name="Block STUN UDP 3478" dir=out action=block protocol=UDP remoteport=3478
netsh advfirewall firewall add rule name="Block STUN TCP 3478" dir=out action=block protocol=TCP remoteport=3478

# STUN alternate port
netsh advfirewall firewall add rule name="Block STUN UDP 3479" dir=out action=block protocol=UDP remoteport=3479
netsh advfirewall firewall add rule name="Block STUN TCP 3479" dir=out action=block protocol=TCP remoteport=3479

# TURN TLS
netsh advfirewall firewall add rule name="Block TURN TLS 5349" dir=out action=block protocol=TCP remoteport=5349
netsh advfirewall firewall add rule name="Block TURN DTLS 5349" dir=out action=block protocol=UDP remoteport=5349

# TURN alternate
netsh advfirewall firewall add rule name="Block TURN TCP 5350" dir=out action=block protocol=TCP remoteport=5350
netsh advfirewall firewall add rule name="Block TURN UDP 5350" dir=out action=block protocol=UDP remoteport=5350

# Google STUN port
netsh advfirewall firewall add rule name="Block Google STUN UDP 19302" dir=out action=block protocol=UDP remoteport=19302
netsh advfirewall firewall add rule name="Block Google STUN TCP 19302" dir=out action=block protocol=TCP remoteport=19302
netsh advfirewall firewall add rule name="Block Google STUN UDP 19303" dir=out action=block protocol=UDP remoteport=19303
netsh advfirewall firewall add rule name="Block Google STUN UDP 19304" dir=out action=block protocol=UDP remoteport=19304
netsh advfirewall firewall add rule name="Block Google STUN UDP 19305" dir=out action=block protocol=UDP remoteport=19305

# TURN relay port ranges (commonly used)
netsh advfirewall firewall add rule name="Block TURN Relay Range UDP 49152-65535" dir=out action=block protocol=UDP remoteport=49152-65535
netsh advfirewall firewall add rule name="Block TURN Relay Range TCP 49152-65535" dir=out action=block protocol=TCP remoteport=49152-65535

# STUN over non-standard ports
# netsh advfirewall firewall add rule name="Block STUN UDP 8443" dir=out action=block protocol=UDP remoteport=8443
# netsh advfirewall firewall add rule name="Block STUN TCP 8443" dir=out action=block protocol=TCP remoteport=8443

Write-Host "Firewall rules added successfully." -ForegroundColor Green
Write-Host ""
Write-Host "WARNING: Blocking 49152-65535 may break some applications." -ForegroundColor Red
Write-Host "Remove with: netsh advfirewall firewall delete rule name=`"Block *`"" -ForegroundColor Cyan
```

Chrome registry edit (be very careful with this): `Chrome.reg`

```
; Disable WebRTC in Chrome via Policy
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome]
"WebRtcLocalIpsAllowedUrls"=""
"WebRtcEventLogCollectionAllowed"=dword:00000000
"WebRtcUdpPortRange"="0-0"
"WebRtcAllowLegacyTLSProtocols"=dword:00000000

; Disable WebRTC in Edge via Policy
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge]
"WebRtcLocalIpsAllowedUrls"=""
"WebRtcUdpPortRange"="0-0"

; Force Chrome to use TCP only (cripples most WebRTC)
[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome]
"WebRtcIPHandling"="disable_non_proxied_udp"

[HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge]
"WebRtcIPHandling"="disable_non_proxied_udp"
```

Group policy in Windows pro:

```
# Chrome
Google > Google Chrome > WebRTC UDP port range = "0-0"
Google > Google Chrome > WebRTC IP handling = disable_non_proxied_udp

# Edge  
Microsoft Edge > WebRTC UDP port range = "0-0"
Microsoft Edge > WebRTC IP handling = disable_non_proxied_udp

```

Add to your windows host file as extra precaution, as some apps can punch through your NAT/Firewall:

```
# ============================================
# WebRTC STUN/TURN/WSS Block List
# ============================================

# --- Google STUN Servers ---
0.0.0.0 stun.l.google.com
0.0.0.0 stun1.l.google.com
0.0.0.0 stun2.l.google.com
0.0.0.0 stun3.l.google.com
0.0.0.0 stun4.l.google.com

# --- Google TURN/WebRTC Infrastructure ---
0.0.0.0 turn.l.google.com
0.0.0.0 relay.l.google.com
0.0.0.0 global.turn.twilio.com
0.0.0.0 global.stun.twilio.com

# --- Twilio TURN/STUN ---
0.0.0.0 global.turn.twilio.com
0.0.0.0 global.stun.twilio.com
0.0.0.0 us1.turn.twilio.com
0.0.0.0 us2.turn.twilio.com
0.0.0.0 eu1.turn.twilio.com
0.0.0.0 ap1.turn.twilio.com

# --- Xirsys ---
0.0.0.0 ws.xirsys.com
0.0.0.0 wss.xirsys.com
0.0.0.0 turn.xirsys.com
0.0.0.0 stun.xirsys.com
0.0.0.0 global.xirsys.net
0.0.0.0 us.xirsys.com
0.0.0.0 eu.xirsys.com
0.0.0.0 ap.xirsys.com

# --- Metered.ca TURN ---
0.0.0.0 relay.metered.ca
0.0.0.0 standard.relay.metered.ca
0.0.0.0 premium.relay.metered.ca
0.0.0.0 a.relay.metered.ca
0.0.0.0 b.relay.metered.ca

# --- Viagenie / NUMB ---
0.0.0.0 numb.viagenie.ca
0.0.0.0 turn.viagenie.ca
0.0.0.0 stun.viagenie.ca

# --- Public STUN Servers ---
0.0.0.0 stun.stunprotocol.org
0.0.0.0 stun.voip.blackberry.com
0.0.0.0 stun.nextcloud.com
0.0.0.0 stun.sipgate.net
0.0.0.0 stun.ekiga.net
0.0.0.0 stun.ideasip.com
0.0.0.0 stun.rixtelecom.se
0.0.0.0 stun.schlund.de
0.0.0.0 stun.voiparound.com
0.0.0.0 stun.voipbuster.com
0.0.0.0 stun.voipstunt.com
0.0.0.0 stun.counterpath.net
0.0.0.0 stun.1und1.de
0.0.0.0 stun.gmx.net
0.0.0.0 stun.t-online.de
0.0.0.0 stun.sip.us
0.0.0.0 stun.xten.com
0.0.0.0 stun.softjoys.com
0.0.0.0 stun.services.mozilla.com
0.0.0.0 stun.gmx.de
0.0.0.0 stun.hosteurope.de
0.0.0.0 stun.sipgate.net
0.0.0.0 stun.dus.net
0.0.0.0 stun.voipplanet.nl
0.0.0.0 stun.freevoipdeal.com
0.0.0.0 stun.justvoip.com
0.0.0.0 stun.internetcalls.com
0.0.0.0 stun.callwithus.com
0.0.0.0 stun.srce.hr
0.0.0.0 stun.antisip.com
0.0.0.0 stun.bluesip.net
0.0.0.0 stun.solnet.ch
0.0.0.0 stun.easyvoip.com
0.0.0.0 stun.lowratevoip.com
0.0.0.0 stun.poivy.com
0.0.0.0 stun.intervoip.com
0.0.0.0 stun.12connect.com
0.0.0.0 stun.12voip.com
0.0.0.0 stun.actionvoip.com
0.0.0.0 stun.cheapvoip.com
0.0.0.0 stun.cloopen.com
0.0.0.0 stun.commpeak.com
0.0.0.0 stun.cope.es
0.0.0.0 stun.dcalling.de
0.0.0.0 stun.demos.ru
0.0.0.0 stun.dialpad.com
0.0.0.0 stun.eoni.com
0.0.0.0 stun.fathomvoice.com
0.0.0.0 stun.freecall.com
0.0.0.0 stun.freeswitch.org
0.0.0.0 stun.gntel.nl
0.0.0.0 stun.gmx.fr
0.0.0.0 stun.ipfire.org
0.0.0.0 stun.ippi.fr
0.0.0.0 stun.jumblo.com
0.0.0.0 stun.liveo.fr
0.0.0.0 stun.mit.de
0.0.0.0 stun.myvoiptraffic.com
0.0.0.0 stun.netappel.com
0.0.0.0 stun.netgsm.com.tr
0.0.0.0 stun.nottingham.ac.uk
0.0.0.0 stun.nova.is
0.0.0.0 stun.powervoip.com
0.0.0.0 stun.ppdi.com
0.0.0.0 stun.rockenstein.de
0.0.0.0 stun.rolmail.net
0.0.0.0 stun.rynga.com
0.0.0.0 stun.sacko.com.au
0.0.0.0 stun.sigmavoip.com
0.0.0.0 stun.sipnet.net
0.0.0.0 stun.sipnet.ru
0.0.0.0 stun.sipy.cz
0.0.0.0 stun.sma.de
0.0.0.0 stun.smartvoip.com
0.0.0.0 stun.smsdiscount.com
0.0.0.0 stun.solcon.nl
0.0.0.0 stun.sonetel.com
0.0.0.0 stun.sonetel.net
0.0.0.0 stun.sovtest.ru
0.0.0.0 stun.sparvoip.de
0.0.0.0 stun.tel.lu
0.0.0.0 stun.telbo.com
0.0.0.0 stun.tng.de
0.0.0.0 stun.twt.it
0.0.0.0 stun.uls.co.za
0.0.0.0 stun.usfamily.net
0.0.0.0 stun.vivox.com
0.0.0.0 stun.vo.lu
0.0.0.0 stun.voicetrading.com
0.0.0.0 stun.webcalldirect.com
0.0.0.0 stun.wifirst.net
0.0.0.0 stun.zadarma.com

# --- Cloudflare WebRTC/TURN ---
0.0.0.0 turn.cloudflare.com
0.0.0.0 turn.cloudflareresearch.com


# --- Discord ---
0.0.0.0 turn1.discord.gg
0.0.0.0 turn2.discord.gg
0.0.0.0 turn3.discord.gg
0.0.0.0 turn4.discord.gg
0.0.0.0 turn5.discord.gg
0.0.0.0 turn1.discord.media
0.0.0.0 turn2.discord.media
0.0.0.0 turn3.discord.media

# --- Microsoft Teams TURN ---
0.0.0.0 turn.teams.microsoft.com
0.0.0.0 relay.teams.microsoft.com
0.0.0.0 worldaz.turn.teams.microsoft.com
0.0.0.0 uswe.turn.teams.microsoft.com
0.0.0.0 usea.turn.teams.microsoft.com
0.0.0.0 usse.turn.teams.microsoft.com
0.0.0.0 uswe2.turn.teams.microsoft.com
0.0.0.0 euwe.turn.teams.microsoft.com
0.0.0.0 euno.turn.teams.microsoft.com
0.0.0.0 euce.turn.teams.microsoft.com
0.0.0.0 apse.turn.teams.microsoft.com
0.0.0.0 apso.turn.teams.microsoft.com
0.0.0.0 apea.turn.teams.microsoft.com
0.0.0.0 aune.turn.teams.microsoft.com
0.0.0.0 ause.turn.teams.microsoft.com

# --- Zoom WebRTC ---
0.0.0.0 turn.zoom.us
0.0.0.0 stun.zoom.us

# --- Jitsi ---
0.0.0.0 meet.jit.si
0.0.0.0 turn.jit.si
0.0.0.0 stun.olocation.net

# --- Slack ---
0.0.0.0 turn.slack.com
0.0.0.0 relay.slack.com

# --- Pion (open source WebRTC) ---
0.0.0.0 stun.pion.ly

# --- WSS Signaling Servers (Common) ---
0.0.0.0 wss.xirsys.com
0.0.0.0 ws.peerjs.com
0.0.0.0 signaling.simplewebrtc.com
0.0.0.0 signal.peer.pm

# --- Open Relay Project ---
0.0.0.0 openrelay.metered.ca
0.0.0.0 relay.webrtc.org


# --- Daily.co ---
0.0.0.0 turn.daily.co
0.0.0.0 stun.daily.co
0.0.0.0 signaling.daily.co

# --- Livekit ---
0.0.0.0 turn.livekit.cloud
0.0.0.0 stun.livekit.cloud
0.0.0.0 livekit.cloud

# --- Agora ---
0.0.0.0 webrtc.agora.io
0.0.0.0 turn.agora.io
0.0.0.0 stun.agora.io
0.0.0.0 edge.agora.io

# --- Vonage / TokBox ---
0.0.0.0 turn.opentok.com
0.0.0.0 relay.opentok.com
0.0.0.0 stun.opentok.com

# --- 100ms ---
0.0.0.0 turn.100ms.live
0.0.0.0 stun.100ms.live

# --- Amazon Chime/Kinesis WebRTC ---
0.0.0.0 kinesisvideo.us-east-1.amazonaws.com
0.0.0.0 kinesisvideo.us-west-2.amazonaws.com
0.0.0.0 kinesisvideo.eu-west-1.amazonaws.com
0.0.0.0 chime.aws

# --- Location Services / IP Leak ---
0.0.0.0 ipinfo.io
0.0.0.0 ifconfig.me
0.0.0.0 icanhazip.com
0.0.0.0 webrtcleak.com
0.0.0.0 ip8.com

# Useful for testing:
#0.0.0.0 ipleak.net 
#0.0.0.0 browserleaks.com

# --- Location-based STUN/TURN wildcards to watch ---
# (can't block wildcards in hosts file, see note below)
# *.turn.twilio.com
# *.stun.twilio.com
# *.xirsys.net
# *.relay.metered.ca
# *.turn.teams.microsoft.com

# ============================================
# END WebRTC Block List
# ============================================

```