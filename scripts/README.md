# Demo media — Cloudinary upload pipeline

Replaces the `/mock-products/*.svg` placeholders with real, license-safe images
(from [Pexels](https://www.pexels.com/)) hosted on Cloudinary.

## Files

- `../src/lib/demo-media-manifest.ts` — source of truth: maps each product /
  category / banner to its Pexels source image(s) and the stable Cloudinary
  public id it should be uploaded as.
- `upload-demo-media.ts` — uploads images to Cloudinary, writes
  `demo-media.generated.json`.
- `apply-demo-media.ts` — reads that JSON and writes the Cloudinary URLs /
  public ids into the database.
- `source-media/` — (git-ignored) optional folder for manually-downloaded
  source images.

## Prerequisites

Set the Cloudinary vars in `.env` (already required by the admin uploads):

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Then choose **one** way to provide the source images.

### Option A — manual download (no API key)

Open the Pexels links in the manifest, download the photos, and save them under
`scripts/source-media/` mirroring each public id (extension can be jpg/png/webp/avif):

```
scripts/source-media/products/camel-boutique-bag/01-main.jpg
scripts/source-media/products/camel-boutique-bag/02-detail.jpg
scripts/source-media/categories/bags.jpg
scripts/source-media/banners/home-hero.jpg
```

### Option B — Pexels API (automatic)

Add a free key to `.env` and the script downloads each photo for you:

```
PEXELS_API_KEY=...
```

Local files in `source-media/` always take precedence over the API.

## Run

```bash
npm run media:upload -- --dry-run   # preview the upload plan (no network)
npm run media:upload                # upload to Cloudinary, write the JSON
npm run media:apply                 # write Cloudinary URLs into the DB
```

`media:upload` uses `overwrite: true` with stable public ids, so it is safe to
re-run. `media:apply` is idempotent (it replaces each product's image rows).
Run `npm run db:seed` first if the DB is empty.
