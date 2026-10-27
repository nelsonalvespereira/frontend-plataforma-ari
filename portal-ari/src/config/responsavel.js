// Dados de quem responde legalmente pelo portal. Aparecem nos Termos de uso e na
// Política de privacidade. Campo vazio ('') simplesmente não aparece nos documentos.
//
// PARA PREENCHER quando o Ari mandar:
//   documento: 'CPF 123.***.***-00'  ou  'CNPJ 12.345.678/0001-90'
//   endereco:  'Rua Tal, 100 - Bairro, Cidade/UF, CEP 00000-000'
//   cidadeForo: 'São Luís/MA'   (cidade do foro; se vazio, vale o domicílio do aluno)

export const RESPONSAVEL = {
  nome: 'José De Arimatea Dias Mendes',
  documento: '',
  endereco: '',
  cidadeForo: '',
  email: 'arimendes85113@gmail.com',
};

export const NOME_PLATAFORMA = 'Arimática Gabaritando';

// Mude esta data sempre que alterar o texto dos Termos ou da Privacidade.
// Ela fica gravada na conta de quem aceitou no cadastro.
export const TERMOS_VERSAO = '2026-10-27';
