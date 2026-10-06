# Token Studio — v0.2.8

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

## Vincular ficha COMP/CON ao ator

Abra Token Studio no ator piloto → **Ficha do mestre** → importe o link/código ou JSON → **Vincular / atualizar ator…** → revise e aplique. Identidade, retrato, build e mechas começam selecionados. Recursos atuais de combate ficam desmarcados para preservar a sessão. O código e a data de sincronização passam à ficha nativa do Lancer, e o mecha favorito fica ativo no piloto. O retrato é validado e usado por URL, sem cópia local, e aparece na ficha; um token personalizado mantém sua arte e seus ajustes. O token padrão fica vinculado ao ator. Para buscar uma versão nova, use **Atualizar origem**, revise e aplique novamente. Não há sincronização em segundo plano nem escrita na conta COMP/CON.

## Usar

- Escolha uma arte uma vez. Ela prepara o retrato sem borda e o token com sua moldura. **Retrato** e **Token** continuam com enquadramentos separados.
- Importe uma imagem por **Trocar imagem**, arraste um arquivo para a janela ou cole uma imagem. No Foundry, Trocar imagem abre o seletor de arquivos; arquivos locais também podem ser arrastados/colados.
- **Usar URL** valida uma imagem HTTPS pública e mostra sua prévia antes de usar. Links Google com `imgurl` e páginas acessíveis com imagem de prévia são resolvidos; links de busca, pins ou mensagens podem exigir o endereço direto da imagem.
- Arraste a arte para posicionar e role a roda do mouse sobre ela para aumentar ou diminuir o zoom. O gesto entra no desfazer e mantém os ajustes de retrato/token independentes. O zoom mantém a proporção. As setas do teclado também movem a arte; Shift aumenta o passo.
- **Preencher** limita o movimento para evitar espaços vazios. **Mostrar inteira** começa mostrando a imagem completa. **Livre** permite deslocar e reduzir sem limites de preenchimento.
- **Importar borda**, ao lado do título Moldura, aceita PNG/WebP com transparência. A abertura central fechada é detectada automaticamente. Bordas abertas podem ser ajustadas manualmente em Avançado.
- O painel **Avançado** contém rotação, formato do retrato, recorte, opacidade, área interna, presets, histórico e importação/exportação do projeto. **Usar imagem do retrato/token** reutiliza a origem sem copiar o enquadramento.
- **Aplicar** permite escolher retrato da ficha, token padrão e/ou tokens selecionados desse personagem na cena atual. Retrato e token padrão começam selecionados juntos; desmarque um se quiser aplicar só o outro. Em Avançado, desmarque **Usar nova imagem na ficha e no token** para trocar somente a origem em edição.
- Na prévia fora do Foundry, Aplicar gera arquivos PNG/WebP e mostra links explícitos para baixá-los. Projeto exportado é um JSON que inclui os originais.

## Molduras do seu pacote

As molduras favoritadas aparecem primeiro no catálogo e até seis atalhos ficam na tela inicial, persistindo neste navegador.

**Escolher do catálogo** oferece 330 molduras transparentes, divididas em coleções, com busca, favoritas e páginas de 24 miniaturas. As 356 imagens originais do RAR foram preservadas byte a byte; 26 fundos/máscaras opacos continuam em `assets/frames`, sem aparecer como moldura. Bordas com abertura fechada são detectadas automaticamente; bordas abertas exigem conferir o recorte manual. Nomes originais e coleções estão em `assets/frames/credits.json`. O pacote não atribui uma licença nova às artes fornecidas por você.

## Ficha do mestre

Mude para **Ficha do mestre**, cole o link público COMP/CON v3 e carregue. Ative Editar ficha para modificar sua cópia; atualizações têm revisão por grupo e preservam alterações locais por padrão. A navegação separa **Perfil narrativo**, **Perfil tático**, **Loadout do piloto** e **Hangar**. O seletor de unidade acompanha a navegação; ações, combate e equipamentos mostram o piloto ou mecha escolhido. O perfil tático agrupa gatilhos, talentos, licenças e core bonuses em abas, com ranks adquiridos e regras completas expansíveis. No hangar, selecione o mecha e seu loadout para consultar frame, traits, core system, montagens, armas e sistemas. **Editar ficha** abre os campos editáveis; o modo de leitura apresenta valores claros. JSON e histórico ficam nas ferramentas do mestre. Os homebrews e campos adicionais permanecem no projeto.

**Ações e efeitos** agrupa cada arma, sistema, talento, frame e demais origens em um cartão fechado com contagens de ações, passivas, efeitos e descrições. Combine busca, origem, categoria e ativação; ranks/loadouts inativos são opcionais. Abra uma origem para consultar suas regras. Regras `None` ficam em passivas, com frequência e gatilho preservados. **Pendências** aponta definições ausentes, dados sem classificação, listas inválidas e problemas de retrato, com acesso ao caminho original.

Na edição da ficha, **Retrato por URL** atualiza a unidade selecionada. Ao aplicar ao ator, o módulo valida de novo e grava a URL, sem upload. Arquivos locais e resultados exportados usam um nome SHA-256 compartilhado entre atores: conteúdo idêntico reutiliza o arquivo existente. Arquivos antigos permanecem no mundo.

No Foundry, **Revisar alterações** separa identidade/build/combate/mechas, mostra alterações antes de aplicar e salva um backup. A revisão valida o ator e as referências de equipamento usando o Lancer instalado; após aplicar, o módulo prepara a ficha nativa e restaura os documentos se essa preparação falhar. A edição remota da conta COMP/CON não está implementada: você edita sua cópia e/ou documentos Foundry autorizados. Efeitos de ações, regras especiais, rolagens e derivados da cópia não são automatizados integralmente. Leia [COMP_CON_GUIDE.md](COMP_CON_GUIDE.md) para entender os destinos, conflitos e limites.

## O que já está implementado

Movimento direto, zoom uniforme, recorte circular/retangular, enquadramento com rotação, PNG/JPG/WebP, preservação de origem GIF, bordas próprias, transparência, fundo sólido, previews, estados separados, até 40 operações no histórico da sessão, presets, rascunho local com recuperação, projeto portátil, exportação PNG/WebP em 256/512/1024/2048 px e integração por APIs do Foundry 13.

As imagens de exemplo são somente demonstrações. Você pode substituir a imagem e importar suas próprias bordas.

## Estado da validação

O editor foi exercitado no navegador e o núcleo tem testes automatizados de geometria, separação de estados e aplicação/restauração dos destinos. **A execução em uma instalação real de Foundry 13 + Lancer ainda não foi validada neste ambiente.** O manifesto não declara versão verificada. Consulte `VALIDATION.md` e faça o primeiro ensaio em um personagem de teste.

## Limites desta versão

- Edição e exportação de tokens são estáticas. GIFs preservam o original, mostram aviso de exportação estática e permitem manter o retrato animado original sem recorte/moldura. Vídeos e exportação WebM ainda não estão implementados. Não há promessa de reprodução/animação completa no canvas.
- Wildcards não são substituídos no token padrão: essa aplicação é interrompida. Tokens selecionados podem ser atualizados individualmente.
- Não há edição por pincel, remoção automática de fundo, pilha arbitrária de camadas nem processamento em lote nesta versão. A composição atual é origem, fundo, recorte e borda.
- URLs externas precisam permitir CORS para editar/exportar. Retratos que permitem apenas visualização podem ser vinculados à ficha; o editor indica o limite e preserva a arte atual do token. URLs temporárias, como anexos do Discord, podem expirar.
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

### Edição de atores existentes

Abrir o editor mantém a imagem já composta do token. Retratos novos começam em **Mostrar inteira**; a aplicação adapta o retrato à área quadrada da ficha Lancer. Em projetos antigos, o enquadramento escolhido é preservado e recebe margem transparente na exportação. Se um recorte já estiver salvo no projeto, ajuste o retrato em **Mostrar inteira** e **Centralizar** para reenquadrar a imagem original.

Sem moldura própria, anéis dinâmicos recebem uma imagem preparada para seu interior. Escolher uma moldura do módulo substitui o anel nos destinos aplicados. Ao abrir pela ficha de um token, esse token da cena atual também aparece entre os destinos.
