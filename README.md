# Phonehenge

This project renders a synchronised 25-phone interface using ES6 canvas animation and gesture-triggered audio via Csound WebAssembly. The UI is designed for a portrait-mode mobile screen (`390×844`) and shared between:

- **Conductor** (`sg-es6-go.html`) — initiates animation via tap
- **Players** (`sg-es6-cs.html`) — passively follow the clock
- Both versions display the same 25-phone layout and interactive clock

## Features

- 🎨 Canvas-based layout and animation in pure ES6 modules
- 🎵 Csound audio synthesis via dynamic gesture-triggered loading
- ✅ Mobile-friendly, multi-player, autoplay-policy compliant
- 🔁 Identical GUI for conductor and players

## 📁 Project Structure
```text . ├── apple-touch-icon-precomposed.png ├── apple-touch-icon.png ├── assets │ ├── bash │ │ └── zshrc │ ├── certs │ ├── csd │ │ ├── phonehenge-0.csd │ │ ├── phonehenge-1.csd │ │ ├── phonehenge-2.csd │ │ ├── phonehenge-3.csd │ │ ├── phonehenge-4.csd │ │ ├── sprite-chords.orc │ │ ├── sprite-single.csd │ │ └── sprite-single.orc │ ├── python │ │ ├── make-qr.py │ │ └── server.py │ └── qr-images │ ├── qr-consort.png │ └── qr-leader.png ├── consort.html ├── css │ └── bootstrap.min.css ├── favicon.ico ├── js │ ├── gui │ │ ├── animation.js │ │ ├── audioEngine.js │ │ ├── canvasExtensions.js │ │ ├── canvasUtils.js │ │ ├── clockBus.js │ │ ├── clockTransport.js │ │ ├── color.js │ │ ├── csoundInit.js │ │ ├── globals.js │ │ ├── helpers.js │ │ ├── henge.js │ │ ├── main.js │ │ ├── net.js │ │ ├── renderer.js │ │ ├── runTime.js │ │ ├── satgamPing.js │ │ ├── sequence.js │ │ ├── sprites.js │ │ ├── text.js │ │ ├── uiControls.js │ │ └── wakeLock.js │ └── synth │ ├── csound6 │ │ ├── csound.js │ │ └── csound.js.map │ └── csound7 │ ├── csound.js │ └── csound.js.map ├── leader.html ├── LICENSE └── README.md 16 directories, 58 files ```

## Getting Started

1. Serve the files using a local HTTP server:
   ```bash
   python3 -m http.server
