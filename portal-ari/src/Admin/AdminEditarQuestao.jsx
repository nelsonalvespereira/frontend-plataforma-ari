import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Save, PlusCircle, ArrowLeft, Loader2, CheckCircle2, ImagePlus, X, Eye, Video, FolderTree } from 'lucide-react';
import BlocoEditor from '../components/BlocoEditor';
import RenderBlocos from '../components/RenderBlocos';
import { criarBloco, processarBlocos, blocosParaTexto } from '../lib/blocos';

import { useAvisos } from '../components/Avisos';
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

export default function AdminEditarQuestao() {
  const avisos = useAvisos();
  const { id } = useParams(); // Pega o ID da questão na URL
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [assuntosArvore, setAssuntosArvore] = useState([]);
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
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

  const [blocosEnunciado, setBlocosEnunciado] = useState([criarBloco('texto')]);
  const [imagemPrincipalFile, setImagemPrincipalFile] = useState(null);
  const [imagemPrincipalPreview, setImagemPrincipalPreview] = useState(null);

  const [alternativasBlocos, setAlternativasBlocos] = useState(() =>
    Object.fromEntries(LETRAS.map((letra) => [letra, [criarBloco('texto')]]))
  );

  // 1. Carrega turmas e os dados da questão a ser editada
  useEffect(() => {
    async function init() {
      setCarregandoDados(true);
      const { data: turmasData } = await supabase.from('turmas').select('*').order('nome');
      if (turmasData) setTurmas(turmasData);

      if (id) {
        const { data: qRaw, error } = await supabase
          .from('questoes')
          .select('*, questoes_gabarito (*)')
          .eq('id', id)
          .single();
        const gab = Array.isArray(qRaw?.questoes_gabarito) ? qRaw.questoes_gabarito[0] : qRaw?.questoes_gabarito;
        const qData = qRaw ? { ...qRaw, ...(gab ?? {}) } : null;

        if (!error && qData) {
          setTurmaId(qData.turma_id || '');
          setMateria(qData.materia || '');
          setAssuntoId(qData.assunto_id || '');
          setDificuldade(qData.dificuldade || 'medio');
          setComentario(qData.comentario || '');
          setVideoResolucaoUrl(qData.video_resolucao_url || '');
          setRespostaCorreta(qData.resposta_correta || 'A');
          setAno(qData.ano || new Date().getFullYear());
          setBanca(qData.banca || 'Inédita');

          if (qData.blocos_enunciado && qData.blocos_enunciado.length > 0) {
            setBlocosEnunciado(qData.blocos_enunciado);
          } else if (qData.enunciado) {
            setBlocosEnunciado([{ id: Date.now(), tipo: 'texto', conteudo: qData.enunciado }]);
          }

          if (qData.imagem_url) {
            setImagemPrincipalPreview(qData.imagem_url);
          }

          if (qData.alternativas && Array.isArray(qData.alternativas)) {
            const mapAlts = {};
            qData.alternativas.forEach((alt) => {
              mapAlts[alt.letra] = alt.blocos && alt.blocos.length > 0
                ? alt.blocos
                : [{ id: Date.now(), tipo: 'texto', conteudo: alt.texto || '' }];
            });
            setAlternativasBlocos(mapAlts);
          }
        }
      }
      setCarregandoDados(false);
    }
    init();
  }, [id]);

  // 2. Busca árvore de assuntos ao mudar a turma
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
    if (imagemPrincipalPreview && imagemPrincipalFile) URL.revokeObjectURL(imagemPrincipalPreview);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setSucesso(false);

    try {
      const blocosEnunciadoProntos = await processarBlocos(supabase, blocosEnunciado, turmaId, 'enunciado');

      let imagemPrincipalUrl = imagemPrincipalPreview && !imagemPrincipalFile ? imagemPrincipalPreview : null;
      if (imagemPrincipalFile) {
        const fileExt = imagemPrincipalFile.name.split('.').pop();
        const filePath = `${turmaId}/principal-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('questoes_imagens').upload(filePath, imagemPrincipalFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('questoes_imagens').getPublicUrl(filePath);
        imagemPrincipalUrl = data.publicUrl;
      }

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
      const nomeAssuntoFinal = assuntoSelecionadoObj ? assuntoSelecionadoObj.nome : '';

      const payload = {
        turma_id: turmaId,
        materia,
        assunto: nomeAssuntoFinal,
        assunto_id: assuntoId && assuntoId.trim() !== '' ? assuntoId : null,
        dificuldade,
        enunciado: blocosParaTexto(blocosEnunciadoProntos),
        blocos_enunciado: blocosEnunciadoProntos,
        imagem_url: imagemPrincipalUrl,
        alternativas: alternativasFormatadas,
        ano: parseInt(ano),
        banca,
      };

      const { error } = await supabase
        .from('questoes')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      // O gabarito fica em tabela própria (só admin lê).
      const { error: erroGabarito } = await supabase.from('questoes_gabarito').upsert(
        {
          questao_id: id,
          resposta_correta: respostaCorreta,
          comentario: comentario || null,
          video_resolucao_url: urlVideoFormatada || null,
        },
        { onConflict: 'questao_id' },
      );
      if (erroGabarito) throw erroGabarito;

      setSucesso(true);
      setTimeout(() => {
        navigate('/admin/simulados-questoes');
      }, 1500);

    } catch (error) {
      console.error('Erro ao atualizar questão:', error.message);
      avisos.erro('Erro ao atualizar a questão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (carregandoDados) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId);
  const assuntoSelecionadoObj = assuntosArvore.find(a => a.id === assuntoId);
  const previewVideoUrlFormatado = formatarUrlVideo(videoResolucaoUrl);

  // Mapeamento multinível para o select (Nível 1 ➔ Nível 2 ➔ Nível 3)
  const principais = assuntosArvore.filter(a => !a.categoria_pai_id);
  const getSub = (paiId) => assuntosArvore.filter(a => a.categoria_pai_id === paiId);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/simulados-questoes" className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-brand-orange" />
              Editar Questão
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Atualize o enunciado, alternativas e a categoria hierárquica.</p>
          </div>
        </div>

        {sucesso && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 font-bold">
            <CheckCircle2 className="w-6 h-6" />
            Questão atualizada com sucesso! Redirecionando...
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 space-y-8">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Classificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Turma / Nicho</label>
                  <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium cursor-pointer">
                    {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Matéria</label>
                  <input required type="text" value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex: Matemática" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-brand-orange" /> Assunto (Árvore)
                  </label>
                  <select 
                    value={assuntoId} 
                    onChange={(e) => setAssuntoId(e.target.value)} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="">Selecione o assunto final...</option>
                    {principais.map(pai => {
                      const subitensNivel1 = getSub(pai.id);
                      return (
                        <React.Fragment key={pai.id}>
                          <option disabled className="font-black text-slate-900 bg-slate-100">📁 {pai.nome.toUpperCase()}</option>
                          {subitensNivel1.map(sub1 => {
                            const subitensNivel2 = getSub(sub1.id);
                            return (
                              <React.Fragment key={sub1.id}>
                                <option disabled className="font-semibold text-slate-700">&nbsp;&nbsp;&nbsp;&nbsp;📂 {sub1.nome}</option>
                                {subitensNivel2.length > 0 ? (
                                  subitensNivel2.map(sub2 => (
                                    <option key={sub2.id} value={sub2.id}>
                                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 {sub2.nome}
                                    </option>
                                  ))
                                ) : (
                                  <option value={sub1.id}>
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;📄 {sub1.nome} (Geral)
                                  </option>
                                )}
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
                  <select value={dificuldade} onChange={(e) => setDificuldade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium cursor-pointer">
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Banca</label>
                  <input type="text" value={banca} onChange={(e) => setBanca(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ano</label>
                  <input type="number" value={ano} onChange={(e) => setAno(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 border-b border-slate-100 pb-2">Enunciado</h3>
              <BlocoEditor blocos={blocosEnunciado} onChange={setBlocosEnunciado} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Gráfico / Imagem Principal (Opcional)</h3>
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center">
                {!imagemPrincipalPreview ? (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-4">
                    <ImagePlus className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700">Clique para enviar o gráfico principal</span>
                    <input type="file" accept="image/*" onChange={handleImagemPrincipalChange} className="hidden" />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img src={imagemPrincipalPreview} alt="Principal" className="max-h-48 mx-auto rounded-xl border bg-white p-1 object-contain" />
                    <button type="button" onClick={removerImagemPrincipal} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

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

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Resolução da Questão</h3>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-brand-orange" /> Link do Vídeo de Resolução (YouTube)
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Texto Explicativo</label>
                <textarea 
                  value={comentario} 
                  onChange={(e) => setComentario(e.target.value)} 
                  rows="4" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-orange font-medium resize-y text-sm" 
                  placeholder="Explique o passo a passo..."
                ></textarea>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button disabled={loading} type="submit" className="flex items-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all disabled:opacity-70 cursor-pointer">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>

          {/* PREVIEW */}
          <div className="xl:sticky xl:top-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Eye className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Preview</h3>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between text-xs font-bold flex-wrap gap-1">
                <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">{materia || 'Matéria'}</span>
                <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">{assuntoSelecionadoObj?.nome || 'Assunto'}</span>
                <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md capitalize">{dificuldade}</span>
              </div>

              <div className="p-5">
                <p className="text-slate-800 font-medium leading-relaxed mb-4 text-justify">
                  <RenderBlocos blocos={blocosEnunciado} placeholder="Enunciado..." />
                </p>

                {imagemPrincipalPreview && (
                  <img src={imagemPrincipalPreview} alt="Gráfico" className="rounded-xl border border-slate-200 max-h-56 mx-auto mb-5 object-contain" />
                )}

                <div className="space-y-2.5">
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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}