import React, { useEffect, useState } from 'react';
import { Loader2, PlayCircle, Video } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatarEmbedUrl } from '../../lib/embed';

// Aulão: as aulas marcadas como do pack (aulas.incluso_no_pack = true).
export default function PackAulao() {
  const [aulas, setAulas] = useState([]);
  const [atualId, setAtualId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase
      .from('aulas')
      .select('id, titulo, video_url, duracao_min, ordem, modulo_nome')
      .eq('incluso_no_pack', true)
      .order('ordem', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setErro('Não foi possível carregar o aulão. Tente novamente.');
        } else {
          setAulas(data ?? []);
          setAtualId(data?.[0]?.id ?? null);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>;
  if (erro) return <p role="alert" className="py-10 text-center text-red-400 text-sm">{erro}</p>;
  if (aulas.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-bold text-slate-300">O aulão ainda não foi liberado</p>
        <p className="text-sm mt-1">Assim que o professor publicar, ele aparece aqui.</p>
      </div>
    );
  }

  const atual = aulas.find((a) => a.id === atualId) ?? aulas[0];

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800">
          {atual.video_url ? (
            <iframe
              key={atual.id}
              className="w-full h-full"
              src={formatarEmbedUrl(atual.video_url)}
              title={atual.titulo}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">Vídeo indisponível.</div>
          )}
        </div>
        <h2 className="mt-4 text-xl font-black text-white">{atual.titulo}</h2>
        {atual.modulo_nome && <p className="text-sm text-slate-400 mt-1">{atual.modulo_nome}</p>}
      </div>

      <aside className="bg-slate-900 border border-slate-800 rounded-2xl p-3 h-fit">
        <p className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-500">Aulas do pack</p>
        <ul className="space-y-1">
          {aulas.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setAtualId(a.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors cursor-pointer ${
                  a.id === atual.id ? 'bg-brand-orange/10 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <PlayCircle className={`w-5 h-5 shrink-0 ${a.id === atual.id ? 'text-brand-orange' : 'text-slate-500'}`} />
                <span className="flex-1 text-sm font-medium leading-snug">{a.titulo}</span>
                {a.duracao_min ? <span className="text-xs text-slate-500 shrink-0">{a.duracao_min} min</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
