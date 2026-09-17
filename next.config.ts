import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apple requires the association file to be served as
        // application/json. It has no file extension, so nothing infers that
        // for us and the default guess makes verification fail silently —
        // Universal Links simply never activate, with no error anywhere.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

export default nextConfig;
