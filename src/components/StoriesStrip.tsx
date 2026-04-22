import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

/* ─── Tipos ────────────────────────────────────────────────────────────────── */
interface Story {
  id: string;
  title: string;
  videoUrl: string;
  imageUrl: string;
  order: number;
}

/* ─── localStorage para controle de "vistos" ──────────────────────────────── */
const SEEN_KEY = 'gg_seen_stories';

const getSeenIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const markSeen = (id: string): Set<string> => {
  try {
    const seen = getSeenIds();
    seen.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    return seen;
  } catch {
    return getSeenIds();
  }
};

/* ─── Gerador de URL de embed ──────────────────────────────────────────────── */
const getEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  // YouTube Shorts / Watch / youtu.be
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/,
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  // TikTok
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (ttMatch) return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;

  // Instagram Reel / Post
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  if (igMatch) return `https://www.instagram.com/p/${igMatch[1]}/embed/`;

  return null;
};

/* ─── Componente principal ────────────────────────────────────────────────── */
export const StoriesStrip: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(getSeenIds);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const touchStartX = useRef<number>(0);

  /* ── Firestore ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'news_stories'), orderBy('order', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Story)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'news_stories'),
    );
    return () => unsub();
  }, []);

  /* ── Lógica de navegação ───────────────────────────────────────────────── */
  const openStory = useCallback(
    (index: number) => {
      const story = stories[index];
      if (!story) return;
      setActiveIndex(index);
      setSeenIds(markSeen(story.id));
    },
    [stories],
  );

  const closeStory = useCallback(() => setActiveIndex(null), []);

  const goNext = useCallback(() => {
    if (activeIndex === null) return;
    activeIndex < stories.length - 1 ? openStory(activeIndex + 1) : closeStory();
  }, [activeIndex, stories.length, openStory, closeStory]);

  const goPrev = useCallback(() => {
    if (activeIndex === null || activeIndex === 0) return;
    openStory(activeIndex - 1);
  }, [activeIndex, openStory]);

  /* ── Keyboard ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (activeIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStory();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex, goNext, goPrev, closeStory]);

  /* ── Lock body scroll ──────────────────────────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activeIndex]);

  if (stories.length === 0) return null;

  const activeStory = activeIndex !== null ? stories[activeIndex] : null;
  const embedUrl = activeStory ? getEmbedUrl(activeStory.videoUrl) : null;

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          CARROSSEL HORIZONTAL DE STORIES
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Label */}
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Stories & Reels
          </p>

          {/* Scroll horizontal */}
          <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-1">
            {stories.map((story, index) => {
              const isSeen = seenIds.has(story.id);
              return (
                <button
                  key={story.id}
                  onClick={() => openStory(index)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
                >
                  {/* Anel gradiente (vermelho = novo | cinza = visto) */}
                  <div
                    className={`p-[2.5px] rounded-full transition-all duration-300 ${
                      isSeen
                        ? 'bg-gray-300'
                        : 'bg-gradient-to-tr from-red-700 to-red-400'
                    }`}
                  >
                    <div className="w-[62px] h-[62px] rounded-full overflow-hidden border-2 border-white bg-gray-100">
                      {story.imageUrl ? (
                        <img
                          src={story.imageUrl}
                          alt={story.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xl font-black">▶</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Título abaixo do círculo */}
                  <span className="text-[10px] font-bold text-gray-600 w-[72px] text-center line-clamp-1 uppercase tracking-wide">
                    {story.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL PLAYER VERTICAL (9:16)
      ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeStory}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const dx = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(dx) > 50) dx > 0 ? goNext() : goPrev();
            }}
          >

            {/* ── Barras de progresso no topo ─────────────────────────────── */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
              {stories.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-none ${
                      i < (activeIndex ?? 0)
                        ? 'w-full bg-white'
                        : i === activeIndex
                        ? 'w-full bg-red-500'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* ── Botão fechar ─────────────────────────────────────────────── */}
            <button
              onClick={(e) => { e.stopPropagation(); closeStory(); }}
              aria-label="Fechar story"
              className="absolute top-8 right-4 z-20 w-9 h-9 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>

            {/* ── Container do vídeo 9:16 ─────────────────────────────────── */}
            <motion.div
              key={activeStory.id}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-full max-w-[360px] mx-4 bg-gray-950 rounded-2xl overflow-hidden border border-gray-800"
              style={{ aspectRatio: '9/16', maxHeight: '88vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {embedUrl ? (
                <iframe
                  key={activeStory.id}
                  src={embedUrl}
                  title={activeStory.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                /* Fallback: link não embeddável */
                <div className="w-full h-full flex flex-col items-center justify-center gap-5 px-8 text-center bg-gray-950">
                  {activeStory.imageUrl && (
                    <img
                      src={activeStory.imageUrl}
                      alt={activeStory.title}
                      className="w-28 h-28 rounded-full object-cover border-2 border-red-600"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <p className="text-white font-bold text-base leading-snug">
                    {activeStory.title}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Este conteúdo não suporta embed direto.
                  </p>
                  <a
                    href={activeStory.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    <ExternalLink size={14} /> ABRIR LINK
                  </a>
                </div>
              )}

              {/* Gradiente + título no rodapé do player */}
              {embedUrl && (
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-white text-sm font-bold line-clamp-2">
                    {activeStory.title}
                  </p>
                </div>
              )}
            </motion.div>

            {/* ── Seta anterior ────────────────────────────────────────────── */}
            {(activeIndex ?? 0) > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label="Anterior"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* ── Seta próximo ─────────────────────────────────────────────── */}
            {(activeIndex ?? 0) < stories.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label="Próximo"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/50 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={22} />
              </button>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
