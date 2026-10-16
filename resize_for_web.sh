#!/bin/bash

# ============================================================
# resize_for_web.sh
# Resize ảnh WebP về max 800px (cạnh dài) + quality 65
# để tối ưu cho web / GitHub Pages.
#
# Usage:
#   ./resize_for_web.sh [thư_mục]            # resize tất cả .webp trong thư mục đó
#   ./resize_for_web.sh blackhole/pictures   # ví dụ
#
# Yêu cầu: ImageMagick  →  brew install imagemagick
# ============================================================

TARGET_DIR="${1:-.}"
MAX_PX=800       # cạnh dài tối đa (px)
QUALITY=65       # WebP quality (60-70 là đủ đẹp cho web)

# ── Màu terminal ──────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

# ── Kiểm tra ImageMagick ──────────────────────────────────────
MAGICK=""
if command -v magick &> /dev/null; then
  MAGICK="magick"
elif command -v convert &> /dev/null; then
  MAGICK="convert"
else
  echo -e "${RED}[ERROR]${NC} Cần ImageMagick: brew install imagemagick"
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}[ERROR]${NC} Không tìm thấy thư mục: $TARGET_DIR"
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
echo "============================================================"
echo " Resize WebP cho web"
echo " Thư mục : $TARGET_DIR"
echo " Max size: ${MAX_PX}px  |  Quality: ${QUALITY}"
echo "============================================================"

COUNT=0
SAVED_BYTES=0

while IFS= read -r -d '' f; do
  orig=$(wc -c < "$f")

  # resize: chỉ thu nhỏ nếu lớn hơn MAX_PX (ký hiệu > = only shrink)
  if "$MAGICK" "$f" -resize "${MAX_PX}x${MAX_PX}>" -quality "$QUALITY" "$f" 2>/dev/null; then
    new=$(wc -c < "$f")
    saved=$(( orig - new ))
    SAVED_BYTES=$(( SAVED_BYTES + saved ))
    COUNT=$(( COUNT + 1 ))
    orig_kb=$(( orig / 1024 ))
    new_kb=$(( new / 1024 ))
    echo -e "${GREEN}[OK]${NC} $(basename "$f")  ${orig_kb}KB → ${new_kb}KB  (-$(( saved / 1024 ))KB)"
  else
    echo -e "${RED}[ERR]${NC} $(basename "$f")"
  fi

done < <(find "$TARGET_DIR" -maxdepth 1 -iname "*.webp" -type f -print0 | sort -z)

echo ""
echo "============================================================"
echo " ✅ Đã resize: $COUNT file"
echo " 💾 Tiết kiệm: $(( SAVED_BYTES / 1024 / 1024 ))MB"
echo "============================================================"
