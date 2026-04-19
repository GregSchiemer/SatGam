# Satellite Gamelan

This project renders a synchronised multiplayer interface using ES6 canvas animation and gesture-triggered audio. It was designed principally as a [concert app](https://satellitegamelan.com) to perform microtonal music created by the [developer](https://www.xenharmonikon.org/2024/09/13/an-extended-interview-with-greg-schiemer/), a 
[composer and builder of bespoke electronic instruments](https://satellitegamelan.com/gallery.php). The combination of javaScript and Csound WebAssembly is intended as an eventual replacement of the original version of the app written in Objective-C. The UI is designed for a portrait-mode mobile screen (`390×844`).

## Features

- 🎨 Canvas-based layout and animation in pure ES6 modules
- 🎵 Csound audio synthesis via dynamic gesture-triggered loading
- ✅ Mobile-friendly, multi-player, autoplay-policy compliant
- 🔁 Collaborative GUI for a consort players synchronised by a lead player

The app can be launched using 1 of 2 html files depending on the role :

- **Lead player** (`leader.html`) — lead player taps the clock to start the animation sequence
- **Consort** (`consort.html`) — all players trigger sounds by tapping sprites enabled by the animation sequence
- Both versions display the same 25-key layout and interactive clock

The leader's role is: 
- to start the animation sequence in sync on all phones;
- to select 1 of 2 playing modes:

    1. **PREVIEW** : plays the animation sequence 'fast-forward' giving players an overview of the changing UI
    2. **CONCERT** : plays it in real-time and lasts between 12:24 and 12:48 seconds 

<p>
  <img src="assets/md-images/ph1.PNG" width="250" alt="Phonehenge image 1">
  <img src="assets/md-images/ph2.PNG" width="250" alt="Phonehenge image 2">
</p>

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
## Getting Started

### How to create and use HTTPS certificates on the SatGam Server for the concert network

This guide assumes SatGam lives at:

```
		/Users/gs/Developer/SG/SatGam
```

SatGam’s browser audio path uses secure-context web features associated with Csound WebAssembly, so for phone deployment it must be served over **HTTPS** with **WSS** for WebSockets.

Certificates must be created for the **SatGam Server** running on the MacBook Pro. Phones reach the server through a concert network using a **tp-link AX73 Wi-Fi 6 Router**.

In this setup:

- **MacBook Pro** runs `server.py`
- **AX73 wireless router** provides the private LAN and Wi-Fi
- **phones** connect to the MacBook through the AX73 network
- `mkcert` creates the SatGam server certificate and its local certificate authority (CA) 

---
### How to set up [tp-link AX73 Wi-Fi 6 Router](https://youtu.be/5nZY1M_RH-k)

### SatGam Router Settings

**Router Information**

| Item | Value | Item | Value |
|:------|-------:|:------|-------:|
| **Device Name** | Archer AX73 | **IPv4 LAN IP** | 192.168.1.1 |
| **LAN MAC Address** | B8-FB-B3-ED-56-F0 | **IPv6 LAN IP** | FE80::BAFB:B3FF:FEED:56F0/64 |

**Wireless Information**

| Band | Network Name (SSID) | Password | Channel | Status |
|:------|----------------------:|----------:|---------:|--------|
| 2.4 GHz / 5 GHz | Vercoe | Stockhausen25root5 | 2.4G Auto (Current: 8) / 5G Auto (Current: 40) | ☐ |

**Wireless Settings**

| Setting | Value |
|:---------|-------------------:|
| **TWT** | ☐ |
| **OFDMA / MU-MIMO** | ☐ |
| **Smart Connect** | Enabled |
| **2.4 GHz / 5 GHz** | Enabled |
| **Network Name (SSID)** | Vercoe |
| **Security** | WPA2-PSK [AES] |
| **Password** | Stockhausen25root5 |
| **2.4 GHz / 5 GHz Advanced Settings** | |
| **2.4 GHz Channel Width** | 20/40 MHz |
| **2.4 GHz Channel** | Auto |
| **5 GHz Channel Width** | 20/40/80/160 MHz |
| **5 GHz Channel** | Auto |

---
### SatGam Server

The MacBook Pro has a fixed AX73-side IP address:

```
		192.168.1.10
```

The secure ports are:

```
		HTTPS: 8443
		WSS: 8444
```

The **server** is run from **Terminal** using the following commands:

```
	gs@MacBook-Pro-2 ~ % cd /Users/gs/Developer/SG/SatGam
	python3 assets/python/server.py \
		--tls \
	  	--https-port 8443 \
	  	--wss-port 8444 \
	  	--cert-file assets/certs/SatGam.pem \
	  	--key-file assets/certs/SatGam-key.pem \
	  	-r .
```
---
The server listens for phones as each player launches the app by scanning a QR code on their phone

**Part 1 — Create and install the SatGam certificates**

Open a Terminal window and run the following commands.

1.	**Go to the SatGam folder**
```
	cd /Users/gs/Developer/SG/SatGam
```
2.	**Create and install a fresh local CA**
```
	mkcert -install
```

Expected output will be similar to:

```
	Created a new local CA 💥
	Sudo password:
	The local CA is now installed in the system trust store! ⚡️
	The local CA is now installed in the Firefox trust store (requires browser restart)! 🦊

	If Firefox is open, restart it after this step.
```

3.	**Create the SatGam server certificate and private key**

```
 	mkcert \
	  -cert-file assets/certs/SatGam.pem \
	  -key-file assets/certs/SatGam-key.pem \
	  192.168.1.10 MacBook-Pro-2.local localhost 127.0.0.1
```

Expected output will be similar to:

``` 
	Created a new certificate valid for the following names 📜
	“192.168.1.10"
	"MacBook-Pro-2.local"
	"localhost"
	"127.0.0.1"

	The certificate is at "assets/certs/SatGam.pem" and the key at "assets/certs/SatGam-key.pem" ✅
```

4.	**Copy the root CA certificate for performer-phone installation**

```
	cp "$(mkcert -CAROOT)/rootCA.pem" assets/certs/SatGam-rootCA.pem
```

This creates a clearly named copy of the mkcert root CA certificate for distribution to performers.

5.	**Validate the certificate files**
```
	ls -l assets/certs
```

Expected files:
```
	SatGam.pem
	SatGam-key.pem
	SatGam-rootCA.pem
```

Example:
```
	total 24
	-rw-------  1 gs  staff  1708 14 Apr 08:18 SatGam-key.pem
	-rw-r--r--  1 gs  staff  1781 14 Apr 08:18 SatGam-rootCA.pem
	-rw-r--r--  1 gs  staff  1614 14 Apr 08:18 SatGam.pem
```
---
**Part 2 — Launch the secure SatGam server**

Open a **new Terminal window** and leave the certificate window available.

6.	**Launch server.py using the SatGam certificate and key**

```
	cd /Users/gs/Developer/SG/SatGam
	python3 assets/python/server.py \
	  --tls \
	  --https-port 8443 \
	  --wss-port 8444 \
	  --cert-file assets/certs/SatGam.pem \
	  --key-file assets/certs/SatGam-key.pem \
	  -r .
```
Expected output will be similar to:

```
	——— Preflight ———
	✅ no auto-start in main.js
	✅ robust wsPort parsing present (qsPort)
	⚠️ leader.html did not show a direct import during preflight (static check).
	If you see [ws] connections later, WS is wired at runtime.
	⚠️ consort.html did not show a direct import during preflight (static check).
	If you see [ws] connections later, WS is wired at runtime.
	———— End preflight ————
	[wss] Listening on wss://0.0.0.0:8444
	[https] Serving /Users/gs/Developer/SG/SatGam on https://0.0.0.0:8443
```

**Note**
0.0.0.0 means the server is listening on all local interfaces, including:
* localhost
* the home-side interface
* the AX73-side interface
* 192.168.1.10
---
**Part 3 — Create Leader and Consort QR codes**

Open another Terminal window if needed.

7.	**Generate the QR codes**

```
	cd /Users/gs/Developer/SG/SatGam
	python3 assets/python/make-qr.py \
  	--scheme https \
  	--host 192.168.1.10 \
  	--http-port 8443 \
  	--ws-port 8444
```
Expected output will be similar to:

```
	QR font file: /System/Library/Fonts/Supplemental/Arial.ttf
	QR font name: ('Arial', 'Regular')
	LABEL ROLE = 'Phonehenge - Leader'
	LABEL ROLE = 'Phonehenge - Consort'
	Base URL: https://192.168.1.10:8443
	WebSocket port: 8444
	Font size: 18
	Leader  → assets/qr-images/qr-leader.png -> https://192.168.1.10:8443/leader.html?wsPort=8444
	Consort → assets/qr-images/qr-consort.png -> https://192.168.1.10:8443/consort.html?wsPort=8444
	Scan from phones while the server is running on the same Wi-Fi.
```

8.	**Validate the QR image files**

```
	ls -l assets/qr-images
```

Expected files:
```
	qr-leader.png
	qr-consort.png
```

**Resulting secure URLs**

The QR codes should now point to:

- **Leader**

```
	https://192.168.1.10:8443/leader.html?wsPort=8444
```
- **Consort**
```
	https://192.168.1.10:8443/consort.html?wsPort=8444
```
---
## Installing SatGam Root Certificate on Performer Phones

To allow performer phones to connect to the SatGam HTTPS server without certificate warnings, each device must install and trust the local certificate authority (CA).

The file to install is:

```
		assets/certs/SatGam-rootCA.pem
```
---
**iPhone (iOS) Installation**

1. Transfer the certificate to the iPhone
Use one of the following methods:
* AirDrop (recommended)
* Email attachment
* Host the file temporarily on the SatGam server and open it in Safari

2. Install the profile
- Open the .pem file on the iPhone
- You will see a message: “Profile Downloaded”
- Open Settings
- Tap Profile Downloaded
- Tap Install
- Enter passcode if prompted
- Tap Install again to confirm

3. Enable full trust (CRITICAL)
This step is required on iOS.
- Go to: Settings → General → About → Certificate Trust Settings
- Under Enable Full Trust for Root Certificates, find:

`	SatGam-rootCA`

	(or similar name)
	
- Toggle it ON
- Confirm when prompted

4. Verify
Open Safari and test:

`	https://192.168.1.10:8443/leader.html?wsPort=8444`

If installed correctly:
* no certificate warning appears
* the page loads normally
---
**Android Installation**

Steps vary slightly depending on Android version and manufacturer.

1. Transfer the certificate
* Email
* USB
* AirDrop equivalent
* Download from server

2. Install the certificate
- Open Settings
- Go to:

```
	Security → Encryption & credentials → Install a certificate
```

	(or search for “Install certificate”)

- Select:

`	CA certificate`

- Locate and accept

`	SatGam-rootCA.pem`

- Confirm installation

3. Accept warning
Android will warn that:

`	“Your network traffic may be monitored”`

This is expected for a user-installed CA.
Tap Install anyway.

4. Verify
Open Chrome and test:

`	https://192.168.1.10:8443/leader.html?wsPort=8444`

If installed correctly:
* no certificate warning appears
* the page loads normally


```
