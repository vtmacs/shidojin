# LinkSide

～沈黙を笑顔にする、対面型AIアイスブレイカー～

始動人Jr.インキュベーション 2026 のプロジェクトです。

初対面で何を話せばいいかわからない、という悩みを解決するための、対面で使うアイスブレイク用の AI アプリです。
2人で画面の選択肢をタップしたり、10秒だけ会話を聞き取らせたりすると、AI が共通点、話題、ミニゲームを作ります。
事前登録はいらないので、気まずくなったその場ですぐに使えます。

## 使い方

1. スマホを2人のあいだに置いて「はじめる」を押す（向かいの人の側は画面が上下逆さに表示されます）
2. 呼び方を入れる（空欄でもOK）
3. 「どっち派？」の質問 5 問に、2人それぞれがタップで答える
4. 10秒だけ2人で話して聞き取らせる（スキップもできます）
5. AI が出した「共通点」「話題」「ミニゲーム」で話す。「別の話題を出す」で何度でも作り直せます

## しくみ

| 部分 | 使っているもの |
| --- | --- |
| 画面 | Next.js（App Router）、React、TypeScript |
| 10秒の聞き取り | ブラウザの音声認識（Web Speech API）。音声は保存せず、文字にした内容だけを使います |
| AI | Claude API（`claude-opus-5-5`）。決まった形の JSON で結果を返させています |
| AI が使えないとき | API キーがないときや通信エラーのときは、回答だけから話題を作る簡易ロジックに切り替わります |

主なファイル:

- `src/app/page.tsx` … 画面全体（スタート → 名前 → 質問 → 聞き取り → 結果）
- `src/app/api/icebreak/route.ts` … Claude に話題を作らせるサーバー側の処理
- `src/lib/questions.ts` … 「どっち派？」の質問一覧（ここを編集すると質問を増やせます）
- `src/lib/fallback.ts` … AI が使えないときの簡易ロジック
- `src/lib/useSpeechTranscript.ts` … 10秒の聞き取り

## 手元で動かす

Node.js 20 以上が必要です。

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY に Claude API のキーを入れる
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

音声の聞き取りは Chrome、Edge、Safari で動きます（Firefox は非対応で、スキップして使えます）。
スマホで試すときは、マイクを使うために HTTPS で開く必要があります。下の Vercel で公開するのが簡単です。

## 公開する（Vercel）

1. https://vercel.com に GitHub アカウントでログインし、このリポジトリを読み込む
2. 「Environment Variables」に `ANTHROPIC_API_KEY` を追加する
3. Deploy を押すと、スマホからそのまま開ける URL ができます

API キーはサーバー側だけで使い、ブラウザには送りません。
