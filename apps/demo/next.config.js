import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@heygen/liveavatar-web-sdk'],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@heygen/liveavatar-web-sdk': path.join(__dirname, '../../packages/js-sdk/src/index.ts'),
        };
        return config;
    },
};

export default nextConfig;
