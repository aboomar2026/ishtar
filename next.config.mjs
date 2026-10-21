/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the Prisma query-engine binaries are bundled into the serverless
  // functions (Netlify/Lambda). Without this the engine can be missing at
  // runtime even when generated, causing Server Component render failures.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/.prisma/client/**/*']
  },
  images: {
    remotePatterns: [
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
