/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  images: { domains: ['api.dicebear.com', 'lh3.googleusercontent.com'] },
};
module.exports = nextConfig;
