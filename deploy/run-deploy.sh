#!/usr/bin/env bash
# CI'nın SSH ile çalıştırdığı TEK komut (authorized_keys'te "command=" ile kilitli).
# Argüman olarak yalnızca commit SHA'sı (40 hex) ya da "latest" kabul edilir.
set -euo pipefail

main() {
  local tag="${SSH_ORIGINAL_COMMAND:-latest}"
  if ! [[ "$tag" =~ ^[0-9a-f]{40}$ || "$tag" == "latest" ]]; then
    echo "Geçersiz etiket" >&2
    exit 1
  fi

  cd /opt/last-one-wins
  git pull --ff-only -q || true   # compose/Caddy ayarları güncellensin

  local prev
  prev="$(grep -E '^APP_TAG=' .env | cut -d= -f2 || true)"
  set_tag() { { grep -vE '^APP_TAG=' .env || true; echo "APP_TAG=$1"; } > .env.new && mv .env.new .env; }

  echo "==> $tag sürümüne geçiliyor (önceki: ${prev:-yok})"
  set_tag "$tag"
  docker compose pull app
  docker compose up -d

  echo "==> Sağlık kontrolü"
  for _ in $(seq 1 30); do
    if docker compose exec -T app wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1; then
      echo "Başarılı: $tag"
      docker image prune -f >/dev/null 2>&1 || true
      return 0
    fi
    sleep 1
  done

  echo "Sağlık kontrolü BAŞARISIZ" >&2
  if [ -n "${prev:-}" ] && [ "$prev" != "$tag" ]; then
    echo "==> Geri alınıyor: $prev" >&2
    set_tag "$prev"
    docker compose up -d
  fi
  return 1
}

main "$@"
exit $?
