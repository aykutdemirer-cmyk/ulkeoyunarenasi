# Yayına alma (ucuz bir sunucu + kendi alan adın)

Hedef: `https://alanadin.com` adresinde herkesin oynayabildiği, otomatik HTTPS'li bir kurulum.
Mimari: **tek küçük sunucu (VPS)** üzerinde Docker ile `uygulama` + `Caddy` (HTTPS sertifikasını kendisi alır ve yeniler).

## 1) Sunucu (VPS) kirala

Herhangi bir sağlayıcı olur; aylık yaklaşık 4-6 $/€ ödeyeceğin en küçük Linux sunucu başlangıç için yeterlidir
(fiyatlar değişebilir, kendi sayfasından kontrol et). Örnekler: Hetzner Cloud, DigitalOcean, Vultr, Contabo.

- İşletim sistemi: **Ubuntu 24.04** (veya 22.04) ya da Debian 12
- Konum: oyuncuların çoğuna yakın olsun (Türkiye için Frankfurt/Falkenstein gibi Avrupa lokasyonları iyi gecikme verir)
- Giriş: mümkünse **SSH anahtarı** ekle (parola yerine)
- Oluşunca sana bir **IP adresi** verir (örn. `203.0.113.10`) - bunu not al

## 2) Alan adını sunucuya yönlendir (DNS)

Alan adını aldığın firmanın DNS panelinde:

| Tür | Ad / Host | Değer |
|---|---|---|
| A | `@` (boş / kök) | sunucunun IP adresi |
| A | `www` (isteğe bağlı) | sunucunun IP adresi |

- Yayılması birkaç dakika sürebilir. Kontrol: `ping alanadin.com` sunucu IP'ni göstermeli.
- **Cloudflare** kullanıyorsan başta kaydı "DNS only" (gri bulut) bırak; sertifika alındıktan sonra istersen
  turuncu buluta (proxy) çevirebilirsin (WebSocket desteklenir; SSL modu **Full** olmalı).

## 3) Kurulum (tek komut)

Bilgisayarından sunucuya bağlan:

```bash
ssh root@SUNUCU_IP
```

Sunucuda şunu çalıştır (alan adını kendininkiyle değiştir):

```bash
curl -fsSL https://raw.githubusercontent.com/aykutdemirer-cmyk/ulkeoyunarenasi/main/deploy/setup.sh | sudo bash -s -- alanadin.com
```

Script şunları yapar: Docker kurar, güvenlik duvarını açar (yalnız SSH, 80, 443), projeyi `/opt/last-one-wins`
klasörüne indirir ve başlatır. 1-3 dakika sonra **https://alanadin.com** açılır.

> `www.alanadin.com` için de adres istiyorsan `deploy/Caddyfile` dosyasına şu bloğu ekleyip `docker compose up -d` çalıştır:
> ```
> www.{$DOMAIN} {
> 	redir https://{$DOMAIN}{uri} permanent
> }
> ```

## 4) Günlük işler

```bash
cd /opt/last-one-wins
docker compose logs -f          # canlı log
docker compose ps               # durum
docker compose restart app      # yalnız oyunu yeniden başlat
sudo bash deploy/update.sh      # yeni sürümü çek ve yeniden başlat
curl https://alanadin.com/healthz   # {"ok":true,"rooms":N,...}
docker stats                    # CPU / RAM kullanımı
```

Güncellemede aktif maçlar kısa süre kesilir (odalar bellekte tutulur). Oyuncular yeniden bağlanabilir ama oda kapanmış olur;
bu yüzden güncellemeyi az oyuncunun olduğu saatte yap.

## 5) Güvenlik ve sınırlar

- Sunucuya **yalnız SSH anahtarıyla** gir; root parolasını kapat. Otomatik güvenlik güncellemeleri için:
  `sudo apt install unattended-upgrades`
- Dışarı sadece 80/443 açıktır; oyun sunucusu (3000) Docker ağı içinde kalır.
- Uygulamadaki sınırlar (ortam değişkeniyle değişir, `docker-compose.yml` > `app.environment`):
  `MAX_ROOMS` (varsayılan 300 oda), `MAX_CONN_PER_IP` (varsayılan 25 bağlantı), oda kurma hız sınırı (1,5 sn).
- Kişisel veri tutulmaz: istatistikler oyuncunun tarayıcısında (`localStorage`) durur, sunucuda veritabanı yoktur.
- Yedeğe gerek yoktur (durum bellekte). Tek saklanan şey Caddy'nin sertifikalarıdır (`caddy_data` Docker volume'u).

## 6) Kapasite hakkında

Oyun tek bir Node.js süreci olarak çalışır; her oda saniyede 30 kez simüle edilir ve anlık görüntü gönderir.
Küçük bir VPS ile başlayıp `docker stats` ve `/healthz` ile izle; CPU sürekli yüksek kalırsa daha güçlü bir sunucuya geç.
Gerçek yük altında ölçüm yapılmadı; kaç eşzamanlı oda taşıyacağını canlıda kendin gözlemlemelisin.

## 7) Sorun giderme

| Belirti | Olası neden / çözüm |
|---|---|
| Tarayıcı "güvenli değil" / sertifika hatası | DNS henüz sunucuyu göstermiyor ya da 80/443 portları kapalı. `docker compose logs caddy` ile bak |
| `502 Bad Gateway` | Uygulama ayağa kalkmadı: `docker compose logs app` |
| Sayfa açılıyor ama oyun bağlanmıyor | Cloudflare/başka proxy WebSocket'i engelliyor; "DNS only" dene |
| Domain yanlış IP'yi gösteriyor | DNS panelindeki A kaydını düzelt, birkaç dakika bekle |
| `permission denied` (docker) | Komutları `sudo` ile çalıştır |

## Yerelde Docker ile deneme

```bash
echo "DOMAIN=localhost" > .env
docker compose up --build        # https://localhost (yerel sertifika uyarısı normaldir)
```
