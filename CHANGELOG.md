# Changelog

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
