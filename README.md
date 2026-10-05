# Token Studio — v0.2.2

Editor independente de retratos e tokens, catálogo de molduras e painel de ficha COMP/CON para o mestre. Interface baseada na proposta visual escolhida: tema escuro, destaque violeta, imagem grande e controles diretos.

## Instalar no Foundry 13

No menu **Instalar módulo**, cole o manifesto:

```text
https://raw.githubusercontent.com/STR4DZN/token-studio/main/module.json
```

O manifesto usa um ZIP fixado na versão da release. O arquivo `token-studio.zip` da release contém somente o módulo pronto para instalar; os ZIPs automáticos **Source code** são para desenvolvimento.

### Instalação manual

1. Extraia o pacote.
2. Copie a pasta `token-studio` para `Data/modules/`. O caminho final deve ser `Data/modules/token-studio/module.json`, sem uma segunda pasta intermediária.
3. Reinicie o Foundry, abra o mundo e ative **Token Studio** em Gerenciar módulos.
4. Como mestre, abra uma ficha e clique em **Token Studio** no cabeçalho/menu de cabeçalho. Também há uma opção no menu de contexto do personagem na lista de atores.
5. Em Configurar configurações, escolha **Token Studio: pasta de imagens**. O padrão é `token-studio`, dentro de Data.

O Tokenizer não é necessário. Esta versão não depende de outros módulos. Fontes, ícones e o editor são distribuídos no pacote, sem CDN.

## Usar

- Escolha **Retrato** ou **Token**. Cada um tem imagem e enquadramento próprios.
- Importe uma imagem por **Trocar imagem**, arraste um arquivo para a janela ou cole uma imagem. No Foundry, Trocar imagem abre o seletor de arquivos; arquivos locais também podem ser arrastados/colados.
- Arraste a arte para posicionar. O zoom mantém a proporção. As setas do teclado também movem a arte; Shift aumenta o passo.
- **Preencher** limita o movimento para evitar espaços vazios. **Mostrar inteira** começa mostrando a imagem completa. **Livre** permite deslocar e reduzir sem limites de preenchimento.
- **Importar borda**, ao lado do título Moldura, aceita PNG/WebP com transparência. A abertura central fechada é detectada automaticamente. Bordas abertas podem ser ajustadas manualmente em Avançado.
- O painel **Avançado** contém rotação, formato do retrato, recorte, opacidade, área interna, presets, histórico e importação/exportação do projeto. **Usar imagem do retrato/token** reutiliza a origem sem copiar o enquadramento.
- **Aplicar** permite escolher retrato da ficha, token padrão e/ou tokens selecionados desse personagem na cena atual. Esses destinos não são marcados juntos automaticamente.
- Na prévia fora do Foundry, Aplicar gera arquivos PNG/WebP e mostra links explícitos para baixá-los. Projeto exportado é um JSON que inclui os originais.

## Molduras do seu pacote

**Escolher do catálogo** oferece 330 molduras transparentes, divididas em coleções, com busca, favoritas e páginas de 24 miniaturas. As 356 imagens originais do RAR foram preservadas byte a byte; 26 fundos/máscaras opacos continuam em `assets/frames`, sem aparecer como moldura. Bordas com abertura fechada são detectadas automaticamente; bordas abertas exigem conferir o recorte manual. Nomes originais e coleções estão em `assets/frames/credits.json`. O pacote não atribui uma licença nova às artes fornecidas por você.

## Ficha do mestre

Mude para **Ficha do mestre**, cole o link público COMP/CON v3 e carregue. Ative Editar ficha para modificar sua cópia; atualizações têm revisão por grupo e preservam alterações locais por padrão. O painel cobre identidade, HASE, biografia, habilidades/ranks/ações, equipamentos, mechas, recursos, notas locais do mestre, histórico e JSON completo. Os homebrews e campos adicionais permanecem no projeto.

No Foundry, **Revisar alterações** separa identidade/build/combate/mechas, mostra alterações antes de aplicar e salva um backup. A edição remota da conta COMP/CON não está implementada: você edita sua cópia e/ou documentos Foundry autorizados. Efeitos de ações, regras especiais, rolagens e derivados da cópia não são automatizados integralmente. Leia [COMP_CON_GUIDE.md](COMP_CON_GUIDE.md) para entender os destinos, conflitos e limites.

## O que já está implementado

Movimento direto, zoom uniforme, recorte circular/retangular, enquadramento com rotação, PNG/JPG/WebP, preservação de origem GIF, bordas próprias, transparência, fundo sólido, previews, estados separados, até 40 operações no histórico da sessão, presets, rascunho local com recuperação, projeto portátil, exportação PNG/WebP em 256/512/1024/2048 px e integração por APIs do Foundry 13.

As imagens de exemplo são somente demonstrações. Você pode substituir a imagem e importar suas próprias bordas.

## Estado da validação

O editor foi exercitado no navegador e o núcleo tem testes automatizados de geometria, separação de estados e aplicação/restauração dos destinos. **A execução em uma instalação real de Foundry 13 + Lancer ainda não foi validada neste ambiente.** O manifesto não declara versão verificada. Consulte `VALIDATION.md` e faça o primeiro ensaio em um personagem de teste.

## Limites desta versão

- Edição e exportação de tokens são estáticas. GIFs preservam o original, mostram aviso de exportação estática e permitem manter o retrato animado original sem recorte/moldura. Vídeos e exportação WebM ainda não estão implementados. Não há promessa de reprodução/animação completa no canvas.
- Wildcards não são substituídos no token padrão: essa aplicação é interrompida. Tokens selecionados podem ser atualizados individualmente.
- Não há edição por pincel, remoção automática de fundo, pilha arbitrária de camadas nem processamento em lote nesta versão. A composição atual é origem, fundo, recorte e borda.
- URLs externas precisam permitir CORS para exportação. Importe o arquivo local quando o servidor externo bloquear o acesso.
- Rascunhos são locais ao navegador, usuário, mundo e personagem; não são compartilhados automaticamente. Aplicar salva o projeto no personagem. Exportar projeto cria uma cópia portátil.
- Arquivos enviados antes de uma falha de atualização podem continuar na pasta de saída. O módulo não apaga arquivos antigos ou originais automaticamente.
- Use um tema de borda próprio ou o anel dinâmico existente. Ao aplicar uma borda embutida, o anel dinâmico é desativado apenas no destino escolhido para evitar borda dupla; escala, visão, vida, equipamento e tamanho do token são preservados.

## Desenvolver

O código-fonte está no repositório GitHub e no diretório `codigo-fonte` do pacote completo. Com Node.js 22 e Python 3 instalados:

```sh
npm ci
npm run dev
npm test
npm run build
npm run build:module
```

`build:module` produz `release/token-studio`. `npm run release:assets` valida as versões e produz `release/assets/module.json`, `token-studio.zip` e `SHA256SUMS.txt`. A tag deve ser `v` seguida da versão do manifesto; o workflow de release verifica essa correspondência antes de publicar os anexos. O editor usa React/Vite; `foundry/` contém a integração e a aplicação dos destinos; `src/engine.js` contém a geometria e o renderizador; `src/storage.js` contém os rascunhos locais. Não há chamadas ao Tokenizer.

## Abrir por macro

Selecione um token e execute:

```js
const token = canvas.tokens.controlled[0];
if (token?.actor) await game.modules.get('token-studio').api.open(token.actor, token.document);
else ui.notifications.warn('Selecione um token.');
```

Para abrir diretamente a ficha, usando um ator piloto selecionado:

```js
const actor = canvas.tokens.controlled[0]?.actor;
if (actor) await game.modules.get('token-studio').api.openSheet(actor);
```

## Fontes técnicas

APIs oficiais usadas como referência: ApplicationV2, FilePicker, controles de cabeçalho, TokenRingData e documentos Actor/Token do Foundry 13. Licenças de React, React DOM, DOMPurify, Inter e Font Awesome estão incluídas em `licenses/` na pasta do módulo.


## Licenças e materiais

A licença MIT do projeto se aplica ao código próprio. Licenças das bibliotecas estão em `licenses/`; as artes de moldura fornecidas pelo usuário mantêm seus nomes/coleções em `assets/frames/credits.json` e não recebem automaticamente a licença do código.
