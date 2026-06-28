/**
 * Service da Grade de Programação da TV.
 * Centraliza a lógica de horários, fechamento de 24h, "no ar agora" e
 * importação por planilha (CSV/Google Sheets). Usado pelo Admin e pela TVPage.
 *
 * Modelo: a grade é dirigida por `order` + `durationSeconds`. O 1º programa do
 * dia começa às 00:00:00; o fim de um programa é início + duração; o início do
 * seguinte é igual ao fim do anterior. Início/fim são CALCULADOS, não digitados.
 */
import { ScheduleItem } from '../types';

export const SECONDS_IN_DAY = 86400;

export const WEEK_DAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

export const DAY_SHORT: Record<string, string> = {
  'Segunda-feira': 'SEG',
  'Terça-feira': 'TER',
  'Quarta-feira': 'QUA',
  'Quinta-feira': 'QUI',
  'Sexta-feira': 'SEX',
  'Sábado': 'SÁB',
  'Domingo': 'DOM',
};

/* ─── Duração / formatação ──────────────────────────────────────────────── */

/**
 * Converte uma duração para segundos. Aceita:
 *  - número (segundos)
 *  - "HH:MM:SS" (3 partes)
 *  - "HH:MM"    (2 partes → horas e minutos)
 *  - "MM"       (1 número puro → MINUTOS)
 */
export function parseDurationToSeconds(input: string | number | undefined | null): number {
  if (input == null || input === '') return 0;
  if (typeof input === 'number') return Math.max(0, Math.round(input));
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10) * 60; // só número → minutos
  const parts = s.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return 0;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Formata segundos como HH:MM:SS dentro do dia (faz wrap em 24h). */
export function formatClock(totalSeconds: number): string {
  const t = ((Math.round(totalSeconds) % SECONDS_IN_DAY) + SECONDS_IN_DAY) % SECONDS_IN_DAY;
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** Formata uma duração como HH:MM:SS SEM wrap (pode passar de 24h). */
export function formatDuration(totalSeconds: number): string {
  const t = Math.max(0, Math.round(totalSeconds));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/* ─── Cálculo de início/fim em cascata ──────────────────────────────────── */

export type ComputedItem = ScheduleItem & {
  startSeconds: number;
  endSeconds: number;
  startLabel: string; // HH:MM:SS
  endLabel: string;   // HH:MM:SS
};

function sortByOrder(a: ScheduleItem, b: ScheduleItem): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao - bo;
  // fallback: horário calculado/legado, para dados ainda sem `order`
  return (a.startTime || a.time || '').localeCompare(b.startTime || b.time || '');
}

/**
 * Ordena os programas de UM dia e atribui início/fim em cascata a partir das 00:00.
 * Não muta os itens originais.
 */
export function computeDaySchedule(items: ScheduleItem[]): ComputedItem[] {
  let cursor = 0;
  return [...items].sort(sortByOrder).map((it) => {
    const dur = it.durationSeconds ?? 0;
    const startSeconds = cursor;
    const endSeconds = cursor + dur;
    cursor = endSeconds;
    return {
      ...it,
      startSeconds,
      endSeconds,
      startLabel: formatClock(startSeconds),
      endLabel: formatClock(endSeconds),
    };
  });
}

/* ─── Fechamento de grade (24h) ─────────────────────────────────────────── */

export type GradeState = 'closed' | 'under' | 'over';
export type GradeStatus = { totalSeconds: number; state: GradeState; label: string };

export function gradeStatus(items: ScheduleItem[]): GradeStatus {
  const totalSeconds = items.reduce((acc, it) => acc + (it.durationSeconds ?? 0), 0);
  if (totalSeconds === SECONDS_IN_DAY) return { totalSeconds, state: 'closed', label: 'Grade fechada' };
  if (totalSeconds < SECONDS_IN_DAY)
    return { totalSeconds, state: 'under', label: `Faltam ${formatDuration(SECONDS_IN_DAY - totalSeconds)}` };
  return { totalSeconds, state: 'over', label: `Passou ${formatDuration(totalSeconds - SECONDS_IN_DAY)}` };
}

/* ─── No ar agora ───────────────────────────────────────────────────────── */

/**
 * Encontra o programa no ar agora num dia, comparando o horário atual com as
 * janelas [início, fim) calculadas. Se o dia ainda não tem durações (soma 0),
 * cai no heurístico antigo (último programa cujo horário <= agora).
 */
export function findOnAir(items: ScheduleItem[], now: Date): ComputedItem | null {
  const computed = computeDaySchedule(items);
  if (computed.length === 0) return null;
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const totalDur = computed.reduce((a, c) => a + (c.durationSeconds ?? 0), 0);

  if (totalDur > 0) {
    return computed.find((c) => nowSeconds >= c.startSeconds && nowSeconds < c.endSeconds) ?? null;
  }
  // fallback legado por horário digitado
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return [...computed].reverse().find((c) => (c.time || c.startLabel) <= hhmm) ?? computed[0];
}

/* ─── Normalização de dia da semana ─────────────────────────────────────── */

const normalize = (s: string) => s.normalize('NFD').toLowerCase().replace(/[^a-z0-9]/g, '');

const DAY_ALIASES: Record<string, string> = {
  seg: 'Segunda-feira', segunda: 'Segunda-feira', segundafeira: 'Segunda-feira',
  ter: 'Terça-feira', terca: 'Terça-feira', tercafeira: 'Terça-feira',
  qua: 'Quarta-feira', quarta: 'Quarta-feira', quartafeira: 'Quarta-feira',
  qui: 'Quinta-feira', quinta: 'Quinta-feira', quintafeira: 'Quinta-feira',
  sex: 'Sexta-feira', sexta: 'Sexta-feira', sextafeira: 'Sexta-feira',
  sab: 'Sábado', sabado: 'Sábado',
  dom: 'Domingo', domingo: 'Domingo',
};

/** Converte "SEG", "segunda", "Segunda-feira" etc. no nome canônico do dia. */
export function normalizeDay(s: string): string {
  return DAY_ALIASES[normalize(s)] ?? s.trim();
}

/* ─── CSV ────────────────────────────────────────────────────────────────── */

/** Parser de CSV com suporte a aspas, vírgula e quebra de linha dentro de aspas. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const HEADER_MAP: Record<string, keyof ImportedRow> = {
  dia: 'dayOfWeek', diadasemana: 'dayOfWeek',
  ordem: 'order', ordertvshow: 'order',
  titulo: 'title', programa: 'title', nome: 'title',
  categoria: 'category',
  descricao: 'description',
  duracao: 'duration', tempo: 'duration',
  link: 'youtubeUrl', linkdovideo: 'youtubeUrl', video: 'youtubeUrl', url: 'youtubeUrl', youtube: 'youtubeUrl',
  thumbnail: 'thumbnailUrl', thumb: 'thumbnailUrl', capa: 'thumbnailUrl', imagem: 'thumbnailUrl',
  status: 'status',
  apresentador: 'host', host: 'host',
};

type ImportedRow = {
  dayOfWeek: string; order: string; title: string; category: string;
  description: string; duration: string; youtubeUrl: string;
  thumbnailUrl: string; status: string; host: string;
};

/**
 * Converte linhas de CSV (1ª linha = cabeçalho) em programas prontos para salvar.
 * Mapeia colunas pelo nome (sem acento/caixa), normaliza o dia, converte a duração
 * em segundos e atribui `order` automaticamente por dia quando não informado.
 */
export function rowsToScheduleItems(rows: string[][]): Partial<ScheduleItem>[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(normalize);
  const colOf = (field: keyof ImportedRow) => header.findIndex((h) => HEADER_MAP[h] === field);
  const cols = {
    dayOfWeek: colOf('dayOfWeek'), order: colOf('order'), title: colOf('title'),
    category: colOf('category'), description: colOf('description'), duration: colOf('duration'),
    youtubeUrl: colOf('youtubeUrl'), thumbnailUrl: colOf('thumbnailUrl'),
    status: colOf('status'), host: colOf('host'),
  };
  const cell = (row: string[], i: number) => (i >= 0 && i < row.length ? row[i].trim() : '');

  const orderCounters: Record<string, number> = {};
  const items: Partial<ScheduleItem>[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const dayOfWeek = normalizeDay(cell(row, cols.dayOfWeek));
    const title = cell(row, cols.title);
    if (!dayOfWeek || !title) continue; // linha incompleta → ignora

    const explicitOrder = parseInt(cell(row, cols.order), 10);
    const order = Number.isFinite(explicitOrder)
      ? explicitOrder
      : (orderCounters[dayOfWeek] = (orderCounters[dayOfWeek] ?? -1) + 1);

    items.push({
      dayOfWeek,
      order,
      title,
      category: cell(row, cols.category),
      description: cell(row, cols.description),
      durationSeconds: parseDurationToSeconds(cell(row, cols.duration)),
      youtubeUrl: cell(row, cols.youtubeUrl),
      thumbnailUrl: cell(row, cols.thumbnailUrl),
      status: cell(row, cols.status) || 'ativo',
      host: cell(row, cols.host),
    });
  }
  return items;
}
