# LAST ONE WINS! - Which country survives?

Çok oyunculu (Socket.io) fizik arenası. Dönen neon halkanın yarığından dışarı çıkan top elenir; son kalan kazanır.

## Çalıştırma

Node.js 18+ gerekir.

```bash
npm install
npm start          # http://localhost:3000   (farklı port: PORT=3001 npm start)
```

Aynı ağdaki telefonlardan `http://<bilgisayarın-yerel-IP-si>:3000` ile bağlanılır.

## Kontroller

| Platform | Hareket | Dash | Tepki |
|---|---|---|---|
| Masaüstü | WASD / Yön tuşları | Space | 1-4 |
| Mobil | Sol yarıda sürükle | Sağ alttaki DASH | Sol alttaki düğmeler |

## Özellikler

- Oda kodu (`ARENA-XXXX`), açık oda listesi, hızlı oyna, seyirci modu, 5 sn yeniden bağlanma toleransı
- FFA ve Takım A vs B; 4 harita (Classic Ring, Hyper Collider, Shrinking Death, The Gauntlet)
- Power-up'lar: Heavy Armor, Super Dash, Ghost Shield
- Botlar (Kolay / Normal / Zor), kill feed, sonuç ekranı, istatistikler
- Client-side prediction + server reconciliation (fizik çekirdeği: `public/shared.js`)

## Dosyalar

- `server.js` - oda/lobi, authoritative fizik döngüsü (30 FPS), bot yapay zekası
- `public/shared.js` - sunucu ve istemcinin ortak fizik kodu
- `public/game.js` - istemci: render, ses (Web Audio), girdi, tahmin
- `public/index.html`, `public/style.css` - arayüz
