-- ISHTAR — targeted cleanup of legacy Saad Center copy stored in Banner rows.
-- Safe, additive content repair: does NOT delete records, orders, products, or assets.
-- IMPORTANT: run against the intended database after reviewing the preview query.
-- Brand names embedded in uploaded images must be reviewed manually.

-- 1) Preview all matching banner records before any changes:
SELECT "id", "placement", "title", "subtitle", "eyebrow", "ctaLabel"
FROM public."Banner"
WHERE concat_ws(' ', "title", "subtitle", "eyebrow", "ctaLabel") ~* '(سعد[[:space:]]*سنتر|saad[ -]?center)'
ORDER BY "createdAt";

-- 2) Replace ONLY explicit obsolete brand names in banner copy.
BEGIN;
UPDATE public."Banner"
SET
  "title" = regexp_replace(regexp_replace("title", 'سعد[[:space:]]*سنتر', 'عشتار', 'g'), 'saad[ -]?center', 'Ishtar', 'gi'),
  "subtitle" = CASE WHEN "subtitle" IS NULL THEN NULL ELSE regexp_replace(regexp_replace("subtitle", 'سعد[[:space:]]*سنتر', 'عشتار', 'g'), 'saad[ -]?center', 'Ishtar', 'gi') END,
  "eyebrow" = CASE WHEN "eyebrow" IS NULL THEN NULL ELSE regexp_replace(regexp_replace("eyebrow", 'سعد[[:space:]]*سنتر', 'عشتار', 'g'), 'saad[ -]?center', 'Ishtar', 'gi') END,
  "ctaLabel" = CASE WHEN "ctaLabel" IS NULL THEN NULL ELSE regexp_replace(regexp_replace("ctaLabel", 'سعد[[:space:]]*سنتر', 'عشتار', 'g'), 'saad[ -]?center', 'Ishtar', 'gi') END,
  "updatedAt" = NOW()
WHERE concat_ws(' ', "title", "subtitle", "eyebrow", "ctaLabel") ~* '(سعد[[:space:]]*سنتر|saad[ -]?center)'
RETURNING "id", "placement", "title", "subtitle", "eyebrow", "ctaLabel";
COMMIT;

-- 3) Ensure 0 matches remain in the banner text:
SELECT count(*) AS legacy_banner_copy_remaining
FROM public."Banner"
WHERE concat_ws(' ', "title", "subtitle", "eyebrow", "ctaLabel") ~* '(سعد[[:space:]]*سنتر|saad[ -]?center)';
