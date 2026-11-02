import { z } from "zod";

export const PLAYER_LABELS = ["左の人", "右の人"] as const;

export const VOICE_MOODS = ["静か", "ふつう", "にぎやか"] as const;
export type VoiceMood = (typeof VOICE_MOODS)[number];

// ブラウザから /api/icebreak に送る内容
export const IcebreakRequestSchema = z.object({
  answers: z
    .array(
      z.object({
        question: z.string().max(100),
        left: z.string().max(50),
        right: z.string().max(50),
      }),
    )
    .max(10),
  transcript: z.string().max(1000).optional(),
  // 10秒間の声の大きさ・話している時間から推定した場の雰囲気
  voice: z
    .object({
      mood: z.enum(VOICE_MOODS),
      speakingRatio: z.number().min(0).max(1),
    })
    .optional(),
  // 「別の話題を出す」とき、すでに出た話題を渡して重複を避ける
  previousTopics: z.array(z.string().max(200)).max(30).optional(),
});

export type IcebreakRequest = z.infer<typeof IcebreakRequestSchema>;

const PersonTypeSchema = z.object({
  typeName: z.string().describe("「〜タイプ」のような短い呼び名（12文字以内）"),
  description: z.string().describe("どんな人か、前向きな言葉で1〜2文"),
  surprise: z.string().describe("回答から見えた意外な一面を1文"),
});

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
  types: z.object({
    left: PersonTypeSchema,
    right: PersonTypeSchema,
    chemistry: z.string().describe("2人の組み合わせについての明るいひとこと"),
  }),
  minigame: z.object({
    name: z.string(),
    rules: z.string().describe("1〜2文でわかるルール"),
    rounds: z.array(z.string()).describe("そのまま読み上げて遊べるお題"),
  }),
});

export type IcebreakResult = z.infer<typeof IcebreakResultSchema>;

export type IcebreakResponse = IcebreakResult & {
  source: "ai" | "local";
};
