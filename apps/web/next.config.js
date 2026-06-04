/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { domains: ['api.dicebear.com', 'lh3.googleusercontent.com'] },
};
module.exports = nextConfig;