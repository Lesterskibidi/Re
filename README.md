# Portfolio Market Tracker

Ung dung web local de theo doi danh muc tai san, bao gom crypto va co phieu.

## Tinh nang

- Them, sua, xoa tai san trong danh muc.
- Ho tro so luong le, vi du `0.14` BTC hoac `1.5` co phieu.
- Ho tro nhieu don vi tien te: USDT, USDC, USD, VND, EUR, JPY, BTC, ETH, BNB...
- Cap nhat gia crypto tu Binance Spot.
- Cap nhat gia co phieu qua Stooq public CSV.
- Tinh gia von, gia tri hien tai, lai/lo va ty trong theo tung don vi tien te.
- Luu danh muc trong trinh duyet bang `localStorage`.
- Xuat CSV.

## Yeu cau

- Node.js 18 tro len.

## Chay local

```bash
npm start
```

Sau do mo:

```text
http://127.0.0.1:8770/stock-portfolio.html
```

Tren Windows co the bam dup:

```text
start-stock-app.bat
```

## Cach nhap ma

Crypto:

- Chon `Crypto / Binance`.
- Nhap `BTC`, `ETH`, `BNB`, hoac cap day du nhu `BTCUSDT`.
- Neu nhap `BTC` va chon `USDT`, server se thu cap `BTCUSDT`.

Co phieu:

- Chon `Co phieu / Stock`.
- Nhap `AAPL`, `MSFT`, `TSLA`, hoac ma Stooq day du nhu `AAPL.US`.
- Neu nhap `AAPL`, server se thu `AAPL.US`.

## Nguon du lieu

- Crypto: Binance Spot public ticker price API.
- Stock: Stooq public CSV quote endpoint.

Luu y: Cac nguon public co the bi gioi han, cham, hoac khong ho tro mot so thi truong. Neu can du lieu on dinh hon cho san pham that, nen dung API co key nhu Alpha Vantage, Finnhub, Twelve Data, Polygon, hoac nha cung cap du lieu chung khoan Viet Nam.

## Trien khai

Ung dung nay can Node server vi file HTML goi API local `/api/quote`.

- GitHub Pages chi host duoc HTML tinh, khong chay duoc `stock-server.js`.
- Co the deploy server len Render, Railway, Fly.io, VPS, hoac bat ky noi nao chay Node.js.
- Neu sau nay dung API key, hay de key trong bien moi truong server, khong dua key vao HTML.
