// 2人がそれぞれタップで答える「どっち派？」質問。
// 毎回この中からランダムに数問を選ぶ。

export type Question = {
  id: string;
  text: string;
  choices: [string, string, ...string[]];
};

export const QUESTION_POOL: Question[] = [
  { id: "morning", text: "朝型？夜型？", choices: ["朝型", "夜型"] },
  { id: "holiday", text: "休みの日はどう過ごしたい？", choices: ["家でのんびり", "外に出かける"] },
  { id: "pet", text: "飼うならどっち？", choices: ["犬", "猫", "その他の生き物"] },
  { id: "season", text: "いちばん好きな季節は？", choices: ["春", "夏", "秋", "冬"] },
  { id: "food", text: "今すぐ食べたいのは？", choices: ["ラーメン", "スイーツ", "焼肉", "おにぎり"] },
  { id: "music", text: "音楽を聴くなら？", choices: ["J-POP", "アニソン・ボカロ", "洋楽・K-POP", "あまり聴かない"] },
  { id: "travel", text: "旅行に行くなら？", choices: ["海", "山", "都会", "温泉"] },
  { id: "subject", text: "好きだった（好きな）教科は？", choices: ["国語・社会", "数学・理科", "英語", "体育・芸術"] },
  { id: "drink", text: "飲むならどっち？", choices: ["コーヒー・紅茶", "ジュース・炭酸", "お茶・水"] },
  { id: "movie", text: "観るならどれ？", choices: ["アニメ", "映画", "ドラマ", "動画配信者"] },
  { id: "plan", text: "予定の立て方は？", choices: ["きっちり計画", "その場のノリ"] },
  { id: "sweet", text: "甘いものとしょっぱいもの、どっち派？", choices: ["甘いもの", "しょっぱいもの"] },
  { id: "superpower", text: "1つだけ超能力がもらえるなら？", choices: ["瞬間移動", "時間を止める", "動物と話せる", "心が読める"] },
  { id: "game", text: "ゲームはする？", choices: ["よくする", "たまにする", "ほとんどしない"] },
  { id: "sport", text: "スポーツは？", choices: ["するのが好き", "観るのが好き", "どちらも苦手"] },
  { id: "gunma", text: "群馬のおすすめを1つ選ぶなら？", choices: ["温泉", "焼きまんじゅう", "自然・山", "上毛かるた"] },
];

export const QUESTIONS_PER_SESSION = 5;

export function pickQuestions(count = QUESTIONS_PER_SESSION): Question[] {
  const pool = [...QUESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
