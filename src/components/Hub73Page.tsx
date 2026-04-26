import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Youtube, Eye, Minimize2, Maximize2, Expand } from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  doc,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { YouTubeVideo } from '../types';
import Hls from 'hls.js';

/* ─── Tipos ────────────────────────────────────────────────────────────────── */
interface HubVideo {
  id: string;
  title: string;
  category: string;
  description?: string;
  imageUrl: string;
  videoUrl: string;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const getYouTubeEmbedUrl = (url: string, autoplay: boolean): string | null => {
  const match = url?.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  );
  return match
    ? `https://www.youtube.com/embed/${match[1]}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`
    : null;
};

const getYouTubeWatchUrl = (youtubeId: string) =>
  `https://www.youtube.com/watch?v=${youtubeId}`;

const isHLS = (url?: string) => !!url?.includes('.m3u8');

/* ─── Player interno (YouTube / HLS / MP4) ────────────────────────────────── */
const VideoPlayer = ({
  video,
  autoplay,
  videoRef,
}: {
  video: HubVideo;
  autoplay: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) => {
  const embedUrl = getYouTubeEmbedUrl(video.videoUrl, autoplay);

  if (embedUrl) {
    return (
      <iframe
        key={`yt-${video.id}-${autoplay}`}
        src={embedUrl}
        title={video.title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (isHLS(video.videoUrl)) {
    return (
      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    );
  }

  return (
    <video
      key={`mp4-${video.id}`}
      src={video.videoUrl}
      controls
      autoPlay={autoplay}
      playsInline
      className="w-full h-full object-contain"
    />
  );
};

/* ─── Componente principal ────────────────────────────────────────────────── */
export const Hub73Page = () => {
  const [videos, setVideos] = useState<HubVideo[]>([]);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<HubVideo | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [playerSize, setPlayerSize] = useState<'sm' | 'lg'>('lg');

  const playerRef = useRef<HTMLDivElement>(null);
  const fsRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const initializedRef = useRef(false);

  /* ── Firestore: hub73 ──────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'hub73'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HubVideo));
        setVideos(items);
        if (items.length > 0 && !initializedRef.current) {
          initializedRef.current = true;
          setSelectedVideo(items[0]);
        }
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'hub73');
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  /* ── Firestore: youtube_videos ─────────────────────────────────────────── */
  useEffect(() => {
    const q = query(
      collection(db, 'youtube_videos'),
      orderBy('publishedAt', 'desc'),
      limit(4),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setYtVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as YouTubeVideo)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'youtube_videos'),
    );
    return () => unsub();
  }, []);

  /* ── HLS ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (!selectedVideo || !isHLS(selectedVideo.videoUrl) || !videoRef.current) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(selectedVideo.videoUrl);
      hls.attachMedia(videoRef.current);
      if (autoplay) {
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => {});
        });
      }
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = selectedVideo.videoUrl;
      if (autoplay) videoRef.current.play().catch(() => {});
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideo?.id]);

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  const selectVideo = (video: HubVideo) => {
    setAutoplay(true);
    setSelectedVideo(video);
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleFullscreen = () => {
    const el = fsRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const incrementViews = async (video: YouTubeVideo) => {
    try {
      await updateDoc(doc(db, 'youtube_videos', video.id), {
        views: increment(1),
      });
    } catch { /* silently ignore */ }
  };

  const filteredVideos =
    filter === 'Todos'
      ? videos
      : videos.filter((v) => v.category?.toLowerCase() === filter.toLowerCase());

  const categories = ['Todos', ...new Set(videos.map((v) => v.category).filter(Boolean))];

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white">

      {/* ════════════════════════════════════════════════════════════════════
          2. PLAYER DE DESTAQUE — carrega o vídeo selecionado na grade
      ═════════════════════════════════════════════════════════════════════ */}
      <section
        ref={playerRef}
        className="bg-gray-950 py-10 scroll-mt-0"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="w-full aspect-video bg-gray-900 rounded-2xl animate-pulse" />
          ) : selectedVideo ? (
            <>
              {/* Player */}
              <div className={`transition-all duration-300 ${playerSize === 'sm' ? 'max-w-2xl mx-auto' : 'w-full'}`}>
                {/* Controles de tamanho */}
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <button
                    onClick={() => setPlayerSize('sm')}
                    title="Tela menor"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors ${playerSize === 'sm' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  >
                    <Minimize2 size={12} /> Menor
                  </button>
                  <button
                    onClick={() => setPlayerSize('lg')}
                    title="Tela maior"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors ${playerSize === 'lg' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  >
                    <Maximize2 size={12} /> Maior
                  </button>
                  <button
                    onClick={handleFullscreen}
                    title="Tela completa"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  >
                    <Expand size={12} /> Completa
                  </button>
                </div>

                <div ref={fsRef} className="w-full bg-black rounded-2xl overflow-hidden border border-gray-800/60 shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedVideo.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="relative aspect-video w-full bg-black"
                    >
                      <VideoPlayer
                        video={selectedVideo}
                        autoplay={autoplay}
                        videoRef={videoRef}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Info abaixo do player */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`info-${selectedVideo.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="mt-6 px-1"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-500 block mb-1">
                    {selectedVideo.category}
                  </span>
                  <h2 className="text-white text-2xl md:text-3xl font-black leading-tight mb-2">
                    {selectedVideo.title}
                  </h2>
                  {selectedVideo.description && (
                    <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
                      {selectedVideo.description}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          ) : null}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          3. NOSSAS PRODUÇÕES — grade de vídeos com filtros
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-16">
        <div className="w-full px-4 sm:px-6 lg:px-8">

          {/* Cabeçalho da seção + filtros */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">
                Hub73 Produtora
              </p>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">
                Nossas <span className="text-red-600">Produções</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-5">
              {categories.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                    filter === f
                      ? 'text-red-600'
                      : 'text-gray-400 hover:text-red-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grade */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-video bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                Nenhum vídeo encontrado nesta categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredVideos.map((video) => {
                const isActive = selectedVideo?.id === video.id;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={video.id}
                    onClick={() => selectVideo(video)}
                    className={`group relative aspect-video bg-gray-900 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-gray-50 shadow-lg shadow-red-100'
                        : 'ring-2 ring-transparent hover:ring-gray-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Thumbnail */}
                    <img
                      src={video.imageUrl}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />

                    {/* Overlay hover: categoria + título + descrição + Play */}
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest mb-1 text-red-500">
                        {video.category}
                      </span>
                      <h4 className="text-sm font-bold text-center line-clamp-2 mb-1">
                        {video.title}
                      </h4>
                      {video.description && (
                        <p className="text-xs text-gray-300 text-center line-clamp-2 mb-3 px-2">
                          {video.description}
                        </p>
                      )}
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                        <Play size={10} fill="white" color="white" className="ml-0.5" />
                      </div>
                    </div>

                    {/* Badge de categoria — visível em repouso */}
                    <div className="absolute bottom-3 left-3 group-hover:opacity-0 transition-opacity">
                      <span className="bg-black/60 text-[10px] font-bold uppercase tracking-widest text-gray-300 px-2 py-1 rounded-full">
                        {video.category}
                      </span>
                    </div>

                    {/* Indicador "em reprodução" */}
                    {isActive && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                          ▶ Reproduzindo
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          4. VÍDEOS RECENTES — youtube_videos
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="bg-gray-950 py-16 border-t border-gray-800">
        <div className="w-full px-4 sm:px-6 lg:px-8">

          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <Youtube size={26} className="text-red-600" />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                Vídeos <span className="text-red-600">Recentes</span>
              </h2>
            </div>
            <a
              href="https://www.youtube.com/@PRODUTORAHUB73/podcasts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Ver todos no YouTube
            </a>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ytVideos.length > 0
              ? ytVideos.map((video) => (
                  <motion.a
                    key={video.id}
                    href={getYouTubeWatchUrl(video.youtubeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => incrementViews(video)}
                    whileHover={{ y: -4 }}
                    className="group block text-left"
                  >
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-gray-800">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                          <Play size={16} fill="white" color="white" className="ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-100 text-sm line-clamp-2 group-hover:text-red-500 transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        {new Date(video.publishedAt).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-600 font-bold">
                        <Eye size={11} /> {video.views ?? 0}
                      </div>
                    </div>
                  </motion.a>
                ))
              : [1, 2, 3, 4].map((n) => (
                  <div key={n} className="space-y-3 animate-pulse">
                    <div className="aspect-video bg-gray-900 rounded-xl" />
                    <div className="h-4 bg-gray-900 rounded w-3/4" />
                    <div className="h-3 bg-gray-900 rounded w-1/4" />
                  </div>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
};
