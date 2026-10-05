# Token Studio v0.2.1

Versão para testar o editor independente de tokens e o painel de ficha COMP/CON no Foundry 13.

## Instalação

Em **Instalar módulo**, use:

```text
https://raw.githubusercontent.com/STR4DZN/token-studio/main/module.json
```

Anexos: `module.json`, `token-studio.zip` e `SHA256SUMS.txt`. O ZIP contém o módulo compilado; os arquivos automáticos **Source code** contêm o projeto de desenvolvimento.

## Alterações

- Manifesto com URL estável para instalação e atualização e download fixado na versão.
- Versão 0.2.1 sincronizada no projeto e nos manifestos.
- ZIP de distribuição reconstruído e validado; o arquivo anterior estava incompleto.
- Workflow de build, validação de tag e publicação de anexos nas próximas releases.

## Validação e limites

39 testes do editor, COMP/CON e adaptador Foundry passaram. Outros 4 testes da prévia também passaram. Builds da prévia e módulo concluídos; integridade de todas as entradas do ZIP verificada.

A execução em **Foundry 13 + Lancer reais permanece pendente**. O manifesto não declara versão verificada. Faça o primeiro ensaio em um personagem de teste e siga `VALIDATION.md`.
