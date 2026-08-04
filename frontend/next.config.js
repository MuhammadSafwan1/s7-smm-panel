/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  // Build timestamp inlined into client bundle - changes on EVERY deploy.
  // Cache key in cache.js includes this → users download fresh after each deploy,
  // and keep cached data until the next deploy (survives reloads + tab closes).
  env: {
    NEXT_PUBLIC_BUILD_TIME: String(Date.now()),
  },
  // Static build ID - change manually only when you want to bust ALL caches
  // For normal updates, Next.js will only rebuild changed chunks
  generateBuildId: async () => {
    return 'v1.0.0'; // Manually increment: v1.0.1, v1.0.2, etc.
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  trailingSlash: false,
  productionBrowserSourceMaps: false, // Disable source maps in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console logs in production
  },
  // Minify and obfuscate code
  swcMinify: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.google.com https://*.googleapis.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://upload-widget.cloudinary.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.google.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.com https://firestore.googleapis.com https://fcm.googleapis.com https://firebase.googleapis.com https://www.googleapis.com https://open.er-api.com https://*.workers.dev https://api.cloudinary.com https://*.cloudinary.com https://*.railway.app https://smmcloud.uk https://*.smmcloud.uk wss://*.firebaseio.com",
              "frame-src 'self' https://*.firebaseapp.com https://www.youtube.com https://youtube-nocookie.com https://player.vimeo.com",
              "media-src 'self' blob: https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    
    // Optimize chunk splitting for better caching
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic', // Stable module IDs
      runtimeChunk: 'single', // Single runtime chunk
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get package name from path
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
              // Keep stable vendor chunk names
              return `vendor-${packageName.replace('@', '')}`;
            },
            priority: 10,
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            name: 'common',
          },
        },
      },
    };
    
    return config;
  },
};

module.exports = nextConfig;
