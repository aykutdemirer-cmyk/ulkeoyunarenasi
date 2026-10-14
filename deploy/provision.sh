#!/usr/bin/env bash
# Yeni bir sunucuyu (Ubuntu/Debian, root) oyun sunucusu olarak hazırlar.
#
#   curl -fsSL https://raw.githubusercontent.com/aykutdemirer-cmyk/ulkeoyunarenasi/main/deploy/provision.sh | sudo bash -s -- \
#     --domain "eu.alanadin.com" --region eu \
#     --origins "https://alanadin.com,https://eu.alanadin.com,https://us.alanadin.com" \
#     --deploy-key "ssh-ed25519 AAAA... github-deploy"
#
# --domain      HTTPS alan adı (birden fazla ise virgülle: "alanadin.com, eu.alanadin.com")
# --region      bu sunucunun bölge kimliği (eu, us, ap ...)
# --origins     socket bağlantısına izin verilen sayfa adresleri (virgülle)
# --deploy-key  GitHub Actions'ın kullanacağı SSH PUBLIC anahtarı (yalnız deploy betiğini çalıştırabilir)
# --regions     bölge listesi JSON dosyasının URL'i (isteğe bağlı; yoksa tek bölge: boş liste)
# --harden-ssh  parola ile SSH girişini kapatır (ÖNCE anahtarla girişin çalıştığını doğrula!)
set -euo pipefail

DOMAIN=""; REGION="local"; ORIGINS=""; DEPLOY_KEY=""; HARDEN=0; REGIONS_URL=""
REPO="${REPO:-https://github.com/aykutdemirer-cmyk/ulkeoyunarenasi.git}"
DIR=/opt/last-one-wins

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --origins) ORIGINS="$2"; shift 2 ;;
    --deploy-key) DEPLOY_KEY="$2"; shift 2 ;;
    --regions) REGIONS_URL="$2"; shift 2 ;;
    --harden-ssh) HARDEN=1; shift ;;
    *) echo "Bilinmeyen seçenek: $1"; exit 1 ;;
  esac
done
# Sohbetten kopyalamada bozulan biçimleri ([metin](url)) temizle
DOMAIN="$(echo "$DOMAIN" | sed -E 's/\[([^]]*)\]\([^)]*\)/\1/g; s/https?:\/\///g')"
[ -n "$DOMAIN" ] || { echo "--domain gerekli"; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "root olarak (sudo) çalıştır"; exit 1; }

# Yeni sunucularda işletim sistemi kendi güncellemelerini yapıp paket kilidini tutabilir: kilit açılana kadar bekle
echo 'DPkg::Lock::Timeout "900";' > /etc/apt/apt.conf.d/99-lock-timeout
echo "==> Sistem güncellemeleri bitene kadar bekleniyor (varsa)"
for _ in $(seq 1 180); do
  fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock >/dev/null 2>&1 || break
  sleep 5
done

echo "==> Paketler"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ufw fail2ban unattended-upgrades ca-certificates dnsutils
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades || true

MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [ "$MEM_MB" -lt 1900 ] && [ -z "$(swapon --show --noheadings)" ]; then
  echo "==> Düşük RAM ($MEM_MB MB): 2 GB takas (swap) dosyası ekleniyor (imaj derlemesi için)"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Docker"
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Güvenlik duvarı (SSH, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> deploy kullanıcısı"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

echo "==> Uygulama: $DIR"
if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone "$REPO" "$DIR"; fi
chown -R deploy:deploy "$DIR"
chmod +x "$DIR"/deploy/*.sh

cd "$DIR"
if [ -n "$REGIONS_URL" ]; then
  curl -fsSL "$REGIONS_URL" -o regions.json
elif [ ! -f regions.json ]; then
  echo '[]' > regions.json   # tek bölge: bölge seçici gizli kalır. Çok bölge için DEPLOY.md'ye bak
fi
cat > .env <<ENV
DOMAIN=$DOMAIN
REGION=$REGION
ALLOWED_ORIGINS=$ORIGINS
REGIONS_FILE_HOST=./regions.json
APP_TAG=latest
ENV
chown deploy:deploy .env regions.json

if [ -n "$DEPLOY_KEY" ]; then
  echo "==> CI anahtarı (yalnız deploy betiğini çalıştırabilir)"
  install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
  echo "command=\"$DIR/deploy/run-deploy.sh\",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty $DEPLOY_KEY" > /home/deploy/.ssh/authorized_keys
  chown deploy:deploy /home/deploy/.ssh/authorized_keys
  chmod 600 /home/deploy/.ssh/authorized_keys
fi

if [ "$HARDEN" -eq 1 ]; then
  echo "==> SSH sertleştirme (parola girişi kapatılıyor)"
  cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'CONF'
PasswordAuthentication no
PermitRootLogin prohibit-password
CONF
  systemctl reload ssh || systemctl reload sshd || true
fi

echo "==> DNS kontrolü"
SERVER_IP="$(curl -4 -fsS https://ifconfig.me || true)"
for d in $(echo "$DOMAIN" | tr ',' ' '); do
  echo "    $d -> $(dig +short A "$d" | tail -n1) (sunucu: ${SERVER_IP:-?})"
done

echo "==> İlk başlatma (yerelde derlenir; sonraki sürümler GitHub'dan gelir)"
docker compose up -d --build

echo
echo "Hazır. Birkaç dakika içinde: https://$(echo "$DOMAIN" | cut -d, -f1 | tr -d ' ')"
echo "Sağlık: curl https://$(echo "$DOMAIN" | cut -d, -f1 | tr -d ' ')/healthz"
