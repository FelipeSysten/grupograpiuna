export interface NewsPost {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  author: string;
  date: string;
  image: string;
}

export interface Podcast {
  id: number;
  title: string;
  host: string;
  guest?: string;
  thumbnail: string;
  duration: string;
}

export interface Production {
  id: number;
  title: string;
  category: 'Podcast' | 'Comercial' | 'Institucional' | 'Evento';
  thumbnail: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  host: string;
  dayOfWeek: string;
  youtubeUrl?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string;
  publishedAt: string;
  views?: number;
}
