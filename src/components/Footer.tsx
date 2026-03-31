import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">G</div>
              <span className="font-bold text-xl tracking-tighter text-white">
                GRUPO <span className="text-red-600">GRAPIÚNA</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6">
              O maior grupo de comunicação do Sul da Bahia. Informação com credibilidade, entretenimento de qualidade e soluções audiovisuais completas.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-red-600 transition-colors"><Facebook size={20} /></a>
              <a href="#" className="hover:text-red-600 transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-red-600 transition-colors"><Twitter size={20} /></a>
              <a href="#" className="hover:text-red-600 transition-colors"><Youtube size={20} /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Navegação</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/tv" className="hover:text-white transition-colors">TV Grapiúna</Link></li>
              <li><Link to="/noticias" className="hover:text-white transition-colors">Portal de Notícias</Link></li>
              <li><Link to="/hub73" className="hover:text-white transition-colors">HUB73 Produtora</Link></li>
              <li><Link to="/podcasts" className="hover:text-white transition-colors">Rede de Podcasts</Link></li>
              <li><Link to="/anuncie" className="hover:text-white transition-colors">Anuncie Conosco</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Categorias</h3>
            <ul className="space-y-4 text-sm">
              <li><Link to="/noticias/politica" className="hover:text-white transition-colors">Política</Link></li>
              <li><Link to="/noticias/cidade" className="hover:text-white transition-colors">Cidade</Link></li>
              <li><Link to="/noticias/economia" className="hover:text-white transition-colors">Economia</Link></li>
              <li><Link to="/noticias/policia" className="hover:text-white transition-colors">Polícia</Link></li>
              <li><Link to="/noticias/sul-da-bahia" className="hover:text-white transition-colors">Sul da Bahia</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Contato</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-red-600 shrink-0" />
                <span>Itabuna, Bahia - Brasil</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-red-600 shrink-0" />
                <span>(73) 3333-3333</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-red-600 shrink-0" />
                <span>contato@grupograpiuna.com.br</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2026 Grupo Grapiúna de Comunicação. Todos os direitos reservados.</p>
          <div className="flex space-x-6">
            <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
            <Link to="/termos" className="hover:text-white">Termos de Uso</Link>
            <Link to="/editorial" className="hover:text-white">Política Editorial</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
