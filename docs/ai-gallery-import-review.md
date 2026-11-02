# Ishtar: reviewed AI galleries (manual approval required)

This tool **does not run in Vercel builds**. It appends images to the 10 products without replacing their original primary photos.

## Why this is gated

The 30-image review ZIP contains 10 generated model views and 20 crops from those same generated views. None proves actual fabric detail or garment construction. **Do not run --apply until each image is checked against the corresponding original customer-supplied product image.** Fabric patterns, buttons, silhouettes and backs may be invented by AI.

## Preparation

1. Download and extract `ishtar_gallery_review_v2.zip` into a private local working folder (outside git). Do not commit the generated photos.
2. Copy `gallery-approval.example.json` into that same folder as `gallery-approval.json`.
3. For each item, fill **actual productId from current production admin URL**, exact product name and image paths relative to the manifest, preserving the folder names from the ZIP.
4. Initially use only `01_ai_model_hero.jpg` if the two derivative crops are visually repetitive. Set `approved: true` only after visual QA. Never put the `REFERENCE_...` screenshot into a gallery.
5. Run locally with access to the **correct intended database** and Cloudinary credentials. Keep credentials out of Git and logs.

```bash
node --env-file=.env.local --import tsx scripts/import-reviewed-ai-galleries.ts --manifest /absolute/path/gallery-approval.json
# Only after all preflight checks pass and product identity/images are approved:
node --env-file=.env.local --import tsx scripts/import-reviewed-ai-galleries.ts --manifest /absolute/path/gallery-approval.json --apply
```

This uses `DATABASE_URL` and Cloudinary env vars. Verify the database target before running. Images are **appended**, not made primary. If an upload fails, the script stops; previously completed products remain changed, so do not rerun blindly without checking and adjusting the manifest. Revalidate storefront paths/cache afterwards.

**Status:** only importer code prepared in this branch. No production database edits, Cloudinary uploads or verified live product IDs have occurred.
