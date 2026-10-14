#!/usr/bin/env bash
# Boş bir Ubuntu/Debian sunucuda (root olarak) tek komutla kurulum:
#   curl -fsSL https://raw.githubusercontent.com/aykutdemirer-cmyk/ulkeoyunarenasi/main/deploy/setup.sh | sudo bash -s -- alanadin.com
set -euo pipefail

DOMAIN="${1:-}"
REPO="${2:-https://github.com/aykutdemirer-cmyk/ulkeoyunarenasi.git}"
DIR=/opt/last-one-wins

if [ -z "$DOMAIN" ]; then
  echo "Kullanım: sudo bash setup.sh alanadin.com"
  exit 1
fi
if [ "$(id -u)" -ne 0 ]; then
  echo "Lütfen root olarak (sudo ile) çalıştır."
  exit 1
fi

echo "==> Paketler kuruluyor"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ufw ca-certificates dnsutils

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Docker kuruluyor"
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Güvenlik duvarı (SSH, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "==> DNS kontrolü"
SERVER_IP="$(curl -4 -fsS https://ifconfig.me || true)"
DNS_IP="$(dig +short A "$DOMAIN" | tail -n1 || true)"
echo "    Sunucu IP: ${SERVER_IP:-?}   |   $DOMAIN -> ${DNS_IP:-kayıt yok}"
if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "$DNS_IP" ]; then
  echo "UYARI: $DOMAIN şu an bu sunucuyu göstermiyor. HTTPS sertifikası, A kaydı doğru olana kadar alınamaz."
  echo "       (DNS yayılması 5-30 dk sürebilir; kurulum yine de devam ediyor, Caddy otomatik tekrar dener.)"
fi

echo "==> Uygulama indiriliyor: $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone "$REPO" "$DIR"
fi
cd "$DIR"
echo "DOMAIN=$DOMAIN" > .env

echo "==> Başlatılıyor"
docker compose up -d --build

echo
echo "Hazır! Birkaç dakika içinde: https://$DOMAIN"
echo "Loglar:      cd $DIR && docker compose logs -f"
echo "Güncelleme:  cd $DIR && sudo bash deploy/update.sh"
