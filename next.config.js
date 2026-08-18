/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  webpack: (config, { isServer }) => {
    // Fix for pdfjs-dist compatibility with Next.js 15
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // pdfjs-dist uses top-level await — enable it for the client bundle
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        topLevelAwait: true,
      };
    }

    return config;
  },
}

module.exports = nextConfig

// Made with Bob
