import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, loginWithGoogle } from '../firebase';
import { motion } from 'motion/react';
import { Clock, User, ArrowLeft, Share2, Facebook, Twitter, MessageCircle, ExternalLink, Send, LogIn, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { AdBanner } from './AdBanner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { NewsComment } from '../types';

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'news', id, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsComment))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'comments'),
    );
    return () => unsub();
  }, [id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !id) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'news', id, 'comments'), {
        text: newComment.trim(),
        userId: user.uid,
        userName: user.displayName || 'Anônimo',
        userPhoto: user.photoURL || null,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, 'news', id, 'comments', commentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'comments');
    }
  };

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

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})/);
    return match ? match[1] : null;
  };

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
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter leading-tight mb-8">
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
        <div className="prose prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-red prose-img:rounded-xl prose-p:mb-5 prose-p:leading-relaxed prose-p:text-justify">
          <div className="markdown-body">
            <Markdown>{news.content?.replace(/\n(?!\n)/g, '\n\n') ?? ''}</Markdown>
          </div>
        </div>

        {/* Galeria de mídias adicionais */}
        {news.media && news.media.length > 0 && (() => {
          const images = news.media.filter((m: any) => m.type === 'image');
          const videos = news.media.filter((m: any) => m.type === 'video');
          const links  = news.media.filter((m: any) => m.type === 'link');
          return (
            <div className="mt-12 pt-10 border-t border-gray-100 space-y-10">
              <h2 className="text-2xl font-black tracking-tighter uppercase">Galeria</h2>

              {images.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((item: any, i: number) => (
                    <div key={i} className="rounded-xl overflow-hidden shadow-md">
                      <img
                        src={item.url}
                        alt={`Foto ${i + 1}`}
                        className="w-full h-auto object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              )}

              {videos.map((item: any, i: number) => {
                const videoId = getYouTubeId(item.url);
                if (!videoId) return null;
                return (
                  <div key={i} className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={`Vídeo ${i + 1}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              })}

              {links.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Links Relacionados</p>
                  {links.map((item: any, i: number) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group"
                    >
                      <ExternalLink size={18} className="shrink-0 text-gray-400 group-hover:text-red-600 transition-colors" />
                      <span className="font-medium truncate">{item.title || item.url}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Comments */}
        <section className="mt-16 pt-10 border-t border-gray-100">
          <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 mb-8">
            <MessageCircle size={22} className="text-red-600" />
            Comentários
            <span className="text-base font-bold text-gray-400">({comments.length})</span>
          </h2>

          {/* Form */}
          {user ? (
            <form onSubmit={handleSubmitComment} className="mb-10">
              <div className="flex gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full shrink-0 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User size={18} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Deixe seu comentário..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">{newComment.length}/500</span>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submitting}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={13} /> {submitting ? 'Enviando...' : 'Comentar'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="mb-10 p-6 bg-gray-50 rounded-2xl text-center border border-gray-100">
              <p className="text-gray-500 text-sm mb-4">Faça login para deixar um comentário</p>
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
                <LogIn size={15} /> Entrar com Google
              </button>
            </div>
          )}

          {/* List */}
          <div className="space-y-5">
            {comments.length === 0 ? (
              <div className="text-center py-10 text-gray-300">
                <MessageCircle size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Seja o primeiro a comentar!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  {comment.userPhoto ? (
                    <img src={comment.userPhoto} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-sm font-bold text-gray-900">{comment.userName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-gray-400">
                            {comment.createdAt?.seconds
                              ? new Date(comment.createdAt.seconds * 1000).toLocaleString('pt-BR')
                              : ''}
                          </span>
                          {user?.uid === comment.userId && (
                            <button
                              onClick={() => comment.id && handleDeleteComment(comment.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Excluir comentário"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>

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
