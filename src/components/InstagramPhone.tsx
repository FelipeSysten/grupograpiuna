import React, { useState, useEffect } from 'react';
import { Instagram, Play, ExternalLink } from 'lucide-react';

/**
 * Mockup de celular exibindo o perfil do Instagram da página, alimentado pelos
 * endpoints /api/instagram/profile (dados do perfil) e /api/instagram/media
 * (grade de posts). Se o Instagram não estiver configurado, mostra um
 * placeholder discreto com link para o Instagram.
 */

type IgProfile = {
  username: string;
  name: string;
  biography: string;
  profilePictureUrl: string;
  followers: number;
  follows: number;
  mediaCount: number;
};

type IgMedia = {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  permalink: string;
};

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
    : n >= 10_000
      ? `${Math.round(n / 1_000)} mil`
      : n.toLocaleString('pt-BR');

export const InstagramPhone = ({ className = '' }: { className?: string }) => {
  const [profile, setProfile] = useState<IgProfile | null>(null);
  const [media, setMedia] = useState<IgMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pRes, mRes] = await Promise.all([
          fetch('/api/instagram/profile'),
          fetch('/api/instagram/media?limit=9'),
        ]);
        const pData = pRes.ok ? await pRes.json() : null;
        const mData = mRes.ok ? await mRes.json() : null;
        if (!alive) return;
        if (pData?.profile?.username) setProfile(pData.profile);
        if (Array.isArray(mData?.media)) {
          setMedia((mData.media as IgMedia[]).filter((m) => m.mediaUrl && m.permalink));
        }
      } catch {
        /* Instagram indisponível → placeholder */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const igUrl = profile
    ? `https://www.instagram.com/${profile.username}/`
    : 'https://www.instagram.com/';

  return (
    <div className={className}>
      {/* Moldura do celular */}
      <div className="mx-auto w-full max-w-[300px] bg-black rounded-[2.8rem] p-2.5 border border-gray-700 shadow-2xl shadow-black/60">
        <div className="relative bg-white rounded-[2.2rem] overflow-hidden">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20" />

          {/* Tela */}
          <div className="h-[540px] overflow-y-auto pt-9 scrollbar-hide">
            {/* Barra superior */}
            <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-100">
              <span className="font-black text-sm tracking-tight text-gray-900">
                {profile ? `@${profile.username}` : 'Instagram'}
              </span>
              <Instagram size={18} className="text-pink-600" />
            </div>

            {loading ? (
              /* Skeleton */
              <div className="p-4 space-y-4 animate-pulse">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-0.5">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100" />
                  ))}
                </div>
              </div>
            ) : profile ? (
              <>
                {/* Cabeçalho do perfil */}
                <div className="px-4 pt-4 flex items-center gap-5">
                  <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 shrink-0">
                    {profile.profilePictureUrl ? (
                      <img
                        src={profile.profilePictureUrl}
                        alt={profile.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full border-2 border-white object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                        <Instagram size={22} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex justify-around text-center">
                    <div>
                      <p className="font-black text-sm text-gray-900">{fmt(profile.mediaCount)}</p>
                      <p className="text-[10px] text-gray-500">posts</p>
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900">{fmt(profile.followers)}</p>
                      <p className="text-[10px] text-gray-500">seguidores</p>
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900">{fmt(profile.follows)}</p>
                      <p className="text-[10px] text-gray-500">seguindo</p>
                    </div>
                  </div>
                </div>

                {/* Nome + bio */}
                <div className="px-4 pt-3">
                  <p className="text-xs font-bold text-gray-900">{profile.name}</p>
                  {profile.biography && (
                    <p className="text-[11px] text-gray-600 leading-snug whitespace-pre-line line-clamp-4">
                      {profile.biography}
                    </p>
                  )}
                </div>

                {/* Botão seguir */}
                <div className="px-4 pt-3 pb-4">
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white text-center text-xs font-bold py-2 rounded-lg transition-opacity"
                  >
                    Seguir no Instagram
                  </a>
                </div>

                {/* Grade de posts */}
                {media.length > 0 && (
                  <div className="grid grid-cols-3 gap-0.5">
                    {media.map((m) => (
                      <a
                        key={m.id}
                        href={m.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square bg-gray-100 overflow-hidden group"
                      >
                        <img
                          src={m.mediaUrl}
                          alt={m.caption ? m.caption.slice(0, 60) : 'Publicação do Instagram'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {m.mediaType === 'VIDEO' && (
                          <Play
                            size={13}
                            fill="white"
                            className="absolute top-1.5 right-1.5 text-white drop-shadow"
                          />
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Instagram não configurado / indisponível */
              <div className="h-[420px] flex flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center">
                  <Instagram size={28} className="text-white" />
                </div>
                <p className="text-sm font-bold text-gray-900">Siga a gente no Instagram</p>
                <p className="text-xs text-gray-500">Acompanhe os bastidores e as novidades da TV Grapiúna.</p>
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg"
                >
                  <ExternalLink size={13} /> Abrir Instagram
                </a>
              </div>
            )}
          </div>

          {/* Home indicator */}
          <div className="h-6 flex items-center justify-center bg-white border-t border-gray-50">
            <div className="w-24 h-1 bg-gray-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
