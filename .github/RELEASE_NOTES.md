# Token Studio v0.2.2

Corrige a ausência de Token Studio no menu de contexto dos atores no Foundry 13.

## Correções

- Usa o evento público `getActorContextOptions`; o evento antigo deixou de existir no Foundry 13.
- Abre o ator clicado e respeita as permissões do mestre.
- Evita entradas duplicadas e sincroniza a versão da API.

## Instalação

Atualize Token Studio para 0.2.2 e recarregue o mundo. Como mestre, clique com o botão direito no ator e escolha Token Studio.

Manifesto: https://raw.githubusercontent.com/STR4DZN/token-studio/main/module.json

## Validação

42 testes automatizados, incluindo novas verificações de abertura e permissões. A integração em Foundry 13 + Lancer reais aguarda confirmação; o manifesto não declara compatibilidade verificada.
