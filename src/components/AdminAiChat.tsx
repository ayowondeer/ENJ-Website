import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowUp,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  SquarePen,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { PORTFOLIO_CATEGORIES, PortfolioItem } from '../data/portfolio';
import { TestimonialItem } from '../data/testimonials';
import { OrderItem } from '../firebase';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type DraftActionType = 'review' | 'portfolio' | 'order' | 'none';
type AdminSectionTab = 'overview' | 'products' | 'orders' | 'testimonials' | 'portfolio';

interface UploadedPhoto {
  id: string;
  dataUrl: string;
  mimeType: string;
  base64: string;
}

interface UploadedAudio {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  base64: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrls?: string[];
  audioNames?: string[];
  isError?: boolean;
  publishedSection?: AdminSectionTab;
}

interface DraftReviewState {
  quote: string;
  author: string;
  role: string;
  highlight: boolean;
}

interface DraftPortfolioState {
  title: string;
  client: string;
  category: string;
  year: string;
  description: string;
  servicesText: string;
  impact: string;
  featured: boolean;
}

interface DraftOrderState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  itemsSummary: string;
  totalAmount: number;
  status: OrderItem['status'];
  paymentStatus: NonNullable<OrderItem['paymentStatus']>;
  paymentMethod: string;
  notes: string;
}

interface ActiveDraft {
  type: Exclude<DraftActionType, 'none'>;
  review?: DraftReviewState;
  portfolio?: DraftPortfolioState;
  order?: DraftOrderState;
}

interface AdminAiChatProps {
  onPublishReview: (draft: Omit<TestimonialItem, 'id'>) => Promise<void>;
  onPublishPortfolio: (draft: Omit<PortfolioItem, 'id'>) => Promise<void>;
  onPublishOrder: (draft: Omit<OrderItem, 'id' | 'createdAt'>) => Promise<void>;
  onNavigateSection: (tab: AdminSectionTab) => void;
}

const VALID_PORTFOLIO_CATEGORIES = PORTFOLIO_CATEGORIES.filter((c) => c !== 'All Projects');
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

const compressChatImage = (file: File): Promise<UploadedPhoto | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 768;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const base64 = rawDataUrl.split(',')[1] || '';
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
            base64,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.74);
        const base64 = compressedUrl.split(',')[1] || '';
        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          dataUrl: compressedUrl,
          mimeType: 'image/jpeg',
          base64,
        });
      };
      img.onerror = () => resolve(null);
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

const readAudioBlob = (blob: Blob, name: string): Promise<UploadedAudio | null> => {
  return new Promise((resolve) => {
    if (blob.size > MAX_AUDIO_BYTES) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve(null);
        return;
      }
      const base64 = dataUrl.split(',')[1] || '';
      const rawMime = (blob.type || 'audio/webm').split(';')[0].trim();
      resolve({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        dataUrl,
        mimeType: rawMime || 'audio/webm',
        base64,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

function normalizePortfolioCategory(raw?: string): string {
  if (!raw) return VALID_PORTFOLIO_CATEGORIES[0];
  const exact = VALID_PORTFOLIO_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.trim().toLowerCase()
  );
  if (exact) return exact;
  const partial = VALID_PORTFOLIO_CATEGORIES.find(
    (c) =>
      c.toLowerCase().includes(raw.trim().toLowerCase()) ||
      raw.trim().toLowerCase().includes(c.toLowerCase().split(' ')[0])
  );
  return partial || VALID_PORTFOLIO_CATEGORIES[0];
}

function normalizeOrderStatus(raw?: string): OrderItem['status'] {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'processing' || val === 'completed' || val === 'cancelled' || val === 'pending') {
    return val;
  }
  return 'pending';
}

function normalizePaymentStatus(raw?: string): NonNullable<OrderItem['paymentStatus']> {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'paid' || val === 'failed' || val === 'pending') {
    return val;
  }
  return 'pending';
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AdminAiChat({
  onPublishReview,
  onPublishPortfolio,
  onPublishOrder,
  onNavigateSection,
}: AdminAiChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<UploadedPhoto[]>([]);
  const [pendingAudios, setPendingAudios] = useState<UploadedAudio[]>([]);
  const [sessionPhotos, setSessionPhotos] = useState<UploadedPhoto[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isIdleCompact, setIsIdleCompact] = useState(false);
  const [isFabHovered, setIsFabHovered] = useState(false);

  // Instant live speech-to-text dictation (with MediaRecorder sound-graph fallback)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing'>('idle');
  const [voiceMode, setVoiceMode] = useState<'live-speech' | 'recorder'>('live-speech');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechActiveRef = useRef<boolean>(false);
  const voiceBaseTextRef = useRef<string>('');
  const speechSessionTextRef = useRef<string>('');
  const latestInputRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const soundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedBarsRef = useRef<Float32Array>(new Float32Array(36));
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const discardRecordingRef = useRef<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  latestInputRef.current = inputText;

  const stopAudioPreview = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlayingAudioId(null);
  };

  const stopVisualizerAndAudio = () => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopLiveSpeech = (keepText: boolean) => {
    speechActiveRef.current = false;
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          // Ignore already-stopped recognition
        }
      }
    }
    if (!keepText) {
      const restored = voiceBaseTextRef.current;
      latestInputRef.current = restored;
      setInputText(restored);
    }
    speechSessionTextRef.current = '';
    setVoiceState('idle');
  };

  const cancelListening = () => {
    if (speechActiveRef.current || recognitionRef.current) {
      stopLiveSpeech(false);
    }
    discardRecordingRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore already-stopped recorder
      }
    }
    stopVisualizerAndAudio();
    setVoiceState('idle');
    setRecordingSeconds(0);
  };

  useEffect(() => {
    return () => {
      cancelListening();
      stopAudioPreview();
    };
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    if (inputText) {
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 110);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (cardRef.current) {
        cardRef.current.scrollTop = 0;
      }
      const el = messagesScrollRef.current;
      if (!el) return;
      const scrollBottom = () => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      };
      requestAnimationFrame(scrollBottom);
      const settleTimer = window.setTimeout(scrollBottom, 360);
      return () => window.clearTimeout(settleTimer);
    }
    cancelListening();
    stopAudioPreview();
  }, [isOpen, messages, activeDraft, isSending]);

  // Collapse floating button to minimal icon while scrolling or after idle period
  useEffect(() => {
    if (isOpen) return;

    let scrollTimeout: number | null = null;
    const handleAnyScroll = () => {
      setIsScrolling(true);
      if (scrollTimeout !== null) {
        window.clearTimeout(scrollTimeout);
      }
      scrollTimeout = window.setTimeout(() => {
        setIsScrolling(false);
      }, 1400);
    };

    const idleTimer = window.setTimeout(() => {
      setIsIdleCompact(true);
    }, 60_000);

    window.addEventListener('scroll', handleAnyScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleAnyScroll, true);
      if (scrollTimeout !== null) window.clearTimeout(scrollTimeout);
      window.clearTimeout(idleTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleResetChat = () => {
    cancelListening();
    stopAudioPreview();
    setMessages([]);
    setPendingPhotos([]);
    setPendingAudios([]);
    setSessionPhotos([]);
    setActiveDraft(null);
    setDraftError(null);
    setUploadNotice(null);
    setInputText('');
  };

  const ingestFiles = async (files: FileList | File[]) => {
    setUploadNotice(null);
    const allFiles = Array.from(files);
    const imageFiles = allFiles.filter((f) => f.type.startsWith('image/'));
    const audioFiles = allFiles.filter(
      (f) =>
        f.type.startsWith('audio/') ||
        /\.(mp3|wav|m4a|ogg|webm|aac)$/i.test(f.name)
    );

    if (imageFiles.length > 0) {
      const compressed = (await Promise.all(imageFiles.slice(0, 6).map(compressChatImage))).filter(
        (item): item is UploadedPhoto => Boolean(item)
      );
      if (compressed.length > 0) {
        setPendingPhotos((prev) => [...prev, ...compressed].slice(0, 6));
      }
    }

    if (audioFiles.length > 0) {
      const audios = (
        await Promise.all(
          audioFiles.slice(0, 2).map((f) => readAudioBlob(f, f.name || 'Voice clip'))
        )
      ).filter((item): item is UploadedAudio => Boolean(item));

      if (audios.length < audioFiles.slice(0, 2).length) {
        setUploadNotice('Audio files must be under 10 MB.');
      }
      if (audios.length > 0) {
        setPendingAudios((prev) => [...prev, ...audios].slice(0, 2));
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/') || items[i].type.startsWith('audio/')) {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      await ingestFiles(files);
    }
  };

  const handleToggleAudioPreview = (clip: UploadedAudio) => {
    if (playingAudioId === clip.id) {
      stopAudioPreview();
      return;
    }
    stopAudioPreview();
    const audio = new Audio(clip.dataUrl);
    audioPlayerRef.current = audio;
    setPlayingAudioId(clip.id);
    audio.onended = () => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    };
    audio.onerror = () => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    };
    audio.play().catch(() => {
      setPlayingAudioId(null);
      audioPlayerRef.current = null;
    });
  };

  // Real-time 60fps AudioContext frequency sound graph loop for MediaRecorder fallback
  useEffect(() => {
    if (voiceState !== 'listening' || voiceMode !== 'recorder') {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const barCount = 34;
    if (smoothedBarsRef.current.length !== barCount) {
      smoothedBarsRef.current = new Float32Array(barCount);
    }
    const freqData = new Uint8Array(analyserRef.current?.frequencyBinCount || 64);
    let phase = 0;

    const renderGraph = () => {
      const canvas = soundCanvasRef.current;
      const analyser = analyserRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = canvas.clientWidth || 220;
        const cssH = canvas.clientHeight || 40;
        const targetW = Math.round(cssW * dpr);
        const targetH = Math.round(cssH * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cssW, cssH);

          if (analyser) {
            analyser.getByteFrequencyData(freqData);
          }

          phase += 0.08;
          const slotW = cssW / barCount;
          const barW = Math.max(2.5, Math.min(4, slotW * 0.52));
          const centerY = cssH / 2;
          const maxBarH = cssH - 6;

          for (let i = 0; i < barCount; i++) {
            const mirrorIdx = Math.abs(i - (barCount - 1) / 2);
            const binIdx = Math.min(
              freqData.length - 1,
              Math.floor(1 + mirrorIdx * 1.15)
            );
            const rawAmp = (freqData[binIdx] || 0) / 255;
            const ambient = 0.08 + 0.05 * Math.sin(phase + i * 0.45);
            const target = Math.min(1, Math.max(ambient, rawAmp * 1.15));

            const prev = smoothedBarsRef.current[i] || 0;
            const next = prev + (target - prev) * (target > prev ? 0.45 : 0.22);
            smoothedBarsRef.current[i] = next;

            const h = Math.max(4, next * maxBarH);
            const x = i * slotW + (slotW - barW) / 2;
            const y = centerY - h / 2;

            ctx.fillStyle =
              next > 0.24
                ? `rgba(244, 123, 32, ${Math.min(1, 0.55 + next * 0.45)})`
                : 'rgba(29, 29, 31, 0.28)';

            const radius = Math.min(barW / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + barW - radius, y);
            ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
            ctx.lineTo(x + barW, y + h - radius);
            ctx.quadraticCurveTo(x + barW, y + h, x + barW - radius, y + h);
            ctx.lineTo(x + radius, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      rafIdRef.current = window.requestAnimationFrame(renderGraph);
    };

    rafIdRef.current = window.requestAnimationFrame(renderGraph);
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [voiceState, voiceMode]);

  const finishAndTranscribe = () => {
    if (voiceState !== 'listening') return;
    if (voiceMode === 'live-speech') {
      stopLiveSpeech(true);
      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
      return;
    }
    discardRecordingRef.current = false;
    if (recordTimerRef.current !== null) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setVoiceState('transcribing');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      stopVisualizerAndAudio();
      setVoiceState('idle');
    }
  };

  const startRecorderFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setUploadNotice('Voice dictation is unavailable in this browser.');
      setVoiceState('idle');
      return;
    }

    setVoiceMode('recorder');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      }

      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const preferredMime =
        typeof MediaRecorder.isTypeSupported === 'function'
          ? candidates.find((m) => MediaRecorder.isTypeSupported(m)) || ''
          : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      discardRecordingRef.current = false;
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const shouldDiscard = discardRecordingRef.current;
        discardRecordingRef.current = false;
        const chunks = audioChunksRef.current;
        stopVisualizerAndAudio();
        setRecordingSeconds(0);

        if (shouldDiscard || chunks.length === 0) {
          setVoiceState('idle');
          return;
        }

        const blob = new Blob(chunks, {
          type: recorder.mimeType || preferredMime || 'audio/webm',
        });

        if (blob.size < 400) {
          setVoiceState('idle');
          setUploadNotice('No speech detected. Tap the microphone and speak clearly.');
          return;
        }

        try {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to read microphone audio.'));
            reader.readAsDataURL(blob);
          });
          const base64 = dataUrl.split(',')[1] || '';
          const mimeType = (blob.type || 'audio/webm').split(';')[0].trim();

          const res = await fetch(apiUrl('/api/admin/transcribe'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mimeType, data: base64 }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (res.status === 405) {
              throw new Error(
                'Backend API endpoint returned 405 Method Not Allowed. Redeploy with the Cloudflare Worker enabled (worker.ts + wrangler.jsonc) or Node server running, and ensure GEMINI_API_KEY is configured.'
              );
            }
            throw new Error(payload?.error || `Could not transcribe voice input (${res.status}).`);
          }

          const transcript = typeof payload?.text === 'string' ? payload.text.trim() : '';
          if (!transcript) {
            setUploadNotice('No speech detected. Please speak clearly and try again.');
          } else {
            setInputText((prev) => {
              const trimmed = prev.trimEnd();
              const combined = trimmed ? `${trimmed} ${transcript}` : transcript;
              latestInputRef.current = combined;
              return combined;
            });
            window.setTimeout(() => {
              textareaRef.current?.focus();
            }, 50);
          }
        } catch (err) {
          setUploadNotice(
            err instanceof Error ? err.message : 'Could not transcribe speech.'
          );
        } finally {
          setVoiceState('idle');
        }
      };

      recorder.start();
      setVoiceState('listening');
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      stopVisualizerAndAudio();
      setVoiceState('idle');
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setUploadNotice('No microphone detected on this device.');
      } else if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError'
      ) {
        setUploadNotice(
          'Microphone permission was denied. Allow microphone access in your browser site settings (or open in a new tab if blocked by an embedded preview).'
        );
      } else {
        setUploadNotice('Could not start microphone.');
      }
    }
  };

  const launchSpeechRecognitionInstance = (SpeechCtor: SpeechRecognitionConstructor) => {
    const rec = new SpeechCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

    rec.onresult = (ev: SpeechRecognitionEventLike) => {
      let finalSeg = '';
      let interimSeg = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        const piece = r?.[0]?.transcript || '';
        if (r?.isFinal) {
          finalSeg += piece;
        } else {
          interimSeg += piece;
        }
      }

      const trimmedFinal = finalSeg.trim();
      const trimmedInterim = interimSeg.trim();
      speechSessionTextRef.current = trimmedFinal;

      const combined = [voiceBaseTextRef.current, trimmedFinal, trimmedInterim]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ');

      latestInputRef.current = combined;
      setInputText(combined);

      if (textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEventLike) => {
      const code = ev?.error || '';
      if (code === 'no-speech' || code === 'aborted') {
        return;
      }
      if (code === 'network' || code === 'service-not-allowed' || code === 'audio-capture') {
        stopLiveSpeech(true);
        void startRecorderFallback();
        return;
      }
      if (code === 'not-allowed') {
        stopLiveSpeech(true);
        setUploadNotice(
          'Microphone permission was denied. Allow microphone access in your browser site settings (or open in a new tab if blocked by an embedded preview).'
        );
        return;
      }
      stopLiveSpeech(true);
    };

    rec.onend = () => {
      if (!speechActiveRef.current) return;
      if (speechSessionTextRef.current) {
        voiceBaseTextRef.current = [voiceBaseTextRef.current, speechSessionTextRef.current]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ');
        speechSessionTextRef.current = '';
      }
      try {
        launchSpeechRecognitionInstance(SpeechCtor);
      } catch {
        speechActiveRef.current = false;
        setVoiceState('idle');
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const startLiveListening = async () => {
    setUploadNotice(null);

    if (voiceState === 'listening') {
      finishAndTranscribe();
      return;
    }
    if (voiceState === 'transcribing') return;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setUploadNotice('Voice input requires HTTPS.');
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechCtor) {
      try {
        voiceBaseTextRef.current = latestInputRef.current.trimEnd();
        speechSessionTextRef.current = '';
        speechActiveRef.current = true;
        setVoiceMode('live-speech');
        setVoiceState('listening');
        launchSpeechRecognitionInstance(SpeechCtor);
        window.setTimeout(() => {
          textareaRef.current?.focus();
        }, 40);
        return;
      } catch {
        stopLiveSpeech(true);
      }
    }

    await startRecorderFallback();
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (voiceState === 'listening') {
      if (voiceMode === 'live-speech') {
        stopLiveSpeech(true);
      } else {
        finishAndTranscribe();
        return;
      }
    }
    if (voiceState === 'transcribing') return;

    const text = latestInputRef.current.trim();
    if ((!text && pendingPhotos.length === 0 && pendingAudios.length === 0) || isSending) return;

    stopAudioPreview();

    const photosToSend = [...pendingPhotos];
    const audiosToSend = [...pendingAudios];
    const updatedSessionPhotos = [...sessionPhotos, ...photosToSend].slice(0, 6);

    const attachmentLabel = [
      photosToSend.length > 0
        ? `${photosToSend.length} image${photosToSend.length > 1 ? 's' : ''}`
        : '',
      audiosToSend.length > 0
        ? `${audiosToSend.length} voice clip${audiosToSend.length > 1 ? 's' : ''}`
        : '',
    ]
      .filter(Boolean)
      .join(' & ');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || `Uploaded ${attachmentLabel}`,
      imageUrls: photosToSend.map((p) => p.dataUrl),
      audioNames: audiosToSend.map((a) => a.name),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setPendingPhotos([]);
    setPendingAudios([]);
    setSessionPhotos(updatedSessionPhotos);
    setDraftError(null);
    setUploadNotice(null);
    setIsSending(true);

    try {
      const res = await fetch(apiUrl('/api/admin/ai-assist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          images: photosToSend.map((p) => ({ mimeType: p.mimeType, data: p.base64 })),
          audioClips: audiosToSend.map((a) => ({ mimeType: a.mimeType, data: a.base64 })),
          history: messages.map((m) => ({
            role: m.role,
            text: m.text,
            imageCount: m.imageUrls?.length || 0,
            audioCount: m.audioNames?.length || 0,
          })),
          existingImageCount: updatedSessionPhotos.length,
          currentDraft: activeDraft,
        }),
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const data = contentType.includes('application/json')
        ? await res.json().catch(() => ({}))
        : {};
      if (!res.ok) {
        if (res.status === 405) {
          throw new Error(
            'API route returned 405 Method Not Allowed because only static files were hosted. Redeploy with the Cloudflare Worker enabled (wrangler.jsonc + worker.ts) or Node server, and set GEMINI_API_KEY in environment secrets.'
          );
        }
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      if (!contentType.includes('application/json') || typeof data.actionType === 'undefined') {
        throw new Error(
          'API route returned the website HTML instead of JSON. Ensure your hosting runs worker.ts (via wrangler.jsonc) or server.ts for /api/* routes.'
        );
      }

      const actionType = (data.actionType || 'none') as DraftActionType;
      const replyText =
        typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : actionType !== 'none'
            ? 'Draft ready below.'
            : 'Hi! Drop photos, voice, or text and I will prepare it for you.';

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: replyText,
        },
      ]);
      if (actionType === 'review' && data.draftReview) {
        setActiveDraft((prev) => ({
          type: 'review',
          review: {
            quote:
              (typeof data.draftReview.quote === 'string' && data.draftReview.quote.trim()) ||
              (prev?.type === 'review' ? prev.review?.quote || '' : ''),
            author:
              (typeof data.draftReview.author === 'string' && data.draftReview.author.trim()) ||
              (prev?.type === 'review' ? prev.review?.author || '' : ''),
            role:
              (typeof data.draftReview.role === 'string' && data.draftReview.role.trim()) ||
              (prev?.type === 'review' ? prev.review?.role || '' : ''),
            highlight:
              typeof data.draftReview.highlight === 'boolean'
                ? data.draftReview.highlight
                : Boolean(prev?.type === 'review' && prev.review?.highlight),
          },
        }));
      } else if (actionType === 'portfolio' && data.draftPortfolio) {
        setActiveDraft({
          type: 'portfolio',
          portfolio: {
            title: data.draftPortfolio.title || '',
            client: data.draftPortfolio.client || 'Client Project',
            category: normalizePortfolioCategory(data.draftPortfolio.category),
            year: data.draftPortfolio.year || String(new Date().getFullYear()),
            description: data.draftPortfolio.description || '',
            servicesText: Array.isArray(data.draftPortfolio.services)
              ? data.draftPortfolio.services.join(', ')
              : '',
            impact: data.draftPortfolio.impact || '',
            featured: Boolean(data.draftPortfolio.featured),
          },
        });
      } else if (actionType === 'order' && data.draftOrder) {
        setActiveDraft({
          type: 'order',
          order: {
            customerName: data.draftOrder.customerName || '',
            customerPhone: data.draftOrder.customerPhone || '',
            customerEmail: data.draftOrder.customerEmail || '',
            customerAddress: data.draftOrder.customerAddress || '',
            itemsSummary: data.draftOrder.itemsSummary || '',
            totalAmount: Number(data.draftOrder.totalAmount) || 0,
            status: normalizeOrderStatus(data.draftOrder.status),
            paymentStatus: normalizePaymentStatus(data.draftOrder.paymentStatus),
            paymentMethod: data.draftOrder.paymentMethod || '',
            notes: data.draftOrder.notes || '',
          },
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Could not contact AI Assistant.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: errMsg,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handlePublishDraft = async () => {
    if (!activeDraft || isPublishing) return;
    setDraftError(null);

    if (activeDraft.type === 'review' && activeDraft.review) {
      const r = activeDraft.review;
      if (!r.quote.trim() || !r.author.trim()) {
        setDraftError('Please enter both the quote and client name.');
        return;
      }
      setIsPublishing(true);
      try {
        await onPublishReview({
          quote: r.quote.trim(),
          author: r.author.trim(),
          role: r.role.trim() || 'Verified Client',
          highlight: r.highlight,
        });
        setActiveDraft(null);
        setMessages((prev) => [
          ...prev,
          {
            id: `pub-${Date.now()}`,
            role: 'assistant',
            text: `Published review from ${r.author.trim()}.`,
            publishedSection: 'testimonials',
          },
        ]);
      } catch (err) {
        let msg = err instanceof Error ? err.message : 'Failed to publish review.';
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error) msg = String(parsed.error);
        } catch {}
        setDraftError(msg);
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    if (activeDraft.type === 'portfolio' && activeDraft.portfolio) {
      const p = activeDraft.portfolio;
      if (sessionPhotos.length === 0) {
        setDraftError('Please attach at least 1 photo before publishing.');
        return;
      }
      if (!p.title.trim()) {
        setDraftError('Please provide a project title.');
        return;
      }
      setIsPublishing(true);
      try {
        const urls = sessionPhotos.map((img) => img.dataUrl);
        const trimmedImpact = p.impact.trim();
        await onPublishPortfolio({
          title: p.title.trim(),
          client: p.client.trim() || 'Client Project',
          category: normalizePortfolioCategory(p.category),
          year: p.year.trim() || String(new Date().getFullYear()),
          description: p.description.trim() || 'Project executed by ENJ Digital Concept.',
          services: p.servicesText
            ? p.servicesText
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : [normalizePortfolioCategory(p.category)],
          ...(trimmedImpact ? { impact: trimmedImpact } : {}),
          imageUrl: urls[0],
          gallery: urls,
          featured: p.featured,
        });
        setActiveDraft(null);
        setSessionPhotos([]);
        setMessages((prev) => [
          ...prev,
          {
            id: `pub-${Date.now()}`,
            role: 'assistant',
            text: `Published portfolio project “${p.title.trim()}”.`,
            publishedSection: 'portfolio',
          },
        ]);
      } catch (err) {
        let msg = err instanceof Error ? err.message : 'Failed to publish portfolio.';
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error) msg = String(parsed.error);
        } catch {}
        setDraftError(msg);
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    if (activeDraft.type === 'order' && activeDraft.order) {
      const o = activeDraft.order;
      if (!o.customerName.trim() || !o.itemsSummary.trim()) {
        setDraftError('Customer name and items summary are required.');
        return;
      }
      setIsPublishing(true);
      try {
        const trimmedAddress = o.customerAddress.trim();
        const trimmedNotes = o.notes.trim();
        await onPublishOrder({
          customerName: o.customerName.trim(),
          customerPhone: o.customerPhone.trim() || 'Not provided',
          customerEmail: o.customerEmail.trim() || 'customer@enjdigitalconcept.com',
          ...(trimmedAddress ? { customerAddress: trimmedAddress } : {}),
          itemsSummary: o.itemsSummary.trim(),
          totalAmount: Math.max(0, Number(o.totalAmount) || 0),
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod.trim() || 'Logged via Admin AI',
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        });
        setActiveDraft(null);
        setMessages((prev) => [
          ...prev,
          {
            id: `pub-${Date.now()}`,
            role: 'assistant',
            text: `Saved order for ${o.customerName.trim()}.`,
            publishedSection: 'orders',
          },
        ]);
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : 'Failed to save order.');
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const hasConversation = messages.length > 0 || Boolean(activeDraft);
  const isExpanded = hasConversation || isSending;
  const hasAttachmentsOrNotice =
    pendingPhotos.length > 0 || pendingAudios.length > 0 || Boolean(uploadNotice);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          if (e.target.files) await ingestFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Animated Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen && (() => {
          const isMinimalIcon = (isScrolling || isIdleCompact) && !isFabHovered;
          return (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => setIsOpen(true)}
              onMouseEnter={() => setIsFabHovered(true)}
              onMouseLeave={() => setIsFabHovered(false)}
              aria-label="Open ENJ Digital AI"
              title="ENJ Digital AI"
              className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-[95] apple-floating-glass rounded-full p-2 flex items-center cursor-pointer group overflow-hidden"
            >
              <span className="specular-highlight opacity-75" />
              <span className="relative z-10 w-8 h-8 rounded-full bg-[#0a0a0a] overflow-hidden flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.22)] shrink-0">
                <img
                  src="/assets/aistudio/image_88705ca9.png"
                  alt="ENJ Digital AI"
                  className="w-full h-full object-contain p-1 select-none"
                />
              </span>
              <AnimatePresence initial={false}>
                {!isMinimalIcon && (
                  <motion.span
                    key="fab-label"
                    initial={{ opacity: 0, width: 0, marginLeft: 0, marginRight: 0 }}
                    animate={{ opacity: 1, width: 'auto', marginLeft: 8, marginRight: 8 }}
                    exit={{ opacity: 0, width: 0, marginLeft: 0, marginRight: 0 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 text-xs font-bold tracking-tight text-[#1d1d1f] whitespace-nowrap overflow-hidden"
                  >
                    ENJ Digital AI
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })()}
      </AnimatePresence>

      {/* Centered Liquid Glass Pill -> Smoothly Expanding Simple Chat */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                key="ai-uploader-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-6 apple-modal-backdrop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ai-uploader-title"
              >
                <motion.div
                  ref={cardRef}
                  key="ai-uploader-card"
                  initial={{ opacity: 0, scale: 0.93, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) setIsDragging(false);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) {
                      await ingestFiles(e.dataTransfer.files);
                    }
                  }}
                  className="relative w-full max-w-[540px]"
                >
                  {/* Top-Right Floating Controls: New Chat (when expanded) + Circular Close (X) */}
                  <motion.div
                    initial={false}
                    animate={{
                      top: isExpanded ? 12 : -10,
                      right: isExpanded ? 12 : -8,
                    }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute z-40 flex items-center gap-1.5"
                  >
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.button
                          key="new-chat-btn"
                          type="button"
                          initial={{ opacity: 0, scale: 0.72, x: 8 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.72, x: 8 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                          onClick={handleResetChat}
                          disabled={isSending}
                          aria-label="New chat"
                          title="New chat"
                          className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_6px_18px_rgba(0,0,0,0.12)] flex items-center justify-center text-[#1d1d1f] hover:bg-white cursor-pointer disabled:opacity-50"
                        >
                          <SquarePen className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      initial={false}
                      animate={{
                        width: isExpanded ? 32 : 28,
                        height: isExpanded ? 32 : 28,
                      }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => setIsOpen(false)}
                      aria-label="Close ENJ Digital AI"
                      title="Close"
                      className="rounded-full bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_6px_18px_rgba(0,0,0,0.12)] flex items-center justify-center text-[#1d1d1f] hover:bg-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  </motion.div>

                  {/* Main Surface: Pure Stadium Pill by default, stretches smoothly upward */}
                  <motion.div
                    initial={false}
                    animate={{
                      borderRadius: isExpanded ? 26 : hasAttachmentsOrNotice ? 24 : 29,
                    }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative w-full apple-modal-glass overflow-hidden flex flex-col max-h-[84dvh] ${
                      isExpanded
                        ? 'shadow-[0_24px_64px_rgba(0,0,0,0.24)]'
                        : 'shadow-[0_18px_48px_rgba(0,0,0,0.14)]'
                    } ${isDragging ? 'ring-2 ring-[#f47b20] bg-orange-50/95' : ''}`}
                  >
                    <span id="ai-uploader-title" className="sr-only">
                      ENJ Digital AI
                    </span>

                    {/* Animated Drag-Over Overlay */}
                    <AnimatePresence>
                      {isDragging && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.16 }}
                          className="absolute inset-0 z-30 bg-orange-50/95 backdrop-blur-sm border-2 border-dashed border-[#f47b20] rounded-[inherit] flex items-center justify-center px-6 text-center pointer-events-none"
                        >
                          <p className="text-sm font-semibold text-[#c95510]">
                            Drop image or voice file here
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Smooth Height-Morphing Messages Area */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="chat-expand-shell"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
                            opacity: { duration: 0.2, delay: 0.04 },
                          }}
                          className="overflow-hidden flex flex-col min-h-0"
                        >
                          <div
                            ref={messagesScrollRef}
                            style={{
                              maskImage:
                                'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.45) 14px, #000 34px)',
                              WebkitMaskImage:
                                'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.45) 14px, #000 34px)',
                            }}
                            className="flex-1 min-h-0 max-h-[58dvh] overflow-y-auto overflow-x-hidden touch-momentum px-4 sm:px-5 pt-14 pb-5 space-y-2.5"
                          >
                            {messages.map((msg) => (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className={`flex flex-col ${
                                  msg.role === 'user' ? 'items-end' : 'items-start'
                                }`}
                              >
                                {msg.role === 'user' ? (
                                  <div className="max-w-[82%] rounded-[18px] rounded-br-[4px] bg-[#1d1d1f] text-white px-3.5 py-2 space-y-2 shadow-xs">
                                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {msg.imageUrls.map((url, idx) => (
                                          <img
                                            key={idx}
                                            src={url}
                                            alt={`Attachment ${idx + 1}`}
                                            className="w-14 h-14 rounded-[10px] object-cover border border-white/20"
                                          />
                                        ))}
                                      </div>
                                    )}
                                    {msg.audioNames && msg.audioNames.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {msg.audioNames.map((name, idx) => (
                                          <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 text-[11px] bg-white/15 px-2 py-0.5 rounded-full"
                                          >
                                            <Volume2 className="w-3 h-3" />
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                                      {msg.text}
                                    </p>
                                  </div>
                                ) : msg.isError ? (
                                  <div className="max-w-[90%] rounded-[16px] bg-rose-50 border border-rose-200/80 px-3.5 py-2 text-[13px] text-rose-900 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                    <span className="leading-relaxed">{msg.text}</span>
                                  </div>
                                ) : msg.publishedSection ? (
                                  <div className="max-w-[90%] rounded-[18px] rounded-bl-[4px] bg-emerald-50 border border-emerald-200/75 text-emerald-950 px-3.5 py-2 text-[13.5px] leading-relaxed flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                    <span className="inline-flex items-center gap-1.5 font-medium">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>{msg.text}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onNavigateSection(msg.publishedSection!);
                                        setIsOpen(false);
                                      }}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer"
                                    >
                                      <span>View Live</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="max-w-[86%] rounded-[18px] rounded-bl-[4px] bg-[#f3f3f6] text-[#1d1d1f] px-3.5 py-2 text-[13.5px] leading-relaxed">
                                    {msg.text}
                                  </div>
                                )}
                              </motion.div>
                            ))}

                            {isSending && (
                              <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.16 }}
                                className="flex items-start"
                              >
                                <div
                                  aria-label="Thinking"
                                  className="rounded-[18px] rounded-bl-[4px] bg-[#f3f3f6] px-4 py-3 flex items-center gap-1.5"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[#1d1d1f]/45 animate-bounce"
                                    style={{ animationDelay: '0ms', animationDuration: '900ms' }}
                                  />
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[#1d1d1f]/45 animate-bounce"
                                    style={{ animationDelay: '150ms', animationDuration: '900ms' }}
                                  />
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-[#1d1d1f]/45 animate-bounce"
                                    style={{ animationDelay: '300ms', animationDuration: '900ms' }}
                                  />
                                </div>
                              </motion.div>
                            )}

                            {/* Minimal Editable Draft Card (disappears cleanly once published) */}
                            <AnimatePresence>
                            {activeDraft && (
                              <motion.div
                                key="active-draft-card"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="rounded-[18px] bg-[#f6f6f8] border border-black/[0.06] p-3.5 space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-black/[0.06]">
                                  <span className="text-xs font-semibold text-[#1d1d1f] capitalize">
                                    {activeDraft.type} Draft
                                  </span>
                                </div>

                                {activeDraft.type === 'portfolio' && activeDraft.portfolio && (
                                  <div className="space-y-2 text-xs">
                                    {sessionPhotos.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {sessionPhotos.map((img, i) => (
                                          <div key={img.id} className="relative">
                                            <img
                                              src={img.dataUrl}
                                              alt={`Project ${i + 1}`}
                                              className="w-12 h-12 rounded-[10px] object-cover border border-black/[0.08]"
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSessionPhotos((prev) =>
                                                  prev.filter((p) => p.id !== img.id)
                                                )
                                              }
                                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                                              title="Remove photo"
                                            >
                                              <X className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <input
                                      type="text"
                                      value={activeDraft.portfolio.title}
                                      onChange={(e) =>
                                        setActiveDraft({
                                          ...activeDraft,
                                          portfolio: {
                                            ...activeDraft.portfolio!,
                                            title: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Project title"
                                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none font-semibold"
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={activeDraft.portfolio.client}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            portfolio: {
                                              ...activeDraft.portfolio!,
                                              client: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="Client"
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none"
                                      />
                                      <select
                                        value={activeDraft.portfolio.category}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            portfolio: {
                                              ...activeDraft.portfolio!,
                                              category: e.target.value,
                                            },
                                          })
                                        }
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] outline-none font-medium"
                                      >
                                        {VALID_PORTFOLIO_CATEGORIES.map((cat) => (
                                          <option key={cat} value={cat}>
                                            {cat}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <textarea
                                      rows={2}
                                      value={activeDraft.portfolio.description}
                                      onChange={(e) =>
                                        setActiveDraft({
                                          ...activeDraft,
                                          portfolio: {
                                            ...activeDraft.portfolio!,
                                            description: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Description"
                                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none resize-none leading-relaxed"
                                    />
                                  </div>
                                )}

                                {activeDraft.type === 'review' && activeDraft.review && (
                                  <div className="space-y-2 text-xs">
                                    <textarea
                                      rows={2}
                                      value={activeDraft.review.quote}
                                      onChange={(e) =>
                                        setActiveDraft({
                                          ...activeDraft,
                                          review: { ...activeDraft.review!, quote: e.target.value },
                                        })
                                      }
                                      placeholder="Review quote"
                                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none resize-none leading-relaxed"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={activeDraft.review.author}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            review: {
                                              ...activeDraft.review!,
                                              author: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="Client name"
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none font-semibold"
                                      />
                                      <input
                                        type="text"
                                        value={activeDraft.review.role}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            review: { ...activeDraft.review!, role: e.target.value },
                                          })
                                        }
                                        placeholder="Role / Company"
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none"
                                      />
                                    </div>
                                  </div>
                                )}

                                {activeDraft.type === 'order' && activeDraft.order && (
                                  <div className="space-y-2 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={activeDraft.order.customerName}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            order: {
                                              ...activeDraft.order!,
                                              customerName: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="Customer name"
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none font-semibold"
                                      />
                                      <input
                                        type="text"
                                        value={activeDraft.order.customerPhone}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            order: {
                                              ...activeDraft.order!,
                                              customerPhone: e.target.value,
                                            },
                                          })
                                        }
                                        placeholder="Phone"
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none"
                                      />
                                    </div>
                                    <textarea
                                      rows={2}
                                      value={activeDraft.order.itemsSummary}
                                      onChange={(e) =>
                                        setActiveDraft({
                                          ...activeDraft,
                                          order: {
                                            ...activeDraft.order!,
                                            itemsSummary: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Items ordered"
                                      className="w-full px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none resize-none"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <input
                                        type="number"
                                        min={0}
                                        value={activeDraft.order.totalAmount}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            order: {
                                              ...activeDraft.order!,
                                              totalAmount: Number(e.target.value) || 0,
                                            },
                                          })
                                        }
                                        placeholder="Amount (NGN)"
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] placeholder:text-[#6e6e73] outline-none font-mono font-bold tabular-nums"
                                      />
                                      <select
                                        value={activeDraft.order.status}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            order: {
                                              ...activeDraft.order!,
                                              status: normalizeOrderStatus(e.target.value),
                                            },
                                          })
                                        }
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] outline-none"
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                      </select>
                                      <select
                                        value={activeDraft.order.paymentStatus}
                                        onChange={(e) =>
                                          setActiveDraft({
                                            ...activeDraft,
                                            order: {
                                              ...activeDraft.order!,
                                              paymentStatus: normalizePaymentStatus(e.target.value),
                                            },
                                          })
                                        }
                                        className="px-3 py-2 rounded-xl border border-black/[0.08] bg-white focus:border-[#f47b20]/60 text-[#1d1d1f] outline-none"
                                      >
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                      </select>
                                    </div>
                                  </div>
                                )}

                                {draftError && (
                                  <p className="text-[11px] text-rose-700 font-medium">{draftError}</p>
                                )}

                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDraft(null);
                                      setDraftError(null);
                                    }}
                                    disabled={isPublishing}
                                    className="px-3 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-gray-50 text-[#6e6e73] text-xs font-semibold cursor-pointer disabled:opacity-50"
                                    title="Discard draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handlePublishDraft}
                                    disabled={isPublishing}
                                    className="flex-1 py-2 rounded-full bg-[#f47b20] hover:bg-[#df6b13] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.99] disabled:opacity-60"
                                  >
                                    {isPublishing ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving…</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>
                                          {activeDraft.type === 'review'
                                            ? 'Publish Review'
                                            : activeDraft.type === 'portfolio'
                                              ? 'Publish Portfolio'
                                              : 'Save Order'}
                                        </span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Unified Bottom Composer Pill Bar */}
                    <form
                      onSubmit={handleSend}
                      className={`shrink-0 relative z-10 px-2.5 sm:px-3 py-2 ${
                        hasAttachmentsOrNotice ? 'space-y-2' : ''
                      }`}
                    >
                      <AnimatePresence>
                        {uploadNotice && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-[14px] bg-rose-50 border border-rose-200/80 px-3 py-1.5 text-[11px] text-rose-900 font-medium flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span className="leading-snug">{uploadNotice}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setUploadNotice(null)}
                                aria-label="Dismiss notice"
                                className="w-5 h-5 rounded-full hover:bg-rose-900/10 flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Queued Attachments Preview */}
                      <AnimatePresence>
                        {(pendingPhotos.length > 0 || pendingAudios.length > 0) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
                              {pendingPhotos.map((img) => (
                                <motion.div
                                  key={img.id}
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.85 }}
                                  className="relative shrink-0"
                                >
                                  <img
                                    src={img.dataUrl}
                                    alt="Attached"
                                    className="w-11 h-11 rounded-[10px] object-cover border border-black/[0.1]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingPhotos((prev) =>
                                        prev.filter((p) => p.id !== img.id)
                                      )
                                    }
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1d1d1f] text-white flex items-center justify-center cursor-pointer hover:bg-red-600"
                                    title="Remove image"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </motion.div>
                              ))}

                              {pendingAudios.map((aud) => (
                                <motion.div
                                  key={aud.id}
                                  initial={{ opacity: 0, scale: 0.88 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.88 }}
                                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-[#f3f3f6] text-[11px] font-medium text-[#1d1d1f]"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAudioPreview(aud)}
                                    className="w-6 h-6 rounded-full bg-[#f47b20]/15 text-[#f47b20] hover:bg-[#f47b20] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    title={playingAudioId === aud.id ? 'Pause' : 'Play preview'}
                                  >
                                    {playingAudioId === aud.id ? (
                                      <Pause className="w-3 h-3 fill-current" />
                                    ) : (
                                      <Play className="w-3 h-3 fill-current ml-0.5" />
                                    )}
                                  </button>
                                  <span className="max-w-[140px] truncate">{aud.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (playingAudioId === aud.id) stopAudioPreview();
                                      setPendingAudios((prev) =>
                                        prev.filter((a) => a.id !== aud.id)
                                      );
                                    }}
                                    className="w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center cursor-pointer shrink-0"
                                    title="Remove audio"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Pill Composer Row OR Fallback Recorder Graph */}
                      <AnimatePresence mode="wait" initial={false}>
                        {voiceState === 'idle' || voiceMode === 'live-speech' ? (
                          <motion.div
                            key="composer-idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.14 }}
                            className="flex items-center gap-2 min-h-[42px]"
                          >
                            {/* Left: + Upload Trigger */}
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isSending}
                              title="Attach images or audio"
                              aria-label="Attach images or audio"
                              className="w-10 h-10 rounded-full hover:bg-black/[0.06] text-[#1d1d1f] flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              >
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                            </motion.button>

                            {/* Center: Clean Inline Input (streams spoken words live as you talk) */}
                            <textarea
                              ref={textareaRef}
                              rows={1}
                              value={inputText}
                              onPaste={handlePaste}
                              onChange={(e) => {
                                const val = e.target.value;
                                latestInputRef.current = val;
                                setInputText(val);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                                if (voiceState === 'listening') {
                                  voiceBaseTextRef.current = val;
                                  speechSessionTextRef.current = '';
                                }
                                if (uploadNotice) setUploadNotice(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSend();
                                }
                              }}
                              placeholder={
                                voiceState === 'listening'
                                  ? 'Listening…'
                                  : isExpanded
                                    ? 'Message or drop files…'
                                    : 'Drag and drop your files here'
                              }
                              className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-[15px] text-[#1d1d1f] placeholder:text-[#515154] placeholder:truncate resize-none leading-[1.4] py-2 max-h-24 overflow-y-auto caret-[#1d1d1f]"
                            />

                            {/* Right Actions: Live Streaming Waveform Button + Smoothly Appearing Send Arrow */}
                            <div className="flex items-center shrink-0">
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                onClick={startLiveListening}
                                disabled={isSending}
                                title={voiceState === 'listening' ? 'Stop listening' : 'Speak live'}
                                aria-label={
                                  voiceState === 'listening'
                                    ? 'Stop voice dictation'
                                    : 'Start live voice dictation'
                                }
                                className={`relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0 transition-colors ${
                                  voiceState === 'listening'
                                    ? 'bg-[#f47b20] text-white shadow-[0_0_0_4px_rgba(244,123,32,0.18)]'
                                    : 'bg-[#efeff2] hover:bg-[#e4e4e8] text-[#1d1d1f]'
                                }`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className={`w-[18px] h-[18px] ${
                                    voiceState === 'listening' ? 'animate-pulse' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.85"
                                  strokeLinecap="round"
                                >
                                  <path d="M5 10v4M8.5 7v10M12 4.5v15M15.5 7v10M19 10v4" />
                                </svg>
                              </motion.button>

                              <AnimatePresence initial={false}>
                                {(inputText.trim().length > 0 ||
                                  pendingPhotos.length > 0 ||
                                  pendingAudios.length > 0 ||
                                  isSending) && (
                                  <motion.div
                                    key="send-btn-slot"
                                    initial={{ opacity: 0, width: 0, marginLeft: 0, scale: 0.7 }}
                                    animate={{ opacity: 1, width: 40, marginLeft: 6, scale: 1 }}
                                    exit={{ opacity: 0, width: 0, marginLeft: 0, scale: 0.7 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    className="overflow-hidden shrink-0"
                                  >
                                    <motion.button
                                      type="submit"
                                      whileTap={{ scale: 0.9 }}
                                      disabled={isSending}
                                      aria-label="Send"
                                      className="w-10 h-10 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white flex items-center justify-center cursor-pointer disabled:opacity-45 transition-colors"
                                    >
                                      {isSending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <ArrowUp className="w-4 h-4" />
                                      )}
                                    </motion.button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="composer-listening"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-center gap-2.5 min-h-[42px]"
                          >
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              onClick={cancelListening}
                              disabled={voiceState === 'transcribing'}
                              aria-label="Cancel voice input"
                              title="Cancel"
                              className="w-10 h-10 rounded-full bg-[#efeff2] hover:bg-[#e4e4e8] text-[#1d1d1f] flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>

                            <div className="flex-1 min-w-0 h-10 flex items-center justify-center gap-2 px-1">
                              {voiceState === 'transcribing' ? (
                                <div className="flex items-center gap-2 text-xs text-[#515154] font-medium">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#f47b20]" />
                                  <span>Converting speech…</span>
                                </div>
                              ) : (
                                <>
                                  <canvas
                                    ref={soundCanvasRef}
                                    className="w-full h-9 block"
                                    aria-label="Live voice sound graph"
                                  />
                                  <span className="tabular-nums text-[11px] font-semibold text-[#c95510] shrink-0">
                                    {formatDuration(recordingSeconds)}
                                  </span>
                                </>
                              )}
                            </div>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={finishAndTranscribe}
                              disabled={voiceState === 'transcribing'}
                              aria-label="Done speaking"
                              title="Done"
                              className="w-10 h-10 rounded-full bg-[#1d1d1f] hover:bg-[#3a3a3c] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              {voiceState === 'transcribing' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </form>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
