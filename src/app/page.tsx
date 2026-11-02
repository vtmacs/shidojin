"use client";

import { useState } from "react";
import { pickQuestions, type Question } from "@/lib/questions";
import type { IcebreakRequest, IcebreakResponse } from "@/lib/schema";
import { RECORD_SECONDS, useSpeechTranscript } from "@/lib/useSpeechTranscript";

type Step = "home" | "names" | "quiz" | "voice" | "loading" | "result";
type Answer = { question: string; a: string; b: string };

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<IcebreakResponse | null>(null);
  const [previousTopics, setPreviousTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const displayNames: [string, string] = [names[0].trim() || "Aさん", names[1].trim() || "Bさん"];

  function startQuiz() {
    setQuestions(pickQuestions());
    setAnswers([]);
    setTranscript("");
    setPreviousTopics([]);
    setResult(null);
    setError(null);
    setStep("quiz");
  }

  async function generate(extra: { transcript?: string; previousTopics?: string[] } = {}) {
    setError(null);
    setStep("loading");
    const body: IcebreakRequest = {
      names,
      answers,
      transcript: (extra.transcript ?? transcript) || undefined,
      previousTopics: extra.previousTopics,
    };
    try {
      const res = await fetch("/api/icebreak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as IcebreakResponse;
      setResult(data);
      setPreviousTopics((prev) => [
        ...prev,
        ...data.topics.map((t) => t.question),
        `ミニゲーム: ${data.minigame.name}`,
      ]);
      setStep("result");
    } catch {
      setError("話題を作れませんでした。通信状態を確認して、もう一度ためしてください。");
      setStep(result ? "result" : "voice");
    }
  }

  return (
    <main className="app">
      {step === "home" && (
        <section className="screen center">
          <p className="tagline">沈黙を笑顔にする、対面型AIアイスブレイカー</p>
          <h1 className="logo">LinkSide</h1>
          <p className="lead">
            スマホを2人のあいだに置いて、
            <br />
            タップで答えるだけ。
            <br />
            AI が共通点と話題を見つけます。
          </p>
          <button className="primary big" onClick={() => setStep("names")}>
            はじめる
          </button>
          <p className="note">登録はいりません</p>
        </section>
      )}

      {step === "names" && (
        <section className="screen center">
          <h2>呼び方を決めよう</h2>
          <p className="lead">ニックネームでOK。空欄のままでも遊べます。</p>
          {[0, 1].map((i) => (
            <label key={i} className="field">
              <span>{i === 0 ? "手前の人" : "向かいの人"}</span>
              <input
                value={names[i]}
                maxLength={20}
                placeholder={i === 0 ? "Aさん" : "Bさん"}
                onChange={(e) =>
                  setNames((prev) => {
                    const next: [string, string] = [...prev];
                    next[i] = e.target.value;
                    return next;
                  })
                }
              />
            </label>
          ))}
          <button className="primary big" onClick={startQuiz}>
            つぎへ
          </button>
        </section>
      )}

      {step === "quiz" && (
        <Quiz
          questions={questions}
          names={displayNames}
          onDone={(list) => {
            setAnswers(list);
            setStep("voice");
          }}
        />
      )}

      {step === "voice" && (
        <Voice
          error={error}
          onSubmit={(text) => {
            setTranscript(text);
            void generate({ transcript: text });
          }}
        />
      )}

      {step === "loading" && (
        <section className="screen center">
          <div className="spinner" aria-hidden />
          <p className="lead">AI がふたりの共通点をさがしています…</p>
        </section>
      )}

      {step === "result" && result && (
        <Result
          result={result}
          names={displayNames}
          answers={answers}
          error={error}
          onMore={() => void generate({ previousTopics })}
          onRestart={startQuiz}
        />
      )}
    </main>
  );
}

// ---- 2人で同時に答える画面 ----
// スマホを机に置いて向かい合う前提で、上半分は向かいの人向けに180度回転させる。

function Quiz({
  questions,
  names,
  onDone,
}: {
  questions: Question[];
  names: [string, string];
  onDone: (answers: Answer[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<[string | null, string | null]>([null, null]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const q = questions[index];
  const bothPicked = picks[0] !== null && picks[1] !== null;
  const matched = bothPicked && picks[0] === picks[1];

  function pick(player: 0 | 1, choice: string) {
    if (bothPicked) return;
    setPicks((prev) => {
      const next: [string | null, string | null] = [...prev];
      next[player] = choice;
      return next;
    });
  }

  function next() {
    const list = [...answers, { question: q.text, a: picks[0]!, b: picks[1]! }];
    if (index + 1 >= questions.length) {
      onDone(list);
      return;
    }
    setAnswers(list);
    setIndex(index + 1);
    setPicks([null, null]);
  }

  const half = (player: 0 | 1) => (
    <div className={`half ${player === 1 ? "flipped" : ""}`}>
      <p className="who">
        {names[player]}
        <span className="count">
          {index + 1} / {questions.length}
        </span>
      </p>
      <p className="question">{q.text}</p>
      <div className="choices">
        {q.choices.map((c) => (
          <button
            key={c}
            className={`choice ${picks[player] === c && bothPicked ? "picked" : ""}`}
            disabled={picks[player] !== null}
            onClick={() => pick(player, c)}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="status">
        {bothPicked
          ? `相手は「${picks[player === 0 ? 1 : 0]}」`
          : picks[player] !== null
            ? "相手の回答を待っています…"
            : "相手に見えないように選んでね"}
      </p>
    </div>
  );

  return (
    <section className="quiz">
      {half(1)}
      <div className="divider">
        {bothPicked ? (
          <>
            <span className={`verdict ${matched ? "match" : ""}`}>{matched ? "おそろい！" : "ちがった！"}</span>
            <button className="primary" onClick={next}>
              {index + 1 >= questions.length ? "結果へ" : "つぎの質問"}
            </button>
          </>
        ) : (
          <span className="verdict">2人とも選んでね</span>
        )}
      </div>
      {half(0)}
    </section>
  );
}

// ---- 10秒だけ会話を聞き取る画面（スキップ可） ----

function Voice({ error, onSubmit }: { error: string | null; onSubmit: (transcript: string) => void }) {
  const speech = useSpeechTranscript();
  const done = !speech.recording && speech.transcript.length > 0;

  return (
    <section className="screen center">
      <h2>10秒だけ、ふたりで話してみよう</h2>
      <p className="lead">
        「どうしてそれを選んだの？」など、なんでもOK。
        <br />
        AI が会話の内容もふまえて話題を考えます。
      </p>

      {speech.supported === false && (
        <p className="note">このブラウザは音声の聞き取りに対応していません。スキップして進めます。</p>
      )}

      {speech.supported && (
        <>
          <button
            className={`record ${speech.recording ? "on" : ""}`}
            onClick={speech.recording ? speech.stop : speech.start}
            aria-label={speech.recording ? "録音を止める" : "録音をはじめる"}
          >
            {speech.recording ? speech.secondsLeft : "●"}
          </button>
          <p className="note">
            {speech.recording ? "聞き取り中… タップで止める" : `タップで${RECORD_SECONDS}秒間 聞き取ります`}
          </p>
          {speech.transcript && <p className="transcript">「{speech.transcript}」</p>}
          {speech.error && <p className="error">{speech.error}</p>}
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button className="secondary" disabled={speech.recording} onClick={() => onSubmit("")}>
          スキップ
        </button>
        <button className="primary" disabled={!done} onClick={() => onSubmit(speech.transcript)}>
          この会話で話題を作る
        </button>
      </div>
      <p className="note small">音声は保存しません。文字にした内容だけを AI に送ります。</p>
    </section>
  );
}

// ---- 結果画面 ----

type Tab = "common" | "topics" | "game";

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ["common", "共通点"],
  ["topics", "話題"],
  ["game", "ミニゲーム"],
];

function Result({
  result,
  names,
  answers,
  error,
  onMore,
  onRestart,
}: {
  result: IcebreakResponse;
  names: [string, string];
  answers: Answer[];
  error: string | null;
  onMore: () => void;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState<Tab>("common");
  const [flipped, setFlipped] = useState(false);
  const matchCount = answers.filter((x) => x.a === x.b).length;

  return (
    <section className={`screen result ${flipped ? "flipped" : ""}`}>
      <div className="result-head">
        <p className="score">
          {names[0]} × {names[1]}
          <strong>
            {matchCount} / {answers.length} 問おそろい
          </strong>
        </p>
        <button className="icon" onClick={() => setFlipped(!flipped)} aria-label="画面を相手側に向ける">
          ⇅
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cards">
        {tab === "common" &&
          result.commonalities.map((c, i) => (
            <article key={i} className="card">
              <h3>{c.title}</h3>
              <p>{c.detail}</p>
            </article>
          ))}
        {tab === "topics" &&
          result.topics.map((t, i) => (
            <article key={i} className="card">
              <h3>{t.question}</h3>
              <p className="why">{t.why}</p>
            </article>
          ))}
        {tab === "game" && <Minigame key={result.minigame.name} game={result.minigame} />}
      </div>

      {error && <p className="error">{error}</p>}
      {result.source === "local" && (
        <p className="note small">いまは AI につながらないため、かんたんな方法で話題を作りました。</p>
      )}

      <div className="row">
        <button className="secondary" onClick={onRestart}>
          質問からやり直す
        </button>
        <button className="primary" onClick={onMore}>
          別の話題を出す
        </button>
      </div>
    </section>
  );
}

function Minigame({ game }: { game: IcebreakResponse["minigame"] }) {
  const [round, setRound] = useState(0);
  const total = game.rounds.length;
  const finished = round >= total;

  return (
    <article className="card game">
      <h3>{game.name}</h3>
      <p>{game.rules}</p>
      {total > 0 && (
        <>
          <p className="round-label">{finished ? "クリア！" : `お題 ${round + 1} / ${total}`}</p>
          <p className="round">{finished ? "おつかれさま！" : game.rounds[round]}</p>
          <button className="primary" onClick={() => setRound(finished ? 0 : round + 1)}>
            {finished ? "もう一回" : round + 1 < total ? "つぎのお題" : "おわり"}
          </button>
        </>
      )}
    </article>
  );
}
