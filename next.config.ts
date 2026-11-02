import type { NextConfig } from "next";

// GitHub Pages（https://<ユーザー名>.github.io/<リポジトリ名>/）で動かすため、
// 静的なファイルとして書き出す。公開先のパスはワークフローから PAGES_BASE_PATH で渡す。
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
