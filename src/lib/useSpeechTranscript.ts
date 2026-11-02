"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceMood } from "./schema";

// 10秒間の会話を
// - ブラウザの音声認識（Web Speech API）で文字にし、
// - マイクの音量から「声の様子」（静か／ふつう／にぎやか）を推定する。
// 録音データそのものは保存も送信もしない。

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

// 音量（RMS）のしきい値。これを超えたら「声が出ている」とみなす
const VOICE_THRESHOLD = 0.04;

export type VoiceSummary = { mood: VoiceMood; speakingRatio: number };

type Meter = {
  stream: MediaStream;
  ctx: AudioContext;
  timer: ReturnType<typeof setInterval> | null;
  samples: number;
  voiced: number;
  sum: number;
};

export function useSpeechTranscript() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const [transcript, setTranscript] = useState("");
  const [level, setLevel] = useState(0);
  const [voice, setVoice] = useState<VoiceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meterRef = useRef<Meter | null>(null);
  const finalTextRef = useRef("");
  const retriedRef = useRef(false);
  const activeRef = useRef(false);

  const stopMeter = useCallback(() => {
    const m = meterRef.current;
    if (!m) return;
    meterRef.current = null;
    if (m.timer) clearInterval(m.timer);
    m.stream.getTracks().forEach((t) => t.stop());
    void m.ctx.close();
    setLevel(0);
    if (m.samples > 0) {
      const ratio = m.voiced / m.samples;
      const avg = m.sum / m.samples;
      const mood: VoiceMood = ratio < 0.25 ? "静か" : ratio > 0.6 && avg > VOICE_THRESHOLD * 1.5 ? "にぎやか" : "ふつう";
      setVoice({ mood, speakingRatio: Math.round(ratio * 100) / 100 });
    }
  }, []);

  // 音量の計測はおまけ機能。マイクを取れなくても文字起こしは続ける
  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // マイクの許可を待つあいだに聞き取りが終わっていたら、すぐ手放す
      if (!activeRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const meter: Meter = { stream, ctx, samples: 0, voiced: 0, sum: 0, timer: null };
      meter.timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sq = 0;
        for (const v of buf) sq += v * v;
        const rms = Math.sqrt(sq / buf.length);
        meter.samples++;
        meter.sum += rms;
        if (rms > VOICE_THRESHOLD) meter.voiced++;
        setLevel(Math.min(1, rms * 8));
      }, 100);
      meterRef.current = meter;
    } catch {
      // 計測できない環境では声の様子なしで進める
    }
  }, []);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.abort();
      stopMeter();
    };
  }, [stopMeter]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recognitionRef.current?.stop();
    stopMeter();
  }, [stopMeter]);

  const startRecognition = useCallback(
    (withMeter: boolean) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
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
        // 端末によっては音量計測とマイクを取り合うので、そのときは計測をやめてやり直す
        if (e.error === "audio-capture" && withMeter && !retriedRef.current) {
          retriedRef.current = true;
          rec.onend = null;
          stopMeter();
          setVoice(null);
          startRecognition(false);
          return;
        }
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("マイクが使えませんでした。ブラウザの設定でマイクを許可してください。");
        } else if (e.error !== "no-speech" && e.error !== "aborted") {
          setError("うまく聞き取れませんでした。もう一度ためすか、スキップしてください。");
        }
      };
      rec.onend = () => {
        activeRef.current = false;
        setRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopMeter();
      };
      recognitionRef.current = rec;
      rec.start();
    },
    [stopMeter],
  );

  const start = useCallback(() => {
    if (!getRecognitionCtor()) return;
    setError(null);
    setTranscript("");
    setVoice(null);
    finalTextRef.current = "";
    retriedRef.current = false;
    activeRef.current = true;

    startRecognition(true);
    void startMeter();
    setRecording(true);
    setSecondsLeft(RECORD_SECONDS);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const left = RECORD_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0) stop();
    }, 200);
  }, [startMeter, startRecognition, stop]);

  return { supported, recording, secondsLeft, transcript, level, voice, error, start, stop };
}
