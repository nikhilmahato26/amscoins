# Payment QR codes

QR codes are images — drop the files here and they are served from
`/payment/<name>.png`.

Payment details including wallet addresses and support contacts are now managed
in Admin → Settings (DB), not environment variables.

A missing QR file is not an error: the deposit screen handles missing payment
methods gracefully. Keep each image square and at least 320×320 so it stays
scannable at the 160px render size.
