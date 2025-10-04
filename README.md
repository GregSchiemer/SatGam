# Phonehenge ES6

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
```text
.
├── assets
│   └── python
│       └── generate_qr.py
├── css
│   └── bootstrap.min.css
├── favicon.ico
├── js
│   ├── gui
│   │   ├── animation.js
│   │   ├── canvasExtensions.js
│   │   ├── canvasUtils.js
│   │   ├── color.js
│   │   ├── enableKeys.js
│   │   ├── helpers.js
│   │   ├── henge.js
│   │   ├── main.js
│   │   ├── runTime.js
│   │   ├── sequence.js
│   │   └── text.js
│   └── Synth
│       ├── csound-init.js
│       ├── csound.js
│       ├── csound.wasm
│       └── csound.worklet.js
├── LICENSE
├── README.md
├── sg-es6-cs.html
├── sg-es6-go.html
└── sg-es6-gui.html
```


## Getting Started

1. Serve the files using a local HTTP server:
   ```bash
   python3 -m http.server
