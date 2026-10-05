# Token Studio v0.2.3 — correção de carregamento

O módulo 0.2.2 falhava ao carregar o editor com `ReferenceError: process is not defined`, antes de registrar o menu de atores e a API. O erro foi reproduzido no ZIP oficial, com checksum confirmado.

## Correção

- Build de biblioteca com React em produção, sem depender da variável Node `process` no navegador.
- Mantém o evento `getActorContextOptions` correto para Foundry 13.
- Publicação passa a carregar o editor compilado e todas as dependências reais num contexto sem globais Node; não substitui React por uma simulação.

## Atualizar

Atualize Token Studio para 0.2.3 e recarregue o mundo. Como mestre: botão direito no ator → Token Studio.

## Verificação

42 testes existentes e 3 testes novos do pacote compilado. A execução visual em Foundry 13 + Lancer reais ainda precisa ser confirmada na instalação do usuário.
