import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, ExternalLink } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const AdminAds = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    size: 'leaderboard',
    imageUrl: '',
    link: '',
    active: true,
    page: 'home'
  });

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('size', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'ads';
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), formData);
      } else {
        await addDoc(collection(db, path), formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ size: 'leaderboard', imageUrl: '', link: '', active: true, page: 'home' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este anúncio?')) {
      try {
        await deleteDoc(doc(db, 'ads', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'ads');
      }
    }
  };

  const handleEdit = (ad: any) => {
    setEditingId(ad.id);
    setFormData({
      size: ad.size,
      imageUrl: ad.imageUrl,
      link: ad.link,
      active: ad.active,
      page: ad.page || 'home'
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Gerenciar <span className="text-red-600">Publicidade</span></h1>
          <p className="text-gray-500 text-sm">Controle os banners e anúncios do portal.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO ANÚNCIO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map((ad) => (
          <div key={ad.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="relative aspect-video bg-gray-100">
              <img src={ad.imageUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => handleEdit(ad)} className="p-2 bg-white/90 backdrop-blur-sm text-blue-600 rounded-xl shadow-sm hover:bg-white transition-colors"><Edit2 size={18} /></button>
                <button onClick={() => handleDelete(ad.id)} className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-xl shadow-sm hover:bg-white transition-colors"><Trash2 size={18} /></button>
              </div>
              <div className="absolute bottom-4 left-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${ad.active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {ad.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest mb-1">{ad.size}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Página: <span className="text-red-600">{ad.page || 'Geral'}</span></p>
                </div>
                <a href={ad.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-600 transition-colors"><ExternalLink size={18} /></a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter">{editingId ? 'Editar' : 'Novo'} <span className="text-red-600">Anúncio</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Tamanho do Banner</label>
                <select 
                  value={formData.size}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                >
                  <option value="leaderboard">Leaderboard (970x90)</option>
                  <option value="sidebar">Sidebar (300x250)</option>
                  <option value="mobile">Mobile (320x50)</option>
                  <option value="cover">Capa YouTube (Largo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Página de Exibição</label>
                <select 
                  value={formData.page}
                  onChange={(e) => setFormData({...formData, page: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                >
                  <option value="home">Home</option>
                  <option value="tv">TV Grapiúna</option>
                  <option value="noticias">Notícias</option>
                  <option value="hub73">Hub73</option>
                  <option value="podcasts">Podcasts</option>
                </select>
              </div>
              <ImageUploadField 
                label="Imagem do Banner"
                value={formData.imageUrl}
                onChange={(url) => setFormData({...formData, imageUrl: url})}
                folder="ads"
              />
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link de Destino</label>
                <input 
                  required
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                />
                <label htmlFor="active" className="text-sm font-bold text-gray-700 uppercase">Anúncio Ativo</label>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">CANCELAR</button>
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100">SALVAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
