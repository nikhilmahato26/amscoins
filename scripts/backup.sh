#!/bin/bash
# Nightly Mongo backup. Runs on the VPS via cron, not in CI.
#   chmod +x scripts/backup.sh
#   crontab -e
#   0 2 * * * /opt/amscoins/scripts/backup.sh >> /opt/amscoins/backups/backup.log 2>&1
set -euo pipefail
set -a; source /opt/amscoins/.env.production; set +a

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
