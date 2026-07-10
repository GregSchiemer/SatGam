**Part 1 — Satellite Gamelan Server : aio_server.py**

aio_server.py is run from **Terminal** using the following command settings :

```
	cd /Users/gs/Developer/SG/SatGam
```

Then run the server:

```
	python3 assets/python/aio_server.py \
	  --port 8443 \
	  -r .
```

The default port is 8443.

When the server starts successfully, the Terminal should show messages similar to:

```
	diag_client=False log_http=False log_ws=True log_assets=True log_client_status=True
	[https+wss] Serving /Users/gs/Developer/SG/SatGam
	[https+wss] https://0.0.0.0:8443
	[https+wss] WebSocket endpoint: wss://0.0.0.0:8443/ws
```

		**Note**
		0.0.0.0 means the server is listening on all local interfaces, including:
		- localhost
		- the home-side interface
		- the AX73-side interface
		- 192.168.1.10


Additional command options include:

```
		--cert-file assets/certs/SatGam.pem

```	
			
			Uses the SatGam public certificate file.
			
	
```
		--key-file assets/certs/SatGam-key.pem

```
			
			Uses the SatGam private encryption key.
			

```
		--log-ws

```

			Displays WebSocket messages in the Terminal console log.


```
		--log-assets

```

			Identifies assets sent to phone clients.

```
		--diag-client

```

			Displays diagnostic status messages on phone clients.
	

---
