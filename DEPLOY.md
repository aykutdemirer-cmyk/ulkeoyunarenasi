# Yayına alma: dünya çapında, güvenli ve GitHub'dan otomatik

Bu belge, oyunu **gerçek oyunculara açmak** için önerilen mimariyi ve adım adım kurulumu anlatır.
Kodun tek doğru kaynağı GitHub'dır; sunucuya elle dosya kopyalamazsın, **main'e birleşen her değişiklik otomatik test edilir,
paketlenir ve sunuculara güvenli şekilde dağıtılır**.

## Önerilen mimari

```
            GitHub (main)
                 │  push
                 ▼
        GitHub Actions: test → imaj derle → GHCR'a gönder
                 │  SSH (kilitli, yalnız "deploy" komutu)
     ┌───────────┼───────────┐
     ▼           ▼           ▼
 eu.alanadin   us.alanadin   ap.alanadin     (her biri: Caddy HTTPS + oyun konteyneri)
 Frankfurt     Virginia      Singapur
     ▲           ▲           ▲
     └──── oyuncu, EN DÜŞÜK PİNGLİ bölgeyi otomatik seçer (değiştirebilir) ────┘
```

**Neden bölgeler?** Gerçek zamanlı oyunda gecikmeyi fizik belirler: Türkiye'den Singapur'a gidiş-dönüş ~200 ms,
Avrupa'ya ~40-60 ms. Tek sunucu herkese iyi gelmez; çözüm oyuncuyu **kendine yakın sunucuya** bağlamaktır.
Odalar bağımsızdır (durum bellektedir), bu yüzden bölgeler birbirinden habersiz çalışır ve eklemek kolaydır.
Arkadaşını çağırmak için oda içindeki kod düğmesi **davet bağlantısı** kopyalar (bölge bilgisi dahil).

### Nereden başlamalı?

1. **Önce tek bölge (Avrupa)** ile aç. Oyuncuların nereden geldiğini `/info` ve loglardan gör.
2. Belirgin bir kitle başka kıtadan gelirse o bölgeye 2. sunucu ekle (aynı komutla, 10 dakika).
3. Çoğu insan için ARM tabanlı veya 2 vCPU'lu en küçük "dedicated/shared" sunucu yeterli başlangıçtır; büyüyünce yükselt.

### Kapasite (ölçülmüş sandbox verisi + tahmin)

`npm run loadtest` ile ölçüldü (4 vCPU Xeon 2,8 GHz, yük üreticisi **aynı makinede**):

| Yük | Sunucu tick süresi (bütçe 33,3 ms) |
|---|---|
| 20 oda × 8 gerçek istemci (160 oyuncu) | ort 4,9 ms, p95 7,0 ms |
| 50 oda × 8 gerçek istemci (400 oyuncu) | ort 8,8 ms, p95 12,2 ms, geç gelen paket yok |

Yük yaklaşık doğrusal arttığı için tek Node.js süreci **birkaç yüz oyuncuyu rahat** taşır; %50 tick bütçesi
için kabaca ~100 oda (~800 oyuncu) tahmin edilir (**bu bir tahmindir**, kendi sunucunda `loadtest` ile doğrula).
Tek süreç tek çekirdek kullanır; daha fazlası için bölge/sunucu ekle.

**Bant genişliği asıl sınırdır:** bir oyuncu ortalama **~15 KB/sn (8 kişilik oda) – ~27 KB/sn (16 kişilik oda)** indirir
(≈ 56-100 MB/saat/oyuncu). 800 eşzamanlı oyuncu ≈ 12 MB/sn ≈ 100 Mbit/sn. Sağlayıcıların aylık dahil trafik kotalarına
bak (Avrupa sunucularında genelde çok yüksek; ABD/Asya lokasyonlarında çoğu zaman çok daha düşüktür).

## Güvenlik modeli

- **Sunucuya elle kod atılmaz.** Tek kaynak GitHub; imaj GitHub Actions'ta derlenir.
- CI'nın SSH anahtarı sunucuda **kilitlidir** (`authorized_keys > command=`): bu anahtarla yalnızca `deploy/run-deploy.sh`
  çalışır; kabuk, port yönlendirme, dosya kopyalama yoktur. Betik sadece 40 haneli commit SHA'sı veya `latest` kabul eder.
- Dağıtım sonrası **sağlık kontrolü** yapılır; başarısızsa önceki sürüme **otomatik geri alınır**.
- Anahtar ve sunucu listesi GitHub **Secrets/Variables**'tadır; `production` ortamına elle onay şartı koyabilirsin.
- Sunucuda yalnız 22/80/443 açık, `fail2ban` ve otomatik güvenlik güncellemeleri etkin; oyun portu (3000) dışarı kapalıdır.
- Uygulama sınırları: IP başına bağlantı, toplam oda, oda kurma hız sınırı; sunucu hataları süreci çökertmez.
- Kişisel veri tutulmaz (istatistikler tarayıcıdadır). Veritabanı yoktur.
- DDoS: sağlayıcının temel koruması + isteğe bağlı Cloudflare (aşağıya bak).

## Adım adım kurulum

### A) Sunucu(lar)ı kirala

Ubuntu 24.04, SSH anahtarıyla. Bölge başına bir sunucu (örn. `eu`, `us`, `ap`). Her birinin **IP**'sini not al.

### B) Alan adı (DNS)

`alanadin.com` için her sunucuya bir A kaydı:

| Ad | Değer |
|---|---|
| `eu` | Avrupa sunucusunun IP'si |
| `us` | ABD sunucusunun IP'si |
| `ap` | Asya sunucusunun IP'si |
| `@` (kök) | Avrupa sunucusunun IP'si (ana sayfa buradan açılır) |

> **Cloudflare notu:** Oyun bölgeleri (`eu/us/ap`) için kaydı **"DNS only" (gri bulut)** bırak; proxy araya bir sıçrama ekler
> ve gecikmeyi artırabilir. Kök alan adını (ana sayfa) turuncu buluta alabilirsin.

### C) GitHub tarafı (bir kez)

1. **Dağıtım anahtarı üret** (kendi bilgisayarında):
   ```bash
   ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy"
   ```
   `deploy_key.pub` dosyasının içeriği sunuculara verilecek; `deploy_key` (özel anahtar) yalnızca GitHub'a gidecek.
2. Repo > **Settings > Secrets and variables > Actions**:
   - **Secret** `DEPLOY_SSH_KEY` = `deploy_key` dosyasının tüm içeriği
   - **Secret** `DEPLOY_KNOWN_HOSTS` = her sunucu için `ssh-keyscan -t ed25519 SUNUCU_IP` çıktısı (satır satır)
   - **Variable** `DEPLOY_HOSTS` = sunucuların IP veya adları, boşlukla ayrılmış (örn. `eu.alanadin.com us.alanadin.com`)
3. Repo > **Settings > Environments > New environment** → `production` (istersen "Required reviewers" ekle).
4. Özel anahtarı bilgisayarından **sil** (`shred -u deploy_key`), sadece GitHub'da kalsın.
5. İmaj paketi (GHCR) gizliyse (repo özelse genelde böyledir): sunucuda bir kez
   `docker login ghcr.io -u KULLANICI` (şifre olarak **yalnızca `read:packages`** yetkili bir token). Paket herkese açıksa gerekmez.

### D) Her sunucuyu hazırla (tek komut, root)

`ssh root@SUNUCU_IP` ile bağlanıp (EU örneği):

```bash
curl -fsSL https://raw.githubusercontent.com/aykutdemirer-cmyk/ulkeoyunarenasi/main/deploy/provision.sh | sudo bash -s -- \
  --domain "eu.alanadin.com, alanadin.com" --region eu \
  --origins "https://alanadin.com,https://eu.alanadin.com,https://us.alanadin.com,https://ap.alanadin.com" \
  --deploy-key "$(cat deploy_key.pub)"
```

(`deploy_key.pub` içeriğini komuta yapıştır; ABD için `--domain "us.alanadin.com" --region us`, Asya için `ap`.)
Betik: Docker, güvenlik duvarı, fail2ban, otomatik güncelleme, `deploy` kullanıcısı, kilitli CI anahtarı kurar ve oyunu başlatır.

Sonra `/opt/last-one-wins/regions.json` dosyasını gerçek adreslerinle düzenle (üç sunucuda da aynı olsun):

```json
[
  { "id": "eu", "name": "Europe", "url": "https://eu.alanadin.com" },
  { "id": "us", "name": "USA",    "url": "https://us.alanadin.com" },
  { "id": "ap", "name": "Asia",   "url": "https://ap.alanadin.com" }
]
```

Tek bölge yeterliyse bu dosyayı boş (`[]`) bırak; bölge seçici otomatik gizlenir.

İsteğe bağlı: anahtarla girişin çalıştığını **doğruladıktan sonra** `--harden-ssh` ile parola girişini kapat.

### E) Dağıtım

Artık `main`'e her birleşmede **Actions > Deploy** çalışır. İlk seferde elle de tetikleyebilirsin (Actions > Deploy > Run workflow).
Sonuç: `https://alanadin.com` açılır, oyuncular en yakın bölgeyi görür.

## Günlük işler

```bash
cd /opt/last-one-wins
docker compose logs -f app              # canlı log
docker compose ps
curl https://eu.alanadin.com/healthz    # sağlık + tick süresi
curl https://eu.alanadin.com/info       # bölge, sürüm, oda/oyuncu sayısı
docker stats
```

Yük ölçmek için (kendi bilgisayarından veya başka bir sunucudan): `npm run loadtest -- https://eu.alanadin.com 20 0 30 8`
(20 oda × 8 gerçek istemci, 30 sn). **Canlı sunucuya yoğun test yapmadan önce oyuncuların az olduğu bir saati seç.**

Elle geri alma: sunucuda `.env` içindeki `APP_TAG`'i önceki commit SHA'sına çevirip `docker compose up -d`.

Maç sırasında dağıtım yapılırsa o sunucudaki aktif maçlar kesilir (odalar bellektedir); az oyunculu saatleri tercih et.

## Sorun giderme

| Belirti | Neden / çözüm |
|---|---|
| Sertifika hatası | DNS henüz sunucuyu göstermiyor veya 80/443 kapalı: `docker compose logs caddy` |
| Actions "Host key verification failed" | `DEPLOY_KNOWN_HOSTS` eksik/yanlış: `ssh-keyscan -t ed25519 IP` çıktısını güncelle |
| Actions "Permission denied (publickey)" | Sunucuya `--deploy-key` verilmemiş ya da `DEPLOY_SSH_KEY` yanlış |
| `pull access denied` (ghcr.io) | Paket gizli: sunucuda `docker login ghcr.io` (read:packages token) |
| Bölge seçici görünmüyor | `regions.json` boş ya da `ALLOWED_ORIGINS` sayfa adresini içermiyor |
| Bağlanıyor ama bölge değişince hata | `ALLOWED_ORIGINS` tüm sayfa adreslerini (https://…) içermeli |
| 502 | `docker compose logs app` |

## Yerelde deneme

```bash
npm install && npm start                       # http://localhost:3000
npm run smoke                                  # hızlı uçtan uca test
DOMAIN=localhost docker compose up --build     # Caddy + uygulama (yerel sertifika uyarısı normal)
```
