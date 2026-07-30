"use client";

// Wraps the browser's SpeechRecognition API. Delivers ONLY final segments,
// never interim partials: the debrief later validates quotes against the
// transcript text the candidate actually sent (locateSpan), so dictation has
// to land as ordinary editable text the candidate can review and correct
// before sending — not live text the caller would otherwise have to trust
// sight unseen. No auto-restart on silence either, for the same reason: a
// segment that showed up without the candidate noticing isn't reviewable.

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal ambient types for the recognizer object and its constructors.
// lib.dom.d.ts (TS 5.9) ships the *result* shapes (SpeechRecognitionResult,
// SpeechRecognitionResultList, SpeechRecognitionAlternative) but not the
// recognizer itself, its events, or the window constructors that expose it —
// Chrome/Edge/Safari only ship the vendor-prefixed `webkitSpeechRecognition`,
// Firefox ships neither. Declared locally rather than in a global .d.ts
// because nothing else in the app needs them.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export interface SpeechDictation {
  supported: boolean;
  listening: boolean;
  error: string | null;
  toggle: () => void;
}

export function useSpeechDictation(onFinalText: (text: string) => void): SpeechDictation {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Kept fresh every render so the recognizer's onresult handler — created
  // once per `start()` — always calls the latest `onFinalText`, not a stale
  // closure over whatever `value` existed when listening began.
  const onFinalTextRef = useRef(onFinalText);
  onFinalTextRef.current = onFinalText;

  useEffect(() => {
    setSupported(getConstructor() !== null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggle = useCallback(() => {
    if (typeof window === "undefined") return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Ctor = getConstructor();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const segments: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const transcript = result[0]?.transcript.trim();
          if (transcript) segments.push(transcript);
        }
      }
      if (segments.length > 0) onFinalTextRef.current(segments.join(" "));
    };

    // No auto-restart here on purpose — silence ending the recognizer is a
    // normal stop, not a failure, and re-starting behind the candidate's back
    // would be exactly the kind of "text appeared without me noticing" thing
    // the final-segments-only rule above is trying to avoid.
    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("Microphone access was blocked — check browser permissions.");
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    recognition.start();
  }, [listening]);

  return { supported, listening, error, toggle };
}
