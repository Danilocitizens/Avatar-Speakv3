import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@heygen/liveavatar-web-sdk'],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@heygen/liveavatar-web-sdk': require.resolve('@heygen/liveavatar-web-sdk'),
        };
        return config;
    },
};

export default nextConfig;
