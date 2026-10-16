#!/bin/bash

# ============================================================
# convert_to_webp.sh
# Convert tất cả file hình trong thư mục (bao gồm thư mục con) sang WebP
#
# Usage:
#   ./convert_to_webp.sh [thư_mục]
#   ./convert_to_webp.sh /path/to/images
#   ./convert_to_webp.sh .   (thư mục hiện tại)
#
# Output:
#   - File webp cạnh file gốc
#   - converted_success_<timestamp>.log  — danh sách file gốc đã convert thành công
#   - converted_errors_<timestamp>.log   — danh sách lỗi (nếu có)
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_ok()   { echo -e "${GREEN}[OK]${NC}    $1"; }
log_skip() { echo -e "${YELLOW}[SKIP]${NC}  $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

# --- Config ---
TARGET_DIR="${1:-.}"
WEBP_QUALITY=80
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SUCCESS_LOG="${SCRIPT_DIR}/converted_success_${TIMESTAMP}.log"
ERROR_LOG="${SCRIPT_DIR}/converted_errors_${TIMESTAMP}.log"

# --- Kiểm tra thư mục ---
if [ ! -d "$TARGET_DIR" ]; then
  echo -e "${RED}[ERROR]${NC} Không tìm thấy thư mục: $TARGET_DIR"
  exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

# --- Kiểm tra cwebp ---
if ! command -v cwebp &> /dev/null; then
  echo -e "${RED}[ERROR]${NC} 'cwebp' chưa được cài. Cài bằng: brew install webp"
  exit 1
fi

# Kiểm tra công cụ tùy chọn
HAS_GIF2WEBP=false
command -v gif2webp &> /dev/null && HAS_GIF2WEBP=true

HAS_MAGICK=false
MAGICK_CMD=""
if command -v magick &> /dev/null; then
  HAS_MAGICK=true; MAGICK_CMD="magick"
elif command -v convert &> /dev/null; then
  HAS_MAGICK=true; MAGICK_CMD="convert"
fi

echo "============================================================"
echo " Convert to WebP"
echo " Thư mục     : $TARGET_DIR"
echo " Quality     : $WEBP_QUALITY"
echo " Success log : $SUCCESS_LOG"
echo " Error log   : $ERROR_LOG"
echo "============================================================"
echo ""

COUNT_SUCCESS=0
COUNT_SKIP_WEBP=0
COUNT_SKIP_NO_TOOL=0
COUNT_ERROR=0

while IFS= read -r -d '' file; do

  filename="$(basename "$file")"
  ext="${filename##*.}"
  ext_lower="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"
  output="${file%.*}.webp"

  case "$ext_lower" in

    webp)
      log_skip "Đã là WebP: $file"
      COUNT_SKIP_WEBP=$((COUNT_SKIP_WEBP + 1))
      ;;

    jpg|jpeg|png|tiff|tif)
      if cwebp -q "$WEBP_QUALITY" "$file" -o "$output" 2>> "$ERROR_LOG"; then
        log_ok "$filename → $(basename "$output")"
        echo "$file" >> "$SUCCESS_LOG"
        COUNT_SUCCESS=$((COUNT_SUCCESS + 1))
      else
        log_err "Lỗi khi convert: $file"
        echo "[FAILED] $file" >> "$ERROR_LOG"
        COUNT_ERROR=$((COUNT_ERROR + 1))
      fi
      ;;

    gif)
      if [ "$HAS_GIF2WEBP" = true ]; then
        if gif2webp "$file" -o "$output" 2>> "$ERROR_LOG"; then
          log_ok "$filename → $(basename "$output")"
          echo "$file" >> "$SUCCESS_LOG"
          COUNT_SUCCESS=$((COUNT_SUCCESS + 1))
        else
          log_err "Lỗi khi convert GIF: $file"
          echo "[FAILED] $file" >> "$ERROR_LOG"
          COUNT_ERROR=$((COUNT_ERROR + 1))
        fi
      else
        log_skip "gif2webp không có, bỏ qua: $filename  (brew install webp)"
        COUNT_SKIP_NO_TOOL=$((COUNT_SKIP_NO_TOOL + 1))
      fi
      ;;

    bmp)
      if [ "$HAS_MAGICK" = true ]; then
        if "$MAGICK_CMD" "$file" -quality "$WEBP_QUALITY" "$output" 2>> "$ERROR_LOG"; then
          log_ok "$filename → $(basename "$output")"
          echo "$file" >> "$SUCCESS_LOG"
          COUNT_SUCCESS=$((COUNT_SUCCESS + 1))
        else
          log_err "Lỗi khi convert BMP: $file"
          echo "[FAILED] $file" >> "$ERROR_LOG"
          COUNT_ERROR=$((COUNT_ERROR + 1))
        fi
      else
        log_skip "ImageMagick không có, bỏ qua BMP: $filename  (brew install imagemagick)"
        COUNT_SKIP_NO_TOOL=$((COUNT_SKIP_NO_TOOL + 1))
      fi
      ;;

  esac

done < <(find "$TARGET_DIR" -type f \( \
  -iname "*.jpg"  -o \
  -iname "*.jpeg" -o \
  -iname "*.png"  -o \
  -iname "*.gif"  -o \
  -iname "*.bmp"  -o \
  -iname "*.tiff" -o \
  -iname "*.tif"  -o \
  -iname "*.webp" \
\) -print0 | sort -z)

echo ""
echo "============================================================"
echo " Kết quả"
echo " ✅ Convert thành công    : $COUNT_SUCCESS"
echo " ↩️  Đã là WebP (bỏ qua)  : $COUNT_SKIP_WEBP"
echo " ⚠️  Bỏ qua (thiếu tool)  : $COUNT_SKIP_NO_TOOL"
echo " ❌ Lỗi                  : $COUNT_ERROR"
echo ""
if [ "$COUNT_SUCCESS" -gt 0 ]; then
  echo " 📄 Dùng file log sau để xoá bản gốc:"
  echo "    ./cleanup_originals.sh $SUCCESS_LOG"
fi
if [ "$COUNT_ERROR" -gt 0 ]; then
  echo " 📄 Chi tiết lỗi: $ERROR_LOG"
fi
echo "============================================================"

[ "$COUNT_ERROR" -gt 0 ] && exit 1
exit 0
