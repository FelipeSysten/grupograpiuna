import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Check, Search } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const AdminHub73 = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    link: '',
    category: 'Design'
  });

  useEffect(() => {
    const q = query(collection(db, 'hub73'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hub73');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'hub73';
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), {
          ...formData,
          updatedAt: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, path), {
          ...formData,
          createdAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ title: '', description: '', imageUrl: '', link: '', category: 'Design' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este projeto do portfólio?')) {
      try {
        await deleteDoc(doc(db, 'hub73', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'hub73');
      }
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      link: item.link || '',
      category: item.category || 'Design'
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Gerenciar <span className="text-red-600">Hub73</span></h1>
          <p className="text-gray-500 text-sm">Adicione ou edite projetos no portfólio do Hub73.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO PROJETO
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Projeto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <span className="font-bold text-gray-900 line-clamp-1">{item.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">{item.category}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter">{editingId ? 'Editar' : 'Novo'} <span className="text-red-600">Projeto</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Título do Projeto</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Categoria</label>
                  <input 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                    placeholder="Ex: Design, Web, Marketing"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link do Projeto (Opcional)</label>
                  <input 
                    value={formData.link}
                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                    type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">URL da Imagem</label>
                  <input 
                    required
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Descrição</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                  ></textarea>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">CANCELAR</button>
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100">SALVAR PROJETO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
