from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


OUTPUT = "Báº£ng tá»± Ä‘Ã¡nh giÃ¡ cho Rubrik.docx"

# Chá»‰ cÃ¡c má»¥c cÃ³ chá»©ng cá»© runtime Ä‘Ã£ Ä‘Æ°á»£c ghi nháº­n trong lá»‹ch sá»­ dá»± Ã¡n má»›i
# nháº­n má»©c 1/2; source code Ä‘Æ¡n thuáº§n khÃ´ng Ä‘Æ°á»£c tÃ­nh lÃ  Ä‘Ã£ cháº¡y.
rows = [
    ("CUSTOMER", "", "", ""),
    ("ÄÄƒng nháº­p máº¡ng xÃ£ há»™i Google/Facebook", "0", "ChÆ°a cÃ³ láº§n Ä‘Äƒng nháº­p OAuth thÃ nh cÃ´ng Ä‘Æ°á»£c lÆ°u báº±ng áº£nh/log. Source: src/.", "Sau khi cáº¥u hÃ¬nh OAuth, quay Ä‘Äƒng nháº­p vÃ  callback tháº­t."),
    ("Xem há»“ sÆ¡", "0", "ChÆ°a cÃ³ báº±ng chá»©ng runtime Ä‘Æ°á»£c lÆ°u.", "ÄÄƒng nháº­p customer, má»Ÿ há»“ sÆ¡ vÃ  chá»¥p trang."),
    ("Äá»•i máº­t kháº©u", "0", "ChÆ°a cÃ³ báº±ng chá»©ng Ä‘á»•i rá»“i Ä‘Äƒng nháº­p láº¡i.", "Quay Ä‘á»•i máº­t kháº©u vÃ  Ä‘Äƒng nháº­p láº¡i."),
    ("KhÃ´i phá»¥c máº­t kháº©u qua email", "0", "SMTP/email chÆ°a Ä‘Æ°á»£c kiá»ƒm chá»©ng.", "YÃªu cáº§u khÃ´i phá»¥c vÃ  má»Ÿ email nháº­n Ä‘Æ°á»£c."),
    ("Quáº£n lÃ½ nhiá»u Ä‘á»‹a chá»‰ giao hÃ ng", "0", "ChÆ°a cÃ³ thao tÃ¡c thÃªm/sá»­a Ä‘á»‹a chá»‰ Ä‘Æ°á»£c xÃ¡c minh.", "ThÃªm Ä‘á»‹a chá»‰ thá»© hai, Ä‘áº·t máº·c Ä‘á»‹nh vÃ  kiá»ƒm tra láº¡i."),
    ("Lá»‹ch sá»­ mua hÃ ng", "0", "ChÆ°a cÃ³ báº±ng chá»©ng end-to-end Ä‘Ã£ lÆ°u.", "Táº¡o Ä‘Æ¡n customer rá»“i má»Ÿ lá»‹ch sá»­ Ä‘Æ¡n."),
    ("Chi tiáº¿t Ä‘Æ¡n vÃ  lá»‹ch sá»­ tráº¡ng thÃ¡i má»›i nháº¥t trÆ°á»›c", "0", "ChÆ°a xÃ¡c minh thá»© tá»± lá»‹ch sá»­ trÃªn giao diá»‡n.", "Má»Ÿ Ä‘Æ¡n cÃ³ nhiá»u láº§n cáº­p nháº­t tráº¡ng thÃ¡i."),
    ("Landing: New Products, Best Sellers, Ã­t nháº¥t 3 danh má»¥c", "1/2", "áº¢nh storefront Ä‘Ã£ xem cho tháº¥y lÆ°á»›i sáº£n pháº©m; chÆ°a lÆ°u áº£nh chá»©ng minh Ä‘á»§ cÃ¡c khu vá»±c.", "Quay toÃ n bá»™ landing vÃ  cÃ¡c danh má»¥c."),
    ("Catalog: tÃªn, giÃ¡, áº£nh, mÃ´ táº£ ngáº¯n", "1/2", "áº¢nh storefront Ä‘Ã£ xem cho tháº¥y tÃªn, giÃ¡ vÃ  mÃ´ táº£; áº£nh sáº£n pháº©m hiá»ƒn thá»‹ dáº¡ng placeholder trong áº£nh Ä‘Ã³.", "Chá»¥p catalog vá»›i áº£nh táº£i thÃ nh cÃ´ng vÃ  cÃ¡c trÆ°á»ng."),
    ("PhÃ¢n trang á»Ÿ má»i danh sÃ¡ch sáº£n pháº©m, ká»ƒ cáº£ má»™t trang", "0", "ChÆ°a cÃ³ kiá»ƒm tra giao diá»‡n cho tá»«ng danh sÃ¡ch.", "Quay pagination á»Ÿ catalog vÃ  cÃ¡c danh sÃ¡ch cÃ³ sáº£n pháº©m."),
    ("Chi tiáº¿t: thÃ´ng tin, mÃ´ táº£ â‰¥5 dÃ²ng, â‰¥3 áº£nh", "0", "ChÆ°a cÃ³ áº£nh/log runtime Ä‘á»§ trÆ°á»ng.", "Quay trang chi tiáº¿t vÃ  chuyá»ƒn Ã­t nháº¥t ba áº£nh."),
    ("Má»—i sáº£n pháº©m â‰¥2 biáº¿n thá»ƒ, tá»“n kho Ä‘á»™c láº­p", "0", "Seed source khÃ´ng thay tháº¿ báº±ng chá»©ng kiá»ƒm tra tá»“n kho tá»«ng biáº¿n thá»ƒ.", "Chá»n hai biáº¿n thá»ƒ vÃ  cho tháº¥y giÃ¡/tá»“n kho riÃªng."),
    ("TÃ¬m kiáº¿m tá»« khÃ³a", "0", "ChÆ°a cÃ³ truy váº¥n káº¿t quáº£ Ä‘Æ°á»£c xÃ¡c minh.", "TÃ¬m tá»« khÃ³a cá»¥ thá»ƒ vÃ  quay danh sÃ¡ch káº¿t quáº£."),
    ("Lá»c â‰¥3 tiÃªu chÃ­, gá»“m brand vÃ  min-max price", "0", "ChÆ°a cÃ³ kiá»ƒm tra káº¿t há»£p bá»™ lá»c Ä‘Æ°á»£c lÆ°u.", "Ãp dá»¥ng brand, min/max vÃ  tiÃªu chÃ­ thá»© ba."),
    ("Sáº¯p xáº¿p tÃªn A-Z, Z-A, giÃ¡ tÄƒng/giáº£m", "0", "ChÆ°a cÃ³ báº±ng chá»©ng kiá»ƒm tra Ä‘á»§ bá»‘n lá»±a chá»n.", "Chá»n láº§n lÆ°á»£t cáº£ bá»‘n vÃ  quay káº¿t quáº£."),
    ("Giá» AJAX realtime, sá»‘ lÆ°á»£ng, giÃ¡, tá»•ng/thuáº¿/phÃ­ ship", "1/2", "á»ž giai Ä‘oáº¡n trÆ°á»›c, /cart vÃ  /api/cart Ä‘Æ°á»£c bÃ¡o HTTP 200; chÆ°a chá»©ng minh cáº­p nháº­t AJAX vÃ  tÃ­nh tiá»n.", "ThÃªm sáº£n pháº©m, Ä‘á»•i sá»‘ lÆ°á»£ng vÃ  xÃ¡c nháº­n khÃ´ng reload."),
    ("Checkout nhiá»u bÆ°á»›c; guest checkout tá»± táº¡o tÃ i khoáº£n; Ä‘á»‹a chá»‰ Ä‘Äƒng nháº­p Ä‘iá»n sáºµn/Ä‘á»•i Ä‘Æ°á»£c", "0", "ChÆ°a cÃ³ giao dá»‹ch end-to-end Ä‘Æ°á»£c xÃ¡c minh.", "Quay guest vÃ  customer checkout thÃ nh cÃ´ng."),
    ("Coupon 5 kÃ½ tá»± chá»¯-sá»‘, tá»‘i Ä‘a 10 lÆ°á»£t, khÃ´ng háº¿t háº¡n; hiá»‡n má»©c giáº£m trÆ°á»›c thanh toÃ¡n", "0", "ChÆ°a kiá»ƒm chá»©ng toÃ n bá»™ quy táº¯c vÃ  quote trÆ°á»›c thanh toÃ¡n.", "Táº¡o coupon, Ã¡p dá»¥ng vÃ  quay sá»‘ lÆ°á»£t/má»©c giáº£m."),
    ("Email xÃ¡c nháº­n Ä‘Æ¡n", "0", "SMTP chÆ°a Ä‘Æ°á»£c kiá»ƒm chá»©ng.", "Äáº·t Ä‘Æ¡n vÃ  cho tháº¥y email thá»±c nháº­n."),
    ("BÃ¬nh luáº­n khÃ´ng cáº§n Ä‘Äƒng nháº­p", "0", "ChÆ°a cÃ³ bÃ¬nh luáº­n runtime Ä‘Æ°á»£c lÆ°u.", "Gá»­i bÃ¬nh luáº­n á»Ÿ tráº¡ng thÃ¡i guest."),
    ("ÄÃ¡nh giÃ¡ sao cáº§n Ä‘Äƒng nháº­p, khÃ´ng yÃªu cáº§u Ä‘Ã£ mua", "0", "ChÆ°a cÃ³ láº§n Ä‘Ã¡nh giÃ¡ runtime Ä‘Æ°á»£c lÆ°u.", "ÄÄƒng nháº­p customer chÆ°a mua vÃ  gá»­i rating."),
    ("Comment/rating cáº­p nháº­t realtime qua WebSocket", "0", "ChÆ°a cÃ³ kiá»ƒm chá»©ng hai trÃ¬nh duyá»‡t/Socket.IO.", "Má»Ÿ hai phiÃªn vÃ  quan sÃ¡t cáº­p nháº­t trá»±c tiáº¿p."),
    ("Äiá»ƒm thÆ°á»Ÿng 10% tá»•ng Ä‘Æ¡n, dÃ¹ng ngay Ä‘Æ¡n káº¿ tiáº¿p", "0", "ChÆ°a kiá»ƒm chá»©ng phÃ©p tÃ­nh vÃ  sá»­ dá»¥ng á»Ÿ Ä‘Æ¡n káº¿ tiáº¿p.", "Quay Ä‘iá»ƒm Ä‘Æ°á»£c cáº¥p vÃ  Ã¡p dá»¥ng quote Ä‘Æ¡n káº¿."),
    ("ADMIN", "", "", ""),
    ("Dashboard cÆ¡ báº£n: tá»•ng user, user má»›i, Ä‘Æ¡n, doanh thu, biá»ƒu Ä‘á»“ best sellers", "0", "ChÆ°a cÃ³ dashboard runtime Ä‘Æ°á»£c xÃ¡c minh.", "ÄÄƒng nháº­p admin vÃ  quay Ä‘á»§ sá»‘ liá»‡u/biá»ƒu Ä‘á»“."),
    ("Dashboard nÃ¢ng cao: nÄƒm/quÃ½/thÃ¡ng/tuáº§n/khoáº£ng ngÃ y; Ä‘Æ¡n, doanh thu, lá»£i nhuáº­n, so sÃ¡nh", "0", "ChÆ°a kiá»ƒm tra tá»«ng khoáº£ng thá»i gian vÃ  biá»ƒu Ä‘á»“ so sÃ¡nh.", "Chuyá»ƒn cÃ¡c khoáº£ng thá»i gian, ghi nháº­n sá»‘ liá»‡u."),
    ("Quáº£n lÃ½ sáº£n pháº©m: thÃªm/sá»­a/xÃ³a, danh má»¥c, tá»“n kho", "0", "ChÆ°a cÃ³ CRUD Ä‘Æ°á»£c thá»±c hiá»‡n vÃ  lÆ°u báº±ng chá»©ng.", "ThÃªm/sá»­a/xÃ³a sáº£n pháº©m demo trong UI."),
    ("Quáº£n lÃ½ user: xem, ban, sá»­a", "0", "ChÆ°a cÃ³ thao tÃ¡c user runtime Ä‘Æ°á»£c xÃ¡c minh.", "Sá»­a vÃ  ban/má»Ÿ ban customer demo."),
    ("Danh sÃ¡ch Ä‘Æ¡n má»›i nháº¥t, khoáº£ng 20/trang vÃ  lá»c thá»i gian", "0", "ChÆ°a kiá»ƒm tra phÃ¢n trang/sáº¯p xáº¿p/bá»™ lá»c.", "Quay trang danh sÃ¡ch vÃ  cÃ¡c má»‘c lá»c."),
    ("Chi tiáº¿t Ä‘Æ¡n vÃ  cáº­p nháº­t tráº¡ng thÃ¡i", "0", "ChÆ°a cÃ³ cáº­p nháº­t tráº¡ng thÃ¡i admin runtime Ä‘Æ°á»£c xÃ¡c minh.", "Äá»•i tráº¡ng thÃ¡i vÃ  má»Ÿ lá»‹ch sá»­ Ä‘Æ¡n."),
    ("Quáº£n lÃ½ coupon: ngÃ y táº¡o, giÃ¡ trá»‹, lÆ°á»£t dÃ¹ng/tá»‘i Ä‘a, Ä‘Æ¡n Ã¡p dá»¥ng, táº¡o má»›i", "0", "ChÆ°a cÃ³ thao tÃ¡c quáº£n lÃ½ coupon runtime Ä‘Æ°á»£c xÃ¡c minh.", "Táº¡o coupon vÃ  má»Ÿ danh sÃ¡ch Ä‘Æ¡n Ã¡p dá»¥ng."),
    ("KHÃC", "", "", ""),
    ("UI/UX responsive", "1/2", "áº¢nh storefront desktop Ä‘Ã£ xem; chÆ°a cÃ³ báº±ng chá»©ng viewport mobile.", "Quay catalog/cart á»Ÿ kÃ­ch thÆ°á»›c desktop vÃ  mobile."),
    ("GiÃ¡ hiá»ƒn thá»‹ dáº¡ng 75,299,000Ä‘", "1/2", "áº¢nh storefront Ä‘Ã£ xem cÃ³ giÃ¡ phÃ¢n tÃ¡ch dáº¥u pháº©y vÃ  háº­u tá»‘ Ä‘; chÆ°a kiá»ƒm tra toÃ n bá»™ trang.", "Chá»¥p giÃ¡ á»Ÿ catalog, chi tiáº¿t, giá» vÃ  Ä‘Æ¡n."),
    ("Danh sÃ¡ch Ä‘Æ¡n má»›i nháº¥t, phÃ¢n trang, tráº¡ng thÃ¡i mÃ u", "0", "ChÆ°a cÃ³ báº±ng chá»©ng runtime Ä‘á»§ ba yÃªu cáº§u.", "Quay sáº¯p xáº¿p, trang vÃ  badge tráº¡ng thÃ¡i."),
    ("Validate client/server, bcrypt, chá»‘ng injection, XSS, CSRF", "0", "ChÆ°a cÃ³ biÃªn báº£n kiá»ƒm tra báº£o máº­t runtime.", "Cháº¡y input há»£p lá»‡/khÃ´ng há»£p lá»‡ vÃ  kiá»ƒm tra tá»« chá»‘i an toÃ n."),
    ("Docker Compose cháº¡y sáº¡ch; frontend/backend/DB lÃ  container riÃªng", "1/2", "Stack Compose trÆ°á»›c giai Ä‘oáº¡n 6 tá»«ng Ä‘Æ°á»£c bÃ¡o Ä‘Ã£ cháº¡y; Compose hiá»‡n táº¡i chÆ°a cháº¡y xÃ¡c nháº­n.", "Khá»Ÿi Ä‘á»™ng tá»« mÃ´i trÆ°á»ng sáº¡ch vÃ  chá»¥p docker compose ps."),
    ("Scaling: stateless, Nginx round-robin, â‰¥2 backend, hostname chá»©ng minh", "1/2", "TrÆ°á»›c Ä‘Ã¢y cÃ³ hai backend container; endpoint/hostname round-robin cá»§a cáº¥u hÃ¬nh hiá»‡n táº¡i chÆ°a Ä‘Æ°á»£c xÃ¡c nháº­n.", "Gá»i /api/instance nhiá»u láº§n vÃ  lÆ°u cáº£ hai hostname."),
    ("BONUS", "", "", ""),
    ("GitHub Actions CI/CD", "0", "Workflow source cÃ³ máº·t; chÆ°a cÃ³ run thÃ nh cÃ´ng Ä‘Æ°á»£c xÃ¡c minh.", "Má»Ÿ GitHub Actions vÃ  chá»¥p run xanh; chá»‰ tÃ­nh khi cháº¡y thÃ nh cÃ´ng."),
    ("Elasticsearch", "0", "TÃ­ch há»£p source cÃ³ máº·t; chÆ°a xÃ¡c minh truy váº¥n trÃªn Compose hiá»‡n táº¡i.", "TÃ¬m sáº£n pháº©m qua API/UI vÃ  lÆ°u log/káº¿t quáº£."),
    ("Microservices / AI", "0", "KhÃ´ng tá»± nháº­n Ä‘Ã£ lÃ m.", "KhÃ´ng Ä‘Æ°a vÃ o demo náº¿u chÆ°a cÃ³ chá»©c nÄƒng cháº¡y thá»±c táº¿."),
]


def shade(cell, color):
    props = cell._tc.get_or_add_tcPr()
    element = OxmlElement("w:shd")
    element.set(qn("w:fill"), color)
    props.append(element)


doc = Document()
section = doc.sections[0]
section.orientation = WD_ORIENT.LANDSCAPE
section.page_width, section.page_height = section.page_height, section.page_width
section.left_margin = Inches(0.45)
section.right_margin = Inches(0.45)
section.top_margin = Inches(0.5)
section.bottom_margin = Inches(0.5)

normal = doc.styles["Normal"]
normal.font.name = "Arial"
normal.font.size = Pt(8)
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")

title = doc.add_heading("Báº¢NG Tá»° ÄÃNH GIÃ RUBRIC", 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle = doc.add_paragraph("Äá»“ Ã¡n Web Programming with Node.js (502070) â€” TechHub Shop")
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph(
    "NgÃ y láº­p: 25/11/2026. Má»©c 0 = chÆ°a cÃ³ báº±ng chá»©ng runtime; 1/2 = Ä‘Ã£ quan sÃ¡t má»™t pháº§n; "
    "Äáº§y Ä‘á»§ = Ä‘Ã£ cháº¡y vÃ  cÃ³ thá»ƒ tÃ¡i hiá»‡n Ä‘á»§ yÃªu cáº§u. MÃ£ nguá»“n hoáº·c sÆ¡ Ä‘á»“ tá»± nÃ³ khÃ´ng pháº£i báº±ng chá»©ng cháº¡y. "
    "Báº£ng pháº£n Ã¡nh báº±ng chá»©ng hiá»‡n cÃ³ trong phiÃªn lÃ m viá»‡c; cÃ¡c má»¥c 0 cáº§n Ä‘Æ°á»£c cháº¡y láº¡i trÃªn mÃ¡y ná»™p bÃ i "
    "vÃ  cáº­p nháº­t sau khi chá»¥p áº£nh/log tháº­t. KhÃ´ng cá»™ng Ä‘iá»ƒm dá»±a trÃªn dá»± Ä‘á»‹nh hoáº·c cáº¥u hÃ¬nh chÆ°a khá»Ÿi Ä‘á»™ng."
)

table = doc.add_table(rows=1, cols=4)
table.style = "Table Grid"
table.autofit = False
widths = [Inches(2.35), Inches(0.62), Inches(4.15), Inches(3.0)]
headers = ["Má»¥c rubric", "Má»©c", "Báº±ng chá»©ng hiá»‡n cÃ³ / giá»›i háº¡n", "Báº±ng chá»©ng cáº§n bá»• sung khi cháº¡y"]
for cell, text, width in zip(table.rows[0].cells, headers, widths):
    cell.width = width
    cell.text = text
    shade(cell, "17365D")
    for run in cell.paragraphs[0].runs:
        run.font.bold = True
        run.font.color.rgb = RGBColor(255, 255, 255)

for item, level, evidence, next_proof in rows:
    cells = table.add_row().cells
    for cell, width in zip(cells, widths):
        cell.width = width
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    if not level:
        cells[0].merge(cells[3])
        cells[0].text = item
        shade(cells[0], "D9EAF7")
        for run in cells[0].paragraphs[0].runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(23, 54, 93)
        continue
    cells[0].text = item
    cells[1].text = level
    cells[2].text = evidence
    cells[3].text = next_proof
    if level == "1/2":
        shade(cells[1], "FFF2CC")
    else:
        shade(cells[1], "FCE4D6")
    for cell in cells:
        for paragraph in cell.paragraphs:
            paragraph.paragraph_format.space_after = Pt(1)
            for run in paragraph.runs:
                run.font.size = Pt(7.5)

doc.add_paragraph(
    "Ghi chÃº váº­n hÃ nh: láº§n thá»­ docker compose ps á»Ÿ phiÃªn láº­p tÃ i liá»‡u bá»‹ tá»« chá»‘i quyá»n truy cáº­p Docker Engine. "
    "VÃ¬ váº­y chÆ°a thá»ƒ xÃ¡c nháº­n Compose giai Ä‘oáº¡n 6, Elasticsearch, round-robin hoáº·c workflow GitHub Actions "
    "Ä‘Ã£ cháº¡y. áº¢nh storefront vÃ  pháº£n há»“i HTTP 200 á»Ÿ má»™t sá»‘ route/cart tá»« cÃ¡c giai Ä‘oáº¡n trÆ°á»›c chá»‰ há»— trá»£ "
    "má»©c má»™t pháº§n nhÆ° Ä‘Ã£ ghi, khÃ´ng chá»©ng minh toÃ n bá»™ tÃ­nh nÄƒng."
)
doc.save(OUTPUT)
print("Created rubric DOCX")

