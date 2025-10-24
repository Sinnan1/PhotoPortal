#!/bin/bash

# Photo Gallery Backup Script
# Creates backups of database and configuration

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="database_${DATE}.sql"
ENV_BACKUP_FILE="env_${DATE}.backup"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Photo Gallery Backup"
echo "=========================================="
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
echo "Backing up database..."
docker compose exec -T postgres pg_dump -U photo_user photo_gallery > "$BACKUP_DIR/$DB_BACKUP_FILE"

if [ -f "$BACKUP_DIR/$DB_BACKUP_FILE" ]; then
    # Compress backup
    gzip "$BACKUP_DIR/$DB_BACKUP_FILE"
    echo -e "${GREEN}✓ Database backed up: $BACKUP_DIR/${DB_BACKUP_FILE}.gz${NC}"
else
    echo -e "${YELLOW}⚠️  Database backup failed${NC}"
fi

# Backup .env file
if [ -f .env ]; then
    echo "Backing up environment configuration..."
    cp .env "$BACKUP_DIR/$ENV_BACKUP_FILE"
    echo -e "${GREEN}✓ Environment backed up: $BACKUP_DIR/$ENV_BACKUP_FILE${NC}"
fi

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Backup Complete${NC}"
echo "=========================================="
echo "Location: $BACKUP_DIR"
echo "Size: $BACKUP_SIZE"
echo ""
echo "Files created:"
ls -lh "$BACKUP_DIR" | tail -n 2
echo ""

# Clean old backups (keep last 7 days)
echo "Cleaning old backups (keeping last 7 days)..."
find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "env_*.backup" -mtime +7 -delete
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Show remaining backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/database_*.sql.gz 2>/dev/null | wc -l)
echo "Total backups: $BACKUP_COUNT"
echo ""
echo "To restore this backup:"
echo "  gunzip $BACKUP_DIR/${DB_BACKUP_FILE}.gz"
echo "  docker compose exec -T postgres psql -U photo_user photo_gallery < $BACKUP_DIR/$DB_BACKUP_FILE"
