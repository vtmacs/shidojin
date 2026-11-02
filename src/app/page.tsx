"use client";

import { useEffect, useState } from "react";
import { clearApiKey, loadApiKey, saveApiKey } from "@/lib/apiKey";
import { generateIcebreak } from "@/lib/generate";
import { pickQuestions, type Question } from "@/lib/questions";
import { pickRescueTopic } from "@/lib/rescue";
import { PLAYER_LABELS, type IcebreakRequest, type IcebreakResponse } from "@/lib/schema";
import { RECORD_SECONDS, useSpeechTranscript, type VoiceSummary } from "@/lib/useSpeechTranscript";

type Step = "home" | "quiz" | "voice" | "loading" | "result";
type Answer = { question: string; left: string; right: string };
type Side = 0 | 1;

const [LEFT, RIGHT] = PLAYER_LABELS;

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [voiceInput, setVoiceInput] = useState<{ transcript: string; voice: VoiceSummary | null }>({
    transcript: "",
    voice: null,
  });
  const [result, setResult] = useState<IcebreakResponse | null>(null);
  const [previousTopics, setPreviousTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => setHasKey(loadApiKey() !== null), []);

  function startQuiz() {
    setQuestions(pickQuestions());
    setAnswers([]);
    setVoiceInput({ transcript: "", voice: null });
    setPreviousTopics([]);
    setResult(null);
    setError(null);
    setStep("quiz");
  }

  async function generate(input: { transcript: string; voice: VoiceSummary | null }, avoid?: string[]) {
    setError(null);
    setStep("loading");
    const body: IcebreakRequest = {
      answers,
      transcript: input.transcript || undefined,
      voice: input.voice ?? undefined,
      previousTopics: avoid,
    };
    try {
      const data = await generateIcebreak(body);
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

  const showRescue = step === "quiz" || step === "voice" || step === "result";

  return (
    <main className="app">
      {step === "home" && (
        <section className="screen center hero">
          <h1 className="wordmark">LINKSIDE</h1>
          <p className="tagline">～沈黙を笑顔にする、対面型アイスブレイカー～</p>
          <div className="howto">
            <p>📱 スマホを2人で並んでのぞきこもう</p>
            <p>👆 タップするだけ。文字の入力はいりません</p>
            <p>✨ AI が共通点と話題を見つけます</p>
          </div>
          <button className="primary big" onClick={startQuiz}>
            はじめる
          </button>
          <p className="note">登録はいりません</p>
          <button className="link" onClick={() => setSettingsOpen(true)}>
            {hasKey ? "✅ AI モード（この端末）" : "AI を使う設定"}
          </button>
        </section>
      )}

      {step === "quiz" && (
        <Quiz
          questions={questions}
          onDone={(list) => {
            setAnswers(list);
            setStep("voice");
          }}
        />
      )}

      {step === "voice" && (
        <Voice
          error={error}
          onSubmit={(input) => {
            setVoiceInput(input);
            void generate(input);
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
          answers={answers}
          error={error}
          onMore={() => void generate(voiceInput, previousTopics)}
          onRestart={startQuiz}
        />
      )}

      {showRescue && !rescueOpen && (
        <button className="rescue-fab" onClick={() => setRescueOpen(true)}>
          <span aria-hidden>🛟</span> レスキュー
        </button>
      )}
      {settingsOpen && (
        <Settings
          hasKey={hasKey}
          onChange={() => setHasKey(loadApiKey() !== null)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {rescueOpen && (
        <Rescue extraTopics={result?.topics.map((t) => t.question) ?? []} onClose={() => setRescueOpen(false)} />
      )}
    </main>
  );
}

// ---- 2人が並んで、それぞれの列をタップする画面 ----

function Quiz({ questions, onDone }: { questions: Question[]; onDone: (answers: Answer[]) => void }) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<[string | null, string | null]>([null, null]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const q = questions[index];
  const bothPicked = picks[0] !== null && picks[1] !== null;
  const matched = bothPicked && picks[0] === picks[1];
  const isLast = index + 1 >= questions.length;

  function pick(side: Side, choice: string) {
    if (bothPicked) return;
    setPicks((prev) => {
      const next: [string | null, string | null] = [...prev];
      next[side] = choice;
      return next;
    });
  }

  function next() {
    const list = [...answers, { question: q.text, left: picks[0]!, right: picks[1]! }];
    if (isLast) {
      onDone(list);
      return;
    }
    setAnswers(list);
    setIndex(index + 1);
    setPicks([null, null]);
  }

  return (
    <section className="screen quiz">
      <p className="progress">
        しつもん {index + 1} / {questions.length}
      </p>
      <h2 className="question">{q.text}</h2>

      <div className="columns">
        {([0, 1] as const).map((side) => (
          <div key={side} className={`column side-${side}`}>
            <p className="who">{PLAYER_LABELS[side]}</p>
            {q.choices.map((c) => (
              <button
                key={c}
                className={`choice ${picks[side] === c ? "picked" : ""}`}
                aria-pressed={picks[side] === c}
                disabled={bothPicked}
                onClick={() => pick(side, c)}
              >
                {c}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="quiz-footer">
        {bothPicked ? (
          <>
            <p className={`verdict ${matched ? "match" : ""}`}>{matched ? "🎉 おそろい！" : "ちがった！なんで？"}</p>
            <button className="primary big" onClick={next}>
              {isLast ? "けっかを見る" : "つぎのしつもん"}
            </button>
          </>
        ) : (
          <p className="verdict">
            {picks[0] === null && picks[1] === null
              ? "2人とも、自分の列から選んでね"
              : `${picks[0] === null ? LEFT : RIGHT}の番です`}
          </p>
        )}
      </div>
    </section>
  );
}

// ---- 10秒だけ会話を聞き取る画面（スキップ可） ----

function Voice({
  error,
  onSubmit,
}: {
  error: string | null;
  onSubmit: (input: { transcript: string; voice: VoiceSummary | null }) => void;
}) {
  const speech = useSpeechTranscript();
  const done = !speech.recording && speech.transcript.length > 0;

  return (
    <section className="screen center">
      <h2>10秒だけ、ふたりで話してみよう</h2>
      <p className="lead">
        「どうしてそれを選んだの？」など、なんでもOK。
        <br />
        AI が声の様子と言葉から話題を考えます。
      </p>

      {speech.supported === false && (
        <p className="note">このブラウザは音声の聞き取りに対応していません。スキップして進めます。</p>
      )}

      {speech.supported && (
        <>
          <button
            className={`record ${speech.recording ? "on" : ""}`}
            onClick={speech.recording ? speech.stop : speech.start}
            aria-label={speech.recording ? "聞き取りを止める" : "聞き取りをはじめる"}
          >
            {speech.recording ? speech.secondsLeft : "🎤"}
          </button>
          <div className="meter" aria-hidden>
            <div className="meter-bar" style={{ transform: `scaleX(${speech.level})` }} />
          </div>
          <p className="note">
            {speech.recording ? "聞き取り中… タップで止める" : `タップで${RECORD_SECONDS}秒間 聞き取ります`}
          </p>
          {speech.transcript && <p className="transcript">「{speech.transcript}」</p>}
          {done && speech.voice && <p className="note">声の様子: {speech.voice.mood}</p>}
          {speech.error && <p className="error">{speech.error}</p>}
        </>
      )}

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button
          className="secondary"
          disabled={speech.recording}
          onClick={() => onSubmit({ transcript: "", voice: null })}
        >
          スキップ
        </button>
        <button
          className="primary"
          disabled={!done}
          onClick={() => onSubmit({ transcript: speech.transcript, voice: speech.voice })}
        >
          この会話で話題を作る
        </button>
      </div>
      <p className="note small">音声は保存しません。文字にした内容と声の大きさの目安だけを AI に送ります。</p>
    </section>
  );
}

// ---- 結果画面 ----

type Tab = "common" | "topics" | "types" | "game";

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ["common", "共通点"],
  ["topics", "話題"],
  ["types", "タイプ"],
  ["game", "ゲーム"],
];

function Result({
  result,
  answers,
  error,
  onMore,
  onRestart,
}: {
  result: IcebreakResponse;
  answers: Answer[];
  error: string | null;
  onMore: () => void;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState<Tab>("common");
  const matchCount = answers.filter((x) => x.left === x.right).length;

  return (
    <section className="screen result">
      <p className="score">
        {LEFT} × {RIGHT}
        <strong>
          {matchCount} / {answers.length} 問おそろい
        </strong>
      </p>

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
        {tab === "types" && (
          <>
            {(["left", "right"] as const).map((side, i) => {
              const t = result.types[side];
              return (
                <article key={side} className={`card type side-${i}`}>
                  <p className="who">{PLAYER_LABELS[i]}は…</p>
                  <h3>{t.typeName}</h3>
                  <p>{t.description}</p>
                  <p className="surprise">
                    <span>意外な一面</span>
                    {t.surprise}
                  </p>
                </article>
              );
            })}
            <article className="card chemistry">
              <p>{result.types.chemistry}</p>
            </article>
          </>
        )}
        {tab === "game" && <Minigame key={result.minigame.name} game={result.minigame} />}
      </div>

      {error && <p className="error">{error}</p>}
      {result.keyInvalid ? (
        <p className="error">保存されている API キーが使えませんでした。スタート画面の設定から確認してください。</p>
      ) : (
        result.source === "local" && <p className="note small">AI を使わず、かんたんな方法で作りました。</p>
      )}

      <div className="row">
        <button className="secondary" onClick={onRestart}>
          しつもんから
        </button>
        <button className="primary" onClick={onMore}>
          別の話題を出す
        </button>
      </div>
    </section>
  );
}

// ---- 30秒ミニゲーム ----

const GAME_SECONDS = 30;

function Minigame({ game }: { game: IcebreakResponse["minigame"] }) {
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const total = game.rounds.length;
  const running = secondsLeft !== null && secondsLeft > 0;
  const timeUp = secondsLeft === 0;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [running, secondsLeft]);

  function start() {
    setRound(0);
    setSecondsLeft(GAME_SECONDS);
  }

  return (
    <article className="card game">
      <h3>{game.name}</h3>
      <p>{game.rules}</p>

      {secondsLeft === null ? (
        <button className="primary big" onClick={start}>
          {GAME_SECONDS}秒スタート！
        </button>
      ) : (
        <>
          <div className="timer" aria-live="polite">
            <div className="timer-bar" style={{ transform: `scaleX(${secondsLeft / GAME_SECONDS})` }} />
            <span>{timeUp ? "タイムアップ！" : `のこり ${secondsLeft} 秒`}</span>
          </div>
          {!timeUp && total > 0 && (
            <>
              <p className="round-label">
                お題 {(round % total) + 1} / {total}
              </p>
              <p className="round">{game.rounds[round % total]}</p>
              <button className="primary" onClick={() => setRound(round + 1)}>
                つぎのお題
              </button>
            </>
          )}
          {timeUp && (
            <>
              <p className="round">おつかれさま！</p>
              <button className="primary" onClick={start}>
                もう一回
              </button>
            </>
          )}
        </>
      )}
    </article>
  );
}

// ---- レスキューボタン：話が途切れたらワンタップで話題 ----

function Rescue({ extraTopics, onClose }: { extraTopics: string[]; onClose: () => void }) {
  const [topic, setTopic] = useState(() => pickRescueTopic(extraTopics));

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="レスキュー話題" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="sheet-label">🛟 この話題はどう？</p>
        <p className="sheet-topic">{topic}</p>
        <div className="row">
          <button className="secondary" onClick={onClose}>
            とじる
          </button>
          <button className="primary" onClick={() => setTopic(pickRescueTopic(extraTopics, topic))}>
            べつの話題
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- AI の設定：持ち主の端末にだけ API キーを保存する ----

function Settings({ hasKey, onChange, onClose }: { hasKey: boolean; onChange: () => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    if (!value.trim().startsWith("sk-ant-")) {
      setMessage("Claude API のキー（sk-ant- で始まる文字列）を入れてください。");
      return;
    }
    if (!saveApiKey(value)) {
      setMessage("この端末には保存できませんでした（プライベートブラウズでは保存できないことがあります）。");
      return;
    }
    setValue("");
    setMessage(null);
    onChange();
    onClose();
  }

  function remove() {
    clearApiKey();
    onChange();
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="AI の設定" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <p className="sheet-label">AI の設定</p>
        <p className="settings-text">
          AI を使うと、ふたりに合わせた共通点・話題・タイプ診断・ミニゲームを作れます。設定しなくても、かんたんな方法で全部の機能を使えます。
        </p>
        {hasKey ? (
          <>
            <p className="settings-status">✅ この端末に API キーが保存されています</p>
            <div className="row">
              <button className="secondary" onClick={remove}>
                キーを消す
              </button>
              <button className="primary" onClick={onClose}>
                とじる
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="field">
              <span>Claude API のキー</span>
              <input
                type="password"
                autoComplete="off"
                placeholder="sk-ant-..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            {message && <p className="error">{message}</p>}
            <p className="note small">
              キーはこの端末のブラウザの中だけに保存され、サイトには載りません。自分の端末でだけ設定し、Claude Console
              で利用額の上限を決めておくと安心です。
            </p>
            <div className="row">
              <button className="secondary" onClick={onClose}>
                とじる
              </button>
              <button className="primary" onClick={save}>
                保存する
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
