# AI Money Coach - Architecture Decision and Cost Estimate

**Ngày lập tài liệu:** 2026-05-27  
**Phạm vi:** Kiến trúc triển khai W7 cho frontend Next.js và backend FastAPI hiện có  
**Region tính chi phí:** `ap-southeast-1` (Singapore)  
**Budget constraint:** `$100` cho 48 giờ hackathon

## 1. Kết luận

Chọn kiến trúc **hybrid transaction classification có human review**:

```text
Browser
  -> AWS Amplify Hosting (Next.js, HTTPS public entry)
  -> API Gateway REST API
  -> AWS Lambda (Python/FastAPI application adapter)
       -> Amazon S3 (encrypted original CSV uploads)
       -> Amazon RDS for PostgreSQL Single-AZ + RDS Proxy
       -> Amazon Bedrock direct model invocation for unresolved rows only
       -> Amazon CloudWatch logs, metrics, dashboard and alarm

Network boundary:
  Lambda in private application subnets
  RDS in private database subnets; inbound only from Lambda security group
  S3 Gateway VPC Endpoint
  Bedrock Runtime Interface VPC Endpoint
  No NAT Gateway for the W7 topology
```

Đây là một kiến trúc hexagonal nhẹ: business policy không phụ thuộc AWS SDK hoặc database, còn Bedrock, S3, PostgreSQL và HTTP chỉ là adapters. Không thêm CQRS, event sourcing, microservices hoặc Bedrock Agent trong phiên bản W7 vì chúng tăng thời gian triển khai mà không giải quyết core challenge.

## 2. Inputs đã đối chiếu

Kiến trúc này dựa trên:

- Tài liệu sản phẩm: `architecture_context.md`, `evidence_pack_domain_b.md`, `case_studies_urls.md`.
- Tài liệu W2: storage, encryption, IAM roles, least privilege.
- Tài liệu W3: chọn database paradigm theo access patterns, DB trong private subnet.
- Tài liệu W4: phân biệt document retrieval/RAG với dữ liệu cấu trúc cần truy vấn chính xác.
- Tài liệu W5: API Gateway trước Lambda, auth/throttling và network isolation.
- Tài liệu W6: tagging, budget controls và CloudWatch evidence.
- Tài liệu W7: rubric, BudgetBot reference architecture, cost estimate và starter implementation.

Không có thư mục `docs/W1` trong workspace hiện tại.

## 3. Architecture decisions

### AD-01 - Hosting frontend: Amplify Hosting

**Chọn:** AWS Amplify Hosting cho ứng dụng Next.js hiện tại.  
**Không chọn ngay:** S3 static hosting + CloudFront.

**Lý do:**

- Frontend đang dùng Next.js App Router và route động `app/app/[section]/page.tsx`.
- Amplify cung cấp HTTPS public entry và hỗ trợ Next.js mà không cần đổi routing để static export.
- S3 + CloudFront là phương án rẻ và đúng reference BudgetBot, nhưng chỉ phù hợp nếu frontend được chuyển thành static build thành công.

### AD-02 - API và compute: API Gateway REST API + Lambda

**Chọn:** API Gateway REST API gọi Lambda Python/FastAPI adapter.

**Lý do:**

- Request demo ngắn và bursty: upload CSV, lấy danh sách, review, insights.
- Lambda tránh chi phí/operation của máy chủ luôn chạy.
- REST API bám sát BudgetBot reference và thuận lợi nếu demo API key/throttling theo bài học W5.

**Không chọn:**

| Phương án | Lý do loại ở W7 |
| --- | --- |
| EC2 chạy FastAPI/Ollama | Cần vận hành server và Ollama không đáp ứng yêu cầu real Bedrock invocation. |
| ECS/Fargate | Chỉ hợp lý nếu parsing/import là long-running workload hoặc cần container runtime đặc biệt. |
| Lambda Function URL | Thiếu API management evidence rõ bằng API Gateway cho auth/throttling. |

### AD-03 - AI pipeline: Rules -> Bedrock few-shot -> Review queue

**Chọn:** deterministic rules và learned merchant rules chạy trước; chỉ dòng chưa giải quyết được mới gọi Bedrock bằng structured few-shot prompt.

```text
known/learned rule match -> category, confidence=1.0, AUTO_APPROVED
no rule match          -> Bedrock JSON classification
confidence >= threshold -> AUTO_APPROVED
confidence < threshold  -> NEEDS_REVIEW
user correction         -> MANUAL_APPROVED, optionally create learned rule
```

**Lý do:**

- Domain B chấm vào ambiguous input, confidence, review flow, measured accuracy và failure cases.
- Direct model invocation phù hợp classification của một transaction row; không cần retrieval corpus.
- Rules giảm model calls theo mức lặp lại thực tế được đo từ sample, thay vì tuyên bố một tỷ lệ chưa đo.

**Threshold:** bắt đầu thử nghiệm ở `0.80`, nhưng chỉ chốt sau khi chạy tối thiểu 30 giao dịch đã gán nhãn và lập confusion matrix. Hiện tài liệu cũ ghi `0.60` trong khi code/evidence đang dùng `0.80`; phải thống nhất trước demo.

**Không chọn:**

| Phương án | Khi phù hợp | Lý do loại ở W7 |
| --- | --- | --- |
| Zero-shot cho mọi row | Prototype cực nhanh | Không khai thác learned rules; yếu hơn với mã giao dịch mơ hồ. |
| Bedrock Knowledge Base / RAG | Hỏi đáp trên documents hoặc correction history lớn | Transaction classification không cần vector retrieval; tăng cost và moving parts. |
| Bedrock Agent / Return of Control | Agent cần chọn và thực thi action groups | Review queue là application workflow, không phải agent orchestration. |
| Comprehend custom classifier | Có đủ labeled training set và inference scale lớn | Chưa có dữ liệu huấn luyện đủ để justify training path. |

### AD-04 - Persistence: RDS PostgreSQL Single-AZ + RDS Proxy

**Chọn:** PostgreSQL cho data ứng dụng và RDS Proxy trước DB.

**Primary access patterns:**

| Access pattern | Query shape |
| --- | --- |
| Spending theo tháng/category | `GROUP BY category` + date range |
| Transactions cần review | filter theo `user_id`, `status` |
| Audit import/model/review | join import với transactions |
| Rules đã học của user | exact/prefix lookup theo normalized merchant |

**Lý do:**

- Insight là bài toán aggregation/reporting tự nhiên của SQL.
- Review update cần tính nhất quán và audit fields rõ.
- RDS Proxy bảo vệ instance nhỏ khỏi connection burst từ Lambda.
- Single-AZ phù hợp thời lượng hackathon; cần ghi rõ đây không phải production HA.

**Không chọn DynamoDB:** DynamoDB phù hợp key-value access ở throughput cao; với các aggregate theo category/tháng sẽ cần denormalized summary tables hoặc pipeline bổ sung.

### AD-05 - Network, secrets và IAM

**Chọn:**

- Một VPC cho một ứng dụng, gồm application subnets và private database subnets.
- RDS security group chỉ nhận PostgreSQL traffic từ Lambda security group.
- Không có NAT Gateway; Lambda chỉ gọi AWS services qua endpoints.
- S3 upload bucket bật Block Public Access và encryption; dùng một KMS CMK nếu chọn evidence encryption.
- DB credential lưu trong Secrets Manager; Lambda execution role chỉ có quyền trên bucket, model, secret và log/metric cần thiết.

**Lý do:** Carry-forward trực tiếp từ W2/W3/W5, đồng thời tránh NAT cost theo W7 guidance.

### AD-06 - Optional capability: Full Observability

**Chọn:** Full Observability thay vì chỉ Advanced Cost Insights.

**Evidence đề xuất:**

| Evidence | Mục đích |
| --- | --- |
| Custom metric `TransactionsClassified` | Chứng minh pipeline xử lý data thật. |
| Custom metric `NeedsReviewRate` | Chứng minh safety trade-off. |
| Custom metric `RuleMatchRate` | Chứng minh claim giảm model calls. |
| Custom metric `BedrockLatencyMs` | Chứng minh performance của AI path. |
| Alarm trên Lambda errors hoặc API 5xx | Chứng minh operational response. |
| Saved Log Insights query theo `importId` | Truy vết một demo execution. |

Ba ảnh Cost Explorer và phân tích cost-per-feature vẫn phải ghi vào evidence pack vì là yêu cầu W7.

## 4. Target API contract

Contract cũ và code hiện tại đang không thống nhất. Chốt một versioned API trước khi deploy:

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `POST` | `/api/v1/imports` | Upload CSV và tạo import job/result. |
| `GET` | `/api/v1/transactions` | Lấy transaction list có filter/status. |
| `PATCH` | `/api/v1/transactions/{id}/review` | User sửa category và approve. |
| `GET` | `/api/v1/insights?month=YYYY-MM` | Spending aggregation cho dashboard. |
| `POST` | `/api/v1/rules` | Lưu learned merchant rule sau review. |

Schema lưu trữ tối thiểu:

| Table | Fields quan trọng |
| --- | --- |
| `imports` | `id`, `user_id`, `s3_key`, `uploaded_at`, `row_count`, `status` |
| `transactions` | `id`, `import_id`, `user_id`, `txn_date`, `description`, `amount`, `category`, `confidence`, `status`, `classification_source`, `model_id`, `prompt_version`, `reviewed_at` |
| `merchant_rules` | `id`, `user_id`, `normalized_pattern`, `category`, `created_from_transaction_id` |
| `budgets` | `user_id`, `month`, `category`, `cap_amount` |

## 5. Cost methodology

### Pricing inputs

Các đơn giá RDS, RDS Proxy, S3, KMS, VPC endpoint, REST API, Lambda và baseline Bedrock dưới đây lấy từ `docs/W7/W7_cost_estimates.md`, cập nhật ngày `2026-05-24`, với giả định list price tại Singapore và không tính free tier.

Các bổ sung cho kiến trúc đề xuất:

| Service | Price input | Source/assumption |
| --- | ---: | --- |
| Amplify build Standard | `$0.01/minute` | Official AWS Amplify pricing, outside free tier |
| Amplify data served | `$0.15/GB` | Official AWS Amplify pricing, outside free tier |
| Amplify CDN storage | `$0.023/GB-month` | Official AWS Amplify pricing, outside free tier |
| Secrets Manager | `$0.40/secret-month` | Official AWS Secrets Manager pricing |
| CloudWatch custom metrics | `$0.30/metric-month` | Conservative paid-tier estimate; pricing is region-sensitive |
| CloudWatch dashboard | `$3.00/dashboard-month` | Conservative paid-tier estimate |
| CloudWatch standard alarm | `$0.10/alarm-metric-month` | Official AWS example unit |
| CloudWatch log ingestion | `$0.50/GB` | Conservative paid-tier estimate |

AWS states that CloudWatch free tier includes 10 custom metrics, 3 dashboards, 10 standard alarm metrics and 5 GB logs/month. The conservative total below ignores those allowances so the estimate remains usable if free tier is unavailable.

### Bedrock token assumption

The course baseline calls the model for every transaction with approximately `150 input + 30 output` tokens. The proposed few-shot hybrid path assumes:

- `350` input tokens per Bedrock-classified row due to instructions and 5-10 examples.
- `30` output tokens per classified row.
- Claude 3.5 Haiku planning price from W7 reference: `$1.00/M input tokens + $5.00/M output tokens`.
- `rule match rate` is an experimental variable, not an established project result.

Formula:

```text
Bedrock cost =
  transaction_count * (1 - rule_match_rate)
  * ((350 / 1,000,000 * $1.00) + (30 / 1,000,000 * $5.00))
```

## 6. 48-hour hackathon estimate

### Assumptions

| Variable | Value |
| --- | ---: |
| Imported transactions | `2,000` |
| Rule match rate planning case | `60%` |
| Bedrock classified rows | `800` |
| Lambda invocations | `500`, `512 MB`, `3s` average |
| Frontend data served | `0.5 GB` |
| Amplify build time | `10 minutes` |
| CloudWatch logs | `0.1 GB` |
| Custom metrics / dashboard / alarm | `4 / 1 / 1` |

### Recommended architecture cost

| Service | Calculation | 48-hour cost |
| --- | ---: | ---: |
| Lambda | W7 reference workload | `$0.012` |
| API Gateway REST | `500` calls | `$0.002` |
| Bedrock Haiku, hybrid few-shot | `800 * (350 in + 30 out)` | `$0.400` |
| RDS PostgreSQL `db.t3.micro`, Single-AZ | `$0.026/hr * 48` | `$1.250` |
| RDS gp3 storage | `20 GB * $0.138 * 48/720` | `$0.180` |
| RDS Proxy | `$0.018/hr * 48` | `$0.860` |
| S3 statement uploads | small demo workload | `$0.002` |
| Amplify Hosting, no free tier | `10 min build + 0.5 GB served + negligible storage` | `$0.176` |
| KMS CMK | `$1/month * 48/720` | `$0.070` |
| Bedrock Interface VPC Endpoint | `$0.013/hr * 48` | `$0.620` |
| Secrets Manager, one DB secret | `$0.40/month * 48/720` | `$0.027` |
| **Subtotal before optional observability** |  | **`$3.599`** |
| CloudWatch Full Observability, conservative paid case | `4 metrics + 1 dashboard + 1 alarm + 0.1 GB logs`, prorated where applicable | `$0.337` |
| **Total conservative estimate** |  | **`$3.936` (~`$3.94`)** |

**Budget result:** approximately `3.94%` of the `$100` cap, leaving about `$96.06` headroom. If the account remains inside CloudWatch and Amplify free allowances, the billed amount can be lower; evidence should report actual Cost Explorer values rather than replace them with this estimate.

### Difference from W7 BudgetBot reference

| Change | Cost effect |
| --- | ---: |
| Replace all-row direct model calling with 60% rule-match hybrid few-shot | `-$0.200` |
| Replace CloudFront/static hosting with Amplify for current Next.js app | `+$0.133` approximately |
| Add Secrets Manager for DB credential | `+$0.027` |
| Add Full Observability optional capability, conservative paid calculation | `+$0.337` |
| Reference BudgetBot total | `$3.650` |
| Recommended total | **`$3.936`** |

The architecture costs about `$0.29` more than the static reference while avoiding frontend static-export risk and providing measurable AI safety evidence.

## 7. Bedrock sensitivity analysis

### Varying rule match rate for 2,000 transactions

| Rule match rate | Rows sent to Bedrock | Bedrock cost | Total with paid observability |
| ---: | ---: | ---: | ---: |
| `0%` | `2,000` | `$1.000` | `$4.536` |
| `40%` | `1,200` | `$0.600` | `$4.136` |
| `60%` | `800` | `$0.400` | `$3.936` |
| `80%` | `400` | `$0.200` | `$3.736` |

At the planning case of `60%` rule matches, the model cost is **`$0.20 per 1,000 imported transactions`**. The project must measure the actual rule-match rate from sample imports before making this an evidence claim.

### Model-selection experiment

Use the same 30+ labeled transactions against at least two Bedrock models. Record macro F1, review rate, latency and calculated cost. Select the cheapest model that meets accuracy and safety targets; do not select solely by price.

## 8. Production Launch Cost Model ( ap-southeast-1, Singapore )

Một ước tính ban đầu ở mức **~$106.87/tháng** là quá thấp đối với một hệ thống được định nghĩa là "production" trong ngành tài chính. Con số đó chỉ phản ánh một môi trường demo/sandbox tối giản, thiếu đi các yếu tố tối quan trọng: độ sẵn sàng cao (High Availability), bảo mật mạng nội bộ (Private VPC Interface Endpoints), proxy cơ sở dữ liệu tính theo vCPU thực tế, tường lửa bảo vệ các endpoint public (AWS WAF), giám sát vận hành chuẩn hóa và các tính năng an toàn cho dữ liệu tài chính nhạy cảm.

Để cung cấp một góc nhìn thực tế cho doanh nghiệp, chúng tôi tái cấu trúc mô hình chi phí cho **Production Launch** tại vùng **ap-southeast-1 (Singapore)** với quy mô một region, Multi-AZ (không bao gồm Disaster Recovery liên vùng cho hệ thống tài chính quy mô lớn).

### Giả Định Tải Vận Hành (Production Baseline)

- **Thời gian chạy:** 720 giờ/tháng.
- **Quy mô người dùng:** 100 MAU ban đầu.
- **Tải xử lý:** 300 file CSV/tháng, tổng cộng 30,000 giao dịch cần phân loại.
- **Tỷ lệ khớp luật (Rule Match Rate):** Xử lý được 60% bằng deterministic rules; còn lại 40% (12,000 giao dịch) chuyển tiếp gọi Bedrock Claude 3.5 Haiku.
- **Tương tác Chat/Advice:** 1,000 câu hỏi mỗi tháng từ người dùng gửi tới AI Coach.
- **Thiết kế mạng bảo mật:** Frontend và API Gateway mở public; Cơ sở dữ liệu nằm hoàn toàn trong private subnets.
- **Cơ sở dữ liệu:** PostgreSQL chạy trên RDS `db.t4g.small` Multi-AZ, ổ cứng 50 GB gp3.
- **Xử lý bất đồng bộ:** Import CSV thông qua SQS + DLQ để tránh nghẽn timeout request trên API Gateway/Lambda.
- **Mạng private:** Không sử dụng NAT Gateway nhằm tối ưu chi phí và tăng tính bảo mật (hệ thống private backend chỉ giao tiếp với các dịch vụ AWS thông qua Private VPC Endpoints tại cả 2 AZ).
- **An toàn & Bảo mật tài chính:** Kích hoạt AWS WAF bảo vệ public endpoints, hệ thống audit logs cơ bản, Guardrails/PII filtering lọc thông tin nhạy cảm trước khi gửi tới LLM, và gói dịch vụ AWS Business Support+.

### Bảng Phân Tích Chi Phí Tháng Đầu (Production Launch Cost)

| Nhóm Dịch Vụ | Hạng Mục Chi Tiết | Gross/Tháng | Sau Free/Trial (Đủ Điều Kiện) | Ghi Chú Kỹ Thuật |
| :--- | :--- | :---: | :---: | :--- |
| **Edge & security** | Amplify hosting/deploy/transfer | $3.40 | $0.75 | Build & CDN phục vụ giao diện Next.js App Router |
| | WAF cho frontend + API | $29.01 | $29.01 | Bảo vệ public endpoints khỏi OWASP Top 10, DDoS & Web exploits |
| | Route 53 hosted zone + DNS | $0.50 | $0.50 | Quản lý tên miền và định tuyến an toàn |
| **App & AI** | API Gateway REST API | $0.02 | $0.00* | Đón nhận request, áp dụng API key, rate limit |
| | Lambda | $0.17 | $0.00 | Xử lý logic nghiệp vụ và parse CSV bất đồng bộ |
| | SQS + DLQ | $0.00 | $0.00 | Hàng đợi import CSV, gần như miễn phí ở tải hiện tại |
| | Cognito User Pools (100 MAU) | $0.00 | $0.00 | Quản lý định danh người dùng (Miễn phí dưới 10K MAU) |
| | SES email notifications | $0.03 | $0.00* | Gửi báo cáo, cảnh báo số dư / hoàn tất import |
| | Bedrock inference (Haiku) | $8.00 | $8.00 | Xử lý 12,000 giao dịch chưa phân loại + 1,000 câu chat |
| | Bedrock Guardrails / PII safety | $2.70 | $2.70 | Lọc thông tin tài khoản, tên riêng trước khi gọi LLM |
| **Data & network** | RDS PostgreSQL Multi-AZ compute | $73.44 | $73.44 | Instance `db.t4g.small` Multi-AZ, đáp ứng HA |
| | RDS gp3 Multi-AZ (50 GB) | $13.80 | $13.80 | Lưu trữ giao dịch, phân loại, rules đã học |
| | Additional backup/snapshot (50 GB) | $4.75 | $4.75 | Bản sao lưu hàng ngày đảm bảo an toàn dữ liệu |
| | RDS Proxy (2 vCPU) | $25.92 | $25.92 | Quản lý connection pool từ Lambda, quy mô 2 vCPU |
| | S3 storage & request nhỏ | $0.03 | $0.03 | Lưu trữ tạm bản gốc CSV mã hóa phía server |
| | KMS Customer-Managed Key | $1.01 | $1.01 | Mã hóa S3, Secrets, và Database Storage |
| | Secrets Manager | $0.41 | $0.41 | Lưu trữ an toàn thông tin kết nối DB |
| | VPC endpoints: Bedrock + Secrets (2 AZ) | $37.44 | $37.44 | Kết nối private an toàn tới Bedrock & Secrets |
| **Operations** | CloudWatch logs/metrics/alarm | $9.70 | $0.00 | Dashboard giám sát, Custom metrics & EMF logs |
| | CloudTrail S3 data events | $0.01 | $0.01 | Ghi nhật ký truy cập dữ liệu phục vụ audit bảo mật |
| | AWS Config baseline | $1.90 | $1.90 | Theo dõi thay đổi cấu hình tài nguyên theo chuẩn |
| | GuardDuty allowance | $1.00 | $0.00* | Phát hiện mối đe dọa và hành vi bất thường |
| | Macie inventory allowance | $0.10 | $0.00* | Quét và phân loại tự động dữ liệu nhạy cảm trên S3 |
| | AWS Business Support+ | $29.00 | $29.00 | Hỗ trợ kỹ thuật 24/7 cho hệ thống sản xuất |
| **TỔNG CỘNG** | | **$242.34/tháng** | **~$228.67/tháng** | **Đầy đủ HA, Security, Audit & Operations** |

*\* Phụ thuộc vào việc tài khoản AWS còn đủ điều kiện Free Tier/Trial và chưa dùng hết hạn mức cho các hệ thống khác.*

Nếu doanh nghiệp lựa chọn **tự vận hành không mua AWS Business Support**, chi phí duy trì ứng dụng thực tế sẽ là:
- **Gross Recurring (Hằng tháng cố định):** **$213.34/tháng**
- **Tháng đầu tiên (Áp dụng các gói Free/Trial):** **~$199.67/tháng**

---

### Sự Khác Biệt Giữa Kiến Trúc Demo vs. Production Launch

Để đạt tới tính thực tế doanh nghiệp của một ứng dụng tài chính cá nhân, chúng tôi đã chỉ ra và sửa đổi các điểm thiếu sót từ các bản ước lượng lý thuyết trước đây:

1. **Từ Database Cỡ Demo sang Production HA:** Thay vì sử dụng instance Single-AZ siêu nhỏ (`db.t3.micro`), môi trường Production đòi hỏi tối thiểu **`db.t4g.small` Multi-AZ** ($73.44/tháng compute + $13.80 storage). Điều này đảm bảo cơ sở dữ liệu tự động failover sang AZ khác mà không mất mát dữ liệu và không làm gián đoạn hệ thống khi xảy ra sự cố phần cứng.
2. **Sửa Lỗi Tính Thiếu RDS Proxy:** RDS Proxy được tính phí theo vCPU của DB instance bên dưới. Một DB instance `db.t4g.small` có 2 vCPU, do đó chi phí thực tế cho RDS Proxy là **$25.92/tháng**, thay vì con số $12.96/tháng thường bị nhầm lẫn khi ước tính trên cấu hình 1 vCPU.
3. **Mạng Nội Bộ Kép (Multi-AZ Private Endpoints):** Một backend private an toàn cần duy trì kết nối tới Bedrock Runtime và Secrets Manager qua cả 2 AZ hoạt động độc lập. Việc này yêu cầu 2 cụm VPC Interface Endpoints hoạt động song song, tiêu tốn **$37.44/tháng** cố định để loại bỏ hoàn toàn nguy cơ rò rỉ dữ liệu qua internet công cộng.
4. **Bảo Vệ Public Endpoints Bằng AWS WAF:** Do API Gateway và giao diện Next.js đều là public, việc triển khai **AWS WAF** với chi phí cố định **$29.01/tháng** là tối quan trọng để chặn đứng các cuộc tấn công SQL Injection vào DB, DDoS làm sập Lambda, hay rà quét lỗ hổng tự động.
5. **Hệ Thống Xử Lý Bất Đồng Bộ (SQS + DLQ):** Upload CSV tài chính không được phụ thuộc trực tiếp vào thời gian phản hồi HTTP (để tránh rủi ro Lambda/Gateway timeout khi file lớn). Bằng cách đưa luồng import qua SQS và xử lý bất đồng bộ ở nền, hệ thống đạt độ tin cậy tuyệt đối với mức chi phí tiệm cận $0 ở quy mô tải hiện tại.
6. **Bộ Lọc An Toàn Bedrock Guardrails / PII Safety:** Dữ liệu tài chính chứa nhiều thông tin định danh cá nhân (PII) cực kỳ nhạy cảm. Việc tích hợp **PII masking / Guardrails** tiêu tốn khoảng **$2.70/tháng** ban đầu nhưng là tấm khiên pháp lý bắt buộc để đảm bảo an toàn dữ liệu trước khi gửi lên AI model.
7. **Baseline Vận Hành Chuẩn Hóa:** Đưa CloudTrail (ghi nhật ký truy cập S3), AWS Config (quản lý cấu hình), GuardDuty (phát hiện xâm nhập) và Macie (phân tích dữ liệu nhạy cảm) vào bài toán chi phí giúp đáp ứng đầy đủ các tiêu chuẩn kiểm toán SOC2/PCI-DSS của ngành Fintech.

### Free Tier Không Phải "Phép Màu" Làm Giảm Chi Phí Cố Định

Nhiều đội ngũ thiết kế thường kỳ vọng AWS Free Tier sẽ kéo chi phí vận hành thực tế xuống tiệm cận $0. Tuy nhiên, các dịch vụ lõi của một hệ thống Production HA không được hỗ trợ bởi các chính sách miễn phí thông thường:
- Cụm RDS Multi-AZ + storage + backup chiếm **$91.99/tháng**.
- RDS Proxy duy trì kết nối Lambda chiếm **$25.92/tháng**.
- VPC Interface Endpoints bảo mật 2 AZ chiếm **$37.44/tháng**.
- AWS WAF bảo vệ public entry chiếm **$29.01/tháng**.

Chỉ riêng 4 hạng mục hạ tầng nền tảng này đã chiếm **~$184.36/tháng** cố định, trước khi tính đến bất kỳ một request API, một dòng logs hay token LLM nào. Các khoản hỗ trợ từ Free Tier (như 1M request Lambda hay 5GB logs CloudWatch) chỉ giúp giảm bớt phần chi phí biến đổi rất nhỏ (~$10/tháng). Do đó, con số **~$200/tháng đến ~$242/tháng** mới phản ánh đúng năng lực vận hành ổn định lâu dài của một AI Money Coach đích thực.

*Lưu ý thêm:* Nếu hệ thống Lambda private gửi custom metrics trực tiếp thông qua API `PutMetricData`, chúng ta sẽ cần thêm CloudWatch Monitoring interface endpoints cho 2 AZ, tăng khoảng **$18.72/tháng**. Để tối ưu khoản này, chúng tôi chọn giải pháp ghi log theo cấu trúc **Embedded Metric Format (EMF)** thông qua CloudWatch Logs thông thường, giúp hệ thống tự động bóc tách metrics từ logs mà không phát sinh thêm chi phí endpoints.

---

## 9. Required implementation alignment

The current code and evidence are not yet consistent with the target architecture:

| Gap | Required resolution before W7 demo |
| --- | --- |
| Backend defaults to local Ollama | Add/configure Bedrock production adapter and demonstrate real application invocation. |
| Evidence states Ollama/local AI architecture | Rewrite evidence claims to match deployed Bedrock path. |
| API contract differs between architecture context and running backend | Freeze the versioned API contract and update FE/BE consistently. |
| Threshold is `0.60` in context but `0.80` in code/evidence | Select one measured threshold and document the confusion matrix. |
| Identity uses client-supplied `x-user-id` | Limit to an explicitly disclosed single demo user or add Cognito/JWT before using non-synthetic data. |
| Case-study text claims exact Robinhood/HITL implementation | Replace with verified inference: Robinhood supports Bedrock/Nova suitability for financial GenAI, not the project's exact pipeline. |

## 10. Sources

### Repository documentation

- `docs/W7/W7_project_announcement.md`
- `docs/W7/W7_learner_guide.md`
- `docs/W7/W7_cost_estimates.md`
- `docs/W7/starter_apps/budgetbot/README.md`
- `architecture_context.md`
- `evidence_pack_domain_b.md`

### Official external sources

- AWS Amplify Pricing: <https://aws.amazon.com/amplify/pricing/>
- AWS Secrets Manager Pricing: <https://aws.amazon.com/secrets-manager/pricing/>
- Amazon CloudWatch Pricing: <https://aws.amazon.com/cloudwatch/pricing/>
- Amazon Bedrock Pricing: <https://aws.amazon.com/bedrock/pricing/>
- AWS Robinhood and Amazon Nova case study: <https://aws.amazon.com/blogs/machine-learning/an-innovative-financial-services-leader-finds-the-right-ai-solution-robinhood-and-amazon-nova/>
- AWS Amazon Finance and Bedrock case study: <https://aws.amazon.com/blogs/machine-learning/how-amazon-finance-built-ai-assistants-for-regulatory-risk-and-compliance-using-amazon-bedrock/>
- Amazon Bedrock Return of Control documentation: <https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html>

