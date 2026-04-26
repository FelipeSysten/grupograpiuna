import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Radio, Link } from 'lucide-react';
import { TVChannel } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const COLLECTION = 'tv_channels';

export const AdminLiveChannels = () => {
  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '' });

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setChannels(snap.docs.map(d => ({ id: d.id, ...d.data() } as TVChannel)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, COLLECTION));
    return () => unsub();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', url: '' });
    setIsModalOpen(true);
  };

  const openEdit = (ch: TVChannel) => {
    setEditingId(ch.id!);
    setFormData({ name: ch.name, url: ch.url });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTION, editingId), formData);
      } else {
        await addDoc(collection(db, COLLECTION), formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, COLLECTION);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este canal?')) return;
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, COLLECTION);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Canais <span className="text-red-600">Ao Vivo</span>
          </h1>
          <p className="text-gray-500 text-sm">Gerencie os canais de streaming disponíveis na TV.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO CANAL
        </button>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Radio size={40} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold">Nenhum canal cadastrado.</p>
          <p className="text-sm">Clique em "Novo Canal" para adicionar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Radio size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{ch.name}</h3>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate mt-0.5">
                    <Link size={10} /> {ch.url}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                <button
                  onClick={() => openEdit(ch)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={17} />
                </button>
                <button
                  onClick={() => handleDelete(ch.id!)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingId ? 'Editar' : 'Novo'} <span className="text-red-600">Canal</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Nome do Canal</label>
                <input
                  required
                  placeholder="Ex: BAND BAHIA"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">URL do Stream (HLS)</label>
                <input
                  required
                  placeholder="Ex: https://exemplo.com/stream.m3u8"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 font-mono text-sm"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                >
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
