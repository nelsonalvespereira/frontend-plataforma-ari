// Utilidades do Pack Avulso.
import { supabase } from './supabaseClient';

export const BUCKET_MATERIAIS = 'pack-materiais';

// Abre um PDF privado do pack: gera na hora um link que vale só alguns minutos.
// A janela é aberta ANTES de pedir o link (senão o navegador bloqueia como pop-up).
export async function abrirMaterialPrivado(path) {
  const janela = window.open('', '_blank');
  const { data, error } = await supabase.storage.from(BUCKET_MATERIAIS).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    janela?.close();
    throw new Error(error?.message || 'Não foi possível abrir o material.');
  }
  if (janela) {
    janela.opener = null;
    janela.location.href = data.signedUrl;
  } else {
    window.location.href = data.signedUrl;
  }
}

// Converte links comuns (YouTube watch/youtu.be/live/shorts, Vimeo) em URL de embed.
// Qualquer coisa que não seja https é descartada (nada de javascript: dentro de iframe).
export function formatarUrlEmbed(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();

  const yt = u.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return u.startsWith('https://') ? u : '';
}

// Só aceita links http(s) para botões "abrir material".
export function linkSeguro(url) {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : '';
}

// "1 dia 04h 12min" / "03h 12min" / "12min 05s" — para o contador de acesso.
export function formatarRestante(ms) {
  if (ms <= 0) return '00:00:00';
  const totalSeg = Math.floor(ms / 1000);
  const d = Math.floor(totalSeg / 86400);
  const h = Math.floor((totalSeg % 86400) / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  const dois = (n) => String(n).padStart(2, '0');

  if (d > 0) return `${d}d ${dois(h)}h ${dois(m)}min`;
  if (h > 0) return `${dois(h)}h ${dois(m)}min`;
  return `${dois(m)}min ${dois(s)}s`;
}

// "48 horas" para packs curtos, "7 dias" para os mais longos.
export function rotuloDuracao(dias) {
  if (!dias) return '';
  return dias <= 3 ? `${dias * 24} horas` : `${dias} dias`;
}

// Estado de uma live a partir do horário de início e da duração (padrão 2h).
export function statusDaLive(dataHora, duracaoMin = 120, agora = Date.now()) {
  const inicio = new Date(dataHora).getTime();
  const fim = inicio + (duracaoMin || 120) * 60000;
  if (agora < inicio) return 'agendada';
  if (agora <= fim) return 'ao_vivo';
  return 'encerrada';
}
