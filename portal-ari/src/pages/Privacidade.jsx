import React from 'react';
import { Link } from 'react-router-dom';
import DocumentoLegal, { EmailContato, identificacaoResponsavel } from '../components/DocumentoLegal';
import { NOME_PLATAFORMA } from '../config/responsavel';

// Política de privacidade (LGPD — Lei 13.709/2018). Ao mudar o texto, atualize TERMOS_VERSAO
// em src/config/responsavel.js.

const P = NOME_PLATAFORMA;

const secoes = [
  {
    id: 'controlador',
    titulo: 'Quem cuida dos seus dados',
    conteudo: (
      <>
        <p>
          O responsável pelos seus dados pessoais no <strong>{P}</strong> (o "controlador", nos termos da Lei Geral de
          Proteção de Dados — LGPD, Lei 13.709/2018) é <strong>{identificacaoResponsavel()}</strong>.
        </p>
        <p>Para qualquer assunto sobre seus dados, fale com o encarregado pelo e-mail <EmailContato />.</p>
      </>
    ),
  },
  {
    id: 'dados',
    titulo: 'Quais dados coletamos',
    conteudo: (
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (a senha é guardada criptografada; ninguém da equipe consegue vê-la).</li>
        <li><strong>Turma e acesso:</strong> sua turma (ex.: Concursos ou ENEM), plano, packs comprados e prazos de acesso.</li>
        <li><strong>Estudo:</strong> aulas assistidas, respostas das questões e simulados, anotações, favoritos, caderno de erros, pontos (XP) e dias de estudo.</li>
        <li><strong>Pagamentos:</strong> valor, data, situação da assinatura ou compra e identificadores da Stripe. <strong>Não guardamos os dados do seu cartão</strong> — eles ficam só com a Stripe.</li>
        <li><strong>Técnicos:</strong> registros de acesso (data, hora e endereço IP), mantidos pelos nossos provedores, como exige o Marco Civil da Internet.</li>
      </ul>
    ),
  },
  {
    id: 'uso',
    titulo: 'Para que usamos',
    conteudo: (
      <ul>
        <li><strong>Prestar o serviço que você contratou</strong> (execução de contrato): criar sua conta, liberar o conteúdo da sua turma e dos packs, guardar seu progresso.</li>
        <li><strong>Cobrar e cumprir obrigações legais:</strong> processar pagamentos, reembolsos e guardar registros exigidos por lei.</li>
        <li><strong>Proteger o conteúdo</strong> (legítimo interesse): exibir seu nome e e-mail como marca d'água nos vídeos e evitar o compartilhamento de contas.</li>
        <li><strong>Ranking e gamificação:</strong> seu <strong>primeiro nome</strong> e seus pontos podem aparecer no ranking para outros alunos.</li>
        <li><strong>Comunicação:</strong> e-mails sobre sua conta (confirmação, recuperação de senha, convites) e avisos importantes sobre a plataforma.</li>
      </ul>
    ),
  },
  {
    id: 'compartilhamento',
    titulo: 'Com quem compartilhamos',
    conteudo: (
      <>
        <p>Não vendemos seus dados. Eles são tratados apenas pelos serviços necessários para a plataforma funcionar:</p>
        <ul>
          <li><strong>Supabase</strong> — banco de dados, login e arquivos (servidores que podem ficar fora do Brasil).</li>
          <li><strong>Stripe</strong> — processamento dos pagamentos com cartão.</li>
          <li><strong>Vercel</strong> — hospedagem do site.</li>
          <li><strong>YouTube (Google)</strong> — exibição das videoaulas e lives; ao assistir, o YouTube pode registrar dados de navegação conforme a política de privacidade do Google.</li>
        </ul>
        <p>
          Alguns desses serviços guardam dados em outros países. Nesses casos, a transferência acontece para executar o
          contrato com você e com empresas que adotam padrões de segurança compatíveis com a LGPD. Também podemos
          fornecer dados quando a lei ou uma ordem judicial exigir.
        </p>
      </>
    ),
  },
  {
    id: 'navegador',
    titulo: 'O que fica salvo no seu navegador',
    conteudo: (
      <p>
        Usamos o armazenamento do navegador só para o essencial: manter você conectado e lembrar pequenas preferências
        (como a turma escolhida ou se você já viu o aviso para instalar o app). Não usamos cookies de publicidade.
      </p>
    ),
  },
  {
    id: 'prazo',
    titulo: 'Por quanto tempo guardamos',
    conteudo: (
      <ul>
        <li>Enquanto sua conta existir, para você continuar de onde parou.</li>
        <li>Quando a conta é excluída, apagamos o cadastro e o histórico de estudo.</li>
        <li>Registros de pagamento podem ser guardados pelo prazo exigido pelas leis fiscais e de consumo (em geral, até 5 anos), e registros de acesso por 6 meses (Marco Civil da Internet).</li>
      </ul>
    ),
  },
  {
    id: 'seguranca',
    titulo: 'Segurança',
    conteudo: (
      <p>
        Usamos conexão segura (HTTPS), senhas criptografadas e regras de acesso no banco de dados para que cada aluno veja
        apenas os próprios dados. Nenhum sistema é 100% invulnerável; se acontecer um incidente que traga risco para você,
        avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), como manda a lei.
      </p>
    ),
  },
  {
    id: 'direitos',
    titulo: 'Seus direitos',
    conteudo: (
      <>
        <p>Pela LGPD (art. 18), você pode, a qualquer momento e de graça:</p>
        <ul>
          <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
          <li>corrigir dados incompletos ou errados;</li>
          <li>pedir a exclusão da sua conta e dos seus dados (exceto o que a lei manda guardar);</li>
          <li>pedir uma cópia dos seus dados (portabilidade);</li>
          <li>saber com quem compartilhamos seus dados;</li>
          <li>revogar consentimentos e se opor a tratamentos que você considere irregulares.</li>
        </ul>
        <p>
          Para exercer qualquer direito, escreva para <EmailContato /> usando o e-mail da sua conta. Respondemos em até
          15 dias. Se não ficar satisfeito, você pode reclamar à ANPD (gov.br/anpd).
        </p>
      </>
    ),
  },
  {
    id: 'menores',
    titulo: 'Menores de idade',
    conteudo: (
      <p>
        Alunos menores de 18 anos devem usar a plataforma com autorização dos pais ou responsáveis. Tratamos os dados
        de crianças e adolescentes sempre no seu melhor interesse e apenas para as finalidades descritas aqui.
      </p>
    ),
  },
  {
    id: 'mudancas',
    titulo: 'Mudanças nesta política',
    conteudo: (
      <p>
        Podemos atualizar esta política. A data da versão fica no topo desta página, e mudanças importantes serão
        avisadas na plataforma ou por e-mail. Veja também os{' '}
        <Link to="/termos" className="font-semibold text-brand-orange hover:underline">Termos de uso</Link>.
      </p>
    ),
  },
];

export default function Privacidade() {
  return (
    <DocumentoLegal
      titulo="Política de privacidade"
      resumo={`Quais dados o ${P} guarda, para que servem, com quem são compartilhados e como você controla tudo isso.`}
      secoes={secoes}
      outro={{ to: '/termos', rotulo: 'Termos de uso' }}
    />
  );
}
