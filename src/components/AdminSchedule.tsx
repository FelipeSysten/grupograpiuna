import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, Youtube, Image as ImageIcon, FileSpreadsheet, Upload, Clock, AlertTriangle } from 'lucide-react';
import { ScheduleItem } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import {
  WEEK_DAYS,
  DAY_SHORT,
  computeDaySchedule,
  gradeStatus,
  parseDurationToSeconds,
  formatDuration,
  rowsToScheduleItems,
  parseCSV,
  type ComputedItem,
  type GradeStatus,
} from '../lib/schedule';

const TODAY_NAME = WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

const EMPTY_FORM = {
  dayOfWeek: 'Segunda-feira',
  order: '',
  title: '',
  category: '',
  host: '',
  description: '',
  duration: '', // HH:MM:SS ou minutos
  youtubeUrl: '',
  thumbnailUrl: '',
  status: 'ativo',
};

/* ─── Selo de fechamento de grade (24h) ─────────────────────────────────── */
const GradeBadge = ({ status }: { status: GradeStatus }) => {
  const styles: Record<string, string> = {
    closed: 'bg-green-100 text-green-700',
    under: 'bg-amber-100 text-amber-700',
    over: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${styles[status.state]}`}>
      {status.label}
    </span>
  );
};

export const AdminSchedule = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // Sincronização por planilha
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetGid, setSheetGid] = useState('0');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [preview, setPreview] = useState<Partial<ScheduleItem>[] | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'tv_schedule'),
      (snapshot) => setSchedule(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduleItem))),
      (error) => handleFirestoreError(error, OperationType.GET, 'tv_schedule'),
    );
    return () => unsubscribe();
  }, []);

  // Programas calculados (início/fim) e status 24h por dia
  const computedByDay: Record<string, ComputedItem[]> = {};
  const statusByDay: Record<string, GradeStatus> = {};
  for (const day of WEEK_DAYS) {
    const items = schedule.filter((s) => s.dayOfWeek === day);
    computedByDay[day] = computeDaySchedule(items);
    statusByDay[day] = gradeStatus(items);
  }

  /* ── Recalcula ordem + início/fim de dias inteiros e persiste ─────────── */
  const recomputeDays = async (allItems: ScheduleItem[], days: string[]) => {
    const batch = writeBatch(db);
    let hasOps = false;
    for (const day of days) {
      computeDaySchedule(allItems.filter((s) => s.dayOfWeek === day)).forEach((c, idx) => {
        batch.update(doc(db, 'tv_schedule', c.id), { order: idx, startTime: c.startLabel, endTime: c.endLabel });
        hasOps = true;
      });
    }
    if (hasOps) await batch.commit();
  };

  /* ── CRUD ──────────────────────────────────────────────────────────────── */
  const openCreate = (day?: string) => {
    setEditingId(null);
    const targetDay = day ?? 'Segunda-feira';
    const nextOrder = schedule.filter((s) => s.dayOfWeek === targetDay).length;
    setFormData({ ...EMPTY_FORM, dayOfWeek: targetDay, order: String(nextOrder) });
    setIsModalOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormData({
      dayOfWeek: item.dayOfWeek,
      order: item.order != null ? String(item.order) : '',
      title: item.title,
      category: item.category ?? '',
      host: item.host ?? '',
      description: item.description ?? '',
      duration: item.durationSeconds ? formatDuration(item.durationSeconds) : '',
      youtubeUrl: item.youtubeUrl ?? '',
      thumbnailUrl: item.thumbnailUrl ?? '',
      status: item.status ?? 'ativo',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = formData.dayOfWeek;
    const data = {
      dayOfWeek: day,
      title: formData.title.trim(),
      order: formData.order === '' ? null : Number(formData.order),
      category: formData.category.trim(),
      description: formData.description.trim(),
      durationSeconds: parseDurationToSeconds(formData.duration),
      youtubeUrl: formData.youtubeUrl.trim(),
      thumbnailUrl: formData.thumbnailUrl.trim(),
      status: formData.status || 'ativo',
      host: formData.host.trim(),
    };
    try {
      let itemId = editingId;
      const originalDay = editingId ? schedule.find((s) => s.id === editingId)?.dayOfWeek : undefined;
      if (editingId) {
        await updateDoc(doc(db, 'tv_schedule', editingId), data);
      } else {
        const ref = await addDoc(collection(db, 'tv_schedule'), data);
        itemId = ref.id;
      }
      // recomputa horários/ordem dos dias afetados (inclui o item recém-salvo)
      const updated: ScheduleItem[] = [
        ...schedule.filter((s) => s.id !== itemId),
        { id: itemId as string, ...data } as ScheduleItem,
      ];
      const affected = new Set<string>([day]);
      if (originalDay && originalDay !== day) affected.add(originalDay);
      await recomputeDays(updated, [...affected]);
      closeModal();
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'tv_schedule');
    }
  };

  const handleDelete = async (item: ScheduleItem) => {
    if (!window.confirm('Excluir este programa?')) return;
    try {
      await deleteDoc(doc(db, 'tv_schedule', item.id));
      // recomputa o dia para reordenar/recalcular horários
      await recomputeDays(schedule.filter((s) => s.id !== item.id), [item.dayOfWeek]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tv_schedule');
    }
  };

  /* ── Sincronização por planilha ───────────────────────────────────────── */
  const loadFromSheet = async () => {
    if (!sheetUrl.trim()) return;
    setSyncLoading(true);
    setSyncError('');
    setPreview(null);
    try {
      const res = await fetch(
        `/api/schedule/sheet?id=${encodeURIComponent(sheetUrl.trim())}&gid=${encodeURIComponent(sheetGid.trim() || '0')}`,
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setSyncError(data.error || 'Falha ao buscar a planilha.');
        return;
      }
      const items = rowsToScheduleItems(parseCSV(data.csv));
      if (items.length === 0) {
        setSyncError('Nenhuma linha válida. Confira o cabeçalho: Dia, Título, Duração, etc.');
        return;
      }
      setPreview(items);
    } catch {
      setSyncError('Erro de rede ao buscar a planilha.');
    } finally {
      setSyncLoading(false);
    }
  };

  const loadFromFile = async (file: File) => {
    setSyncError('');
    setPreview(null);
    try {
      const text = await file.text();
      const items = rowsToScheduleItems(parseCSV(text));
      if (items.length === 0) {
        setSyncError('Nenhuma linha válida no CSV. Confira o cabeçalho.');
        return;
      }
      setPreview(items);
    } catch {
      setSyncError('Não foi possível ler o arquivo CSV.');
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    const days = [...new Set(preview.map((i) => i.dayOfWeek))];
    if (!window.confirm(`Isso vai SUBSTITUIR todos os programas dos dias: ${days.join(', ')}. Continuar?`)) return;
    setSyncLoading(true);
    try {
      const batch = writeBatch(db);
      const daySet = new Set(days);
      // 1) apaga os programas existentes dos dias presentes na planilha
      schedule.filter((s) => daySet.has(s.dayOfWeek)).forEach((s) => batch.delete(doc(db, 'tv_schedule', s.id)));
      // 2) recomputa e insere os novos
      for (const day of days) {
        const dayItems = preview
          .filter((i) => i.dayOfWeek === day)
          .map((it, i) => ({ id: `tmp-${i}`, ...it } as ScheduleItem));
        computeDaySchedule(dayItems).forEach((c, idx) => {
          const ref = doc(collection(db, 'tv_schedule'));
          batch.set(ref, {
            dayOfWeek: c.dayOfWeek,
            title: c.title,
            order: idx,
            category: c.category ?? '',
            description: c.description ?? '',
            durationSeconds: c.durationSeconds ?? 0,
            youtubeUrl: c.youtubeUrl ?? '',
            thumbnailUrl: c.thumbnailUrl ?? '',
            status: c.status ?? 'ativo',
            host: c.host ?? '',
            startTime: c.startLabel,
            endTime: c.endLabel,
          });
        });
      }
      await batch.commit();
      setIsSyncOpen(false);
      setPreview(null);
      setSheetUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tv_schedule');
    } finally {
      setSyncLoading(false);
    }
  };

  const totalPrograms = schedule.length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Grade de <span className="text-red-600">Programação</span>
          </h1>
          <p className="text-gray-500 text-sm">
            {totalPrograms} programa{totalPrograms !== 1 ? 's' : ''} na semana. Horários calculados a partir das durações.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setIsSyncOpen(true); setSyncError(''); setPreview(null); }}
            className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
          >
            <FileSpreadsheet size={18} /> SINCRONIZAR PLANILHA
          </button>
          <button
            onClick={() => openCreate()}
            className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
          >
            <Plus size={20} /> NOVO
          </button>
        </div>
      </div>

      {/* Grade semanal */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-7 gap-3 min-w-[1000px]">
          {WEEK_DAYS.map((day) => {
            const isToday = day === TODAY_NAME;
            const items = computedByDay[day];
            const status = statusByDay[day];
            return (
              <div key={day} className="flex flex-col gap-2">
                {/* Cabeçalho do dia: sigla + contagem + status 24h */}
                <div className={`px-3 py-2 rounded-xl ${isToday ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest">{DAY_SHORT[day]}</span>
                    <button
                      onClick={() => openCreate(day)}
                      title={`Novo programa — ${day}`}
                      className={`rounded-full w-5 h-5 flex items-center justify-center transition-colors ${
                        isToday ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className={`text-[9px] font-bold ${isToday ? 'text-white/80' : 'text-gray-400'}`}>
                      {items.length} prog.
                    </span>
                    <GradeBadge status={status} />
                  </div>
                </div>

                {/* Programas do dia */}
                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">Sem programas</p>
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="group bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-mono">
                            {item.durationSeconds
                              ? `${item.startLabel.slice(0, 5)}–${item.endLabel.slice(0, 5)}`
                              : (item.time || item.startLabel.slice(0, 5))}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {item.thumbnailUrl && <ImageIcon size={11} className="text-gray-300" />}
                            {item.youtubeUrl && <Youtube size={12} className="text-red-400" />}
                          </div>
                        </div>

                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2 mb-1">{item.title}</p>
                        {item.category && (
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider truncate mb-0.5">{item.category}</p>
                        )}
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-2">
                          <Clock size={9} /> {formatDuration(item.durationSeconds ?? 0)}
                        </p>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(item)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Edit2 size={11} /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
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
              <button onClick={closeModal} className="text-gray-400 hover:text-red-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Dia da Semana</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                  >
                    {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Ordem</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Título do Programa</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Categoria</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Duração (HH:MM:SS)</label>
                  <input
                    required
                    placeholder="01:30:00"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Apresentador (opcional)</label>
                <input
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Descrição (opcional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link do Vídeo (opcional)</label>
                <input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  type="url"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Thumbnail (opcional)</label>
                <input
                  placeholder="https://..."
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  type="url"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
                  CANCELAR
                </button>
                <button type="submit" className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100">
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sincronizar planilha */}
      {isSyncOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-red-600" /> Sincronizar Planilha
              </h2>
              <button onClick={() => setIsSyncOpen(false)} className="text-gray-400 hover:text-red-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1">
              <p className="text-xs text-gray-500 leading-relaxed">
                Colunas reconhecidas: <strong>Dia, Ordem, Título, Categoria, Descrição, Duração, Link do vídeo, Thumbnail, Status</strong>.
                A duração aceita <code>HH:MM:SS</code> ou minutos. Os horários são calculados automaticamente.
              </p>

              {/* Google Sheets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-gray-400">Google Sheets (link ou ID)</label>
                <input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-600"
                />
                <div className="flex gap-2">
                  <input
                    value={sheetGid}
                    onChange={(e) => setSheetGid(e.target.value)}
                    placeholder="gid (aba) — padrão 0"
                    className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                  />
                  <button
                    onClick={loadFromSheet}
                    disabled={syncLoading || !sheetUrl.trim()}
                    className="flex-1 bg-gray-900 text-white font-bold py-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {syncLoading ? 'Buscando...' : 'Buscar planilha'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">A planilha precisa estar como "qualquer pessoa com o link pode ver".</p>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                <div className="flex-1 h-px bg-gray-100" /> ou <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* CSV */}
              <div>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-4 cursor-pointer hover:border-red-300 transition-colors text-sm font-bold text-gray-500">
                  <Upload size={18} /> Enviar arquivo CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFromFile(f); e.target.value = ''; }}
                  />
                </label>
              </div>

              {syncError && (
                <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-xl">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {syncError}
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                    Pré-visualização ({preview.length} programas)
                  </p>
                  <div className="space-y-1.5">
                    {[...new Set(preview.map((i) => i.dayOfWeek))].map((day) => {
                      const dayItems = preview.filter((i) => i.dayOfWeek === day) as ScheduleItem[];
                      const status = gradeStatus(dayItems);
                      return (
                        <div key={day} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-700">{day} — {dayItems.length} prog.</span>
                          <GradeBadge status={status} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 text-amber-700 text-[11px] p-2.5 rounded-lg mt-3">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    A importação substitui todos os programas dos dias acima.
                  </div>
                  <button
                    onClick={confirmImport}
                    disabled={syncLoading}
                    className="w-full mt-3 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {syncLoading ? 'Importando...' : 'Importar para a grade'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
