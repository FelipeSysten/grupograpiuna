import React, { useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';

interface AdBannerProps {
  size: 'leaderboard' | 'sidebar' | 'mobile' | 'intermediario';
  page?: string;
  className?: string;
}

export const AdBanner = ({ size, page, className }: AdBannerProps) => {
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    let q = query(
      collection(db, 'ads'),
      where('size', '==', size),
      where('active', '==', true)
    );

    if (page) {
      q = query(q, where('page', '==', page));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Pega um anúncio aleatório dos ativos para a página
        const randomIndex = Math.floor(Math.random() * snapshot.docs.length);
        setAd(snapshot.docs[randomIndex].data());
      } else {
        setAd(null);
      }
    });

    return () => unsubscribe();
  }, [size, page]);

  const sizeClasses = {
    leaderboard:  'w-full max-w-[970px] h-[90px]',
    intermediario:'w-full max-w-[728px] h-[90px]',
    sidebar:      'w-[300px] h-[250px]',
    mobile:       'w-full max-w-[320px] h-[50px]',
  };

  const labels = {
    leaderboard:  'Leaderboard 970×90',
    intermediario:'Intermediário 728×90',
    sidebar:      'Sidebar 300×250',
    mobile:       'Mobile 320×50',
  };

  const cls = sizeClasses[size];

  if (ad) {
    return (
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('block rounded-lg overflow-hidden mx-auto transition-transform hover:scale-[1.01]', cls, className)}
      >
        <img src={ad.imageUrl} alt="Publicidade" className="w-full h-full object-cover" />
      </a>
    );
  }

  return (
    <div className={cn('bg-gray-100 border border-gray-200 flex items-center justify-center rounded-lg overflow-hidden mx-auto', cls, className)}>
      <div className="text-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Publicidade</span>
        <span className="text-[10px] font-medium text-gray-300 uppercase">{labels[size]}</span>
      </div>
    </div>
  );
};
