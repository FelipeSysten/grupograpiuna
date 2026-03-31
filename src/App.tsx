/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './components/Home';
import { TVPage } from './components/TVPage';
import { NewsPage } from './components/NewsPage';
import { Hub73Page } from './components/Hub73Page';
import { PodcastPage } from './components/PodcastPage';
import { MidiaKitPage } from './components/MidiaKitPage';
import { AdminDashboard } from './components/AdminDashboard';
import { NewsDetailPage } from './components/NewsDetailPage';
import { AdBanner } from './components/AdBanner';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans selection:bg-red-100 selection:text-red-900 pb-16 md:pb-0">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tv" element={<TVPage />} />
            <Route path="/noticias" element={<NewsPage />} />
            <Route path="/noticias/:id" element={<NewsDetailPage />} />
            <Route path="/hub73" element={<Hub73Page />} />
            <Route path="/podcasts" element={<PodcastPage />} />
            <Route path="/anuncie" element={<MidiaKitPage />} />
            <Route path="/midia-kit" element={<MidiaKitPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
        
        {/* Sticky Mobile Ad */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-2 shadow-lg">
          <AdBanner size="mobile" />
        </div>
      </div>
    </Router>
  );
}

