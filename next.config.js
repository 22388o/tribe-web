/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        hostname: 'image.nostr.build',
      },
      {
        hostname: 'nostr.build',
      },
    ],
    domains: ['res.cloudinary.com'],
  },
  ...(process.env.NODE_ENV === 'production' && {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
};

module.exports = nextConfig;
