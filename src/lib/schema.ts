import { z } from "zod";

// ブラウザから /api/icebreak に送る内容
export const IcebreakRequestSchema = z.object({
  names: z.tuple([z.string().max(20), z.string().max(20)]),
  answers: z
    .array(
      z.object({
        question: z.string().max(100),
        a: z.string().max(50),
        b: z.string().max(50),
      }),
    )
    .max(10),
  transcript: z.string().max(1000).optional(),
  // 「別の話題を出す」とき、すでに出た話題を渡して重複を避ける
  previousTopics: z.array(z.string().max(200)).max(30).optional(),
});

export type IcebreakRequest = z.infer<typeof IcebreakRequestSchema>;

// AI が返す内容（構造化出力のスキーマにもそのまま使う）
export const IcebreakResultSchema = z.object({
  commonalities: z.array(
    z.object({
      title: z.string().describe("共通点を短く（20文字以内）"),
      detail: z.string().describe("その共通点から話を広げるひとこと"),
    }),
  ),
  topics: z.array(
    z.object({
      question: z.string().describe("どちらかが相手に投げかける質問文"),
      why: z.string().describe("この話題をすすめる理由（短く）"),
    }),
  ),
  minigame: z.object({
    name: z.string(),
    rules: z.string().describe("1〜3文でわかるルール"),
    rounds: z.array(z.string()).describe("そのまま読み上げて遊べるお題"),
  }),
});

export type IcebreakResult = z.infer<typeof IcebreakResultSchema>;

export type IcebreakResponse = IcebreakResult & {
  source: "ai" | "local";
};
