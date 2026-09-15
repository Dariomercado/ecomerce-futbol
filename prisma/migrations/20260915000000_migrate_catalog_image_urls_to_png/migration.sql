-- Update only the public catalog fixture URLs that were replaced by generated PNG assets.
-- Exact slug-and-old-URL predicates make this safe to re-run and preserve archived demos.

UPDATE "Category" AS category
SET "imageUrl" = CASE category."slug"
  WHEN 'botines' THEN '/catalog/categories/botines.png'
  WHEN 'camisetas' THEN '/catalog/categories/camisetas.png'
  WHEN 'entrenamiento' THEN '/catalog/categories/entrenamiento.png'
  WHEN 'accesorios' THEN '/catalog/categories/accesorios.png'
END
WHERE category."isActive" IS TRUE
  AND (category."slug", category."imageUrl") IN (
    ('botines', '/catalog/categories/botines.jpg'),
    ('camisetas', '/catalog/categories/camisetas.jpg'),
    ('entrenamiento', '/catalog/categories/entrenamiento.jpg'),
    ('accesorios', '/catalog/categories/accesorios.jpg')
  );

UPDATE "ProductImage" AS image
SET "url" = CASE image."url"
  WHEN '/catalog/products/control-fg-verde-1.jpg' THEN '/catalog/products/control-fg-verde-1.png'
  WHEN '/catalog/products/control-fg-verde-2.jpg' THEN '/catalog/products/control-fg-verde-2.png'
  WHEN '/catalog/products/terreno-tf-arena-1.jpg' THEN '/catalog/products/terreno-tf-arena-1.png'
  WHEN '/catalog/products/camiseta-verde-arena-local-1.jpg' THEN '/catalog/products/camiseta-verde-arena-local-1.png'
  WHEN '/catalog/products/camiseta-verde-arena-local-2.jpg' THEN '/catalog/products/camiseta-verde-arena-local-2.png'
  WHEN '/catalog/products/camiseta-matchday-negra-1.jpg' THEN '/catalog/products/camiseta-matchday-negra-1.png'
  WHEN '/catalog/products/northline-training-jacket-1.jpg' THEN '/catalog/products/northline-training-jacket-1.png'
  WHEN '/catalog/products/conos-terreno-pack-1.jpg' THEN '/catalog/products/conos-terreno-pack-1.png'
  WHEN '/catalog/products/botella-matchday-1.jpg' THEN '/catalog/products/botella-matchday-1.png'
END
FROM "Product" AS product
WHERE image."productId" = product."id"
  AND product."status" = 'PUBLISHED'::"ProductStatus"
  AND product."isActive" IS TRUE
  AND (product."slug", image."url") IN (
    ('control-fg-verde', '/catalog/products/control-fg-verde-1.jpg'),
    ('control-fg-verde', '/catalog/products/control-fg-verde-2.jpg'),
    ('terreno-tf-arena', '/catalog/products/terreno-tf-arena-1.jpg'),
    ('camiseta-verde-arena-local', '/catalog/products/camiseta-verde-arena-local-1.jpg'),
    ('camiseta-verde-arena-local', '/catalog/products/camiseta-verde-arena-local-2.jpg'),
    ('camiseta-matchday-negra', '/catalog/products/camiseta-matchday-negra-1.jpg'),
    ('campera-northline-training', '/catalog/products/northline-training-jacket-1.jpg'),
    ('pack-conos-terreno', '/catalog/products/conos-terreno-pack-1.jpg'),
    ('botella-matchday-studio', '/catalog/products/botella-matchday-1.jpg')
  );
