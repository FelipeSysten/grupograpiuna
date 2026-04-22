import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, ShoppingBag, Tag, Sparkles, ArrowDown } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

/* ─── Config ───────────────────────────────────────────────────────────────── */
// Substitua pelo número com DDI + DDD sem espaços ou símbolos
const WHATSAPP = '557399999999';

/* ─── Tipos ────────────────────────────────────────────────────────────────── */
interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  featured?: boolean;
  active: boolean;
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const CATEGORIES = ['Todos', 'Gráfica', 'Digital', 'Vídeo', 'Camisas', 'Outros'];

const CATEGORY_ICON: Record<string, string> = {
  Gráfica: '🖨️',
  Digital: '💻',
  Vídeo: '🎬',
  Camisas: '👕',
  Outros: '📦',
};

const whatsappUrl = (product: ShopProduct) => {
  const text = encodeURIComponent(
    `Olá! Tenho interesse no produto/serviço *${product.name}* (${product.price}). Poderia me enviar mais informações e um orçamento?`,
  );
  return `https://wa.me/${WHATSAPP}?text=${text}`;
};

/* ─── Card de produto ──────────────────────────────────────────────────────── */
const ProductCard = ({ product, index }: { product: ShopProduct; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay: index * 0.06, ease: 'easeOut' }}
    className="group relative flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
  >
    {/* Thumbnail */}
    <div className="relative aspect-[4/3] overflow-hidden bg-gray-800">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ShoppingBag size={40} className="text-gray-700" />
        </div>
      )}

      {/* Badge de destaque */}
      {product.featured && (
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
          <Sparkles size={9} /> Destaque
        </div>
      )}

      {/* Overlay de hover com preço + CTA */}
      <div className="absolute inset-0 bg-black/82 flex flex-col items-center justify-center gap-4 px-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="text-center">
          <p className="text-white font-black text-2xl leading-none mb-1">
            {product.price}
          </p>
          <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">
            {product.description}
          </p>
        </div>
        <a
          href={whatsappUrl(product)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-colors shadow-lg shadow-green-900/40"
        >
          <MessageCircle size={15} /> Solicitar via WhatsApp
        </a>
      </div>
    </div>

    {/* Info permanente abaixo da imagem */}
    <div className="flex-1 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-600/10 px-2 py-0.5 rounded-full">
          {CATEGORY_ICON[product.category] ?? '📦'} {product.category}
        </span>
      </div>
      <h3 className="text-white font-black text-base leading-snug mb-1 line-clamp-2">
        {product.name}
      </h3>
      <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
        {product.description}
      </p>
      <p className="text-red-400 font-black text-sm mt-3">{product.price}</p>
    </div>

    {/* Botão mobile (sempre visível em telas pequenas) */}
    <div className="px-5 pb-5 md:hidden">
      <a
        href={whatsappUrl(product)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white text-xs font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-colors"
      >
        <MessageCircle size={14} /> Solicitar via WhatsApp
      </a>
    </div>
  </motion.div>
);

/* ─── Skeleton de carregamento ─────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-gray-800" />
    <div className="p-5 space-y-3">
      <div className="h-3 bg-gray-800 rounded w-1/3" />
      <div className="h-5 bg-gray-800 rounded w-3/4" />
      <div className="h-3 bg-gray-800 rounded w-full" />
      <div className="h-4 bg-gray-800 rounded w-1/4 mt-2" />
    </div>
  </div>
);

/* ─── Componente principal ────────────────────────────────────────────────── */
export const ShopPage = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  /* ── Firestore ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = query(
      collection(db, 'shop_products'),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopProduct)));
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'shop_products');
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const filtered =
    filter === 'Todos' ? products : products.filter((p) => p.category === filter);

  const featured = products.filter((p) => p.featured);

  const scrollToGrid = () => {
    document.getElementById('shop-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-gray-950 min-h-screen text-white">

      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center text-center overflow-hidden px-6 pt-20 pb-16">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">
            <Tag size={12} /> Comunicação Gráfica
          </span>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-4">
            Nossa <span className="text-red-600">Loja</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Produtos físicos e serviços digitais de comunicação gráfica,
            identidade visual, vídeo e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToGrid}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-sm px-8 py-4 rounded-xl transition-colors shadow-lg shadow-red-900/30"
            >
              Ver Produtos <ArrowDown size={16} />
            </button>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Gostaria de um orçamento personalizado.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-gray-700 hover:border-green-500 hover:text-green-400 text-gray-300 font-bold uppercase tracking-widest text-sm px-8 py-4 rounded-xl transition-colors"
            >
              <MessageCircle size={16} /> Orçamento Personalizado
            </a>
          </div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          DESTAQUES (só aparece se houver produtos featured)
      ═════════════════════════════════════════════════════════════════════ */}
      {!loading && featured.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8 pb-14">
          <div className="flex items-center gap-3 mb-7">
            <Sparkles size={18} className="text-red-500" />
            <h2 className="text-lg font-black uppercase tracking-tighter">
              Em <span className="text-red-600">Destaque</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.slice(0, 3).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          FILTROS + GRADE PRINCIPAL
      ═════════════════════════════════════════════════════════════════════ */}
      <section id="shop-grid" className="w-full px-4 sm:px-6 lg:px-8 pb-20">

        {/* Cabeçalho + filtros */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10 border-t border-gray-800 pt-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">
              Hub73 Produtora
            </p>
            <h2 className="text-3xl font-black uppercase tracking-tighter">
              Todos os <span className="text-red-600">Produtos</span>
            </h2>
          </div>

          {/* Pills de filtro */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all duration-200 ${
                  filter === cat
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {cat !== 'Todos' && (CATEGORY_ICON[cat] ?? '')} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <ShoppingBag size={40} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
              {filter === 'Todos'
                ? 'Nenhum produto cadastrado ainda.'
                : `Nenhum produto na categoria "${filter}".`}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          CTA FINAL
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="mx-4 sm:mx-6 lg:mx-8 mb-16 bg-red-600 rounded-3xl px-8 py-12 text-center overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-white rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white rounded-full" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-3">
            Precisa de algo <span className="text-red-200">personalizado?</span>
          </h2>
          <p className="text-red-100 mb-8 text-sm max-w-md mx-auto leading-relaxed">
            Nossa equipe atende projetos sob medida. Fale com a gente e receba
            um orçamento sem compromisso.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Olá! Gostaria de solicitar um orçamento personalizado.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-red-600 font-black uppercase tracking-widest text-sm px-8 py-4 rounded-xl hover:bg-red-50 transition-colors shadow-xl"
          >
            <MessageCircle size={18} /> Falar no WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
};
