export interface NewsMediaItem {
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
}

export interface NewsPost {
  id?: string;
  title: string;
  content: string;
  category: string;
  author: string;
  imageUrl: string;
  createdAt?: any;
  updatedAt?: any;
  featured?: boolean;
  media?: NewsMediaItem[];
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
