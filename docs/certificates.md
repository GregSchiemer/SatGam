**Part 3 — Satellite Gamelan Certificates**

Certificates reassure the phone browser that an authentic Web Assembly application will be downloaded when a QR code is scanned. SatGam provides certificates that are ready-to-deploy and customisable to accomodate on-going development. 


*** Ready-to-Deploy ***

SatGam assets/certs includes ready-to-deploy certificates for iPhone and android phones. 

```

gs@MacBook-Pro-2 SatGam % tree 
.
└── assets
    ├── backup
    └── certs
        ├── android-deploy
        │   └── SatGam-rootCA.cer
        └── ios-deploy
            └── Satellite-Gamelan-Root-Certificate.mobileconfig

```
For android phones deploy SatGam-rootCA.cer

1. upload to via Bluetooth 
2. install certificate
3. trust certificate

For iOS phones deploy Satellite-Gamelan-Root-Certificate.mobileconfig

1. upload to Safari via Bluetooth using AirDrop or via USB using Apple Configurator
2. install certificate
3. trust certificate
  


*** Customised ***

To create a customised certificate open a Terminal window and run the following commands.

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

___

**Part 4 — Satellite Gamelan QR codes**

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
## Installing SatGam Certificate Authority on Performer Phones

To allow performer phones to connect to the SatGam HTTPS server without certificate warnings, each device must install and trust the local **Certificate Authority** (**CA**).

The file to install is:

```
		assets/certs/SatGam-rootCA.pem
```
---
**iPhone (iOS) CA Installation**

1. **Transfer the certificate** to the iPhone using one of the following methods:
* AirDrop (recommended)
* Email attachment
* Host the file temporarily on the SatGam server and open it in Safari

2. **Install the profile**
- Open the .pem file on the iPhone
- You will see a message: `Profile Downloaded`
- Open **Settings**
- Tap `Profile Downloaded`
- Tap **Install**
- Enter passcode if prompted
- Tap Install again to confirm

3. **Enable full trust** (CRITICAL)
This step is required on iOS.
- Go to: Settings → General → About → Certificate Trust Settings
- Under Enable Full Trust for Root Certificates, find:

`	SatGam-rootCA` (or similar name)
	
- Toggle it ON
- Confirm when prompted

4. **Verify**
Open Safari and test:

`	https://192.168.1.10:8443/leader.html?wsPort=8444`

If installed correctly:
* no certificate warning appears
* the page loads normally
---
**Android CA Installation**

Steps may vary slightly depending on Android version and manufacturer.

1. **Transfer** the certificate
* Email
* USB
* AirDrop equivalent
* Download from server

2. **Install the certificate**
- **Open Settings**
- Go to:

```
	Security → Encryption & credentials → Install a certificate
```

	(or search for *Install certificate*)

- **Select**

`	CA certificate`

- **Locate** and accept:

`	SatGam-rootCA.pem`

- Confirm installation:

3. **Accept**

Android will warn that:

`	Your network traffic may be monitored`

This is expected for a user-installed CA. Tap Install anyway.

4. **Verify**

Open Chrome and test:

`	https://192.168.1.10:8443/leader.html?wsPort=8444`

If installed correctly:
* no certificate warning appears
* the page loads normally

---