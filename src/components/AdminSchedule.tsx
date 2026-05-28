import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Youtube } from 'lucide-react';
import { ScheduleItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const DAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const DAY_SHORT: Record<string, string> = {
  'Segunda-feira': 'SEG',
  'Terça-feira':   'TER',
  'Quarta-feira':  'QUA',
  'Quinta-feira':  'QUI',
  'Sexta-feira':   'SEX',
  'Sábado':        'SÁB',
  'Domingo':       'DOM',
};

const TODAY_NAME = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

const EMPTY_FORM = {
  time: '',
  title: '',
  host: '',
  dayOfWeek: 'Segunda-feira',
  youtubeUrl: '',
};

export const AdminSchedule = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    const q = query(collection(db, 'tv_schedule'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleItem));
      const sorted = [...raw].sort(
        (a, b) =>
          DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) ||
          a.time.localeCompare(b.time),
      );
      setSchedule(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'tv_schedule');
    });
    return () => unsubscribe();
  }, []);

  const grouped: Record<string, ScheduleItem[]> = DAYS.reduce(
    (acc, day) => ({ ...acc, [day]: schedule.filter(s => s.dayOfWeek === day) }),
    {} as Record<string, ScheduleItem[]>,
  );

  const openCreate = (day?: string) => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, dayOfWeek: day ?? 'Segunda-feira' });
    setIsModalOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormData({
      time: item.time,
      title: item.title,
      host: item.host,
      dayOfWeek: item.dayOfWeek,
      youtubeUrl: item.youtubeUrl || '',
    });
    setIsModalOpen(true);
  };

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
      setFormData({ ...EMPTY_FORM });
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

  const totalPrograms = schedule.length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Grade de <span className="text-red-600">Programação</span>
          </h1>
          <p className="text-gray-500 text-sm">
            {totalPrograms} programa{totalPrograms !== 1 ? 's' : ''} cadastrado{totalPrograms !== 1 ? 's' : ''} na semana.
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO PROGRAMA
        </button>
      </div>

      {/* Grade semanal — scroll horizontal em telas pequenas */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-7 gap-3 min-w-[900px]">
          {DAYS.map((day) => {
            const isToday = day === TODAY_NAME;
            const items = grouped[day];
            return (
              <div key={day} className="flex flex-col gap-2">
                {/* Cabeçalho do dia */}
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                    isToday
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {DAY_SHORT[day]}
                  </span>
                  <button
                    onClick={() => openCreate(day)}
                    title={`Novo programa — ${day}`}
                    className={`rounded-full w-5 h-5 flex items-center justify-center transition-colors ${
                      isToday
                        ? 'bg-white/20 hover:bg-white/40 text-white'
                        : 'bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Lista de programas do dia */}
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                        Sem programas
                      </p>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="group bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        {/* Horário */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-mono">
                            {item.time}
                          </span>
                          {item.youtubeUrl && (
                            <Youtube size={12} className="text-red-400 shrink-0" />
                          )}
                        </div>

                        {/* Título */}
                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 mb-1">
                          {item.title}
                        </p>

                        {/* Apresentador */}
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate mb-2">
                          {item.host}
                        </p>

                        {/* Ações (visíveis no hover) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(item)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={11} /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 size={11} /> Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal criar/editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingId ? 'Editar' : 'Novo'} <span className="text-red-600">Programa</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
              {/* Dia da semana */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Dia da Semana</label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Horário</label>
                <input
                  required
                  placeholder="Ex: 08:00"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  type="time"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Título do Programa</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Apresentador */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Apresentador</label>
                <input
                  required
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* YouTube */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link do YouTube (Opcional)</label>
                <input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  type="url"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex gap-4 pt-2">
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
