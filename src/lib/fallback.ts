import type { IcebreakRequest, IcebreakResult } from "./schema";

// AI が使えないとき（API キー未設定・通信エラーなど）でも
// その場が止まらないように、回答だけから話題を組み立てる。

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
    rules: "お題を読み上げたら、2人で「せーの！」で同時に答えを言います。そろったら成功！",
    rounds: ["赤い食べ物といえば？", "夏といえば？", "コンビニで買うものといえば？", "動物園の人気者といえば？", "朝ごはんといえば？"],
  },
  {
    name: "どっちを選ぶ？",
    rules: "2択のお題に、相手がどっちを選ぶか予想してから答え合わせ。当たったら1ポイント！",
    rounds: ["一生パンだけ／一生ごはんだけ", "空を飛べる／水の中で息ができる", "ずっと夏／ずっと冬", "過去に行ける／未来に行ける"],
  },
  {
    name: "3ヒントクイズ",
    rules: "片方が好きなものを1つ思い浮かべて、ヒントを3つ出します。もう片方は当ててみよう！",
    rounds: ["好きな食べ物", "好きなキャラクター", "行ってみたい場所", "最近買ったもの"],
  },
];

export function buildLocalResult(req: IcebreakRequest): IcebreakResult {
  const [nameA, nameB] = req.names.map((n, i) => n.trim() || (i === 0 ? "Aさん" : "Bさん"));
  const same = req.answers.filter((x) => x.a === x.b);
  const diff = req.answers.filter((x) => x.a !== x.b);

  const commonalities: IcebreakResult["commonalities"] =
    same.length > 0
      ? same.slice(0, 3).map((x) => ({
          title: `どちらも「${x.a}」`,
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
    question: `${nameA}は「${x.a}」、${nameB}は「${x.b}」。それぞれのいいところを紹介し合ってみない？`,
    why: `「${x.question}」で答えが分かれたから`,
  }));
  const topics = [...diffTopics, ...shuffle(GENERIC_TOPICS)]
    .filter((t) => !previous.has(t.question))
    .slice(0, 3);

  return {
    commonalities,
    topics: topics.length > 0 ? topics : shuffle(GENERIC_TOPICS).slice(0, 3),
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
