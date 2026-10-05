# Especificação — Token Studio

## Decisões confirmadas

- Módulo independente do Tokenizer, voltado ao mestre, alvo inicial Foundry 13 + Lancer.
- Proposta visual escolhida: a primeira imagem, tema escuro com violeta, canvas à esquerda e ajustes/prévias à direita.
- Interação semelhante ao recorte de avatar: arrastar a imagem, controle explícito de zoom, sem atalhos obrigatórios.
- Bordas próprias fornecidas pelo usuário, importadas com transparência; amostras do pacote não substituem as bordas do usuário.
- Ajuda e facilidades do editor; barras de vida e recursos de combate não fazem parte do escopo.

## Regras de imagem

1. O arquivo original nunca é sobrescrito. Edições são parâmetros e composições separados.
2. A transformação da origem usa uma única escala para os dois eixos. Imagens e bordas não são esticadas para preencher o destino.
3. Retrato e token têm fontes, enquadramentos e formatos independentes.
4. A geometria usa coordenadas normalizadas do destino, e não pixels da janela. Redimensionar a janela não altera o recorte exportado.
5. Preencher usa a área de recorte e a rotação para calcular a escala mínima; deslocamentos são limitados no espaço da imagem rotacionada.
6. Mostrar inteira considera os cantos da imagem. Em recorte circular, não basta encaixar o retângulo em um quadrado: os quatro cantos precisam caber no círculo.
7. O mesmo renderizador produz a prévia final e a exportação. O canvas de edição mostra o contexto externo escurecido e uma guia de recorte; a borda final aparece na prévia do token.
8. A máscara automática usa somente a região transparente central encerrada pela borda. Transparência externa não é confundida com abertura interna. A detecção não pretende resolver bordas abertas ou com várias aberturas.
9. A origem animada é preservada. A saída estática recebe aviso explícito; manter o retrato animado original é uma opção separada que ignora a composição estática.
10. Exportação distingue formato, resolução e qualidade da origem. Aumentar a resolução não cria detalhe.

## Modelo persistido

Projeto versão 1: modo ativo, data de atualização e duas vistas. Cada vista contém fonte original, modo de ajuste, zoom, deslocamentos, rotação, proporção do destino, borda/fonte de borda, cor, fundo, abertura, opacidade, tipo de máscara e indicador de animação. Memória de enquadramento por modo é opcional. Presets transferem estilo, preservando a fonte da vista de destino.

Rascunho: IndexedDB, chave de usuário/mundo/ator no Foundry. Presets: configuração do mundo no Foundry, armazenamento local na prévia. Projeto aplicado: `flags.token-studio.project`. Projeto portátil: JSON com imagens embutidas.

## Aplicação

| Destino | Alterações permitidas |
| --- | --- |
| Retrato | `Actor.img` e projeto do editor |
| Token padrão | `prototypeToken.texture.src`, anel/arte do anel quando necessário, projeto |
| Tokens selecionados | `texture.src`, anel/arte do anel quando necessário, somente IDs selecionados do ator |

Não alterar atributos do sistema, vida, equipamentos, visão, iluminação, dimensões, posições ou escala dos tokens. O anel dinâmico é desativado quando uma borda já foi embutida; sem borda, a arte do anel existente recebe o novo arquivo.

Primeiro validar permissões e escolhas; gerar saídas; enviar arquivos novos; atualizar o ator; atualizar a seleção da cena. Falha na cena inicia restauração de imagens e anéis anteriores. Se a restauração falhar, mostrar falha parcial claramente. A aplicação não é uma transação atômica distribuída entre arquivos e documentos; arquivos enviados não são apagados automaticamente.

## Arquitetura

- UI React: controles, estados, histórico, feedback e fluxo de aplicação.
- Motor: geometria, composição, abertura da borda e exportação Canvas 2D.
- Persistência: rascunhos, presets e cópia portátil.
- Adaptador Foundry: ApplicationV2, FilePicker, abertura pela ficha/lista/API e atualizações dos documentos.
- Build: prévia web e bundle próprio do módulo. Dependências de frontend distribuídas no bundle.

## Evolução prevista, ainda não implementada

Editor de animações e exportação WebM; fila de processamento em lote com amostra; biblioteca pesquisável de bordas; máscaras de pintura e recorte avançado; camadas adicionais; ponto focal visual persistido; ferramentas de remoção de fundo. Cada expansão deve preservar os invariantes e receber testes próprios. A versão atual fecha o fluxo de edição estática e integração explícita dos destinos.


## Entrega 0.2.0 — extensão de ficha e molduras

- Catálogo das 356 imagens fornecidas: 330 molduras selecionáveis, 26 apoios preservados; miniaturas, coleções, busca, favoritas e paginação. Originais mantidos byte a byte.
- Painel próprio de mestre com nove seções, importação por link público COMP/CON v3 e JSON, preservação de homebrews e dados desconhecidos, edição estruturada/JSON, histórico e exportação.
- Atualização por comparação entre base importada, cópia local e nova origem, com revisão por grupo e preservação de alterações locais como padrão.
- Recursos de combate explícitos, dano já resolvido com overshield, recuperação limitada e contadores de frequência conhecidos. Sem execução automática de regras especiais ou calculador completo de derivados.
- Adaptador próprio para piloto Lancer e mechas vinculados, criação/atualização de itens por instância, loadout ativo, seleção de destinos, schema de itens, backup e compensação de falha. Não usa o importador privado destrutivo do Lancer nem o Tokenizer.
- Notas do mestre locais e separadas dos exports e dos flags públicos. Nenhuma escrita na conta COMP/CON.

A integração no Foundry ainda exige ensaio real; deployables, ActiveEffects automáticos, rolagens e restauração de backup pela interface permanecem pendentes. Ver COMP_CON_GUIDE.md e VALIDATION.md.
