import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Video, Briefcase, Users, Calendar, Play } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const Hub73Page = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'hub73'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'hub73');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredProjects = filter === 'Todos' 
    ? projects 
    : projects.filter(p => p.category?.toLowerCase() === filter.toLowerCase());

  const categories = ['Todos', ...new Set(projects.map(p => p.category).filter(Boolean))];

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-gray-900 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/production/1920/1080" 
            alt="Production" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block bg-red-600 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
          >
            HUB73 PRODUTORA
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 uppercase">
            Transformamos Ideias em <span className="text-red-600">Impacto Visual</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12">
            A produtora oficial do Grupo Grapiúna. Especialistas em comerciais, podcasts, institucionais e cobertura de eventos.
          </p>
          <button className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-red-600 hover:text-white transition-all transform hover:scale-105">
            SOLICITAR ORÇAMENTO
          </button>
        </div>
      </section>

      {/* Services */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              { title: 'Podcasts', icon: Users, desc: 'Estúdio completo com multi-câmeras e edição profissional.' },
              { title: 'Comerciais', icon: Video, desc: 'Produção de VT para TV e redes sociais com alta conversão.' },
              { title: 'Institucionais', icon: Briefcase, desc: 'Conte a história da sua empresa com cinematografia premium.' },
              { title: 'Eventos', icon: Calendar, desc: 'Cobertura completa e transmissão ao vivo de grandes eventos.' },
            ].map((s, i) => (
              <div key={i} className="group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-900 mb-6 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                  <s.icon size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Nosso <span className="text-red-600">Portfólio</span></h2>
            <div className="flex flex-wrap gap-4">
              {categories.map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`text-xs font-bold uppercase tracking-widest transition-colors ${filter === f ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={project.id} 
                  className="group relative aspect-video bg-gray-200 rounded-2xl overflow-hidden cursor-pointer"
                >
                  <img 
                    src={project.imageUrl} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest mb-2 text-red-500">{project.category}</span>
                    <h4 className="text-xl font-bold text-center">{project.title}</h4>
                    <p className="text-xs text-gray-300 text-center mt-2 line-clamp-2">{project.description}</p>
                    <div className="mt-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">
                      <Play size={20} fill="currentColor" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum projeto encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
