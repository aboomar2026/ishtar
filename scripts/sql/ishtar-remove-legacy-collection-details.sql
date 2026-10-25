-- Owner-run, optional cleanup for the ORIGINAL 100 imported fixture IDs only.
-- Removes exact legacy detail strings; preserves every other detail and all other columns.
-- No product/category names, images, prices, quantities, orders or collection memberships change.
-- Run the whole statement in Supabase SQL Editor. Re-running returns no changed rows.
WITH legacy AS (
  SELECT '["المجموعة: لمسة","المجموعة: أناقة","المجموعة: رونق","المجموعة: إشراقة","المجموعة: جاذبية"]'::jsonb AS labels
), cleaned AS (
  SELECT p.id,
    COALESCE(jsonb_agg(entry.value ORDER BY entry.position)
      FILTER (WHERE NOT (legacy.labels @> jsonb_build_array(entry.value))), '[]'::jsonb) AS details
  FROM public."Product" p CROSS JOIN legacy
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.details) = 'array' THEN p.details ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS entry(value, position)
  WHERE p.id ~ '^ishtar-qa-product-(00[1-9]|0[1-9][0-9]|100)$'
    AND jsonb_typeof(p.details) = 'array'
  GROUP BY p.id
)
UPDATE public."Product" p
SET details = cleaned.details, "updatedAt" = CURRENT_TIMESTAMP
FROM cleaned WHERE p.id = cleaned.id AND p.details IS DISTINCT FROM cleaned.details
RETURNING p.id, p.name, p.details;
