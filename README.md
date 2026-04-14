# Phonehenge

This project renders a synchronised multiplayer interface using ES6 canvas animation and gesture-triggered audio synthesised via Csound WebAssembly. It was designed principally as a concert app to perform microtonal music called *Phonehenge*, created by the developer, *Greg Schiemer*. The UI is designed for a portrait-mode mobile screen (`390×844`) and shared between:

- **Lead player** (`leader.html`) — lead player starts animation by tapping clock
- **Consort** (`consort.html`) — all players trigger sounds by tapping sprites enabled by the animation
- Both versions display the same 25-key layout and interactive clock

## Features

- 🎨 Canvas-based layout and animation in pure ES6 modules
- 🎵 Csound audio synthesis via dynamic gesture-triggered loading
- ✅ Mobile-friendly, multi-player, autoplay-policy compliant
- 🔁 Collaborative GUI for a consort players synchronised by a lead player

## 📁 Project Structure
## Current project tree

Actual `.pem` certificate files are omitted here for clarity.

```text
.
├── apple-touch-icon-precomposed.png
├── apple-touch-icon.png
├── assets
│   ├── bash
│   │   └── zshrc
│   ├── certs
│   ├── csd
│   │   ├── phonehenge-0.csd
│   │   ├── phonehenge-1.csd
│   │   ├── phonehenge-2.csd
│   │   ├── phonehenge-3.csd
│   │   ├── phonehenge-4.csd
│   │   ├── sprite-chords.orc
│   │   ├── sprite-single.csd
│   │   └── sprite-single.orc
│   ├── python
│   │   ├── make-qr.py
│   │   └── server.py
│   └── qr-images
│       ├── qr-consort.png
│       └── qr-leader.png
├── consort.html
├── css
│   └── bootstrap.min.css
├── favicon.ico
├── js
│   ├── gui
│   │   ├── animation.js
│   │   ├── audioEngine.js
│   │   ├── canvasExtensions.js
│   │   ├── canvasUtils.js
│   │   ├── clockBus.js
│   │   ├── clockTransport.js
│   │   ├── color.js
│   │   ├── csoundInit.js
│   │   ├── globals.js
│   │   ├── helpers.js
│   │   ├── henge.js
│   │   ├── main.js
│   │   ├── net.js
│   │   ├── renderer.js
│   │   ├── runTime.js
│   │   ├── sequence.js
│   │   ├── sprites.js
│   │   ├── text.js
│   │   ├── uiControls.js
│   │   └── wakeLock.js
│   └── synth
│       ├── csound6
│       │   ├── csound.js
│       │   └── csound.js.map
│       └── csound7
│           ├── csound.js
│           └── csound.js.map
├── leader.html
├── LICENSE
└── README.md

16 directories, 58 files

## Getting Started

# How to create and use SatGam HTTPS certificates on the MacBook server for the AX73 concert network

SatGam’s browser audio path uses secure-context web features, so for phone deployment the app should be served over **HTTPS** with **WSS** for WebSockets.

These certificates are **not** for the TP-Link AX73 router itself.  
They are for the **SatGam server running on the MacBook Pro**, which phones reach through the AX73 network.

In this setup:

- the **MacBook Pro** runs `server.py`
- the **AX73 router** provides the private LAN and Wi-Fi
- the **phones** connect to the MacBook through the AX73 network
- `mkcert` creates the local CA and the SatGam server certificate

---

## Assumptions

This guide assumes:

- SatGam lives at:

  /Users/gs/Developer/SG/SatGam
```
