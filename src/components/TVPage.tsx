import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Play, Calendar, Users, MessageSquare, Share2, Send, LogIn, Youtube, Eye } from 'lucide-react';
import { AdBanner } from './AdBanner';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, updateDoc, doc, increment } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, loginWithGoogle } from '../firebase';
import { ScheduleItem, YouTubeVideo } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const TVPage = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [currentProgram, setCurrentProgram] = useState<ScheduleItem | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const incrementVideoViews = async (video: YouTubeVideo) => {
    try {
      await updateDoc(doc(db, 'youtube_videos', video.id), {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing video views:', error);
    }
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    setSelectedVideoId(video.youtubeId);
    incrementVideoViews(video);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'live_chat'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeChat = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'live_chat');
    });
    return () => unsubscribeChat();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const q = query(collection(db, 'tv_schedule'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
      setSchedule(data);
      
      // Logic to find current program
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const current = [...data].reverse().find(p => p.time <= currentTime) || data[0];
      if (current) {
        setCurrentProgram(current);
        if (current.youtubeUrl) {
          setSelectedVideoId(getYouTubeId(current.youtubeUrl));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'youtube_videos'), orderBy('publishedAt', 'desc'), limit(8));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YouTubeVideo));
      setVideos(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'youtube_videos');
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const chatPath = 'live_chat';
    try {
      await addDoc(collection(db, chatPath), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        userPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, chatPath);
    }
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleProgramClick = (prog: ScheduleItem) => {
    if (prog.youtubeUrl) {
      setSelectedVideoId(getYouTubeId(prog.youtubeUrl));
      setCurrentProgram(prog);
    }
  };

  return (
    <div className="bg-gray-950 min-h-screen text-white">
      {/* Top Ad */}
      <div className="py-6 bg-black">
        <AdBanner size="leaderboard" className="bg-gray-900 border-gray-800" />
      </div>

      {/* Live Player Section */}
      <section className="pt-10 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Player */}
            <div className="lg:col-span-2">
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                {selectedVideoId ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                    <img 
                      src="https://picsum.photos/seed/live/1280/720" 
                      alt="Live Stream Placeholder" 
                      className="w-full h-full object-cover opacity-30 absolute inset-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="relative z-10 text-center px-4">
                      <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                        <Play size={32} className="text-gray-600" />
                      </div>
                      <h3 className="text-xl font-bold">Nenhum vídeo disponível no momento</h3>
                      <p className="text-gray-400 text-sm mt-2">Selecione um programa na grade abaixo para assistir.</p>
                    </div>
                  </div>
                )}
                
                {currentProgram && (
                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-xs font-bold z-10">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div> NO AR: {currentProgram.title}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{currentProgram?.title || 'TV Grapiúna Ao Vivo'}</h1>
                  <p className="text-gray-400 text-sm">
                    {currentProgram?.host ? `Com apresentação de ${currentProgram.host}` : 'Acompanhe nossa programação local 24h.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <a 
                    href="https://www.youtube.com/@tv.grapiuna" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    INSCREVER NO CANAL
                  </a>
                  <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Share2 size={18} /> Compartilhar
                  </button>
                </div>
              </div>
            </div>

            {/* Chat / Sidebar */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 flex flex-col h-[500px] lg:h-auto overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-sm">
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
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm scrollbar-thin scrollbar-thumb-gray-800">
                {messages.length > 0 ? messages.map((msg, i) => (
                  <div key={msg.id || i} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="font-bold text-red-500 shrink-0">{msg.userName}:</span>
                    <span className="text-gray-300 break-words">{msg.text}</span>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 text-center px-4">
                    <MessageSquare size={32} className="mb-2 opacity-20" />
                    <p className="text-xs">Seja o primeiro a comentar!</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                {user ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Diga algo..." 
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                ) : (
                  <button 
                    onClick={loginWithGoogle}
                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <LogIn size={18} className="text-red-600" /> ENTRAR PARA COMENTAR
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programming Schedule */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-12">
            <Calendar size={28} className="text-red-600" />
            <h2 className="text-3xl font-black uppercase tracking-tighter">Grade de <span className="text-red-600">Programação</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {schedule.length > 0 ? schedule.map((prog, i) => (
              <button 
                key={i} 
                onClick={() => handleProgramClick(prog)}
                className={`text-left p-6 rounded-xl border-l-4 transition-all transform hover:scale-105 ${
                  currentProgram?.id === prog.id 
                    ? 'bg-red-600/10 border-red-600 shadow-lg shadow-red-900/20' 
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                }`}
              >
                <span className={`font-mono font-bold text-lg ${currentProgram?.id === prog.id ? 'text-red-400' : 'text-red-500'}`}>
                  {prog.time}
                </span>
                <h3 className="text-xl font-bold mt-2">{prog.title}</h3>
                <p className="text-gray-400 text-sm mt-1">Com {prog.host}</p>
                {prog.youtubeUrl && (
                  <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                    <Play size={10} fill="currentColor" /> Assistir agora
                  </div>
                )}
              </button>
            )) : (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-gray-800 p-6 rounded-xl border-l-4 border-gray-700 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      
      {/* Recent Videos */}
      <section className="py-20 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <Youtube size={28} className="text-red-600" />
              <h2 className="text-3xl font-black uppercase tracking-tighter">Vídeos <span className="text-red-600">Recentes</span></h2>
            </div>
            <a 
              href="https://www.youtube.com/@tv.grapiuna" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Ver todos no YouTube <Share2 size={14} />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {videos.length > 0 ? videos.map((video) => (
              <motion.button
                key={video.id}
                whileHover={{ y: -5 }}
                onClick={() => handleVideoSelect(video)}
                className="group text-left"
              >
                <div className="relative aspect-video rounded-xl overflow-hidden mb-4 border border-gray-800">
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-xl">
                      <Play size={24} fill="white" className="text-white ml-1" />
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-gray-100 line-clamp-2 group-hover:text-red-500 transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    {new Date(video.publishedAt).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                    <Eye size={12} /> {video.views || 0}
                  </div>
                </div>
              </motion.button>
            )) : (
              [1, 2, 3, 4].map((n) => (
                <div key={n} className="space-y-4 animate-pulse">
                  <div className="aspect-video bg-gray-900 rounded-xl"></div>
                  <div className="h-4 bg-gray-900 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-900 rounded w-1/4"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
