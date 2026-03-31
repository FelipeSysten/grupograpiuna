import React, { useState, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';

interface AdBannerProps {
  size: 'leaderboard' | 'sidebar' | 'mobile';
  className?: string;
}

export const AdBanner = ({ size, className }: AdBannerProps) => {
  const [ad, setAd] = useState<any>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'ads'),
      where('size', '==', size),
      where('active', '==', true),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setAd(snapshot.docs[0].data());
      } else {
        setAd(null);
      }
    });

    return () => unsubscribe();
  }, [size]);

  const dimensions = {
    leaderboard: { width: '970px', height: '90px', label: '970x90 Leaderboard' },
    sidebar: { width: '300px', height: '250px', label: '300x250 Sidebar' },
    mobile: { width: '320px', height: '50px', label: '320x50 Mobile' },
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
