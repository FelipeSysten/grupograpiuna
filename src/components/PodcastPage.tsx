import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic, Play, Clock, Share2, Heart, Headphones } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const PodcastPage = () => {
  const [podcasts, setPodcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'podcasts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPodcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'podcasts');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const latestPodcast = podcasts[0];

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-orange-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-64 h-64 bg-white rounded-3xl shadow-2xl overflow-hidden shrink-0 rotate-3">
              <img 
                src={latestPodcast?.imageUrl || "https://picsum.photos/seed/pod/600/600"} 
                alt="Podcast Cover" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center md:text-left">
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">Rede de Podcasts</span>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 uppercase">Grapiúna <span className="text-black">Talks</span></h1>
              <p className="text-xl opacity-90 mb-8 max-w-2xl">As conversas mais relevantes do Sul da Bahia. Política, negócios, cultura e muito mais.</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                {latestPodcast && (
                  <a 
                    href={latestPodcast.audioUrl || latestPodcast.youtubeUrl || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-black text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-900 transition-all"
                  >
                    <Play size={18} fill="currentColor" /> OUVIR ÚLTIMO EPISÓDIO
                  </a>
                )}
                <button className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-white/20 transition-all">
                  <Headphones size={18} /> SEGUIR NO SPOTIFY
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Episodes Grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-12">Episódios <span className="text-orange-600">Recentes</span></h2>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {podcasts.map((podcast) => (
                <motion.div
                  key={podcast.id}
                  whileHover={{ y: -10 }}
                  className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group"
                >
                  <div className="relative aspect-square">
                    <img
                      src={podcast.imageUrl}
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a
                        href={podcast.audioUrl || podcast.youtubeUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-14 h-14 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-xl"
                      >
                        <Play size={20} fill="currentColor" />
                      </a>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-orange-600 text-[10px] font-bold uppercase tracking-widest">EPISÓDIO</span>
                      <span className="flex items-center gap-1 text-gray-400 text-[10px] font-bold"><Clock size={11} /> {podcast.duration || '45 min'}</span>
                    </div>
                    <h3 className="text-sm font-bold mb-2 group-hover:text-orange-600 transition-colors line-clamp-2">
                      {podcast.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{podcast.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                          <Mic size={12} />
                        </div>
                        <span className="text-xs font-bold text-gray-600">Grapiúna Talks</span>
                      </div>
                      <div className="flex gap-2 text-gray-400">
                        <button className="hover:text-orange-600 transition-colors"><Heart size={15} /></button>
                        <button className="hover:text-orange-600 transition-colors"><Share2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && podcasts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum episódio de podcast encontrado.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
