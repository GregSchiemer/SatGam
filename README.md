# Satellite Gamelan

The Satellite Gamelan is a web app designed for a large group of musicians to perform concert music using mobile phones. The app embodies both an animated musical score and a set of instruments to play it.

The instruments are easy to play and quick to learn, enabling musicians to explore uncharted harmonic spaces rarely visited using standard musical instruments. Every phone becomes a mobile sound source in a large harmonic constellation and a hand-held stage light that enhances concert presentation.

Performance relies on a choir of miniature speakers to project sound into reverberant concert venues that were designed to propagate the unamplified sound of multiple hand-held instruments and a cappella voices.

The app renders a synchronised multiplayer interface using gesture-triggered audio and ES6 canvas animation. It was designed as a [concert app](https://satellitegamelan.com) to perform microtonal music composed by the developer initially to explore microtonal tuning theories of [Erv Wilson](https://www.anaphoria.com/wilson.html). This version supports a work that explores harmonic properties of a tuning system with 25 equally spaced intervals, devised by Karlheinz Stockhausen for his 1954 electronic work [*Studie II*](https://joachimheintz.de/stuecke/code/stockhausen_studie_II_LAC_2010.pdf). The source code here is intended as an eventual replacement of the original app written in Objective-C. It uses a combination of javaScript and [Csound](https://csound.com/index.html) [WebAssembly](https://github.com/orgs/csound/people) and draws on the work of New Zealand composer and computer music pioneer [Barry Vercoe](https://www.media.mit.edu/posts/in-memoriam-barry-lloyd-vercoe-1937-2025/) and an international community of [Csound developers](https://github.com/csound/csound#contributors). In the spirit of Vercoe I have released the code into the wild.

## Documentation

- [Concert Direction](docs/overview.md)
- [References](docs/references.md)

- [Tuning](docs/tuning.md)
- [Setup](docs/setup.md)
- [Server](docs/server.md)
- [Security](docs/certificates.md)
- [Router](docs/router.md)
- [Source material from original README](docs/source.md)
