import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { motion } from 'motion/react';
import { Play, Calendar, MessageSquare, Share2, Send, LogIn, Tv, Minimize2, Maximize, Maximize2 } from 'lucide-react';
import { AdBanner } from './AdBanner';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, loginWithGoogle } from '../firebase';
import { ScheduleItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const TV_CHANNELS = [
  { name: 'BAND BAHIA',                      url: 'https://hplay.tv:443/jaypereiratvweb/112254789/175.m3u8' },
  { name: 'GLOBO BA',                        url: 'https://hplay.tv:443/jaypereiratvweb/112254789/172.m3u8' },
  { name: 'GLOBO BA | JUAZEIRO',             url: 'https://hplay.tv:443/jaypereiratvweb/112254789/7299.m3u8' },
  { name: 'GLOBO BA | SUBAÉ',                url: 'https://hplay.tv:443/jaypereiratvweb/112254789/7298.m3u8' },
  { name: 'GLOBO BA | TV SANTA CRUZ',        url: 'https://hplay.tv:443/jaypereiratvweb/112254789/7411.m3u8' },
  { name: 'GLOBO BA | TV SUDOESTE',          url: 'https://hplay.tv:443/jaypereiratvweb/112254789/7426.m3u8' },
  { name: 'GLOBO BA | VITÓRIA DA CONQUISTA', url: 'https://hplay.tv:443/jaypereiratvweb/112254789/136460.m3u8' },
  { name: 'RECORD BAHIA',                    url: 'https://hplay.tv:443/jaypereiratvweb/112254789/174.m3u8' },
  { name: 'RECORD CABRÁLIA',                 url: 'https://hplay.tv:443/jaypereiratvweb/112254789/7189.m3u8' },
];

type ViewMode = 'normal' | 'theater';

export const TVPage = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [currentProgram, setCurrentProgram] = useState<ScheduleItem | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [liveConfig, setLiveConfig] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<{ name: string; url: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // ── Live config ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'live_config', 'current'), (snap) => {
      if (snap.exists()) setLiveConfig(snap.data());
    });
    return () => unsub();
  }, []);

  // ── Chat ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'live_chat'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse());
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'live_chat'));
    return () => unsub();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Schedule ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'tv_schedule'), orderBy('time', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
      setSchedule(data);
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const current = [...data].reverse().find(p => p.time <= currentTime) || data[0];
      if (current) {
        setCurrentProgram(current);
        if (current.youtubeUrl && !liveConfig?.active) {
          setSelectedVideoId(getYouTubeId(current.youtubeUrl));
        }
      }
    });
    return () => unsub();
  }, [liveConfig]);

  // ── HLS: carrega stream quando selectedChannel muda ───────────────────────
  // O effect roda APÓS o render, garantindo que videoRef.current já existe.
  useEffect(() => {
    if (!selectedChannel) return;
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(selectedChannel.url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari: suporte nativo a HLS
      video.src = selectedChannel.url;
      video.play().catch(() => {});
    }
  }, [selectedChannel]);

  // ── Cleanup HLS ao desmontar ───────────────────────────────────────────────
  useEffect(() => {
    return () => { hlsRef.current?.destroy(); };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getYouTubeId = (url: string) => {
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Seleciona um canal HLS; descarta YouTube da grade */
  const handleChannelSelect = (channel: { name: string; url: string }) => {
    setSelectedVideoId(null);
    setSelectedChannel(channel);
    // O carregamento HLS ocorre no useEffect acima, após o re-render
  };

  /** Clique na grade de programação: carrega YouTube e encerra HLS */
  const handleProgramClick = (prog: ScheduleItem) => {
    if (!prog.youtubeUrl) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setSelectedChannel(null);
    setSelectedVideoId(getYouTubeId(prog.youtubeUrl));
    setCurrentProgram(prog);
  };

  /** Tela cheia: usa o wrapper do player para cobrir todo o viewport */
  const handleFullscreen = () => {
    playerWrapperRef.current?.requestFullscreen().catch(() => {});
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'TV Grapiúna - Ao Vivo', text: 'Assista agora a TV Grapiúna ao vivo!', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copiado!');
      }
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    try {
      await addDoc(collection(db, 'live_chat'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        userPhoto: user.photoURL,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'live_chat');
    }
  };

  // ── Flags de visibilidade do player ──────────────────────────────────────
  // O <video> fica sempre no DOM (hidden/block) para manter o ref ativo.
  const showVideo   = !!selectedChannel || (liveConfig?.active && liveConfig?.type === 'direct');
  const showIframe  = !showVideo && (!!selectedVideoId || (liveConfig?.active && liveConfig?.type === 'youtube'));
  const showPlaceholder = !showVideo && !showIframe;
  const isTheater   = viewMode === 'theater';

  return (
    <div className="bg-gray-950 min-h-screen text-white">

      {/* ── 1. Banner topo ─────────────────────────────────────────────────── */}
      <div className="bg-black border-b border-gray-800">
        <AdBanner size="leaderboard" page="tv" />
      </div>

      {/* ── 2. Player + Chat ───────────────────────────────────────────────── */}
      <section className="py-10 pb-6">
        <div className={isTheater ? 'w-full px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
          <div className={isTheater ? 'flex flex-col gap-6' : 'grid grid-cols-1 lg:grid-cols-4 gap-6'}>

            {/* Player column */}
            <div className={isTheater ? 'w-full' : 'lg:col-span-3'}>

              {/* Player wrapper — ref para fullscreen */}
              <div
                ref={playerWrapperRef}
                className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
              >
                {/* <video> sempre no DOM; visibilidade controlada por CSS */}
                <video
                  id="main-video-player"
                  ref={videoRef}
                  controls
                  autoPlay
                  className={`absolute inset-0 w-full h-full ${showVideo ? 'block' : 'hidden'}`}
                  src={liveConfig?.active && liveConfig?.type === 'direct' && !selectedChannel ? liveConfig.url : undefined}
                />

                {/* YouTube iframe */}
                {showIframe && (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${liveConfig?.active ? getYouTubeId(liveConfig.url) : selectedVideoId}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}

                {/* Placeholder */}
                {showPlaceholder && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                    <img
                      src="https://picsum.photos/seed/live/1280/720"
                      alt="Placeholder"
                      className="w-full h-full object-cover opacity-30 absolute inset-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 text-center px-4">
                      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                        <Play size={32} className="text-gray-600" />
                      </div>
                      <h3 className="text-xl font-bold">Nenhum vídeo disponível no momento</h3>
                      <p className="text-gray-400 text-sm mt-2">Selecione um canal ou programa abaixo.</p>
                    </div>
                  </div>
                )}

                {/* Badge AO VIVO */}
                {(currentProgram || liveConfig?.active || selectedChannel) && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-xs font-bold z-10">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    {liveConfig?.active
                      ? 'TRANSMISSÃO AO VIVO'
                      : selectedChannel
                        ? selectedChannel.name
                        : currentProgram?.title}
                  </div>
                )}
              </div>

              {/* Controls bar */}
              <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold">
                    {selectedChannel?.name ?? (liveConfig?.active ? 'TV Grapiúna Ao Vivo' : (currentProgram?.title || 'Eventos ao Vivo'))}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {currentProgram?.host && !selectedChannel
                      ? `Com ${currentProgram.host}`
                      : 'Acompanhe nossa programação local 24h.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href="https://www.youtube.com/@tv.grapiuna"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                  >
                    INSCREVER NO CANAL
                  </a>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Share2 size={15} /> Compartilhar
                  </button>

                  {/* Controles de tamanho */}
                  <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-1 border border-gray-700" title="Tamanho do player">
                    <button
                      title="Normal"
                      onClick={() => setViewMode('normal')}
                      className={`p-1.5 rounded transition-colors ${viewMode === 'normal' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Minimize2 size={15} />
                    </button>
                    <button
                      title="Modo Teatro"
                      onClick={() => setViewMode('theater')}
                      className={`p-1.5 rounded transition-colors ${viewMode === 'theater' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      <Maximize size={15} />
                    </button>
                    <button
                      title="Tela Cheia"
                      onClick={handleFullscreen}
                      className="p-1.5 rounded text-gray-400 hover:text-white transition-colors"
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ad banners */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdBanner size="sidebar" page="tv" className="w-full h-auto aspect-[2/1]" />
                <AdBanner size="sidebar" page="tv" className="w-full h-auto aspect-[2/1]" />
              </div>
            </div>

            {/* Chat column */}
            <div className={`bg-gray-900 rounded-2xl border border-gray-800 flex overflow-hidden ${
              isTheater ? 'flex-row h-44' : 'lg:col-span-1 flex-col h-[500px] lg:h-auto'
            }`}>

              {/* Header (somente modo normal) */}
              {!isTheater && (
                <div className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/50 backdrop-blur-sm">
                  <h3 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                    <MessageSquare size={16} className="text-red-600" /> Chat Ao Vivo
                  </h3>
                  {user && (
                    <div className="flex items-center gap-2">
                      <img src={user.photoURL || ''} className="w-5 h-5 rounded-full" alt="" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{user.displayName?.split(' ')[0]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagens */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-800">
                {messages.length > 0 ? messages.map((msg, i) => (
                  <div key={msg.id || i} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="font-bold text-red-500 shrink-0">{msg.userName}:</span>
                    <span className="text-gray-300 break-words">{msg.text}</span>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 text-center px-4">
                    <MessageSquare size={28} className="mb-2 opacity-20" />
                    <p className="text-xs">Seja o primeiro a comentar!</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className={`p-4 bg-gray-900/50 ${
                isTheater
                  ? 'border-l border-gray-800 w-64 shrink-0 flex flex-col justify-center'
                  : 'border-t border-gray-800'
              }`}>
                {isTheater && (
                  <h3 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest mb-3">
                    <MessageSquare size={14} className="text-red-600" /> Chat
                  </h3>
                )}
                {user ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Diga algo..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={loginWithGoogle}
                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <LogIn size={16} className="text-red-600" /> ENTRAR PARA COMENTAR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Canais Disponíveis ──────────────────────────────────────────── */}
      <section className="py-12 bg-gray-950 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Tv size={22} className="text-red-600" />
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                Canais <span className="text-red-600">Disponíveis</span>
              </h2>
            </div>
            {selectedChannel && (
              <button
                onClick={() => {
                  if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
                  setSelectedChannel(null);
                }}
                className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-4 py-1.5 rounded-full transition-all"
              >
                Fechar canal
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {TV_CHANNELS.map((ch) => {
              const isActive = selectedChannel?.url === ch.url;
              return (
                <motion.button
                  key={ch.url}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleChannelSelect(ch)}
                  className={`relative group flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all text-center ${
                    isActive
                      ? 'bg-red-600/10 border-red-600 shadow-lg shadow-red-900/20'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      AO VIVO
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
                  }`}>
                    {isActive ? <Play size={20} fill="currentColor" /> : <Tv size={20} />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider leading-snug ${
                    isActive ? 'text-red-400' : 'text-gray-200'
                  }`}>
                    {ch.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Grade de Programação ────────────────────────────────────────── */}
      <section className="py-16 bg-gray-900/50 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-10">
            <Calendar size={26} className="text-red-600" />
            <h2 className="text-3xl font-black uppercase tracking-tighter">
              Grade de <span className="text-red-600">Programação</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {schedule.length > 0 ? schedule.map((prog, i) => (
              <button
                key={i}
                onClick={() => handleProgramClick(prog)}
                className={`text-left p-4 rounded-lg border-l-4 transition-all hover:scale-105 text-sm ${
                  currentProgram?.id === prog.id && !selectedChannel
                    ? 'bg-red-600/10 border-red-600 shadow-lg shadow-red-900/20'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
              >
                <span className={`font-mono font-bold text-base ${
                  currentProgram?.id === prog.id && !selectedChannel ? 'text-red-400' : 'text-red-500'
                }`}>
                  {prog.time}
                </span>
                <h3 className="text-base font-bold mt-2 line-clamp-2">{prog.title}</h3>
                <p className="text-gray-400 text-xs mt-1 line-clamp-1">Com {prog.host}</p>
                {prog.youtubeUrl && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                    <Play size={10} fill="currentColor" /> Assistir
                  </div>
                )}
              </button>
            )) : (
              [1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-gray-800 p-4 rounded-lg border-l-4 border-gray-700 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-2/3" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
