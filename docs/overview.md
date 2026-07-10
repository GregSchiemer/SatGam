## Features

- 🎵 **Csound audio synthesis** via dynamic gesture-triggered loading
- 🌐 **Async** server provides secure **HTTP** and **WebSocket** services
- ✅ Mobile-friendly, multi-player, autoplay-policy compliant
- 🔁 Collaborative GUI for a consort of players synchronised by a lead player
- 🎨 Canvas-based layout and animation in pure ES6 modules
- 📡 **Application** runs untethered from the internet

## Concert instructions

Players download the app to their phone from a local server via a Wi-Fi Router. The app is launched by scanning 1 of 2 QR codes depending on their role in the performance : one QR code launches leader.html, the other launches consort.html.

<p>
  <img src="assets/md-images/ph1.PNG" width="250" alt="Phonehenge image 1">
  <img src="assets/md-images/ph2.PNG" width="250" alt="Phonehenge image 2">
  <img src="assets/md-images/wifi.PNG" width="250" alt="Archer AX73 screen shot">
</p>


- **Lead player** (`leader.html`) â€” lead player taps the digital clock readout to start an animation sequence that drives the performance
- **Consort** (`consort.html`) â€” all players trigger sounds by tapping sprites enabled by the animation sequence
- Both versions display the same 25-key layout and interactive clock
- The lead player synchronises all phones in the consort via a Wi-Fi 6 Router

The leader's role is: 
- to start the animation sequence in sync on all phones;
- to select 1 of 2 playing modes for playing the animation sequence :

    1. **PREVIEW** : plays 'fast-forward' giving players an overview of the changing UI
    2. **CONCERT** : plays in real-time and lasts between 12:24 and 12:48 seconds 

## Player instructions

The app has an animated sequence of states where 25 coloured keys appear and disappear at various times during the performance.

- before starting the performance players set phones in wake mode

- the sequence starts when the lead player taps the clock 

- players trigger notes by tapping keys as they appear

- in each state a player may play up to 5 notes

