import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Autorise l'accès depuis le téléphone sur le réseau local (ex: 192.168.1.2:3000)
  allowedDevOrigins: ['192.168.1.2', '192.168.1.*'],
};

export default nextConfig;