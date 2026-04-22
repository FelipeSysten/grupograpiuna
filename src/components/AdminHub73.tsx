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
import { Plus, Trash2, Edit2, X, Video } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface HubVideo {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  category: string;
}

const EMPTY_FORM = {
  title: '',
  description: '',
  imageUrl: '',
  videoUrl: '',
  category: '',
};

export const AdminHub73 = () => {
  const [videos, setVideos] = useState<HubVideo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  /* ── Firestore ─────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'hub73'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setVideos(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HubVideo)),
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'hub73');
      },
    );
    return () => unsubscribe();
  }, []);

  /* ── Salvar (criar ou editar) ──────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'hub73';
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), {
          ...formData,
          updatedAt: Timestamp.now(),
        });
      } else {
        await addDoc(collection(db, path), {
          ...formData,
          createdAt: Timestamp.now(),
        });
      }
      closeModal();
    } catch (error) {
      handleFirestoreError(
        error,
        editingId ? OperationType.UPDATE : OperationType.CREATE,
        path,
      );
    }
  };

  /* ── Excluir ───────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este vídeo do Hub73?')) {
      try {
        await deleteDoc(doc(db, 'hub73', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'hub73');
      }
    }
  };

  /* ── Abrir modal de edição ─────────────────────────────────────── */
  const handleEdit = (item: HubVideo) => {
    setEditingId(item.id);
    setFormData({
      title: item.title ?? '',
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      videoUrl: item.videoUrl ?? '',
      category: item.category ?? '',
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: formData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData({ ...formData, [key]: e.target.value }),
  });

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Gerenciar <span className="text-red-600">Hub73</span>
          </h1>
          <p className="text-gray-500 text-sm">
            Adicione ou edite vídeos exibidos no Video Hub.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO VÍDEO
        </button>
      </div>

      {/* Tabela de listagem */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Vídeo
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Categoria
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                URL
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {videos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                  Nenhum vídeo cadastrado ainda.
                </td>
              </tr>
            ) : (
              videos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Thumbnail + título */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-20 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-20 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Video size={20} className="text-gray-400" />
                        </div>
                      )}
                      <span className="font-bold text-gray-900 line-clamp-2 text-sm leading-snug">
                        {item.title}
                      </span>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">
                      {item.category || '—'}
                    </span>
                  </td>

                  {/* URL (truncada) */}
                  <td className="px-6 py-4 max-w-[200px]">
                    <span className="text-xs text-gray-400 font-mono truncate block max-w-[180px]">
                      {item.videoUrl || '—'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de criação / edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingId ? 'Editar' : 'Novo'}{' '}
                <span className="text-red-600">Vídeo</span>
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Título do vídeo */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Título do Vídeo
                  </label>
                  <input
                    required
                    type="text"
                    {...field('title')}
                    placeholder="Ex: Cobertura Evento XYZ"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Categoria
                  </label>
                  <input
                    required
                    type="text"
                    {...field('category')}
                    placeholder="Ex: Comercial, Evento, Institucional"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900"
                  />
                </div>

                {/* URL do vídeo */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    URL do Vídeo{' '}
                    <span className="normal-case font-normal text-gray-400">
                      (YouTube ou .m3u8)
                    </span>
                  </label>
                  <input
                    required
                    type="url"
                    {...field('videoUrl')}
                    placeholder="https://youtube.com/watch?v=... ou https://.../stream.m3u8"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900 font-mono text-sm"
                  />
                </div>

                {/* Thumbnail */}
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="Thumbnail (Miniatura)"
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                    folder="hub73"
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Descrição
                  </label>
                  <textarea
                    rows={3}
                    {...field('description')}
                    placeholder="Breve descrição do vídeo exibida abaixo do player."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900 resize-none"
                  />
                </div>
              </div>

              {/* Ações do formulário */}
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
                  SALVAR VÍDEO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
