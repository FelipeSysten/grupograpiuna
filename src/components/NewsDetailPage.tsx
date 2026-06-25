import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, loginWithGoogle } from '../firebase';
import { motion } from 'motion/react';
import { Clock, User, ArrowLeft, Share2, Facebook, Twitter, MessageCircle, ExternalLink, Send, LogIn, Trash2, RefreshCw } from 'lucide-react';
import Markdown from 'react-markdown';
import { AdBanner } from './AdBanner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { newsHref, extractNewsId } from '../lib/utils';
import { NewsComment } from '../types';

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  // A rota pode vir como `slug-id` (URL legível) ou só o id (links antigos).
  const newsId = extractNewsId(id);
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<NewsComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchNews = async () => {
      if (!newsId) return;
      try {
        const docRef = doc(db, 'news', newsId);
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
  }, [newsId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!newsId) return;
    const q = query(collection(db, 'news', newsId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsComment))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'comments'),
    );
    return () => unsub();
  }, [newsId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !newsId) return;
    if (!user && !guestName.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'news', newsId, 'comments'), {
        text: newComment.trim(),
        userId: user?.uid || '',
        userName: user?.displayName || guestName.trim(),
        userPhoto: user?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      if (!user) setGuestName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!newsId) return;
    try {
      await deleteDoc(doc(db, 'news', newsId, 'comments', commentId));
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

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11})/);
    return match ? match[1] : null;
  };

  // URL canônica e legível da notícia para compartilhamento
  const shareUrl = `${window.location.origin}${newsHref(news.title, newsId)}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(news.title);

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () =>
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
  const handleShareTwitter = () =>
    openShareWindow(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`);
  const handleShareWhatsApp = () =>
    openShareWindow(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: news.title, text: news.title, url: shareUrl });
      } catch {
        /* usuário cancelou o compartilhamento */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt('Copie o link da notícia:', shareUrl);
      }
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Header Ad */}
      <div className="py-6 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <AdBanner size="leaderboard" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex gap-10 items-start">
          {/* Main Article */}
          <article className="flex-1 min-w-0">
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
                  <button
                    type="button"
                    onClick={handleShareFacebook}
                    aria-label="Compartilhar no Facebook"
                    title="Compartilhar no Facebook"
                    className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                  >
                    <Facebook size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleShareTwitter}
                    aria-label="Compartilhar no X (Twitter)"
                    title="Compartilhar no X (Twitter)"
                    className="w-10 h-10 rounded-full bg-sky-400 text-white flex items-center justify-center hover:bg-sky-500 transition-colors"
                  >
                    <Twitter size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    aria-label="Compartilhar no WhatsApp"
                    title="Compartilhar no WhatsApp"
                    className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle size={18} />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      aria-label="Compartilhar ou copiar link"
                      title="Compartilhar ou copiar link"
                      className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Share2 size={18} />
                    </button>
                    {copied && (
                      <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-[10px] font-bold px-2 py-1 rounded">
                        Link copiado!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Atualização da Reportagem */}
            {news.updateNote && (
              <div className="mb-10 bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-2">
                  <RefreshCw size={12} /> Atualização da Reportagem
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">{news.updateNote}</p>
                {news.updatedAt && (
                  <p className="text-[10px] text-amber-500 mt-2">
                    Atualizado em {new Date(news.updatedAt.seconds * 1000).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            {/* Featured Image */}
            <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={news.imageUrl}
                alt={news.title}
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Mid-content Ad */}
            <div className="mb-8">
              <AdBanner size="leaderboard" />
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-red prose-img:rounded-xl prose-p:mb-4 prose-p:leading-relaxed prose-p:text-justify">
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

              {/* Formulário — disponível para todos, logados ou anônimos */}
              <form onSubmit={handleSubmitComment} className="mb-10">
                {!user && (
                  <div className="mb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      maxLength={50}
                      required
                      placeholder="Seu nome (obrigatório)"
                      className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 transition-colors"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  {user ? (
                    user.photoURL ? (
                      <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full shrink-0 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User size={18} className="text-gray-400" />
                      </div>
                    )
                  ) : (
                    <div className="w-10 h-10 shrink-0" />
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
                      <div className="flex items-center gap-3">
                        {!user && (
                          <button
                            type="button"
                            onClick={loginWithGoogle}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <LogIn size={12} /> Entrar com Google
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!newComment.trim() || submitting || (!user && !guestName.trim())}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={13} /> {submitting ? 'Enviando...' : 'Comentar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>

              {/* Lista de comentários */}
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
                              {user?.uid === comment.userId && comment.userId !== '' && (
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

          {/* Sidebar com anúncios */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-32 space-y-8">
              <AdBanner size="sidebar" />
              <AdBanner size="sidebar" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
