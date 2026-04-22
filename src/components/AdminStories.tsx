import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Smartphone, GripVertical } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Story {
  id: string;
  title: string;
  videoUrl: string;
  imageUrl: string;
  order: number;
}

const EMPTY_FORM = {
  title: '',
  videoUrl: '',
  imageUrl: '',
  order: 0,
};

const PLATFORM_HINTS = [
  { label: 'YouTube Shorts', example: 'https://youtube.com/shorts/VIDEO_ID' },
  { label: 'TikTok', example: 'https://www.tiktok.com/@user/video/123...' },
  { label: 'Instagram Reel', example: 'https://www.instagram.com/reel/CODE/' },
];

export const AdminStories = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [showHints, setShowHints] = useState(false);

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

  /* ── Salvar ────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'news_stories';
    const payload = { ...formData, order: Number(formData.order) };
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), {
          ...payload,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, path), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      closeModal();
    } catch (err) {
      handleFirestoreError(
        err,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        path,
      );
    }
  };

  /* ── Excluir ───────────────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este story?')) {
      try {
        await deleteDoc(doc(db, 'news_stories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'news_stories');
      }
    }
  };

  /* ── Editar ────────────────────────────────────────────────────────────── */
  const handleEdit = (item: Story) => {
    setEditingId(item.id);
    setFormData({
      title: item.title ?? '',
      videoUrl: item.videoUrl ?? '',
      imageUrl: item.imageUrl ?? '',
      order: item.order ?? 0,
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, order: stories.length + 1 });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowHints(false);
  };

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: formData[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData({ ...formData, [key]: e.target.value }),
  });

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Stories &amp; <span className="text-red-600">Vídeos Curtos</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerencie os stories exibidos no carrossel da página de Notícias.
            Suporta YouTube Shorts, TikTok e Instagram Reels.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO STORY
        </button>
      </div>

      {/* Preview dos avatares (estado atual) */}
      {stories.length > 0 && (
        <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
            Prévia do Carrossel
          </p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {stories.map((s) => (
              <div key={s.id} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-red-700 to-red-400">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white bg-gray-200">
                    {s.imageUrl && (
                      <img
                        src={s.imageUrl}
                        alt={s.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>
                <span className="text-[9px] font-bold text-gray-500 w-16 text-center line-clamp-1 uppercase">
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest w-10">
                <GripVertical size={14} className="text-gray-300" />
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Story
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Plataforma / URL
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">
                Ordem
              </th>
              <th className="px-4 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <Smartphone size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-bold">
                    Nenhum story cadastrado ainda.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Clique em "Novo Story" para começar.
                  </p>
                </td>
              </tr>
            ) : (
              stories.map((item) => {
                const isYT = item.videoUrl?.includes('youtube') || item.videoUrl?.includes('youtu.be');
                const isTT = item.videoUrl?.includes('tiktok');
                const isIG = item.videoUrl?.includes('instagram');
                const platform = isYT ? 'YouTube' : isTT ? 'TikTok' : isIG ? 'Instagram' : 'Link';

                return (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-4 text-gray-300">
                      <GripVertical size={16} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-[2px] rounded-full bg-gradient-to-tr from-red-700 to-red-400 flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-gray-100">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 text-sm line-clamp-1">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          isYT ? 'bg-red-100 text-red-600'
                          : isTT ? 'bg-gray-900 text-white'
                          : isIG ? 'bg-pink-100 text-pink-600'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {platform}
                        </span>
                        <span className="text-xs text-gray-400 font-mono truncate max-w-[160px]">
                          {item.videoUrl}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-black text-gray-500">{item.order}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de criação / edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingId ? 'Editar' : 'Novo'}{' '}
                <span className="text-red-600">Story</span>
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Título */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Título do Vídeo{' '}
                    <span className="normal-case font-normal text-gray-400">
                      (controle interno)
                    </span>
                  </label>
                  <input
                    required
                    type="text"
                    {...field('title')}
                    placeholder="Ex: Cobertura Carnaval 2025"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900"
                  />
                </div>

                {/* Ordem */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Ordem de Exibição
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: Number(e.target.value) })
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Menor número aparece primeiro no carrossel.
                  </p>
                </div>

                {/* Plataforma badges (informativo) */}
                <div className="flex flex-col justify-center gap-2">
                  <label className="text-xs font-bold uppercase text-gray-400">
                    Plataformas Suportadas
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-1 rounded-full uppercase">YouTube Shorts</span>
                    <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-1 rounded-full uppercase">TikTok</span>
                    <span className="text-[10px] font-black bg-pink-100 text-pink-600 px-2 py-1 rounded-full uppercase">Instagram Reel</span>
                  </div>
                </div>

                {/* URL do vídeo */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase text-gray-400">
                      Link do Vídeo
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHints(!showHints)}
                      className="text-[10px] text-red-600 font-bold hover:underline"
                    >
                      {showHints ? 'Ocultar exemplos' : 'Ver exemplos de links'}
                    </button>
                  </div>

                  {showHints && (
                    <div className="mb-3 bg-gray-50 rounded-xl p-4 space-y-1.5 border border-gray-100">
                      {PLATFORM_HINTS.map((h) => (
                        <div key={h.label} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 uppercase w-28 flex-shrink-0">
                            {h.label}:
                          </span>
                          <code className="text-[10px] text-gray-400 font-mono break-all">
                            {h.example}
                          </code>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    required
                    type="url"
                    {...field('videoUrl')}
                    placeholder="https://youtube.com/shorts/... ou tiktok.com/... ou instagram.com/reel/..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900 font-mono text-sm"
                  />
                </div>

                {/* Thumbnail */}
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="Thumbnail (Miniatura do Story)"
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                    folder="stories"
                  />
                  <p className="text-[10px] text-gray-400 mt-2">
                    Será exibida como círculo no carrossel. Recomendado: imagem quadrada.
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  SALVAR STORY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
