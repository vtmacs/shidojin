import type { MetadataRoute } from "next";

// スマホの「ホーム画面に追加」でアプリのように開けるようにする
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LinkSide",
    short_name: "LinkSide",
    description: "沈黙を笑顔にする、対面型AIアイスブレイカー",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f3",
    theme_color: "#ff7a59",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
