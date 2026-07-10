# Satellite Gamelan

The Satellite Gamelan is a web app designed for a large group of musicians to perform concert music using mobile phones. The app embodies both an animated musical score and a set of instruments to play it.

The instruments are easy to play and quick to learn, enabling musicians to explore uncharted harmonic spaces rarely visited using standard musical instruments. Every phone becomes a mobile sound source in a large harmonic constellation and a hand-held stage light that enhances concert presentation.

Performance relies on a choir of miniature speakers to project sound into reverberant concert venues that were designed to propagate the unamplified sound of multiple hand-held instruments and a cappella voices.

The app renders a synchronised multiplayer interface using gesture-triggered audio and ES6 canvas animation. It was designed as a [concert app](https://satellitegamelan.com) to perform microtonal music composed by the developer initially to explore microtonal tuning theories of [Erv Wilson](https://www.anaphoria.com/wilson.html). The source code here is intended as an eventual replacement of the original app written in Objective-C. It uses a combination of JavaScript and [Csound](https://csound.com/index.html) [WebAssembly](docs/server.md) and draws on the work of New Zealand composer and computer music pioneer [Barry Vercoe](https://www.media.mit.edu/posts/in-memoriam-barry-lloyd-vercoe-1937-2025/) and an international community of [Csound developers](docs/server.md). In the spirit of Vercoe I have released the code into the wild.

This version of the code evolved to support the realisation of *Phonehenge*, a work where musicians can explore the harmonic properties of a [non-octave tuning system](docs/tuning.md) with 25 equally spaced pitches, devised by Karlheinz Stockhausen for his 1954 electronic work [*Studie II*](https://joachimheintz.de/stuecke/code/stockhausen_studie_II_LAC_2010.pdf).

### Features

🎵 Csound audio synthesis via dynamic gesture-triggered loading
🌐 Async server provides secure HTTP and WebSocket services
✅ Mobile-friendly, multi-player, autoplay-policy compliant
🔁 Collaborative GUI for a consort of players synchronised by a lead player
🎨 Canvas-based layout and animation in pure ES6 modules
📡 Application runs untethered from the internet

### 📁 File Structure

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
│   │   ├── satgamPing.js
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
The `assets/certs` directory contains server certificates and mobile deployment certificates. See [Security](docs/certificates.md).

## Documentation

- [Concert Direction](docs/overview.md)
- [References](docs/references.md)

- [Tuning](docs/tuning.md)
- [Setup](docs/setup.md)
- [Server](docs/server.md)
- [Security](docs/certificates.md)
- [Router](docs/router.md)
- [Source material from original README](docs/source.md)
