import { productionDomainRedirects } from './scripts/site-redirects.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() { return productionDomainRedirects(process.env); },
  env: { SEO_NOINDEX: process.env.SEO_NOINDEX === 'true' || ['preview', 'development'].includes(process.env.VERCEL_ENV ?? '') ? 'true' : 'false' },
  // Ensure the Prisma query-engine binaries are bundled into the serverless
  // functions on Vercel. Without this the engine can be missing at
  // runtime even when generated, causing Server Component render failures.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/.prisma/client/**/*']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.dummyjson.com',
        pathname: '/product-images/**'
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**'
      },
      {
        // Sprint 7A demo: direct Pexels CDN images (query params vary, so no exact match).
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/photos/**'
      }
    ]
  }
};

export default nextConfig;
