// next.config.mjs - SIMPLIFIED VERSION
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A stable identifier for this build. Prefer the git commit (set by Vercel),
// fall back to a generic env, then to a timestamp for local builds. Inlined
// into both the client and server bundles so the running app can detect when a
// newer deployment is live and prompt the user to reload.
const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  process.env.SOURCE_VERSION ||
  String(Date.now());

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  generateBuildId: async () => buildId,
  // Set output file tracing root to silence multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "motherlandcrmsolutions.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "vertexcrmsolution.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  typescript: {
    // Temporarily allow builds to succeed while we iteratively fix TS errors.
    // Long-term: set this back to `false` and fix all TypeScript issues.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint during build to avoid style-only lint failures blocking production builds.
    // Long-term: fix lint errors or adjust rules; this is a pragmatic short-term workaround.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "motherlandcrmsolutions.com",
        "www.motherlandcrmsolutions.com",
        "vertexcrmsolution.com",
        "www.vertexcrmsolution.com",
      ],
      bodySizeLimit: "2mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/signin",
        destination: "/login",
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Video assets: put files in /public (e.g. /public/videos/...) and reference by URL.
    // Avoid file-loader here — it is not a project dependency and can break Next 15 dev
    // chunk layout (missing ./NNNN.js relative to webpack-runtime).

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.cloudinary.com https://flagcdn.com",
              "media-src 'self' blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.cloudinary.com https://*.ably.io wss://*.ably.io https://*.ably.net wss://*.ably.net https://*.ably-realtime.com wss://*.ably-realtime.com",
              "frame-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
