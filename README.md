# LAST ONE WINS! - Which country survives?

Çok oyunculu (Socket.io) fizik arenası. Dönen neon halkanın yarığından dışarı çıkan top elenir; son kalan kazanır.

## Çalıştırma

Node.js 18+ gerekir.

```bash
npm install
npm start          # http://localhost:3000   (farklı port: PORT=3001 npm start)
```

Sunucu açılışta aynı ağdaki telefonlar için `http://<IP>:3000` adresini de yazar.

Canlıya alma (dünya çapında, çok bölgeli, GitHub'dan otomatik dağıtım): bkz. [DEPLOY.md](DEPLOY.md)

Docker: `docker build -t last-one-wins . && docker run -p 3000:3000 last-one-wins`

Aynı ağdaki telefonlardan `http://<bilgisayarın-yerel-IP-si>:3000` ile bağlanılır.

## Kontroller

| Platform | Hareket | Dash | Tepki |
|---|---|---|---|
| Masaüstü | WASD / Yön tuşları | Space | 1-4 |
| Mobil | Sol yarıda sürükle | Sağ alttaki DASH | Sol alttaki düğmeler |

## Özellikler

- Oda kodu (`ARENA-XXXX`), açık oda listesi, hızlı oyna, seyirci modu, 5 sn yeniden bağlanma toleransı
- Modlar: Herkes Tek, Takım A vs B, **Bomb Tag** (halka kapalı, bomba süre bitince patlar), **King of the Hill** (60 sn, tepede tek başına kalan puan alır), **Futbol** (Takım A vs B, top + 2 kale; ilk 5 gol ya da 2 dk, beraberlikte altın gol; dash = şut), **Coin Rush** (60 sn altın topla; güçlü çarpışmada coin kaybedilir)
- Lobide (geniş ekranda) mod ve haritaların üzerine gelince yan panellerde canlı önizleme, kurallar ve ipuçları
- Dil seçeneği: Türkçe / English (sağ üstteki TR | EN düğmesi, tarayıcı dilinden otomatik seçilir)
- Seri maçlar (tek maç, ilk 2'ye, ilk 3'e) ve oda içi galibiyet sayacı
- 10 harita: **Lava Floor** (dilimler kızarır, sonra yakar), Pulse Arena (nefes alan halka), Classic Ring, Hyper Collider, Shrinking Death, The Gauntlet, **Ice Rink** (kaygan zemin), **Whirlpool** (girdap), **Pinball Pit** (4 tampon), **Black Hole** (merkez çeker, içine düşen elenir)
- Power-up'lar: Heavy Armor, Super Dash, Ghost Shield
- Botlar (Kolay / Normal / Zor), kill feed, sonuç ekranı, istatistikler
- Client-side prediction + server reconciliation (fizik çekirdeği: `public/shared.js`)

## Dosyalar

- `server.js` - oda/lobi, authoritative fizik döngüsü (30 FPS), bot yapay zekası
- `public/shared.js` - sunucu ve istemcinin ortak fizik kodu
- `public/game.js` - istemci: render, ses (Web Audio), girdi, tahmin
- `public/index.html`, `public/style.css` - arayüz
