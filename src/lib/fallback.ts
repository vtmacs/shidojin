import { PLAYER_LABELS, type IcebreakRequest, type IcebreakResult } from "./schema";

// AI が使えないとき（API キー未設定・通信エラーなど）でも
// その場が止まらないように、回答だけから結果を組み立てる。

const GENERIC_TOPICS = [
  { question: "最近ちょっとうれしかったことって何？", why: "誰でも答えやすく、明るい話になりやすい" },
  { question: "今ハマっているものを1つ教えて！", why: "好きなものの話は自然と盛り上がる" },
  { question: "子どものころの夢って何だった？", why: "意外な一面が見えて会話が広がる" },
  { question: "もし1日だけ自由に使えるなら何する？", why: "想像の話なので気楽に答えられる" },
  { question: "地元でおすすめの場所はある？", why: "共通の場所が見つかるかも" },
  { question: "最近見ておもしろかった動画や番組は？", why: "おすすめし合うと次の話題につながる" },
];

const MINIGAMES: IcebreakResult["minigame"][] = [
  {
    name: "せーので同じ答え",
    rules: "お題を読んだら「せーの！」で同時に答えを言おう。そろったら成功！",
    rounds: ["赤い食べ物といえば？", "夏といえば？", "コンビニで買うものといえば？", "動物園の人気者といえば？", "朝ごはんといえば？"],
  },
  {
    name: "究極の二択",
    rules: "相手がどっちを選ぶか予想してから、せーので答え合わせ。当たったら1ポイント！",
    rounds: ["一生パンだけ／一生ごはんだけ", "空を飛べる／水の中で息ができる", "ずっと夏／ずっと冬", "過去に行ける／未来に行ける"],
  },
  {
    name: "3ヒントクイズ",
    rules: "片方が好きなものを思い浮かべてヒントを3つ。もう片方は当ててみよう！",
    rounds: ["好きな食べ物", "好きなキャラクター", "行ってみたい場所", "最近買ったもの"],
  },
];

const TYPES = [
  { typeName: "マイペース探検家", description: "自分のペースで、気になることをとことん楽しめる人。" },
  { typeName: "おだやか聞き上手", description: "まわりの話をじっくり聞けて、そばにいると安心できる人。" },
  { typeName: "わくわく行動派", description: "思い立ったらすぐ動ける、場を明るくするタイプ。" },
  { typeName: "こだわり職人", description: "好きなものへのこだわりが強く、話すと深い人。" },
];

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function buildLocalResult(req: IcebreakRequest): IcebreakResult {
  const [left, right] = PLAYER_LABELS;
  const same = req.answers.filter((x) => x.left === x.right);
  const diff = req.answers.filter((x) => x.left !== x.right);

  const commonalities: IcebreakResult["commonalities"] =
    same.length > 0
      ? same.slice(0, 3).map((x) => ({
          title: `どちらも「${x.left}」`,
          detail: `「${x.question}」で同じ答え！どうしてそれを選んだのか聞いてみよう。`,
        }))
      : [
          {
            title: "答えが全部ちがう！",
            detail: "それだけ相手から新しいことを知れるチャンス。ちがいを楽しもう。",
          },
        ];

  const previous = new Set(req.previousTopics ?? []);
  const diffTopics = diff.map((x) => ({
    question: `${left}は「${x.left}」、${right}は「${x.right}」。それぞれのいいところを教えて！`,
    why: `「${x.question}」で答えが分かれたから`,
  }));
  const topics = [...diffTopics, ...shuffle(GENERIC_TOPICS)]
    .filter((t) => !previous.has(t.question))
    .slice(0, 3);

  const personType = (side: "left" | "right") => {
    const key = req.answers.map((x) => x[side]).join("|");
    const base = TYPES[hash(key + side) % TYPES.length];
    const pick = req.answers[hash(key) % Math.max(1, req.answers.length)];
    return {
      ...base,
      surprise: pick
        ? `「${pick.question}」で「${pick[side]}」を選んだところに、その人らしさが出ているかも。`
        : "これから話して、意外な一面を見つけよう。",
    };
  };

  return {
    commonalities,
    topics: topics.length > 0 ? topics : shuffle(GENERIC_TOPICS).slice(0, 3),
    types: {
      left: personType("left"),
      right: personType("right"),
      chemistry:
        same.length >= diff.length
          ? "似ているところが多い2人。好きなものの話でどんどん盛り上がれそう！"
          : "ちがうところが多い2人。おたがいの「なんで？」を聞くと話がつきなさそう！",
    },
    minigame: MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)],
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
