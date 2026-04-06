import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Video, Play, Youtube, Eye } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { YouTubeVideo } from '../types';

export const Hub73Page = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'hub73'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hub73');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'youtube_videos'), orderBy('publishedAt', 'desc'), limit(4));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YouTubeVideo));
      setVideos(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'youtube_videos');
    });
    return () => unsubscribe();
  }, []);

  const incrementVideoViews = async (video: YouTubeVideo) => {
    try {
      await updateDoc(doc(db, 'youtube_videos', video.id), {
        views: increment(1)
      });
    } catch (error) {
      console.error('Error incrementing video views:', error);
    }
  };

  const filteredProjects = filter === 'Todos' 
    ? projects 
    : projects.filter(p => p.category?.toLowerCase() === filter.toLowerCase());

  const categories = ['Todos', ...new Set(projects.map(p => p.category).filter(Boolean))];

  return (
    <div className="bg-white min-h-screen">
      {/* Hero - Compact */}
      <section className="bg-gray-900 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="/assets/pagehub73.png" 
            alt="Production" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 flex justify-center"
          >
            <img 
              src="/assets/hub73.png" 
              alt="HUB73 PRODUTORA" 
              className="h-16 md:h-20 w-auto object-contain" 
            />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase">
            Transformamos Ideias em <span className="text-[#00A859]">Impacto Social</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8">
            A produtora oficial do Grupo Grapiúna. Especialistas em comerciais, podcasts, institucionais e cobertura de eventos.
          </p>
          <button className="bg-white text-black px-8 py-3 rounded-full font-bold text-base hover:bg-red-600 hover:text-white transition-all transform hover:scale-105">
            SOLICITAR ORÇAMENTO
          </button>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Nosso <span className="text-red-600">Portfólio</span></h2>
            <div className="flex flex-wrap gap-4">
              {categories.map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={project.id} 
                  className="group relative aspect-video bg-gray-200 rounded-2xl overflow-hidden cursor-pointer"
                >
                  <img 
                    src={project.imageUrl} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest mb-2 text-red-500">{project.category}</span>
                    <h4 className="text-xl font-bold text-center">{project.title}</h4>
                    <p className="text-xs text-gray-300 text-center mt-2 line-clamp-2">{project.description}</p>
                    <div className="mt-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
                      <Play size={20} fill="currentColor" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum projeto encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </section>

      {/* Recent Videos Section */}
      <section className="py-20 bg-gray-950 text-white">
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
              Ver todos no YouTube
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {videos.length > 0 ? videos.map((video) => (
              <motion.button
                key={video.id}
                whileHover={{ y: -5 }}
                onClick={() => incrementVideoViews(video)}
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
