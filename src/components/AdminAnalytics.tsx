import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { YouTubeVideo } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Eye, TrendingUp, Smartphone, Monitor, MousePointer2, Youtube, BarChart2 } from 'lucide-react';

const PATH_LABELS: Record<string, string> = {
  '_': 'Início',
  '_noticias': 'Notícias',
  '_tv': 'TV Ao Vivo',
  '_hub73': 'Hub73',
  '_podcasts': 'Podcasts',
  '_loja': 'Loja',
  '_anuncie': 'Anuncie',
  '_midia-kit': 'Mídia Kit',
  '_admin': 'Admin',
};

const pathLabel = (key: string) =>
  PATH_LABELS[key] ?? (key.replace(/_/g, '/') || '/');

const truncate = (str: string, max: number) =>
  str.length > max ? str.substring(0, max) + '…' : str;

const EmptyChart = ({ message = 'Sem dados disponíveis' }: { message?: string }) => (
  <div className="h-64 flex flex-col items-center justify-center text-gray-300 gap-3">
    <BarChart2 size={32} className="opacity-30" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const StatCard = ({ title, value, icon: Icon, color }: {
  title: string; value: number | undefined; icon: React.ElementType; color: string;
}) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl ${color} text-white`}>
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-3xl font-black tracking-tighter text-gray-900">
      {(value ?? 0).toLocaleString('pt-BR')}
    </p>
  </div>
);

export const AdminAnalytics = () => {
  const [stats, setStats] = useState<any>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'site_stats', 'global'), (snap) => {
      setStats(snap.exists() ? snap.data() : null);
      setLoading(false);
    });

    const qVideos = query(collection(db, 'youtube_videos'), orderBy('views', 'desc'));
    const unsubVideos = onSnapshot(qVideos, (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as YouTubeVideo)));
    });

    return () => { unsubStats(); unsubVideos(); };
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-gray-100 rounded-3xl" />;

  // ── Daily Accesses — sort by YYYY-MM-DD first, then format to DD/MM ────────
  const dailyData = stats?.dailyStats
    ? Object.entries(stats.dailyStats as Record<string, number>)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, count]) => {
          const [, mm, dd] = date.split('-');
          return { date: `${dd}/${mm}`, count };
        })
    : [];

  // ── Top Pages ─────────────────────────────────────────────────────────────
  const pageData = stats?.pageViews
    ? Object.entries(stats.pageViews as Record<string, number>)
        .map(([key, count]) => ({ name: pathLabel(key), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7)
    : [];

  // ── Device Distribution ───────────────────────────────────────────────────
  const desktop = stats?.deviceStats?.desktop ?? 0;
  const mobile  = stats?.deviceStats?.mobile  ?? 0;
  const hasDeviceData = desktop + mobile > 0;
  const deviceData = [
    { name: 'Desktop', value: desktop, color: '#2563eb' },
    { name: 'Mobile',  value: mobile,  color: '#ef4444' },
  ];

  // ── Top Videos ────────────────────────────────────────────────────────────
  const videoData = videos.slice(0, 5).map(v => ({
    name: truncate(v.title, 22),
    views: v.views ?? 0,
  }));

  const totalVideoViews = videos.reduce((acc, v) => acc + (v.views ?? 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black uppercase tracking-tighter">
          Dashboard de <span className="text-red-600">Audiência</span>
        </h2>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          DADOS EM TEMPO REAL
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Acessos Totais"          value={stats?.totalAccesses}        icon={Eye}       color="bg-blue-600"   />
        <StatCard title="Views de Vídeos"          value={totalVideoViews}              icon={TrendingUp} color="bg-red-600"    />
        <StatCard title="Acessos Mobile"           value={stats?.deviceStats?.mobile}   icon={Smartphone} color="bg-orange-600" />
        <StatCard title="Acessos Desktop"          value={stats?.deviceStats?.desktop}  icon={Monitor}    color="bg-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Daily Accesses ──────────────────────────────────────────── */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-red-600" /> Acessos Diários (Últimos 14 dias)
          </h3>
          {dailyData.length === 0 ? <EmptyChart /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 800, color: '#ef4444' }}
                    formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Acessos']}
                  />
                  <Line
                    type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3}
                    dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Device Distribution ──────────────────────────────────────── */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Smartphone size={20} className="text-red-600" /> Distribuição por Dispositivo
          </h3>
          {!hasDeviceData ? <EmptyChart message="Nenhum acesso registrado ainda" /> : (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {deviceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Acessos']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Top Pages ────────────────────────────────────────────────── */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <MousePointer2 size={20} className="text-red-600" /> Páginas Mais Visitadas
          </h3>
          {pageData.length === 0 ? <EmptyChart /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis
                    type="number"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(v: number) => v.toLocaleString('pt-BR')}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name" type="category"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Acessos']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Top Videos ───────────────────────────────────────────────── */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Youtube size={20} className="text-red-600" /> Vídeos Mais Assistidos
          </h3>
          {videoData.length === 0 ? <EmptyChart message="Nenhum vídeo cadastrado" /> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={videoData} margin={{ bottom: 40 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 600 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(v: number) => v.toLocaleString('pt-BR')}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Views']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="views" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
