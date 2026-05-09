-- ============================================================
-- 004_seed_products.sql
-- 체험 상품 및 옵션 초기 데이터 시드
-- ============================================================

-- ── 상품 INSERT ──────────────────────────────────────────────
INSERT INTO products (tenant_id, slug, name, subtitle, price, duration_min, features, badge, is_featured, is_active, sort_order)
SELECT
  t.id,
  p.slug,
  p.name,
  p.subtitle,
  p.price,
  p.duration_min,
  p.features,
  p.badge,
  p.is_featured,
  true,
  p.sort_order
FROM tenants t
CROSS JOIN (VALUES
  ('basic',   '베이직',   '첫 패러글라이딩 입문',     75000,  10, ARRAY['탠덤 비행','안전 교육','기념 스티커'],       NULL,    false, 1),
  ('extreme', '익스트림', '스릴 넘치는 고고도 비행',  120000, 20, ARRAY['고고도 탠덤 비행','스릴 기동','안전 교육'],   '인기',  true,  2),
  ('vip',     'VIP',      '프리미엄 풀 패키지',        180000, 30, ARRAY['파노라마 코스','VIP 라운지','사진+영상 포함'], NULL,    false, 3)
) AS p(slug, name, subtitle, price, duration_min, features, badge, is_featured, sort_order)
WHERE t.slug = 'gureum'
ON CONFLICT (tenant_id, slug) DO UPDATE
  SET name        = EXCLUDED.name,
      subtitle    = EXCLUDED.subtitle,
      price       = EXCLUDED.price,
      duration_min = EXCLUDED.duration_min,
      features    = EXCLUDED.features,
      badge       = EXCLUDED.badge,
      is_featured = EXCLUDED.is_featured,
      sort_order  = EXCLUDED.sort_order;


-- ── 옵션 INSERT ──────────────────────────────────────────────
-- basic 옵션
INSERT INTO product_options (tenant_id, product_id, name, price, is_active)
SELECT t.id, pr.id, '사진 패키지', 30000, true
FROM tenants t
JOIN products pr ON pr.tenant_id = t.id AND pr.slug = 'basic'
WHERE t.slug = 'gureum'
  AND NOT EXISTS (
    SELECT 1 FROM product_options po WHERE po.product_id = pr.id AND po.name = '사진 패키지'
  );

INSERT INTO product_options (tenant_id, product_id, name, price, is_active)
SELECT t.id, pr.id, '영상 촬영', 20000, true
FROM tenants t
JOIN products pr ON pr.tenant_id = t.id AND pr.slug = 'basic'
WHERE t.slug = 'gureum'
  AND NOT EXISTS (
    SELECT 1 FROM product_options po WHERE po.product_id = pr.id AND po.name = '영상 촬영'
  );

-- extreme 옵션
INSERT INTO product_options (tenant_id, product_id, name, price, is_active)
SELECT t.id, pr.id, '사진 패키지', 30000, true
FROM tenants t
JOIN products pr ON pr.tenant_id = t.id AND pr.slug = 'extreme'
WHERE t.slug = 'gureum'
  AND NOT EXISTS (
    SELECT 1 FROM product_options po WHERE po.product_id = pr.id AND po.name = '사진 패키지'
  );

INSERT INTO product_options (tenant_id, product_id, name, price, is_active)
SELECT t.id, pr.id, '영상 촬영', 20000, true
FROM tenants t
JOIN products pr ON pr.tenant_id = t.id AND pr.slug = 'extreme'
WHERE t.slug = 'gureum'
  AND NOT EXISTS (
    SELECT 1 FROM product_options po WHERE po.product_id = pr.id AND po.name = '영상 촬영'
  );

-- vip: 사진+영상 포함이므로 별도 옵션 없음
