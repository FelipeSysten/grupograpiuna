import React, { useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';

interface AdBannerProps {
  size: 'leaderboard' | 'sidebar' | 'mobile' | 'cover';
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

  const dimensions = {
    leaderboard: { width: '100%', height: '90px', label: '970x90 Leaderboard' },
    sidebar: { width: '300px', height: '250px', label: '300x250 Sidebar' },
    mobile: { width: '320px', height: '50px', label: '320x50 Mobile' },
    cover: { width: '100%', height: 'auto', label: 'Capa Estilo YouTube' },
  };

  const { label } = dimensions[size];

  if (ad) {
    return (
      <a 
        href={ad.link} 
        target="_blank" 
        rel="noreferrer"
        className={cn(
          "block rounded-lg overflow-hidden mx-auto transition-transform hover:scale-[1.01]",
          size === 'leaderboard' && "w-full max-w-[970px] h-[90px]",
          size === 'sidebar' && "w-[300px] h-[250px]",
          size === 'mobile' && "w-[320px] h-[50px]",
          size === 'cover' && "w-full aspect-[16/4] md:aspect-[16/3]",
          className
        )}
      >
        <img src={ad.imageUrl} alt="Publicidade" className="w-full h-full object-cover" />
      </a>
    );
  }

  return (
    <div 
      className={cn(
        "bg-gray-100 border border-gray-200 flex items-center justify-center rounded-lg overflow-hidden mx-auto",
        size === 'leaderboard' && "w-full max-w-[970px] h-[90px]",
        size === 'sidebar' && "w-[300px] h-[250px]",
        size === 'mobile' && "w-[320px] h-[50px]",
        size === 'cover' && "w-full aspect-[16/4] md:aspect-[16/3]",
        className
      )}
    >
      <div className="text-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Publicidade</span>
        <span className="text-[10px] font-medium text-gray-300 uppercase">{label}</span>
      </div>
    </div>
  );
};
