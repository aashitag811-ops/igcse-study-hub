/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  webpack: (config) => {
    // Fix for react-pdf and pdfjs-dist compatibility with Next.js 15
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    return config;
  },
}

module.exports = nextConfig

// Made with Bob
