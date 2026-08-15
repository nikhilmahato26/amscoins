# Payment QR codes

QR codes are images, so unlike the wallet addresses and support handles they are
**not** environment variables — drop the files here and they are served from
`/payment/<name>.png`.

| File              | Shown on                          | Should encode                        |
| ----------------- | --------------------------------- | ------------------------------------ |
| `usdt-trc20.png`  | Trust Wallet → TRC20              | the `VITE_USDT_TRC20_ADDRESS` wallet |
| `usdt-bep20.png`  | Trust Wallet → BEP20              | the `VITE_USDT_BEP20_ADDRESS` wallet |
| `binance-pay.png` | Binance Pay                       | the Binance Pay receive code         |

A missing file is not an error: the deposit screen drops the QR block and the
copyable address carries the flow, and the on-screen steps reword themselves to
stop mentioning a QR. Keep each image square and at least 320×320 so it stays
scannable at the 160px render size.

**Check every QR against the address in `.env` before shipping one.** A QR that
points at a wallet we don't control sends deposits somewhere unrecoverable, and
nothing in the app can detect that.
