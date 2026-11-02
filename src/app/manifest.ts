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
    background_color: "#eef0f7",
    theme_color: "#1f2b4d",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
