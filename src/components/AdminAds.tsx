import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Edit2, X, ExternalLink, ChevronDown, ChevronRight, Power } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

// Metadados de cada tamanho de banner
const AD_SIZES = [
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    dims: '970 × 90 px',
    desc: 'Banner horizontal — topo das páginas',
    previewRatio: 'aspect-[970/90] min-h-[48px]',
  },
  {
    key: 'intermediario',
    label: 'Intermediário',
    dims: '728 × 90 px',
    desc: 'Banner intermediário — entre seções de conteúdo',
    previewRatio: 'aspect-[728/90] min-h-[48px]',
  },
  {
    key: 'sidebar',
    label: 'Sidebar',
    dims: '300 × 250 px',
    desc: 'Rectangle médio — lateral do conteúdo',
    previewRatio: 'aspect-[6/5]',
  },
  {
    key: 'mobile',
    label: 'Mobile',
    dims: '320 × 50 px',
    desc: 'Banner fixo — rodapé em dispositivos móveis',
    previewRatio: 'aspect-[320/50] min-h-[48px]',
  },
] as const;

type SizeKey = typeof AD_SIZES[number]['key'];

const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  tv: 'TV',
  noticias: 'Notícias',
  hub73: 'Canais ao Vivo',
  podcasts: 'Podcasts',
};

const EMPTY_FORM = { size: 'leaderboard' as SizeKey, imageUrl: '', link: '', active: true, page: 'home' };

export const AdminAds = () => {
  const [ads, setAds] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [openSections, setOpenSections] = useState<Set<SizeKey>>(
    new Set(['leaderboard', 'intermediario', 'sidebar', 'mobile'])
  );

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('size', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAds(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
      closeModal();
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
    setFormData({ size: ad.size, imageUrl: ad.imageUrl, link: ad.link, active: ad.active, page: ad.page || 'home' });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'ads', id), { active: !current });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ads');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
  };

  const toggleSection = (key: SizeKey) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const currentSizeInfo = AD_SIZES.find(s => s.key === formData.size);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Gerenciar <span className="text-red-600">Publicidade</span>
          </h1>
          <p className="text-gray-500 text-sm">Controle os banners e anúncios do portal.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
        >
          <Plus size={20} /> NOVO ANÚNCIO
        </button>
      </div>

      {/* Seções por tamanho */}
      <div className="space-y-4">
        {AD_SIZES.map(size => {
          const items = ads.filter(ad => ad.size === size.key);
          const isOpen = openSections.has(size.key);

          return (
            <div key={size.key} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Cabeçalho da seção */}
              <button
                type="button"
                onClick={() => toggleSection(size.key)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {isOpen
                    ? <ChevronDown size={18} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={18} className="text-gray-400 shrink-0" />
                  }
                  <div className="text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-gray-900 uppercase tracking-tight">{size.label}</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {size.dims}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{size.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-gray-400">
                    {items.length} {items.length === 1 ? 'anúncio' : 'anúncios'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    items.filter(a => a.active).length > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {items.filter(a => a.active).length} ativo{items.filter(a => a.active).length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>

              {/* Cards da seção */}
              {isOpen && (
                <div className="px-6 pb-6 border-t border-gray-50">
                  {items.length === 0 ? (
                    <div className="py-10 text-center text-gray-400">
                      <p className="text-sm">Nenhum anúncio cadastrado para este formato.</p>
                      <button
                        type="button"
                        onClick={() => { setFormData({ ...EMPTY_FORM, size: size.key }); setEditingId(null); setIsModalOpen(true); }}
                        className="mt-3 text-xs font-bold text-red-600 hover:underline"
                      >
                        + Criar anúncio {size.label}
                      </button>
                    </div>
                  ) : (
                    <div className={`mt-4 grid gap-4 ${
                      size.key === 'sidebar'
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        : 'grid-cols-1'
                    }`}>
                      {items.map(ad => (
                        <div
                          key={ad.id}
                          className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50 hover:border-gray-200 transition-colors"
                        >
                          {/* Preview com aspect ratio correto para o tamanho */}
                          <div className={`relative bg-gray-200 w-full overflow-hidden ${size.previewRatio}`}>
                            {ad.imageUrl ? (
                              <img
                                src={ad.imageUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs font-bold uppercase">
                                Sem imagem
                              </div>
                            )}
                            {/* Badges sobrepostos */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                            <div className="absolute top-3 left-3">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow ${
                                ad.active
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-700/80 text-gray-300'
                              }`}>
                                {ad.active ? '● Ativo' : '○ Inativo'}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(ad)}
                                className="p-1.5 bg-white/90 backdrop-blur-sm text-blue-600 rounded-lg shadow-sm hover:bg-white transition-colors"
                                title="Editar"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(ad.id)}
                                className="p-1.5 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg shadow-sm hover:bg-white transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Barra de informações */}
                          <div className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase shrink-0">
                                {PAGE_LABELS[ad.page] || 'Geral'}
                              </span>
                              {ad.link && (
                                <a
                                  href={ad.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-red-600 transition-colors shrink-0"
                                  title={ad.link}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                              <span className="text-xs text-gray-400 truncate hidden sm:block">{ad.link}</span>
                            </div>

                            {/* Toggle ativo/inativo inline */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(ad.id, ad.active)}
                              title={ad.active ? 'Desativar' : 'Ativar'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all shrink-0 ${
                                ad.active
                                  ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600'
                                  : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'
                              }`}
                            >
                              <Power size={12} />
                              {ad.active ? 'Ativo' : 'Inativo'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal criar/editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingId ? 'Editar' : 'Novo'} <span className="text-red-600">Anúncio</span>
              </h2>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-red-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              {/* Tamanho */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Tamanho do Banner</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value as SizeKey })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                >
                  {AD_SIZES.map(s => (
                    <option key={s.key} value={s.key}>
                      {s.label} — {s.dims}
                    </option>
                  ))}
                </select>
                {currentSizeInfo && (
                  <p className="mt-1.5 text-[11px] text-gray-400">{currentSizeInfo.desc}</p>
                )}
              </div>

              {/* Página */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Página de Exibição</label>
                <select
                  value={formData.page}
                  onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 bg-white"
                >
                  {Object.entries(PAGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Imagem */}
              <ImageUploadField
                label="Imagem do Banner"
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                folder="ads"
              />

              {/* Link */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Link de Destino</label>
                <input
                  required
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  type="url"
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Status ativo */}
              <div
                onClick={() => setFormData({ ...formData, active: !formData.active })}
                className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  formData.active
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div>
                  <p className={`font-bold text-sm ${formData.active ? 'text-green-700' : 'text-gray-500'}`}>
                    {formData.active ? '● Anúncio Ativo' : '○ Anúncio Inativo'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formData.active ? 'Será exibido nas páginas' : 'Não será exibido'}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${formData.active ? 'left-[22px]' : 'left-0.5'}`} />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
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
    </div>
  );
};
