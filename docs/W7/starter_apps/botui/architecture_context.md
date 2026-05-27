# 💰 AI Money Coach (Domain B) - Project Blueprint & Context

Tài liệu này cung cấp toàn bộ ngữ cảnh (Context), kiến trúc hệ thống và giao thức API để nhóm của bạn có thể tự khởi tạo dự án Next.js tại thư mục `botui` này và code độc lập.

## 1. Tổng quan Kiến trúc Hệ thống (Hybrid Multi-Agent)

Ứng dụng tuân theo mẫu kiến trúc **Supervisor Agent** kết hợp **Human-in-the-loop (HITL)** của AWS Bedrock (tạm thời chạy bằng Local Ollama để thay thế Bedrock do đang chờ duyệt).

- **Frontend:** `Next.js` (App Router) + `TailwindCSS` + `shadcn/ui`. Giao tiếp với Backend qua REST API.
- **Backend:** `FastAPI` (Python - thư mục `budgetbot`). Nơi chứa logic phân loại giao dịch (Classification Engine).
- **AI Backend:** `Ollama` chạy local model `llama3.1:8b`.
- **Database:** `SQLite` (hoặc biến in-memory tạm thời) để lưu danh sách giao dịch.

---

## 2. Luồng xử lý dữ liệu (Classification Workflow)

Khi người dùng upload một file CSV chứa sao kê ngân hàng (Bank Statement):

1. **Bước 1 (Regex/Rule-based):** Backend đọc từng dòng CSV. Quét nhanh bằng Regex. 
   - *Ví dụ:* Nếu `Description` chứa chữ `GRAB` -> Gắn luôn category là `Transport`, confidence = `1.0`. (Cách này tiết kiệm tới 50% chi phí và thời gian gọi LLM).
2. **Bước 2 (LLM Supervisor Agent):** Với những dòng Regex không bắt được (ví dụ `VINMART HCM 04`), gửi prompt cho Ollama. Yêu cầu Ollama ép kiểu dữ liệu trả về (Structured Output) theo chuẩn JSON gồm `{ "category": "Food", "confidence": 0.8 }`.
3. **Bước 3 (Human-in-the-loop):** Backend kiểm tra lại kết quả của Ollama.
   - Nếu `confidence >= 0.6`: Lưu vào DB với trạng thái `AUTO_APPROVED`.
   - Nếu `confidence < 0.6` hoặc category trả về là rác: Gắn trạng thái `NEEDS_REVIEW` (Chờ người duyệt).

---

## 3. Cấu trúc Dữ liệu (Data Schema)

Để Frontend và Backend hiểu nhau, nhóm thống nhất dùng cấu trúc Transaction này:

```json
{
  "id": "txn_12345",
  "date": "2026-05-27",
  "description": "VINMART HCM 04",
  "amount": 250000,
  "category": "Food",       // Các Enum: "Food", "Transport", "Subscriptions", "Shopping", "Unclassified"
  "confidence": 0.55,       // Từ 0.0 đến 1.0
  "status": "NEEDS_REVIEW"  // Các Enum: "AUTO_APPROVED", "NEEDS_REVIEW", "MANUAL_APPROVED"
}
```

---

## 4. Đặc tả API (API Contract)

Frontend Next.js sẽ gọi 3 API chính từ FastAPI Backend (chạy ở `http://localhost:8000`):

### 4.1. Upload CSV
- **Endpoint:** `POST /api/upload`
- **Payload:** File `multipart/form-data` chứa file `.csv`
- **Response:** Trả về danh sách toàn bộ transactions vừa được AI phân loại.
```json
{
  "total_processed": 50,
  "needs_review_count": 5,
  "transactions": [ ...danh sách object Transaction... ]
}
```

### 4.2. Lấy danh sách giao dịch (Dành cho Dashboard)
- **Endpoint:** `GET /api/transactions`
- **Response:**
```json
{
  "transactions": [ ... ]
}
```

### 4.3. Human-in-the-loop: Phê duyệt giao dịch (Review Queue)
Khi User mở trang "Review Queue" trên Next.js, họ sửa lại category của các giao dịch `NEEDS_REVIEW` cho đúng, sau đó submit API này.
- **Endpoint:** `POST /api/transactions/review`
- **Payload:**
```json
{
  "transaction_id": "txn_12345",
  "corrected_category": "Shopping"
}
```
- **Response:**
```json
{
  "status": "success",
  "updated_transaction": {
     "id": "txn_12345",
     "category": "Shopping",
     "status": "MANUAL_APPROVED"
  }
}
```

---

## 5. Hướng dẫn Tự tạo Dự án Frontend (Next.js)

Nhóm bạn mở Terminal, trỏ vào đúng thư mục `botui` này và chạy lệnh sau để tự khởi tạo Next.js với Tailwind:

```bash
cd /home/dinh/Downloads/xbrain/xbrain-learners/W7/starter_apps/botui
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn-ui@latest init
```
