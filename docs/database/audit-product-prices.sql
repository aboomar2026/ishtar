-- READ ONLY. Differences require review: options can intentionally have different prices.
-- Includes available variants and the same minimum-price rule used by the storefront.
SELECT p.id, p.name, p.slug, p."basePrice", p."compareAtPrice",
       COALESCE(MIN(v.price) FILTER (WHERE v.quantity > 0), MIN(v.price)) AS "storefrontPrice",
       jsonb_agg(jsonb_build_object('id', v.id, 'sku', v.sku, 'price', v.price,
         'compareAtPrice', v."compareAtPrice", 'quantity', v.quantity)) AS "activeVariants"
FROM "Product" p
JOIN "ProductVariant" v ON v."productId" = p.id AND v."isActive"
WHERE p."deletedAt" IS NULL AND p.status = 'ACTIVE'
GROUP BY p.id
HAVING bool_or(v.price <> p."basePrice"
  OR COALESCE(v."compareAtPrice", p."compareAtPrice") IS DISTINCT FROM p."compareAtPrice")
ORDER BY p.name;

-- Existing orders keep their agreed price. Review manually; do not rewrite history.
SELECT oi."orderId", oi."variantId", oi."unitPrice", oi.quantity, oi."createdAt"
FROM "OrderItem" oi
WHERE oi."productId" = 'cmvwkpva8000gl507g5kbjgz6'
ORDER BY oi."createdAt" DESC;
