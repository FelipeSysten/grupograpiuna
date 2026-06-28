export interface NewsMediaItem {
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
}

export interface NewsPost {
  id?: string;
  title: string;
  content: string;
  updateNote?: string;
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
  dayOfWeek: string;
  title: string;
  order?: number;            // ordem do programa dentro do dia
  category?: string;
  description?: string;
  durationSeconds?: number;  // duração em segundos (fonte do cálculo de horários)
  youtubeUrl?: string;
  thumbnailUrl?: string;
  status?: string;           // 'ativo' | 'inativo'
  host?: string;             // apresentador (opcional)
  startTime?: string;        // 'HH:MM:SS' — calculado e persistido
  endTime?: string;          // 'HH:MM:SS' — calculado e persistido
  time?: string;             // legado: horário digitado manualmente
}

export interface NewsComment {
  id?: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  createdAt?: any;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl: string;
  publishedAt: string;
  views?: number;
}

export interface TVChannel {
  id?: string;
  name: string;
  url: string;
}
