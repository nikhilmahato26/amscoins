#!/bin/bash
# Nightly Mongo backup. Runs on the VPS via cron, not in CI.
#   chmod +x scripts/backup.sh
#   crontab -e
#   0 2 * * * /opt/amscoins/scripts/backup.sh >> /opt/amscoins/backups/backup.log 2>&1
set -euo pipefail

# Extract only the two vars needed, rather than `source`-ing the whole file:
# .env.production also holds values like MAIL_FROM ("ASM Coins <noreply@...>")
# that are valid for Docker's env_file parser but are NOT valid shell syntax
# (unescaped <, >, spaces) — sourcing the file whole breaks on those.
MONGO_ROOT_USER=$(grep '^MONGO_ROOT_USER=' /opt/amscoins/.env.production | cut -d= -f2-)
MONGO_ROOT_PASSWORD=$(grep '^MONGO_ROOT_PASSWORD=' /opt/amscoins/.env.production | cut -d= -f2-)

BACKUP_DIR=/opt/amscoins/backups
mkdir -p "$BACKUP_DIR"
CONTAINER=$(docker compose -f /opt/amscoins/docker-compose.yml ps -q mongo)

docker exec "$CONTAINER" mongodump \
  --username "$MONGO_ROOT_USER" --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --archive --gzip \
  > "$BACKUP_DIR/asmcoins_$(date +%F).archive.gz"

# Local retention: 14 days.
find "$BACKUP_DIR" -name "*.archive.gz" -mtime +14 -delete

# TODO: sync off-box before going live, e.g.:
#   rclone copy "$BACKUP_DIR" remote:asmcoins-backups/
# A wiped/compromised VPS should not mean losing both the DB and its backups.
