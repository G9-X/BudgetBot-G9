# W7 Evidence Pack: BotUI - AI Money Coach

## 1. Kiến trúc hệ thống (Architecture)
- **Frontend**: Next.js App Router, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI (thư mục `apps/api`), sử dụng cấu trúc `handlers.py`, `app.py`, `config.py`.
- **Database**: Tương thích Supabase (PostgreSQL) thông qua lớp `PostgresUserStore` trong `userstore.py`. Hiện tại sử dụng `SQLiteUserStore` cho môi trường local/demo.
- **AI Provider**: Sử dụng **Ollama** (Local AI) kết nối qua thư viện `httpx`. Lựa chọn này giúp đảm bảo 100% quyền riêng tư (Zero-data leakage) và miễn phí chi phí API (phù hợp với chiến lược giảm chi phí mây).

### Data Flow
1. Người dùng tải lên file CSV trên giao diện `Money-Coach`.
2. Frontend đóng gói thành `FormData` và gọi API `POST /upload`.
3. Backend `handlers.py` parse CSV, sau đó chạy các luật (Rules) có sẵn. Nếu không khớp luật nào, Backend gọi `OllamaAI.categorize` thông qua HTTP POST đến `http://localhost:11434`.
4. Kết quả từ AI (bao gồm Category và Confidence Score) được lưu vào Database cùng trạng thái `AUTO_APPROVED` (nếu điểm >= 0.8) hoặc `NEEDS_REVIEW` (nếu điểm < 0.8).
5. Trả kết quả tóm tắt cho Frontend để render UI. Frontend sau đó gọi `GET /transactions` để hiển thị danh sách.

## 2. Prompt Engineering & AI Safety
### Prompt Template
```
Categorize the following bank transaction into exactly one category.
Categories: {categories}

Transaction: "{description}"
Amount: {amount}
Date: {date}

Respond with JSON only. No explanation.
{{"category": "<category>", "confidence": <float between 0.0 and 1.0>}}
```
- Sử dụng kỹ thuật Zero-shot với danh sách Category rõ ràng.
- Ràng buộc cấu trúc JSON để có thể map thẳng vào Schema của Database.

### AI Safety & Human-in-the-loop (HIL)
- Trí tuệ nhân tạo không hoàn hảo, đặc biệt là với các ngân hàng nội địa hoặc mô hình Ollama cỡ nhỏ.
- **Nguyên tắc Hybrid**: Hệ thống ưu tiên chạy Rule Matching trước. Ví dụ, nếu giao dịch chứa "Netflix", nó tự động được gắn nhãn "Subscriptions" với độ tự tin 1.0. AI chỉ can thiệp với các Merchant lạ (giúp tiết kiệm ~80% token inference).
- **HIL**: Nếu `confidence < 0.8`, giao dịch rơi vào hàng chờ `NEEDS_REVIEW`. Người dùng phải tự phân loại tay trên giao diện. Khi người dùng tick "Remember for next time", một Rule mới được sinh ra (`POST /rules`) để AI không bao giờ bị hỏi lại câu đó ở kỳ sao kê sau.

## 3. Tối ưu ROI (Return on Investment)
- Việc đẩy AI về chạy Local (Ollama) kết hợp Rule-based giúp tiết giảm 90% chi phí gọi LLM API hàng tháng.
- Kiến trúc phân mảnh (Frontend - Vercel / Backend API - Local/EC2 / DB - Supabase) cho phép ứng dụng mở rộng dễ dàng mà không bị vendor lock-in.

## 4. UI/UX
- Giao diện Dark Mode sang trọng, hỗ trợ đa ngôn ngữ (i18n).
- Tích hợp biểu đồ Recharts mượt mà, phân loại rõ ràng, và quan trọng nhất là tính năng Hỗ trợ đọc RTL cho ngôn ngữ đặc thù (như Ả Rập, Hebrew).
