# 📚 Thư Viện URL & Nguồn Trích Dẫn Case Study (Domain B)
*Tài liệu tra cứu nhanh dành cho nhóm khi làm báo cáo và gắn link vào Slide bảo vệ.*

---

## 🏢 Nhóm Doanh Nghiệp & Các "Ông Lớn" Tài Chính

### 1. Robinhood (FinCrimes Agent)
- **Cách giải quyết:** Dùng cấu trúc Phễu (Regex -> Amazon Nova) và Return of Control để chống rửa tiền.
- **Nguồn AWS ML Blog:** [An innovative financial services leader finds the right AI solution: Robinhood and Amazon Nova](https://aws.amazon.com/blogs/machine-learning/an-innovative-financial-services-leader-finds-the-right-ai-solution-robinhood-and-amazon-nova/)
- **Video AWS re:Invent 2024:** [Scaling secure large language models with Robinhood](https://www.youtube.com/watch?v=kY3P3O0Qd0s)

### 2. Morgan Stanley & JPMorgan Chase
- **Cách giải quyết:** Morgan Stanley dùng RAG cho 16.000 tư vấn viên. JPMorgan dùng COiN bóc tách hợp đồng, tiết kiệm 360.000 giờ.
- **Nguồn Forbes/WSJ (Về Morgan Stanley OpenAI):** [Morgan Stanley Wealth Management Announces Key Milestone in AI Strategy](https://www.morganstanley.com/press-releases/morgan-stanley-wealth-management-announces-key-milestone-in-inno)
- **Nguồn JPMorgan COiN:** [JPMorgan Software Does in Seconds What Took Lawyers 360,000 Hours](https://www.bloomberg.com/news/articles/2017-02-28/jpmorgan-marshals-an-army-of-developers-to-automate-high-finance)

### 3. Amazon FinTech Internal
- **Cách giải quyết:** Ứng dụng Bedrock + OpenSearch để trả lời truy vấn pháp lý/kiểm toán tài chính siêu tốc (<2s).
- **Nguồn AWS News:** [Amazon FinTech uses Amazon Bedrock to automate regulatory inquiries](https://aws.amazon.com/blogs/machine-learning/) *(Bài viết trên blog ML của AWS)*

### 4. Genpact (`riskCanvas`)
- **Cách giải quyết:** Nền tảng chống rửa tiền (AML) dùng Amazon Bedrock đánh giá rủi ro giao dịch (Confidence Scoring).
- **Nguồn AWS Partners:** [Genpact and AWS Collaborate to Transform Financial Crimes Operations](https://www.genpact.com/about-us/media/press-releases/genpact-and-aws-collaborate-to-transform-financial-crimes-operations-with-generative-ai)

### 5. Broadridge Financial Solutions
- **Cách giải quyết:** Dùng Bedrock RAG xử lý dữ liệu hợp đồng, tiết kiệm 20% chi phí.
- **Nguồn AWS Case Study:** [Broadridge Uses Amazon Bedrock to Transform Document Processing](https://aws.amazon.com/solutions/case-studies/broadridge-amazon-bedrock-case-study/)

---

## 🏆 Nhóm Dự Án Sinh Viên / Khởi Nghiệp Thắng Giải Hackathon

> *Lưu ý: Các dự án này được lưu trữ trên nền tảng Devpost. Khi cần tham khảo mã nguồn hoặc video demo của họ, hãy click vào các link dưới đây.*

### 6. TokenIQ (Giải Nhất Chainlink Chromion Hackathon 2025)
- **Cách giải quyết:** "CFO tự động" dùng AI quản lý dòng tiền và đề xuất chiến lược tiết kiệm.
- **Link Dự án Devpost:** [TokenIQ on Devpost](https://devpost.com/software/tokeniq)

### 7. Voice Teller (Vô địch GKE Turns 10 Hackathon)
- **Cách giải quyết:** Agent xử lý dữ liệu đầu vào siêu mập mờ (âm thanh giọng địa phương) để bóc tách ý định giao dịch ngân hàng.
- **Link Dự án Devpost:** [Voice Teller on Devpost](https://devpost.com/software/voice-teller)

### 8. Vigil AI (Hackathon 2025)
- **Cách giải quyết:** Multi-Agent phát hiện gian lận thẻ tín dụng, có cơ chế "Review Queue" cho con người can thiệp.
- **Link Dự án Devpost:** [Vigil AI on Devpost](https://devpost.com/software/vigil-ai)

### 9. Tiba (Vô địch AI Agents on Arc Hackathon 2025)
- **Cách giải quyết:** Trợ lý AI tự động hóa việc thanh toán và tra soát hóa đơn y tế/viện phí.
- **Link Dự án Devpost:** [Tiba on Devpost](https://devpost.com/software/tiba)

### 10. LoanLens (Vô địch Financial AI Hackathon 2025)
- **Cách giải quyết:** Bóc tách tài liệu tài chính dùng Agentic Document Extraction (ADE).
- **Link Dự án Devpost:** (Nền tảng LandingAI/AWS thi đấu) Tìm kiếm *"LoanLens LandingAI Hackathon"* trên Google.

---

## 🌐 Các Trang Thông Tin Công Nghệ Liên Quan

### 11. AWS 10,000 AIdeas Competition (T4/2026)
- **Link Trang Chủ Sự kiện:** [AWS 10,000 AIdeas Official Page](https://aws.amazon.com/developer/10000-aideas/)

### 12. Tài liệu gốc của AWS: Multi-Agent & Return of Control
*(Dùng để dẫn chứng cho các thiết kế kỹ thuật trong phần Architecture của Slide)*
- **Multi-Agent Collaboration:** [AWS Docs - Agents Collaboration](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-collaboration.html)
- **Return of Control (Human-in-the-loop):** [AWS Docs - Return of Control](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-returncontrol.html)
