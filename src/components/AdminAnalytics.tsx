import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { YouTubeVideo } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Eye, TrendingUp, Smartphone, Monitor, MousePointer2, Youtube } from 'lucide-react';

export const AdminAnalytics = () => {
  const [stats, setStats] = useState<any>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubStats = onSnapshot(doc(db, 'site_stats', 'global'), (doc) => {
      if (doc.exists()) {
        setStats(doc.data());
      }
      setLoading(false);
    });

    const qVideos = query(collection(db, 'youtube_videos'), orderBy('views', 'desc'));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YouTubeVideo)));
    });

    return () => {
      unsubStats();
      unsubVideos();
    };
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-gray-100 rounded-3xl"></div>;

  // Prepare Daily Data
  const dailyData = stats?.dailyStats ? Object.entries(stats.dailyStats)
    .map(([date, count]) => ({ date: date.split('-').slice(1).join('/'), count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7) : [];

  // Prepare Page Data
  const pageData = stats?.pageViews ? Object.entries(stats.pageViews)
    .map(([path, count]) => ({ 
      name: path.replace(/_/g, '/') || '/', 
      count 
    }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5) : [];

  // Prepare Device Data
  const deviceData = [
    { name: 'Desktop', value: stats?.deviceStats?.desktop || 0, color: '#2563eb' },
    { name: 'Mobile', value: stats?.deviceStats?.mobile || 0, color: '#ef4444' }
  ];

  // Prepare Video Data
  const videoData = videos.slice(0, 5).map(v => ({
    name: v.title.substring(0, 20) + '...',
    views: v.views || 0
  }));

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color} text-white`}>
          <Icon size={20} />
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-black tracking-tighter text-gray-900">{value?.toLocaleString('pt-BR')}</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Dashboard de <span className="text-red-600">Audiência</span></h2>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          DADOS EM TEMPO REAL
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Acessos Totais" value={stats?.totalAccesses} icon={Eye} color="bg-blue-600" />
        <StatCard title="Visualizações de Vídeos" value={videos.reduce((acc, v) => acc + (v.views || 0), 0)} icon={TrendingUp} color="bg-red-600" />
        <StatCard title="Acessos Mobile" value={stats?.deviceStats?.mobile} icon={Smartphone} color="bg-orange-600" />
        <StatCard title="Acessos Desktop" value={stats?.deviceStats?.desktop} icon={Monitor} color="bg-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Accesses Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-red-600" /> Acessos Diários (Últimos 7 dias)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 800, color: '#ef4444' }}
                />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Smartphone size={20} className="text-red-600" /> Distribuição por Dispositivo
          </h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <MousePointer2 size={20} className="text-red-600" /> Páginas Mais Visitadas
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pageData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} width={100} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Videos */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Youtube size={20} className="text-red-600" /> Vídeos Mais Assistidos
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={videoData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="views" fill="#ef4444" radius={[10, 10, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
