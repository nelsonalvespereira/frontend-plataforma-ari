import React from 'react';
import { Link } from 'react-router-dom';
import DocumentoLegal, { EmailContato, identificacaoResponsavel } from '../components/DocumentoLegal';
import { NOME_PLATAFORMA, RESPONSAVEL } from '../config/responsavel';

// Termos de uso. Ao mudar o texto, atualize TERMOS_VERSAO em src/config/responsavel.js.

const P = NOME_PLATAFORMA;

const secoes = [
  {
    id: 'quem-somos',
    titulo: 'Quem somos',
    conteudo: (
      <>
        <p>
          O <strong>{P}</strong> é uma plataforma on-line de estudos de matemática, com videoaulas, banco de questões,
          simulados, lives e materiais de apoio para concursos e ENEM.
        </p>
        <p>
          A plataforma é oferecida por <strong>{identificacaoResponsavel()}</strong> ("nós"). Contato: <EmailContato />.
        </p>
        <p>
          Ao criar uma conta ou usar a plataforma, você ("aluno") declara que leu e concorda com estes Termos e com a{' '}
          <Link to="/privacidade" className="font-semibold text-brand-orange hover:underline">Política de privacidade</Link>.
          Se não concordar, não use a plataforma.
        </p>
      </>
    ),
  },
  {
    id: 'conta',
    titulo: 'Sua conta',
    conteudo: (
      <ul>
        <li>Para usar a plataforma é preciso criar uma conta com nome, e-mail e senha verdadeiros.</li>
        <li>
          A conta é <strong>pessoal e intransferível</strong>. Não compartilhe sua senha nem permita que outras pessoas
          assistam às aulas pela sua conta.
        </li>
        <li>Você é responsável por manter sua senha em segredo e por tudo o que for feito com a sua conta.</li>
        <li>
          Menores de 18 anos devem usar a plataforma com autorização e acompanhamento dos pais ou responsáveis, que
          também respondem pela contratação.
        </li>
      </ul>
    ),
  },
  {
    id: 'planos',
    titulo: 'Assinaturas e packs',
    conteudo: (
      <>
        <p><strong>Assinatura.</strong> Dá acesso ao conteúdo da sua turma enquanto estiver ativa. A cobrança é feita
          no cartão de crédito, de forma recorrente, a cada período contratado (por exemplo, mensal), até que você cancele.</p>
        <p><strong>Packs avulsos.</strong> São compras únicas que liberam um conteúdo específico (aulões, questões, lives
          e materiais) por um prazo informado na página de compra (por exemplo, 30 dias). Comprar o mesmo pack de novo
          antes do fim soma os dias. Ao fim do prazo, o acesso ao pack termina.</p>
        <p>Os preços, a duração e o que cada plano ou pack inclui aparecem antes do pagamento. Os pagamentos são
          processados pela <strong>Stripe</strong>; os dados do seu cartão não ficam guardados na plataforma.</p>
        <p>Podemos mudar preços de novas contratações a qualquer momento. Se o preço da sua assinatura mudar, você será
          avisado antes da próxima cobrança e poderá cancelar.</p>
      </>
    ),
  },
  {
    id: 'cancelamento',
    titulo: 'Cancelamento e reembolso',
    conteudo: (
      <>
        <p>
          <strong>Direito de arrependimento.</strong> Você pode desistir de qualquer compra (assinatura ou pack) em até{' '}
          <strong>7 (sete) dias</strong> contados do pagamento e receber o <strong>reembolso integral</strong>, conforme o
          art. 49 do Código de Defesa do Consumidor. Basta pedir pelo e-mail <EmailContato />. O reembolso volta para o
          mesmo cartão, nos prazos da operadora, e o acesso comprado é encerrado.
        </p>
        <p>
          <strong>Assinatura, depois dos 7 dias.</strong> Você pode cancelar quando quiser, pelo próprio portal (área de
          pagamento) ou pelo e-mail de contato. O cancelamento interrompe as próximas cobranças e você continua com acesso
          até o fim do período já pago. Não há reembolso proporcional de período já iniciado.
        </p>
        <p>
          <strong>Pack, depois dos 7 dias.</strong> Não há reembolso. O acesso continua até o fim do prazo do pack.
        </p>
        <p>
          <strong>Contestação no cartão.</strong> Se o pagamento for contestado junto ao banco (chargeback) ou
          reembolsado, o acesso ligado a ele é encerrado.
        </p>
      </>
    ),
  },
  {
    id: 'cortesia',
    titulo: 'Acessos gratuitos (cortesia e convite)',
    conteudo: (
      <p>
        O professor pode liberar acesso gratuito a alguns alunos, por cortesia ou por convite. Esse acesso é uma
        liberalidade: não gera direito a reembolso nem a manutenção, e pode ser alterado ou encerrado a qualquer momento.
      </p>
    ),
  },
  {
    id: 'conteudo',
    titulo: 'Uso do conteúdo',
    conteudo: (
      <>
        <p>
          Todas as aulas, vídeos, lives, questões comentadas, resoluções, apostilas e PDFs são protegidos por direitos
          autorais (Lei 9.610/98) e são licenciados apenas para o <strong>seu estudo pessoal</strong>, enquanto seu acesso
          estiver ativo.
        </p>
        <p>É proibido, sem autorização por escrito:</p>
        <ul>
          <li>gravar a tela, baixar, copiar ou extrair vídeos, lives, questões ou materiais;</li>
          <li>compartilhar, vender, revender ou publicar o conteúdo em qualquer lugar (grupos, redes sociais, sites, drives);</li>
          <li>compartilhar links, senha ou acesso com outras pessoas;</li>
          <li>usar robôs ou programas para copiar o conteúdo da plataforma.</li>
        </ul>
        <p>
          Para proteger o conteúdo, os vídeos exibem uma <strong>marca d'água com o seu nome e e-mail</strong>. Isso
          permite identificar a origem de cópias indevidas.
        </p>
      </>
    ),
  },
  {
    id: 'suspensao',
    titulo: 'Suspensão e encerramento da conta',
    conteudo: (
      <p>
        Se você descumprir estes Termos (por exemplo, compartilhando a conta ou o conteúdo), podemos suspender ou
        encerrar o seu acesso, sem reembolso do período em que a regra foi descumprida, sem prejuízo das medidas legais
        cabíveis. Você também pode pedir o encerramento da sua conta a qualquer momento pelo e-mail de contato.
      </p>
    ),
  },
  {
    id: 'plataforma',
    titulo: 'Funcionamento da plataforma',
    conteudo: (
      <>
        <p>
          Trabalhamos para manter a plataforma no ar e funcionando bem, mas ela pode passar por manutenções, falhas de
          internet ou de serviços de terceiros (como hospedagem e vídeos). Nesses casos faremos o possível para
          normalizar o acesso o quanto antes.
        </p>
        <p>
          O conteúdo é preparado com cuidado para ajudar na sua preparação, mas a aprovação em provas depende de vários
          fatores; não garantimos aprovação ou resultado.
        </p>
        <p>O conteúdo das turmas, aulas e packs pode ser atualizado, reorganizado ou substituído ao longo do tempo.</p>
      </>
    ),
  },
  {
    id: 'mudancas',
    titulo: 'Mudanças nestes Termos',
    conteudo: (
      <p>
        Podemos atualizar estes Termos. A data da versão fica no topo desta página. Mudanças importantes serão avisadas
        na plataforma ou por e-mail. Se continuar usando a plataforma depois do aviso, você concorda com a nova versão.
      </p>
    ),
  },
  {
    id: 'foro',
    titulo: 'Lei aplicável e foro',
    conteudo: (
      <p>
        Estes Termos seguem as leis do Brasil. Eventuais conflitos serão resolvidos no foro{' '}
        {RESPONSAVEL.cidadeForo
          ? <>da comarca de <strong>{RESPONSAVEL.cidadeForo}</strong>, ressalvado o direito do consumidor de escolher o foro do seu domicílio.</>
          : <>do domicílio do aluno, conforme o Código de Defesa do Consumidor.</>}{' '}
        Antes disso, fale com a gente: <EmailContato />.
      </p>
    ),
  },
];

export default function Termos() {
  return (
    <DocumentoLegal
      titulo="Termos de uso"
      resumo={`As regras para usar o ${P}: sua conta, pagamentos, cancelamento e o uso das aulas e materiais.`}
      secoes={secoes}
      outro={{ to: '/privacidade', rotulo: 'Política de privacidade' }}
    />
  );
}
