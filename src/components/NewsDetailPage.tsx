import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Clock, User, ArrowLeft, Share2, Facebook, Twitter, MessageCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { AdBanner } from './AdBanner';

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'news', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNews({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Erro ao buscar notícia:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <h2 className="text-2xl font-bold mb-4">Notícia não encontrada</h2>
        <Link to="/noticias" className="text-red-600 font-bold flex items-center gap-2">
          <ArrowLeft size={20} /> VOLTAR PARA NOTÍCIAS
        </Link>
      </div>
    );
  }

  const shareUrl = window.location.href;

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Header Ad */}
      <div className="py-6 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <AdBanner size="leaderboard" />
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 pt-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">
          <Link to="/" className="hover:text-red-600">Home</Link>
          <span>/</span>
          <Link to="/noticias" className="hover:text-red-600">Notícias</Link>
          <span>/</span>
          <span className="text-red-600 truncate max-w-[200px]">{news.category}</span>
        </nav>

        {/* Title Section */}
        <header className="mb-10">
          <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded uppercase mb-6 inline-block">
            {news.category}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight mb-8">
            {news.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-between gap-6 py-6 border-y border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                <User size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Por {news.author || 'Redação'}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} /> {news.createdAt ? new Date(news.createdAt.seconds * 1000).toLocaleString('pt-BR') : 'Data não disponível'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Facebook size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-sky-400 text-white flex items-center justify-center hover:bg-sky-500 transition-colors">
                <Twitter size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors">
                <MessageCircle size={18} />
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl">
          <img 
            src={news.imageUrl} 
            alt={news.title} 
            className="w-full h-auto object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-red prose-img:rounded-xl">
          <div className="markdown-body">
            <Markdown>{news.content}</Markdown>
          </div>
        </div>

        {/* Footer Ad */}
        <div className="mt-16 py-12 border-t border-gray-100">
          <AdBanner size="leaderboard" />
        </div>

        {/* Navigation */}
        <div className="mt-12 flex justify-center">
          <Link to="/noticias" className="bg-black text-white px-10 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-red-600 transition-all transform hover:scale-105">
            <ArrowLeft size={20} /> VER MAIS NOTÍCIAS
          </Link>
        </div>
      </article>
    </div>
  );
};
