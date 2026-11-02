"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ブラウザの音声認識（Web Speech API）で会話を文字にする。
// 録音データそのものは保存も送信もしない（文字にした結果だけを使う）。

type RecognitionResultList = ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const RECORD_SECONDS = 10;

export function useSpeechTranscript() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef("");

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    setTranscript("");
    finalTextRef.current = "";

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalTextRef.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      setTranscript(finalTextRef.current + interim);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("マイクが使えませんでした。ブラウザの設定でマイクを許可してください。");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setError("うまく聞き取れませんでした。もう一度ためすか、スキップしてください。");
      }
    };
    rec.onend = () => {
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setSecondsLeft(RECORD_SECONDS);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const left = RECORD_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0) stop();
    }, 200);
  }, [stop]);

  return { supported, recording, secondsLeft, transcript, error, start, stop };
}
