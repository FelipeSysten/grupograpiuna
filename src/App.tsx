/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import { doc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Analytics } from '@vercel/analytics/react';
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

function AccessTracker() {
  const location = useLocation();

  useEffect(() => {
    const trackAccess = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const deviceType = isMobile ? 'mobile' : 'desktop';
        
        // Sanitize path for Firestore keys (replace / with _)
        const pathKey = location.pathname.replace(/\//g, '_') || 'home';

        await setDoc(doc(db, 'site_stats', 'global'), {
          totalAccesses: increment(1),
          [`pageViews.${pathKey}`]: increment(1),
          [`dailyStats.${today}`]: increment(1),
          [`deviceStats.${deviceType}`]: increment(1)
        }, { merge: true });
      } catch (error) {
        console.error('Error tracking site access:', error);
      }
    };
    trackAccess();
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <Router>
      <AccessTracker />
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
      <Analytics />
    </Router>
  );
}

