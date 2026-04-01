import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { YouTubeVideo } from '../types';
import { Trash2, Plus, Youtube, ExternalLink } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const AdminVideos = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    youtubeUrl: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'youtube_videos'), orderBy('publishedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YouTubeVideo));
      setVideos(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'youtube_videos');
    });
    return () => unsubscribe();
  }, []);

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const youtubeId = getYouTubeId(formData.youtubeUrl);
    
    if (!youtubeId) {
      alert('URL do YouTube inválida');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'youtube_videos'), {
        title: formData.title,
        youtubeId: youtubeId,
        thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
        publishedAt: new Date().toISOString()
      });
      setFormData({ title: '', youtubeUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'youtube_videos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este vídeo?')) return;
    try {
      await deleteDoc(doc(db, 'youtube_videos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'youtube_videos');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Gerenciar <span className="text-red-600">Vídeos YouTube</span></h2>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400">Título do Vídeo</label>
            <input 
              type="text" 
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Entrevista com Prefeito de Itabuna"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-400">URL do YouTube</label>
            <input 
              type="text" 
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 transition-colors"
              value={formData.youtubeUrl}
              onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
              placeholder="Ex: https://www.youtube.com/watch?v=..."
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="bg-red-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Plus size={20} /> {loading ? 'ADICIONANDO...' : 'ADICIONAR VÍDEO'}
        </button>
      </form>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
            <div className="relative aspect-video">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a 
                  href={`https://youtube.com/watch?v=${video.youtubeId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-red-600 p-2 rounded-full hover:scale-110 transition-transform"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 line-clamp-2 mb-4">{video.title}</h3>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  {new Date(video.publishedAt).toLocaleDateString('pt-BR')}
                </span>
                <button 
                  onClick={() => handleDelete(video.id)}
                  className="text-gray-300 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
