"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typing for the browser Web Speech API (not in TypeScript's DOM lib).
type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function SpeechInput({
  mode,
  value,
  onChange,
}: {
  mode: "speak" | "paste";
  value: string;
  onChange: (v: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => setSupported(getCtor() !== null), []);
  useEffect(() => () => recRef.current?.stop(), []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) {
        const cur = valueRef.current;
        onChange((cur ? cur.replace(/\s*$/, " ") : "") + finalText.trim());
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => setMicError(e.error === "not-allowed" ? "Microphone permission was denied." : `Speech error: ${e.error}`);
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    setMicError(null);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <div className="space-y-3">
      {mode === "speak" && supported && (
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            onClick={toggle}
            aria-label={listening ? "Stop recording" : "Start recording"}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-md transition ${
              listening ? "animate-pulse bg-red-600" : "bg-accent-600 hover:bg-accent-700"
            }`}
          >
            {listening ? "■" : "🎙"}
          </button>
          <span className="text-sm text-slate-500">{listening ? "Listening… tap to stop" : "Tap to speak (English – India)"}</span>
          {micError && <span className="text-sm text-red-700">{micError}</span>}
        </div>
      )}
      {mode === "speak" && !supported && (
        <p className="text-sm text-slate-500">Voice input isn’t supported in this browser — type your note below.</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={mode === "paste" ? 10 : 5}
        placeholder={mode === "paste" ? "Paste a WhatsApp message or email here…" : "Your words appear here — you can edit them."}
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-accent-600 focus:outline-none"
      />
      {interim && <p className="text-sm text-slate-400 italic">{interim}</p>}
    </div>
  );
}
