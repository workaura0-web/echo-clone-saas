/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['msedge-tts', 'ws', 'isomorphic-ws'],
  },
};

export default nextConfig;
