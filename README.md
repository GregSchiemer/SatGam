# Satellite Gamelan

This project renders a synchronised multiplayer interface using ES6 canvas animation and gesture-triggered audio synthesised via Csound WebAssembly. It was designed principally as a concert app and written in javaScript as a replacement for an earlier version written in Objective-C. The UI is designed for a portrait-mode mobile screen (`390×844`).

The app can be launched using 1 of 2 html files depending on the role :

- **Lead player** (`leader.html`) — lead player taps the clock to start the animation sequence
- **Consort** (`consort.html`) — all players trigger sounds by tapping sprites enabled by the animation sequence
- Both versions display the same 25-key layout and interactive clock

The leader's role is: 
- to start the animation sequence in sync on all phones;
- to select 1 of 2 playing modes:

- **PREVIEW** : plays 'fast-forward' giving players an overview of the changing UI 
- **CONCERT** : plays in real-time and lasts between 12:24 and 12:48 seconds 



## Features

- 🎨 Canvas-based layout and animation in pure ES6 modules
- 🎵 Csound audio synthesis via dynamic gesture-triggered loading
- ✅ Mobile-friendly, multi-player, autoplay-policy compliant
- 🔁 Collaborative GUI for a consort players synchronised by a lead player

## 📁 Project Structure

Actual `.pem` certificate files are omitted here for clarity.

```
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

```
## Getting Started

### How to create and use SatGam HTTPS certificates on the MacBook server for the AX73 concert network

SatGam’s browser audio path uses secure-context web features associated with Csound Web Assembly, so for phone deployment it must be served over **HTTPS** with **WSS** for WebSockets.

Certificates must be created for the **SatGam server running on the MacBook Pro**. Phones reach the server through a concert network using a **tp-link AX73 Wi-Fi 6 Router**.

In this setup:

- **MacBook Pro** runs `server.py`
- **AX73 router** provides the private LAN and Wi-Fi
- **phones** connect to the MacBook through the AX73 network
- `mkcert` creates the SatGam server certificate and its local certificate authority (CA) 

This guide assumes SatGam lives at:

    `/Users/gs/Developer/SG/SatGam`

The MacBook Pro has a fixed AX73-side IP address:

    `192.168.1.10`
    
The secure ports are:

    `HTTPS: 8443`

    `WSS: 8444`

The server is run from terminal using the following commands:

```gs@MacBook-Pro-2 ~ % cd /Users/gs/Developer/SG/SatGam
python3 assets/python/server.py \
  --tls \
  --https-port 8443 \
  --wss-port 8444 \
  --cert-file assets/certs/SatGam.pem \
  --key-file assets/certs/SatGam-key.pem \
  -r .
```
The server listens for phones as each player launches the app by scanning a QR code on their phone


```
