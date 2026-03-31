import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, ExternalLink } from 'lucide-react';

export const AdminAds = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    size: 'leaderboard',
    imageUrl: '',
    link: '',
    active: true
  });

  useEffect(() => {
    const q = query(collection(db, 'ads'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, 'ads', editingId), formData);
      } else {
        await addDoc(collection(db, 'ads'), formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ size: 'leaderboard', imageUrl: '', link: '', active: true });
    } catch (error) {
      console.error("Error saving ad:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este anúncio?')) {
      await deleteDoc(doc(db, 'ads', id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Gerenciar <span className="text-red-600">Publicidade</span></h1>
          <p className="text-gray-500 text-sm">Controle os banners de anúncios do portal.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO ANÚNCIO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {ads.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="aspect-video bg-gray-100 relative">
              <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                {item.size}
              </div>
              <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${item.active ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white`}></div>
            </div>
            <div className="p-6 flex justify-between items-center">
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Link de Destino</p>
                <a href={item.link} target="_blank" rel="noreferrer" className="text-sm font-bold text-red-600 flex items-center gap-1 truncate hover:underline">
                  {item.link} <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingId(item.id);
                    setFormData({ size: item.size, imageUrl: item.imageUrl, link: item.link, active: item.active });
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
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
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Tamanho</label>
                <select 
                  value={formData.size}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                >
                  <option value="leaderboard">Leaderboard (970x90)</option>
                  <option value="sidebar">Sidebar (300x250)</option>
                  <option value="mobile">Mobile (320x50)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">URL da Imagem</label>
                <input 
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link de Destino</label>
                <input 
                  required
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                  type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="w-5 h-5 accent-red-600"
                />
                <label htmlFor="active" className="text-sm font-bold text-gray-700">Anúncio Ativo</label>
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
