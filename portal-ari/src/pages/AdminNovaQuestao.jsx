import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Save, PlusCircle, ArrowLeft, Loader2, CheckCircle2, ImagePlus, X, Eye, Video, FolderTree } from 'lucide-react';
import BlocoEditor from '../components/BlocoEditor';
import RenderBlocos from '../components/RenderBlocos';
import { criarBloco, processarBlocos, blocosParaTexto } from '../lib/blocos';

import { useAvisos } from '../components/Avisos';
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

export default function AdminNovaQuestao() {
  const avisos = useAvisos();
  const [turmas, setTurmas] = useState([]);
  const [assuntosArvore, setAssuntosArvore] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [turmaId, setTurmaId] = useState('');
  const [materia, setMateria] = useState('');
  const [assuntoId, setAssuntoId] = useState(''); 
  const [dificuldade, setDificuldade] = useState('medio');
  const [comentario, setComentario] = useState('');
  const [videoResolucaoUrl, setVideoResolucaoUrl] = useState('');
  const [respostaCorreta, setRespostaCorreta] = useState('A');
  const [ano, setAno] = useState(new Date().getFullYear());
  const [banca, setBanca] = useState('Inédita');

  // Enunciado dividido em 3 partes estilo ENEM: Superior -> Imagem no Meio -> Inferior
  const [blocosEnunciadoSuperior, setBlocosEnunciadoSuperior] = useState([criarBloco('texto')]);
  const [blocosEnunciadoInferior, setBlocosEnunciadoInferior] = useState([]);

  // Gráfico / Imagem principal no meio
  const [imagemPrincipalFile, setImagemPrincipalFile] = useState(null);
  const [imagemPrincipalPreview, setImagemPrincipalPreview] = useState(null);

  // Alternativas
  const [alternativasBlocos, setAlternativasBlocos] = useState(() =>
    Object.fromEntries(LETRAS.map((letra) => [letra, [criarBloco('texto')]]))
  );

  useEffect(() => {
    supabase.from('turmas').select('*').order('nome').then(({ data, error }) => {
      if (!error && data) {
        setTurmas(data);
        if (data.length > 0) setTurmaId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (turmaId) {
      supabase
        .from('assuntos_hierarquia')
        .select('*')
        .eq('turma_id', turmaId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          if (data) setAssuntosArvore(data);
        });
    }
  }, [turmaId]);

  const handleImagemPrincipalChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagemPrincipalFile(file);
      setImagemPrincipalPreview(URL.createObjectURL(file));
    }
  };

  const removerImagemPrincipal = () => {
    if (imagemPrincipalPreview) URL.revokeObjectURL(imagemPrincipalPreview);
    setImagemPrincipalFile(null);
    setImagemPrincipalPreview(null);
  };

  const formatarUrlVideo = (url) => {
    if (!url) return '';
    if (url.includes('embed')) return url;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    return url;
  };

  const resetarFormulario = () => {
    setBlocosEnunciadoSuperior([criarBloco('texto')]);
    setBlocosEnunciadoInferior([]);
    setAlternativasBlocos(Object.fromEntries(LETRAS.map((letra) => [letra, [criarBloco('texto')]])));
    removerImagemPrincipal();
    setComentario('');
    setVideoResolucaoUrl('');
    setAssuntoId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assuntoId) return avisos.erro('Selecione um assunto da árvore hierárquica.');
    if (!materia.trim()) return avisos.erro('Preencha o campo Matéria.');

    setLoading(true);
    setSucesso(false);

    try {
      // 1. Processa blocos superiores e inferiores
      const blocosSupProntos = await processarBlocos(supabase, blocosEnunciadoSuperior, turmaId, 'enunciado-sup');
      const blocosInfProntos = blocosEnunciadoInferior.length > 0 
        ? await processarBlocos(supabase, blocosEnunciadoInferior, turmaId, 'enunciado-inf') 
        : [];

      // 2. Sobe a imagem do meio (principal)
      let imagemPrincipalUrl = null;
      if (imagemPrincipalFile) {
        const fileExt = imagemPrincipalFile.name.split('.').pop();
        const filePath = `${turmaId}/principal-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('questoes_imagens').upload(filePath, imagemPrincipalFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('questoes_imagens').getPublicUrl(filePath);
        imagemPrincipalUrl = data.publicUrl;
      }

      // 3. Processa alternativas
      const alternativasFormatadas = await Promise.all(
        LETRAS.map(async (letra) => {
          const blocosProntos = await processarBlocos(supabase, alternativasBlocos[letra], turmaId, `alt-${letra}`);
          return {
            letra,
            texto: blocosParaTexto(blocosProntos),
            blocos: blocosProntos,
          };
        })
      );

      const urlVideoFormatada = formatarUrlVideo(videoResolucaoUrl);
      const assuntoSelecionadoObj = assuntosArvore.find(a => a.id === assuntoId);
      const nomeAssuntoFinal = assuntoSelecionadoObj ? assuntoSelecionadoObj.nome : 'Geral';

      const dadosQuestao = {
        turma_id: turmaId,
        materia: materia.trim(),
        assunto: nomeAssuntoFinal,
        assunto_id: assuntoId, 
        dificuldade,
        enunciado: blocosParaTexto(blocosSupProntos), // Mantém compatibilidade
        blocos_enunciado: blocosSupProntos,
        blocos_enunciado_superior: blocosSupProntos,
        blocos_enunciado_inferior: blocosInfProntos,
        imagem_url: imagemPrincipalUrl,
        alternativas: alternativasFormatadas,
        ano: ano ? parseInt(ano) : null,
        banca: banca.trim() || 'Inédita',
      };

      const { data: nova, error } = await supabase
        .from('questoes')
        .insert([dadosQuestao])
        .select('id')
        .single();

      if (error) throw error;

      // O gabarito fica em tabela própria (só admin lê). Se falhar, desfaz a questão.
      const { error: erroGabarito } = await supabase.from('questoes_gabarito').insert({
        questao_id: nova.id,
        resposta_correta: respostaCorreta,
        comentario: comentario.trim() || null,
        video_resolucao_url: urlVideoFormatada || null,
      });
      if (erroGabarito) {
        await supabase.from('questoes').delete().eq('id', nova.id);
        throw erroGabarito;
      }

      setSucesso(true);
      resetarFormulario();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSucesso(false), 4000);

    } catch (error) {
      console.error('Erro detalhado ao salvar questão:', error);
      avisos.erro('Erro ao salvar a questão: ' + (error.message || 'Erro desconhecido.'));
    } finally {
      setLoading(false);
    }
  };

  const turmaAtual = turmas.find((t) => t.id === turmaId);
  const assuntoSelecionadoObj = assuntosArvore.find(a => a.id === assuntoId);
  const previewVideoUrlFormatado = formatarUrlVideo(videoResolucaoUrl);

  const principais = assuntosArvore.filter(a => !a.categoria_pai_id);
  const getSub = (paiId) => assuntosArvore.filter(a => a.categoria_pai_id === paiId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/simulados-questoes" className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-brand-orange" />
              Adicionar Nova Questão (Modelo ENEM)
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Texto superior, imagem/tabela no meio e texto explicativo inferior.</p>
          </div>
        </div>

        {sucesso && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 font-bold shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
            Questão salva com sucesso no banco de dados!
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">

          {/* FORMULÁRIO */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 space-y-8 shadow-xs">

            {/* Classificação */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Classificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Turma / Nicho</label>
                  <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium">
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Matéria</label>
                  <input required type="text" value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex: Matemática" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-brand-orange" /> Assunto (Árvore Hierárquica)
                  </label>
                  <select 
                    required 
                    value={assuntoId} 
                    onChange={(e) => setAssuntoId(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium text-slate-700"
                  >
                    <option value="">Selecione a categoria/subcategoria...</option>
                    {principais.map(pai => {
                      const subitensNivel1 = getSub(pai.id);
                      return (
                        <React.Fragment key={pai.id}>
                          <option value={pai.id} className="font-bold">📁 {pai.nome}</option>
                          {subitensNivel1.map(sub1 => {
                            const subitensNivel2 = getSub(sub1.id);
                            return (
                              <React.Fragment key={sub1.id}>
                                <option value={sub1.id}>&nbsp;&nbsp;&nbsp;&nbsp;📂 {sub1.nome}</option>
                                {subitensNivel2.map(sub2 => (
                                  <option key={sub2.id} value={sub2.id}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 {sub2.nome}</option>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Dificuldade</label>
                  <select value={dificuldade} onChange={(e) => setDificuldade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium">
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Banca (Opcional)</label>
                  <input type="text" value={banca} onChange={(e) => setBanca(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ano (Opcional)</label>
                  <input type="number" value={ano} onChange={(e) => setAno(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium" />
                </div>
              </div>
            </div>

            {/* 1. ENUNCIADO SUPERIOR */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 border-b border-slate-100 pb-2">1. Enunciado Superior (Introdução / Contexto)</h3>
              <p className="text-xs text-slate-500 mb-3">Texto que vem antes do gráfico ou da tabela.</p>
              <BlocoEditor blocos={blocosEnunciadoSuperior} onChange={setBlocosEnunciadoSuperior} />
            </div>

            {/* 2. GRÁFICO / TABELA NO MEIO */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">2. Gráfico / Tabela Central (No Meio)</h3>
              <p className="text-xs text-slate-500 mb-3">Exibido exatamente no centro, entre o texto superior e a pergunta final.</p>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center">
                {!imagemPrincipalPreview ? (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-4">
                    <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">Clique para enviar a tabela ou gráfico central</span>
                    <input type="file" accept="image/*" onChange={handleImagemPrincipalChange} className="hidden" />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img src={imagemPrincipalPreview} alt="Central" className="max-h-56 mx-auto rounded-xl border bg-white p-1 object-contain" />
                    <button type="button" onClick={removerImagemPrincipal} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. ENUNCIADO INFERIOR */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 border-b border-slate-100 pb-2">3. Enunciado Inferior (Pergunta / Comando Final - Opcional)</h3>
              <p className="text-xs text-slate-500 mb-3">Texto que aparece logo abaixo da tabela/gráfico fazendo a pergunta da questão.</p>
              <BlocoEditor blocos={blocosEnunciadoInferior} onChange={setBlocosEnunciadoInferior} placeholder="Ex: A mediana dessa distribuição é igual a..." />
            </div>

            {/* Alternativas */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Alternativas</h3>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-600">Gabarito:</span>
                  <select value={respostaCorreta} onChange={(e) => setRespostaCorreta(e.target.value)} className="p-2 bg-brand-orange text-white rounded-lg font-bold outline-none cursor-pointer">
                    {LETRAS.map((l) => <option key={l} value={l}>Letra {l}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {LETRAS.map((letra) => (
                  <div key={letra} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${respostaCorreta === letra ? 'bg-brand-orange text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {letra}
                      </span>
                      <div className="flex-1">
                        <BlocoEditor
                          compact
                          blocos={alternativasBlocos[letra]}
                          onChange={(novos) => setAlternativasBlocos((prev) => ({ ...prev, [letra]: novos }))}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comentário e Vídeo */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Resolução da Questão</h3>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-brand-orange" /> Link do Vídeo de Resolução (YouTube / Embed - Opcional)
                </label>
                <input 
                  type="text" 
                  value={videoResolucaoUrl} 
                  onChange={(e) => setVideoResolucaoUrl(e.target.value)} 
                  placeholder="Ex: https://www.youtube.com/watch?v=..." 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Texto Explicativo da Resolução</label>
                <textarea 
                  value={comentario} 
                  onChange={(e) => setComentario(e.target.value)} 
                  rows="4" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium resize-y text-sm" 
                  placeholder="Explique o passo a passo da resposta correta..."
                ></textarea>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button disabled={loading} type="submit" className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-70 cursor-pointer shadow-md">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? 'Salvando...' : 'Salvar Questão'}
              </button>
            </div>

          </form>

          {/* PREVIEW AO VIVO */}
          <div className="xl:sticky xl:top-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Eye className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Como o aluno vai ver</h3>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">{materia || 'Matéria'}</span>
                <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">{assuntoSelecionadoObj?.nome || 'Assunto / Categoria'}</span>
                <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md capitalize">{dificuldade}</span>
              </div>

              <div className="p-5 space-y-4">
                {/* 1. Enunciado Superior */}
                <p className="text-slate-800 font-medium leading-relaxed text-justify">
                  <RenderBlocos blocos={blocosEnunciadoSuperior} placeholder="O texto superior aparece aqui..." />
                </p>

                {/* 2. Imagem / Tabela no Meio */}
                {imagemPrincipalPreview && (
                  <div className="my-2 flex justify-center">
                    <img src={imagemPrincipalPreview} alt="Tabela ou Gráfico Central" className="rounded-xl border border-slate-200 max-h-64 object-contain bg-white p-1" />
                  </div>
                )}

                {/* 3. Enunciado Inferior */}
                {blocosEnunciadoInferior.length > 0 && (
                  <p className="text-slate-800 font-medium leading-relaxed text-justify">
                    <RenderBlocos blocos={blocosEnunciadoInferior} placeholder="A pergunta final aparece aqui..." />
                  </p>
                )}

                <div className="space-y-2.5 pt-2">
                  {LETRAS.map((letra) => (
                    <div
                      key={letra}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border ${
                        respostaCorreta === letra ? 'border-brand-orange bg-orange-50/60' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        respostaCorreta === letra ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {letra}
                      </div>
                      <span className="font-medium text-sm text-slate-700">
                        <RenderBlocos blocos={alternativasBlocos[letra]} imgHeight="h-8" placeholder={`Alternativa ${letra}`} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(comentario || previewVideoUrlFormatado) && (
                <div className="px-5 py-4 bg-orange-50/60 border-t border-orange-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">P</div>
                    <h4 className="font-black text-slate-800 text-sm">Resolução do Professor</h4>
                  </div>

                  {previewVideoUrlFormatado && (
                    <div className="aspect-video bg-black rounded-xl overflow-hidden border border-orange-200 shadow-md">
                      <iframe 
                        className="w-full h-full"
                        src={previewVideoUrlFormatado} 
                        title="Vídeo de Resolução"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {comentario && (
                    <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{comentario}</p>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 font-medium mt-3 px-1">
              Turma: {turmaAtual?.nome || '—'} {banca && banca !== 'Inédita' ? `· ${banca}` : ''} {ano ? `· ${ano}` : ''}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}