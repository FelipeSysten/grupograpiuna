import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Clock } from 'lucide-react';
import { ScheduleItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const AdminSchedule = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    time: '',
    title: '',
    host: '',
    dayOfWeek: 'Segunda-feira',
    youtubeUrl: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'tv_schedule'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tv_schedule');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'tv_schedule';
    try {
      if (editingId) {
        await updateDoc(doc(db, path, editingId), formData);
      } else {
        await addDoc(collection(db, path), formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ time: '', title: '', host: '', dayOfWeek: 'Segunda-feira', youtubeUrl: '' });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Excluir este programa?')) {
      try {
        await deleteDoc(doc(db, 'tv_schedule', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'tv_schedule');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Grade de <span className="text-red-600">Programação</span></h1>
          <p className="text-gray-500 text-sm">Gerencie os horários da TV Grapiúna.</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO PROGRAMA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schedule.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-xs">
                {item.time}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Com {item.host}</p>
                {item.youtubeUrl && <p className="text-[10px] text-red-500 truncate max-w-[200px] mt-1">{item.youtubeUrl}</p>}
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                onClick={() => {
                  setEditingId(item.id);
                  setFormData({ 
                    time: item.time, 
                    title: item.title, 
                    host: item.host, 
                    dayOfWeek: item.dayOfWeek,
                    youtubeUrl: item.youtubeUrl || ''
                  });
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
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black uppercase tracking-tighter">{editingId ? 'Editar' : 'Novo'} <span className="text-red-600">Programa</span></h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Horário</label>
                <input 
                  required
                  placeholder="Ex: 08:00"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Título do Programa</label>
                <input 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Apresentador</label>
                <input 
                  required
                  value={formData.host}
                  onChange={(e) => setFormData({...formData, host: e.target.value})}
                  type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link do YouTube (Opcional)</label>
                <input 
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                  type="url" className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600" 
                />
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
