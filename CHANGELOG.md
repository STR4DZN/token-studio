# Changelog

## 0.2.5 — 2026-10-05

- Vincula a ficha COMP/CON ao piloto nativo: dados existentes, código público, data de sincronização e origem registrada no ator. O token padrão acompanha o nome e fica vinculado ao piloto.
- Importa o retrato v3/legado/embutido, valida e guarda o original no Foundry, atualiza a imagem da ficha e o editor já aberto.
- Preserva arte, moldura, enquadramento, escala e demais ajustes de tokens personalizados; usa o retrato somente quando a arte do token é padrão.
- Acrescenta retrato à revisão, ativa identidade/retrato/build/recursos/mechas por padrão e mantém a aplicação explícita. Mostra o retrato e o estado do vínculo na ficha do mestre.
- Reconfere alterações concorrentes após download e backup; recupera imagem e token junto dos dados quando a aplicação falha.
- Dez regressões novas cobrem vínculo completo, atualização, FilePicker e retorno ao editor, falhas de imagem, concorrência e restauração. Foundry 13 + Lancer reais ainda requerem confirmação.

## 0.2.4

- Corrige a junção dos caminhos das imagens quando a rota de assets não termina em barra, preservando prefixos do servidor.
- Usa a mesma função para miniaturas, originais e imagens padrão; os arquivos originais permanecem intactos.
- Adiciona regressão na passagem dos caminhos Foundry → editor e verifica por HTTP todos os arquivos do catálogo empacotado, com e sem prefixo.

## 0.2.3 — 2026-10-05

- Corrige o carregamento do módulo no navegador: o build em modo biblioteca agora substitui `process.env.NODE_ENV` por `production`. O React empacotado não exige mais a variável Node `process`.
- Reproduz o erro `ReferenceError: process is not defined` no ZIP oficial 0.2.2, que interrompia a importação antes do registro do menu, cabeçalhos e API.
- Adiciona testes do grafo real de módulos empacotados, incluindo React, sem globais Node e sem substituir o editor por uma simulação. Esses testes fazem parte da publicação e impedem a liberação de um pacote que falhe ao carregar.
- Mantém a integração de contexto `getActorContextOptions` da versão 13. Validação no Foundry real ainda depende da instalação do usuário.

## 0.2.2 — 2026-10-05

- Corrige a entrada Token Studio no menu de contexto dos atores: utiliza `getActorContextOptions`, evento público do Foundry 13, em vez do evento removido da versão 12.
- Resolve o ator clicado pela coleção do aplicativo e respeita permissão de edição; evita entradas duplicadas.
- Corrige a versão exposta pela API para acompanhar o módulo instalado.
- Adiciona testes de abertura pelo menu e pelos cabeçalhos V1/V2. A execução em Foundry 13 + Lancer reais ainda requer validação.

## 0.2.1 — 2026-10-05

- Prepara distribuição pelo GitHub com manifesto de instalação e ZIP fixado na tag `v0.2.1`.
- Mantém versões do código-fonte, manifesto e pacote em sincronia.
- Adiciona validação do pacote, checksums e workflow de publicação de releases.
- Reconstrói o ZIP de distribuição anterior que estava incompleto.
- Mantém o comportamento da 0.2.0. Validação em Foundry 13 + Lancer reais permanece pendente.

## 0.2.0 — 2026-10-05

- Catálogo de 330 molduras e preservação das 356 imagens fornecidas.
- Importação de ficha pública COMP/CON, edição local, comparação de atualizações e painel do mestre.
- Revisão e backup antes de aplicar alterações aos atores no Foundry.

## 0.1.0 — 2026-10-05

- Editor independente de retratos e tokens, enquadramentos separados, molduras, presets e exportação PNG/WebP.
