import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Google profile photos (Google Sign-In / OAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Firebase Storage (user-uploaded avatars)
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
