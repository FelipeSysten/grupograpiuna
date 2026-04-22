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
import { Plus, Trash2, Edit2, X, ShoppingBag, Eye, EyeOff, Sparkles } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

/* ─── Tipos ────────────────────────────────────────────────────────────────── */
interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  featured: boolean;
  active: boolean;
}

const CATEGORIES = ['Gráfica', 'Digital', 'Vídeo', 'Camisas', 'Outros'];

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'Gráfica',
  imageUrl: '',
  featured: false,
  active: true,
};

/* ─── Badge de categoria ───────────────────────────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  Gráfica: 'bg-blue-100 text-blue-700',
  Digital: 'bg-purple-100 text-purple-700',
  Vídeo: 'bg-red-100 text-red-600',
  Camisas: 'bg-yellow-100 text-yellow-700',
  Outros: 'bg-gray-100 text-gray-600',
};

/* ─── Componente ───────────────────────────────────────────────────────────── */
export const AdminShop = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState('Todos');

  /* ── Firestore ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(collection(db, 'shop_products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopProduct)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'shop_products'),
    );
    return () => unsub();
  }, []);

  /* ── Salvar ────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'shop_products';
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
    if (window.confirm('Excluir este produto da loja?')) {
      try {
        await deleteDoc(doc(db, 'shop_products', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'shop_products');
      }
    }
  };

  /* ── Toggle active ─────────────────────────────────────────────────────── */
  const toggleActive = async (item: ShopProduct) => {
    try {
      await updateDoc(doc(db, 'shop_products', item.id), {
        active: !item.active,
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'shop_products');
    }
  };

  /* ── Editar ────────────────────────────────────────────────────────────── */
  const handleEdit = (item: ShopProduct) => {
    setEditingId(item.id);
    setFormData({
      name: item.name ?? '',
      description: item.description ?? '',
      price: item.price ?? '',
      category: item.category ?? 'Gráfica',
      imageUrl: item.imageUrl ?? '',
      featured: item.featured ?? false,
      active: item.active ?? true,
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

  const setField = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  /* ── Filtro local ──────────────────────────────────────────────────────── */
  const visible =
    filterCat === 'Todos' ? products : products.filter((p) => p.category === filterCat);

  /* ── Stats rápidos ─────────────────────────────────────────────────────── */
  const activeCount = products.filter((p) => p.active).length;
  const featuredCount = products.filter((p) => p.featured).length;

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Loja <span className="text-red-600">Gráfica</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerencie produtos e serviços exibidos na página da loja.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex-shrink-0"
        >
          <Plus size={20} /> NOVO PRODUTO
        </button>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total de Produtos', value: products.length, color: 'text-gray-900' },
          { label: 'Ativos na Loja', value: activeCount, color: 'text-green-600' },
          { label: 'Em Destaque', value: featuredCount, color: 'text-red-600' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5"
          >
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros por categoria */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['Todos', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${
              filterCat === cat
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Produto
              </th>
              <th className="px-5 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Categoria
              </th>
              <th className="px-5 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest">
                Preço
              </th>
              <th className="px-5 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-center">
                Status
              </th>
              <th className="px-5 py-4 text-xs font-bold uppercase text-gray-400 tracking-widest text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <ShoppingBag size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm font-bold">
                    Nenhum produto encontrado.
                  </p>
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50/60 transition-colors ${!item.active ? 'opacity-50' : ''}`}
                >
                  {/* Produto */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-14 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={16} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-sm line-clamp-1">
                            {item.name}
                          </span>
                          {item.featured && (
                            <Sparkles size={12} className="text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Categoria */}
                  <td className="px-5 py-4">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                        CAT_COLORS[item.category] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>

                  {/* Preço */}
                  <td className="px-5 py-4">
                    <span className="font-black text-gray-900 text-sm">{item.price}</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => toggleActive(item)}
                      title={item.active ? 'Desativar' : 'Ativar'}
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                        item.active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {item.active ? <Eye size={10} /> : <EyeOff size={10} />}
                      {item.active ? 'Ativo' : 'Oculto'}
                    </button>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-4 text-right">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingId ? 'Editar' : 'Novo'}{' '}
                <span className="text-red-600">Produto</span>
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

                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Nome do Produto / Serviço
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setField('name', e.target.value)}
                    placeholder="Ex: Banner Lona 2x1m, Logo Profissional..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Categoria
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setField('category', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preço */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Preço
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="Ex: R$ 99,90 · A partir de R$ 150 · Sob consulta"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900"
                  />
                </div>

                {/* Thumbnail */}
                <div className="md:col-span-2">
                  <ImageUploadField
                    label="Imagem / Thumbnail do Produto"
                    value={formData.imageUrl}
                    onChange={(url) => setField('imageUrl', url)}
                    folder="shop"
                  />
                </div>

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-2">
                    Descrição Detalhada
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Descreva o produto, especificações, prazo de entrega..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-red-600 text-gray-900 resize-none"
                  />
                </div>

                {/* Toggles */}
                <div className="md:col-span-2 flex flex-col sm:flex-row gap-4">
                  {/* Ativo */}
                  <label className="flex items-center gap-3 cursor-pointer select-none group flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 hover:border-red-200 transition-colors">
                    <div
                      onClick={() => setField('active', !formData.active)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        formData.active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          formData.active ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Ativo na Loja</p>
                      <p className="text-[10px] text-gray-400">
                        {formData.active ? 'Visível para visitantes' : 'Oculto da loja'}
                      </p>
                    </div>
                  </label>

                  {/* Destaque */}
                  <label className="flex items-center gap-3 cursor-pointer select-none group flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 hover:border-red-200 transition-colors">
                    <div
                      onClick={() => setField('featured', !formData.featured)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${
                        formData.featured ? 'bg-red-600' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          formData.featured ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 flex items-center gap-1">
                        <Sparkles size={12} className="text-red-500" /> Produto em Destaque
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Aparece na seção de destaque no topo da loja
                      </p>
                    </div>
                  </label>
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
                  SALVAR PRODUTO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
