/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config) => {
    // Silence @metamask/sdk trying to bundle react-native-async-storage (mobile-only dep)
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@react-native-async-storage/async-storage": false,
      },
    };
    return config;
  },
};

export default nextConfig;
