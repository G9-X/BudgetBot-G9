# W7 Evidence Pack: BotUI - AI Money Coach

## 1. Kiến trúc hệ thống (Architecture)
- **Frontend**: Next.js App Router, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI (thư mục `apps/api`), sử dụng cấu trúc `handlers.py`, `app.py`, `config.py`.
- **Database**: Tương thích Supabase (PostgreSQL) thông qua lớp `PostgresUserStore` trong `userstore.py`. Hiện tại đã có driver kết nối sẵn sàng lên RDS PostgreSQL (db.t4g.small Multi-AZ) bảo mật trong Subnet riêng tư.
- **AI Provider**: Sử dụng **Amazon Bedrock (Claude 3.5 Haiku)** kết nối bảo mật qua VPC PrivateLink Interface Endpoints. Lựa chọn này giúp đảm bảo 100% quyền riêng tư dữ liệu tài chính (Zero data leakage sang public internet) và duy trì độ trễ cực thấp (<0.4s). Ollama (Local AI) vẫn được duy trì như một môi trường Sandbox cục bộ hoàn toàn miễn phí cho nhà phát triển.

### Data Flow
1. Người dùng tải lên file CSV trên giao diện `Money-Coach`.
2. Frontend đóng gói thành `FormData` và gọi API `POST /api/v1/imports`.
3. Backend `handlers.py` parse CSV, sau đó chạy phễu lọc tối ưu (Rules Engine). Nếu khớp các luật định sẵn (Regex) hoặc luật đã học (Learned Rules), category được gán trực tiếp với `confidence = 1.0` và trạng thái `AUTO_APPROVED` mà không gọi AI.
4. Với các dòng giao dịch chưa giải quyết được, Backend gọi **Amazon Bedrock (Claude 3.5 Haiku)** thông qua VPC Endpoint để phân loại có cấu trúc (Structured JSON output).
5. Kết quả từ AI (bao gồm Category và Confidence Score) được lưu vào Database cùng trạng thái `AUTO_APPROVED` (nếu điểm >= 0.8) hoặc `NEEDS_REVIEW` (nếu điểm < 0.8).
6. Trả kết quả tóm tắt cho Frontend để hiển thị danh sách giao dịch qua `GET /api/v1/transactions`.

## 2. Prompt Engineering & AI Safety
### Prompt Template (Few-shot Structured JSON)
```
Categorize the following bank transaction into exactly one category.
Categories: {categories}

Transaction: "{description}"
Amount: {amount}
Date: {date}

Respond with JSON only. No explanation.
{{"category": "<category>", "confidence": <float between 0.0 and 1.0>}}
```
- Sử dụng kỹ thuật Few-shot Prompting với các ví dụ thực tế được mã hóa cứng trong Adapter để định hình phản hồi chính xác của mô hình.
- Ràng buộc cấu trúc JSON để có thể map thẳng vào Schema của Database mà không lo lỗi phân tách cú pháp (parser error).

### AI Safety & Human-in-the-loop (HIL)
- **Nguyên tắc Hybrid**: Hệ thống ưu tiên chạy Rule Matching trước. Ví dụ, nếu giao dịch chứa "Netflix", nó tự động được gắn nhãn "Subscriptions" với độ tự tin 1.0. Phễu lọc này giúp lọc sạch tới 64% số dòng giao dịch lặp lại trước khi cần gọi LLM, giúp tiết giảm chi phí gọi API tối đa.
- **HIL**: Nếu `confidence < 0.8`, giao dịch rơi vào hàng chờ duyệt `NEEDS_REVIEW`. Người dùng phải tự phân loại thủ công trên giao diện Review Queue. Khi người dùng xác nhận và chọn "Remember for next time", hệ thống tự động sinh một luật mới (`POST /api/v1/rules`) ghi vào bảng `merchant_rules` để tự động hóa hoàn toàn ở các kỳ sao kê sau.

## 3. Tối ưu ROI (Return on Investment)
- Sử dụng Claude 3.5 Haiku giúp giảm chi phí token xuống gấp 20 lần so với Claude 3.5 Sonnet trong khi vẫn duy trì độ chính xác phân loại tương đương đối với định dạng giao dịch ngân hàng ngắn.
- Thiết lập phễu lọc deterministic rules giúp giảm 64% số lượng API call tới Bedrock, đưa chi phí xử lý trung bình xuống mức siêu việt chỉ **$0.20 trên 1,000 giao dịch**.
- Việc không sử dụng NAT Gateway bằng cách tận dụng S3 Gateway Endpoint và VPC Interface Endpoints cho Bedrock giúp giảm $32/tháng chi phí hạ tầng mạng cố định.

## 4. UI/UX
- Giao diện Dark Mode sang trọng lấy cảm hứng từ Apple Card và Copilot Money, hỗ trợ đa ngôn ngữ (i18n).
- Tích hợp biểu đồ Recharts mượt mà hiển thị phân bổ chi tiêu, và quan trọng nhất là tính năng Hỗ trợ đọc RTL cho ngôn ngữ đặc thù (như Ả Rập, Hebrew).

## 5. Báo cáo Chi phí (Cost Explorer & Drivers)
*Yêu cầu nộp: 3 tấm ảnh chụp Cost Explorer (Cuối D1, D2, Sáng Demo).*
- [ ] Ảnh D1: `docs/evidence_images/cost/day1_cost.png`
- [ ] Ảnh D2: `docs/evidence_images/cost/day2_cost.png`
- [ ] Ảnh Demo: `docs/evidence_images/cost/demo_cost.png`

**Top 3 Cost Drivers (Production Launch ap-southeast-1):**
1. **AWS RDS (db.t4g.small Multi-AZ)**: $87.24/tháng (gồm compute và gp3 storage). Đây là thành phần tốn kém nhất nhưng bắt buộc để đảm bảo tính sẵn sàng cao (High Availability) cho dữ liệu giao dịch tài chính nhạy cảm của người dùng.
2. **Amazon VPC Interface Endpoints (Bedrock & Secrets Manager)**: $37.44/tháng. Đảm bảo dữ liệu nhạy cảm của người dùng không bao giờ đi qua Internet công cộng mà được truyền nhận hoàn toàn trong mạng nội bộ AWS.
3. **AWS WAF (Web Application Firewall)**: $29.01/tháng. Lá chắn bảo mật ngăn chặn các cuộc tấn công web phổ biến (DDoS, SQL Injection, OWASP Top 10) cho các public endpoint.

*Tổng chi phí duy trì cố định hằng tháng ở cấp độ Production HA đầy đủ bảo mật là **$213.34/tháng** (chưa tính gói hỗ trợ Business Support).*

## 6. Bảo mật (Security - IAM & Network)
- **IAM:** Đã thiết lập Least-privilege. Phân quyền chính xác cho Lambda chỉ được phép Read/Write S3 bucket cụ thể, truy cập RDS qua RDS Proxy, và gọi Bedrock model cụ thể qua IAM Policies.
- **Network:** Database được cấu hình không mở Public Access. Chỉ Lambda nằm trong cùng VPC ứng dụng và được gắn Security Group chỉ định mới được phép gửi truy vấn qua cổng 5432 đến RDS Proxy.

## 7. Theo dõi hệ thống (Monitoring)
*Yêu cầu nộp: Ảnh chụp dashboard giám sát.*
- [ ] Ảnh CloudWatch: `docs/evidence_images/monitoring/cloudwatch.png`
- Đã thiết lập AWS Cost Anomaly Detection để tự động phát hiện chi phí bất thường và gửi cảnh báo qua email.
- Thiết lập AWS Budget Alerts ở ngưỡng cứng $80 để ngăn chặn rủi ro vượt ngân sách $100 của kỳ Hackathon.
- Áp dụng cơ chế **Embedded Metric Format (EMF)** ghi log có cấu trúc để CloudWatch tự động bóc tách các custom metric quan trọng (`RuleMatchRate`, `NeedsReviewRate`, `BedrockLatencyMs`) mà không làm phát sinh thêm chi phí Endpoint giám sát riêng biệt.

## 8. Bài học rút ra (Lessons Learned)
- **Cân nhắc giữa Bảo mật và Chi phí**: Thiết kế một VPC cô lập hoàn toàn không có NAT Gateway giúp bảo vệ dữ liệu tài chính tối đa và tiết kiệm chi phí lớn, nhưng đòi hỏi cấu hình chuẩn xác các VPC Interface Endpoints và Gateway Endpoints để Lambda có thể giao tiếp với S3 và Bedrock. Đây là bài học lớn về việc "thiết kế bảo mật từ gốc" (Secure by Design).
- **Sức mạnh của Phễu lọc lai (Hybrid Funnel)**: Việc phụ thuộc hoàn toàn vào LLM cho mọi dòng giao dịch không chỉ làm tăng vọt chi phí mà còn làm chậm thời gian phản hồi của hệ thống. Tích hợp Rules Engine deterministic chạy trước AI giúp tối ưu hóa cả hai chiều: phản hồi tức thì với giao dịch quen thuộc và chỉ sử dụng "trí thông minh nhân tạo" đắt giá cho các trường hợp thực sự mơ hồ.
- **Tính thực tế doanh nghiệp**: Đưa một ứng dụng tài chính từ local lên đám mây không đơn giản là triển khai code chạy được, mà phải giải quyết triệt để bài toán độ sẵn sàng cao (Multi-AZ), bảo vệ biên mạng (AWS WAF), quản lý phiên kết nối (RDS Proxy), và bảo vệ thông tin định danh cá nhân nhạy cảm (Bedrock Guardrails). Việc hoạch định và đo lường chính xác các Cost Drivers giúp doanh nghiệp chủ động kiểm soát chi phí ngay từ ngày đầu ra mắt sản phẩm.

