/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/tasks", destination: "/markets", permanent: true },
      { source: "/tasks/:path*", destination: "/markets", permanent: true },
      { source: "/agents", destination: "/markets", permanent: true },
      { source: "/agents/:path*", destination: "/markets", permanent: true },
    ];
  },
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
