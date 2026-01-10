/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle optional ledger-bitcoin dependency from @bitcoinerlab/descriptors
    // We don't use Ledger integration, so stub it out
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'ledger-bitcoin': false,
    };

    return config;
  },
};

export default nextConfig;
