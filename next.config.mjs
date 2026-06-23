/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "nlpbifhxscrlgsfgrlua.supabase.co" },
    ],
  },
};

export default nextConfig;
