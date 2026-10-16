#!/bin/bash

# ============================================================
# cleanup_originals.sh
# Xoá các file hình gốc đã được convert sang WebP thành công
#
# CẢNH BÁO: Hành động này KHÔNG THỂ HOÀN TÁC!
# Chỉ chạy sau khi đã kiểm tra kỹ toàn bộ file WebP.
#
# Usage:
#   ./cleanup_originals.sh <success_log_file>
#   ./cleanup_originals.sh converted_success_20240115_143022.log
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_ok()   { echo -e "${GREEN}[DELETED]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC}    $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC}   $1"; }
log_skip() { echo -e "${CYAN}[SKIP]${NC}    $1"; }

# --- Kiểm tra argument ---
if [ $# -eq 0 ]; then
  echo "Usage: $0 <success_log_file>"
  echo "Ví dụ: $0 converted_success_20240115_143022.log"
  exit 1
fi

LOG_FILE="$1"

if [ ! -f "$LOG_FILE" ]; then
  echo -e "${RED}[ERROR]${NC} Không tìm thấy file log: $LOG_FILE"
  exit 1
fi

TOTAL_LINES=$(grep -c . "$LOG_FILE" 2>/dev/null || echo "0")

if [ "$TOTAL_LINES" -eq 0 ]; then
  echo "File log rỗng, không có gì để xoá."
  exit 0
fi

# --- Header ---
echo "============================================================"
echo " Cleanup: Xoá file hình gốc đã convert sang WebP"
echo " Log file         : $LOG_FILE"
echo " Số file sẽ xử lý: $TOTAL_LINES"
echo "============================================================"
echo ""

# Preview 5 dòng đầu
echo "Ví dụ các file trong log:"
head -5 "$LOG_FILE" | while IFS= read -r line; do
  echo "  $line"
done
[ "$TOTAL_LINES" -gt 5 ] && echo "  ... và $((TOTAL_LINES - 5)) file khác"
echo ""

# --- Xác nhận ---
echo -e "${YELLOW}⚠️  CẢNH BÁO: Thao tác này sẽ XOÁ VĨNH VIỄN các file hình gốc!${NC}"
echo "Chỉ tiếp tục nếu bạn đã kiểm tra kỹ tất cả file WebP."
echo ""
echo -n "Nhập 'yes' để xác nhận xoá: "
read -r confirm

if [ "$confirm" != "yes" ]; then
  echo ""
  echo "Đã huỷ. Không có file nào bị xoá."
  exit 0
fi

echo ""

COUNT_DELETED=0
COUNT_SKIP_NO_ORIGINAL=0
COUNT_SKIP_NO_WEBP=0
COUNT_ERROR=0

while IFS= read -r original_file || [ -n "$original_file" ]; do

  [ -z "$original_file" ] && continue
  [[ "$original_file" == "[FAILED]"* ]] && continue

  webp_file="${original_file%.*}.webp"

  # File gốc không còn tồn tại
  if [ ! -f "$original_file" ]; then
    log_skip "File gốc không còn tồn tại: $original_file"
    COUNT_SKIP_NO_ORIGINAL=$((COUNT_SKIP_NO_ORIGINAL + 1))
    continue
  fi

  # File WebP không tồn tại → giữ lại bản gốc
  if [ ! -f "$webp_file" ]; then
    log_warn "WebP không tồn tại → GIỮ lại bản gốc"
    log_warn "  Gốc : $original_file"
    log_warn "  WebP: $webp_file"
    COUNT_SKIP_NO_WEBP=$((COUNT_SKIP_NO_WEBP + 1))
    continue
  fi

  # Xoá file gốc
  if rm "$original_file"; then
    log_ok "$original_file"
    COUNT_DELETED=$((COUNT_DELETED + 1))
  else
    log_err "Không thể xoá: $original_file"
    COUNT_ERROR=$((COUNT_ERROR + 1))
  fi

done < "$LOG_FILE"

echo ""
echo "============================================================"
echo " Kết quả"
echo " 🗑️  Đã xoá                 : $COUNT_DELETED"
echo " ⚠️  Giữ lại (WebP không có) : $COUNT_SKIP_NO_WEBP"
echo " ℹ️  File gốc đã mất rồi    : $COUNT_SKIP_NO_ORIGINAL"
echo " ❌ Lỗi                    : $COUNT_ERROR"
echo "============================================================"

[ "$COUNT_ERROR" -gt 0 ] && exit 1
exit 0
