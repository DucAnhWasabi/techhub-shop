require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const products = [
  ['AeroBook 14 Pro', 'Laptop', 'AeroTech', 32990000], ['AeroBook 16 Studio', 'Laptop', 'AeroTech', 44990000],
  ['AeroBook 15 Air', 'Laptop', 'AeroTech', 25990000], ['AeroBook Creator 16', 'Laptop', 'AeroTech', 52990000],
  ['ThinkCore X14 Gen 5', 'Laptop', 'Lenovo', 36990000], ['ThinkCore T16 Gen 3', 'Laptop', 'Lenovo', 31990000],
  ['LegionForge 5 16', 'Laptop', 'Lenovo', 42990000], ['IdeaCore Slim 5 14', 'Laptop', 'Lenovo', 22990000],
  ['VivoBook Pro 15 OLED', 'Laptop', 'ASUS', 29990000], ['ROG Strix G16', 'Laptop', 'ASUS', 46990000],
  ['ZenBook Duo 14', 'Laptop', 'ASUS', 39990000], ['TUF Gaming A15', 'Laptop', 'ASUS', 27990000],
  ['Swift Edge 16', 'Laptop', 'Acer', 32990000], ['Predator Helios Neo 16', 'Laptop', 'Acer', 38990000],
  ['Aspire 7 Creator', 'Laptop', 'Acer', 21990000], ['Nitro V 15', 'Laptop', 'Acer', 24990000],
  ['UltraSharp U2724D', 'Màn hình', 'Dell', 11990000], ['UltraSharp U3425WE', 'Màn hình', 'Dell', 24990000],
  ['AlienVision AW2725DF', 'Màn hình', 'Dell', 27990000], ['P-Series P2725H', 'Màn hình', 'Dell', 6490000],
  ['Odyssey G7 32 OLED', 'Màn hình', 'Samsung', 24990000], ['ViewFinity S8 27', 'Màn hình', 'Samsung', 10990000],
  ['ProArt PA279CRV', 'Màn hình', 'ASUS', 13990000], ['TUF Gaming VG27AQML1A', 'Màn hình', 'ASUS', 12990000],
  ['990 PRO NVMe SSD', 'Ổ cứng', 'Samsung', 4290000], ['870 EVO SATA SSD', 'Ổ cứng', 'Samsung', 2590000],
  ['Black SN850X NVMe', 'Ổ cứng', 'WD', 3890000], ['Blue SN580 NVMe', 'Ổ cứng', 'WD', 2190000],
  ['BarraCuda 4TB HDD', 'Ổ cứng', 'Seagate', 3290000], ['IronWolf 8TB NAS HDD', 'Ổ cứng', 'Seagate', 7490000],
  ['Vengeance DDR5 32GB Kit', 'RAM', 'Corsair', 3290000], ['Dominator Titanium DDR5 64GB', 'RAM', 'Corsair', 8290000],
  ['Fury Beast DDR5 32GB Kit', 'RAM', 'Kingston', 2890000], ['Fury Renegade DDR5 64GB Kit', 'RAM', 'Kingston', 7290000],
  ['Core i7-14700K', 'CPU', 'Intel', 10990000], ['Core i5-14600K', 'CPU', 'Intel', 7890000],
  ['Ryzen 7 9800X3D', 'CPU', 'AMD', 13990000], ['Ryzen 5 9600X', 'CPU', 'AMD', 8490000],
  ['GeForce RTX 4070 SUPER Dual', 'VGA', 'ASUS', 18990000], ['Radeon RX 7800 XT Gaming', 'VGA', 'AMD', 15990000]
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const categories = [...new Set(products.map((item) => item[1]))];
const brands = [...new Set(products.map((item) => item[2]))];

async function seed() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const name of categories) {
      await client.query('INSERT INTO categories(name,slug,description) VALUES($1,$2,$3) ON CONFLICT(slug) DO NOTHING',
        [name, slugify(name), `Sản phẩm ${name.toLowerCase()} chính hãng cho máy tính.`]);
    }
    for (const name of brands) {
      await client.query('INSERT INTO brands(name,slug,description) VALUES($1,$2,$3) ON CONFLICT(slug) DO NOTHING',
        [name, slugify(name), `Thương hiệu thiết bị và linh kiện máy tính ${name}.`]);
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@techhub.local').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!ChangeMe';
    if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD cần ít nhất 12 ký tự.');
    const adminHash = await bcrypt.hash(adminPassword, 12);
    await client.query(
      `INSERT INTO users(email,full_name,password_hash,role) VALUES($1,'TechHub Administrator',$2,'admin')
       ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', updated_at=NOW()`,
      [adminEmail, adminHash]
    );
    const customers = [
      ['minh.nguyen@example.com', 'Nguyễn Minh Anh'],
      ['linh.tran@example.com', 'Trần Gia Linh'],
      ['khoa.le@example.com', 'Lê Đăng Khoa']
    ];
    const customerHash = await bcrypt.hash('Customer123!ChangeMe', 10);
    for (const [email, fullName] of customers) {
      await client.query(
        `INSERT INTO users(email,full_name,password_hash,role) VALUES($1,$2,$3,'customer')
         ON CONFLICT(email) DO NOTHING`, [email, fullName, customerHash]
      );
    }

    for (const [index, [name, categoryName, brandName, price]] of products.entries()) {
      const slug = slugify(name);
      const description = [
        `${name} là thiết bị máy tính dành cho nhu cầu học tập, làm việc và giải trí.`,
        `Sản phẩm thuộc danh mục ${categoryName}, được chọn lọc cho cửa hàng TechHub.`,
        `Thương hiệu ${brandName} mang lại hiệu năng ổn định trong quá trình sử dụng.`,
        'Thông số cấu hình thay đổi theo biến thể; vui lòng chọn cấu hình phù hợp.',
        'Sản phẩm được đóng gói cẩn thận và hỗ trợ bảo hành theo chính sách cửa hàng.'
      ].join('\n');
      const inserted = await client.query(
        `INSERT INTO products(name,slug,brand_id,category_id,short_description,description)
         VALUES($1,$2,(SELECT id FROM brands WHERE slug=$3),(SELECT id FROM categories WHERE slug=$4),$5,$6)
         ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,brand_id=EXCLUDED.brand_id,category_id=EXCLUDED.category_id,
         short_description=EXCLUDED.short_description,description=EXCLUDED.description,updated_at=NOW() RETURNING id`,
        [name, slug, slugify(brandName), slugify(categoryName), `${brandName} ${categoryName} cho dàn máy của bạn.`, description]
      );
      const productId = inserted.rows[0].id;

      await client.query('DELETE FROM product_images WHERE product_id=$1', [productId]);
      for (let imageIndex = 1; imageIndex <= 3; imageIndex += 1) {
        const imageUrl = `https://placehold.co/900x700/111827/e5e7eb?text=${encodeURIComponent(name)}+${imageIndex}`;
        await client.query('INSERT INTO product_images(product_id,image_url,alt_text,position) VALUES($1,$2,$3,$4)',
          [productId, imageUrl, `${name} - ảnh ${imageIndex}`, imageIndex]);
      }
      const variants = [
        [`${slug.toUpperCase().replace(/-/g, '').slice(0, 12)}-A`, 'Cấu hình tiêu chuẩn', { configuration: 'standard' }, price, 8 + (index % 21)],
        [`${slug.toUpperCase().replace(/-/g, '').slice(0, 12)}-B`, 'Cấu hình nâng cao', { configuration: 'performance' }, Math.round(price * 1.12), 4 + (index % 15)]
      ];
      for (const [sku, variantName, attributes, variantPrice, stock] of variants) {
        await client.query(
          `INSERT INTO variants(product_id,sku,name,attributes,price_vnd,stock_quantity)
           VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(sku) DO UPDATE SET product_id=EXCLUDED.product_id,
           name=EXCLUDED.name,attributes=EXCLUDED.attributes,price_vnd=EXCLUDED.price_vnd,stock_quantity=EXCLUDED.stock_quantity,updated_at=NOW()`,
          [productId, sku, variantName, JSON.stringify(attributes), variantPrice, stock]
        );
      }
    }
    await client.query('COMMIT');
    console.log(`Seed hoàn tất: ${products.length} sản phẩm, ${categories.length} danh mục, ${brands.length} thương hiệu.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

seed().catch((error) => { console.error('Seed thất bại:', error.message); process.exit(1); });
