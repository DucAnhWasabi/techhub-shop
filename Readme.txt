TECHHUB SHOP - DO AN WEB PROGRAMMING WITH NODE.JS (502070)
================================================================

1. CHAY UNG DUNG

Yeu cau: Docker Desktop dang chay va Docker Compose v2.
Mo PowerShell tai thu muc goc project, sau do chay:

    docker compose up -d

Mo website:       http://localhost:8080
Trang quan tri:   http://localhost:8080/admin

Kiem tra cac container:

    docker compose ps

Xem log khi khoi dong:

    docker compose logs --tail=80 nginx frontend backend-1 backend-2 migrate seed

Compose tu build image va cai cac goi npm trong Dockerfile. Lan dau co the can
cho PostgreSQL, Redis va Elasticsearch khoi dong; hay kiem tra `docker compose ps`
va logs neu website chua mo duoc.

2. TAI KHOAN DEMO

Admin (gia tri mac dinh neu chua ghi de trong .env):
    Email: admin@techhub.local
    Mat khau: Admin123!ChangeMe

Customer seed:
    minh.nguyen@example.com / Customer123!ChangeMe
    linh.tran@example.com  / Customer123!ChangeMe
    khoa.le@example.com    / Customer123!ChangeMe

Chi dung cac tai khoan nay cho demo local. Neu da thay doi ADMIN_EMAIL,
ADMIN_PASSWORD hoac du lieu database da ton tai tu lan chay truoc, thong tin
thuc te co the khac. Khong dung cac mat khau demo tren moi truong public.

3. CAU HINH

- Tao file `.env` tu `.env.example` khi can thay doi cau hinh. Khong commit `.env`.
- Database, Redis va Elasticsearch duoc Compose noi bo; website truy cap qua Nginx
  tai cong 8080. Du lieu luu trong named volumes.
- OAuth Google/Facebook can client ID/secret va callback URL hop le.
- Gui email that can SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM.
  Neu chua co SMTP, khong danh gia chuc nang email la da xac minh.
- Seed tao du lieu ban dau khi database moi duoc migrate. Neu volume database da
  co du lieu, seed khong co nghia la reset database ve trang thai sach.
- Khi Elasticsearch chua san sang, hay doi container khoi dong va xem logs.
  Cau hinh source chua duoc runtime-xac nhan trong moi truong tao tai lieu nay.

4. BONUS

- GitHub Actions: workflow CI/CD da co trong `.github/workflows/ci-cd.yml`.
  Can push len GitHub va co run thanh cong moi co the tinh la bonus da xac minh.
- Elasticsearch: tich hop tim kiem catalog da co trong source. Chua duoc xac nhan
  bang truy van tren Compose hien tai, nen chua tinh la bonus da chay.
- Nginx round-robin va hai backend: co cau hinh Compose/source, nhung Compose giai
  doan 6 chua duoc khoi dong xac nhan trong lan lap tai lieu nay.
- Khong tuyen bo bonus microservices hoac AI.

5. TRANG THAI BANG CHUNG

Tai thoi diem lap tai lieu (25/11/2026), Docker daemon khong truy cap duoc tu
phien lam viec nay, nen khong the xac nhan runtime cua Compose giai doan 6. Trong
cac giai doan truoc, nhom da bao cao stack Docker chay, seed 40 san pham va mot so
route gio hang tra HTTP 200; anh storefront da duoc xem trong hoi thoai. Cac bang
chung do khong xac nhan toan bo rubric hoac cau hinh Compose hien tai. Vui long
chay lai ung dung tren may nop bai, luu screenshot/log that va cap nhat
`Bảng tự đánh giá cho Rubrik.docx` truoc khi nop.

Tai lieu ky thuat chi tiet: `README.md`.
Bang tu danh gia: `Bảng tự đánh giá cho Rubrik.docx`.
Bonus va kich ban quay: thu muc `bonus/`.
