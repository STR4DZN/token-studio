# Revisão visual — Token Studio

**Findings**

Nenhum desvio P0/P1/P2 acionável permanece na comparação final do núcleo desktop.

- [P3] A arte de demonstração foi recriada a partir da referência, mantendo piloto, armadura cinza/vermelha e cenário industrial; detalhes do rosto e do cenário diferem. Evidência: `qa/comparison.jpg`. Aceitável para uma imagem substituível, sem identidade de marca envolvida.
- [P3] Os anéis de amostra têm relevo mais discreto que a referência. Evidência: `qa/focused-comparison.jpg`. São imagens raster reais, com transparência; o usuário utilizará suas próprias bordas. Refinamento possível sem bloquear o fluxo.

**Target and evidence**

- Verdade visual: `qa/design-reference.png` (opção 1 selecionada pelo usuário); origem de trabalho `/workspace/scratch/9080c0dae02d/generated_images/exec-a21601cb-0333-4580-96b7-c3822fb980a3.png`.
- Captura da implementação: `qa/iteration-2.jpg`, renderizada no navegador cloud. Prévia local mantida aberta.
- Fonte: 1487 × 1058 pixels; trata-se de um mock gerado, sem tamanho CSS ou densidade declarados.
- Implementação: 1363 × 936 pixels/CSS, devicePixelRatio 1. O navegador disponível tem viewport diferente do mock. A comparação normaliza escala por contenção, sem deformar os arquivos; não é uma sobreposição pixel a pixel. As regiões focadas alinham componentes correspondentes.
- Estado final: tema escuro, Token selecionado, Preencher, zoom 125%, rotação 0°, borda prata, cor violeta, fundo transparente, Avançado fechado, rascunho salvo, sem aviso ou modal.
- Comparação conjunta da vista completa: `qa/comparison.jpg`.
- Comparações conjuntas focadas: `qa/focused-comparison.jpg` (cabeçalho, inspector/prévias e barra de ferramentas).

**Required fidelity surfaces**

| Superfície | Avaliação |
| --- | --- |
| Fontes e tipografia | Inter local, pesos e hierarquia próximos à fonte sem serifa do mock. Título destacado, labels legíveis, sem truncamento importante no viewport testado. |
| Espaçamento e layout | Editor grande à esquerda, inspector estreito à direita, ações inferiores persistentes, seções separadas e cantos suaves. Densidade adaptada ao viewport menor. Avançado alcançável por rolagem própria; nenhuma ação persistente escondida. |
| Cores e tokens | Fundo carvão, painéis cinza escuro, bordas discretas, texto claro e seleção violeta preservam a direção escolhida. Foco visível, sucesso textual e ícone. |
| Imagens e assets | Arte quadrada de alta resolução mantém proporção. A área escurecida mostra o contexto fora do recorte; não estica o original para preencher o palco. Bordas raster com abertura transparente e ícones Font Awesome. Prévias e exportações compartilham o renderizador. |
| Copy e conteúdo | Rótulos principais em português correspondem ao mock. Importar borda, Sem moldura, ajuda de enquadramento e destinos explícitos completam o fluxo pedido; não há texto de implementação nas telas principais. |

**Comparison history**

- Revisão de desenvolvimento: moldura no palco competia com a guia de recorte; foi retirada do palco e mantida nas prévias/exportações. Espaçamento do inspector foi compactado para o viewport disponível antes da captura inicial.
- Captura `qa/iteration-1.jpg`: registro inicial do editor renderizado. O estado ainda era zoom 100% com aviso de rascunho e testes de ajustes em andamento; não foi tratado como comparação final do estado do mock.
- Captura `qa/iteration-2.jpg`: após testes, estado alinhado em Token, zoom 125%, prata, Avançado fechado e aviso fechado. Comparações completa e focada examinadas conjuntamente com a fonte. Sem novas correções visuais P0/P1/P2 exigidas pela comparação final.

**Interactions and console**

Arraste, zoom, estados de retrato/token, desfazer/refazer, rotação, preset, importação de borda com abertura detectada, recuperação de rascunho e PNG/WebP exercitados. Ajuda fecha por Escape e restitui o foco. Logs finais examinados: nenhum erro/aviso da origem da aplicação; erros da extensão de automação são separados. As exportações foram decodificadas na interface, mas o transporte de download pelo adaptador não foi confirmado. Integração real Foundry/Lancer pendente; consultar `VALIDATION.md`.

**Open Questions**

Na entrega 0.1.0 as bordas ainda não tinham sido fornecidas; a entrega 0.2.0 incorpora e valida o pacote real, conforme revisão abaixo.

**Implementation Checklist**

- [x] Aplicar a direção visual 1 e os assets reais.
- [x] Exercitar o fluxo principal no navegador.
- [x] Examinar fonte e captura juntas, incluindo regiões focadas.
- [x] Conferir as cinco superfícies de fidelidade.
- [x] Manter a prévia aberta e documentar lacunas de integração.

**Follow-up Polish**

Refinar o relevo das bordas de amostra. As bordas reais já foram incorporadas na entrega 0.2.0. Esses ajustes não bloqueiam o editor independente.

final result: passed


## Extensão 0.2.0 — painel de ficha e catálogo

**Target and evidence**

A extensão segue o tema escuro/violeta da opção 1; não existe mock selecionado da ficha para comparação pixel a pixel. A captura real `qa/sheet-final-v0.2.jpg` foi examinada para layout e legibilidade; a evidência final da entrega está em `qa/sheet-delivery-v0.2.jpg`. O catálogo real está em `qa/gallery-final-v0.2.jpg`. Todas usam o viewport 1363 × 936, densidade 1.

**Findings**

- Corrigido P2: a ordem de importação do CSS fazia o catálogo herdar largura 540 px e reduzir cartões, deixando a paginação abaixo do modal. Evidência anterior `qa/gallery-v0.2.jpg`; evidência corrigida `qa/gallery-final-v0.2.jpg`. CSS base passa a preceder a extensão; o catálogo tem área rolável própria e filtros/paginação visíveis.
- Corrigido P2: recursos secundários, inclusive zeros de mecha presentes na ficha de piloto, dominavam o combate. Recursos principais agora ficam visíveis; demais valores ficam em disclosure sem perder edição. A visão geral mostra estatísticas relevantes à unidade selecionada.
- Sem novo P0/P1/P2 acionável na revisão final desktop. Sidebar, ações inferiores e seleção estão legíveis; conteúdo longo usa rolagem interna.
- P3: a ficha é densa por conter regras completas/homebrews. Busca, filtros e disclosures reduzem a leitura necessária. Não há desenho/validação dedicada de smartphone nesta entrega.

| Superfície | Avaliação final |
| --- | --- |
| Tipografia | Inter local; título, valores e labels com hierarquia consistente. Regras sanitizadas preservam parágrafos/listas. |
| Layout | Sidebar de nove seções, área principal rolável, cabeçalho e rodapé persistentes. Sem overflow horizontal desktop. Catálogo com 6 colunas e 24 entradas por página. |
| Cores | Carvão, painéis cinza, seleções violeta e vida verde com valor textual. Avisos/conflitos também têm texto. |
| Imagens | Miniaturas WebP contidas, originais só na seleção, bordas reais sem recolorir/esticar. Arquivos originais conferidos byte a byte. |
| Conteúdo | Identidade, equipamento homebrew e ações reais da referência, ausência explícita de mechas. Dados desconhecidos preservados; nenhuma promessa de automação total. |

**Interações e limites**

Link público carregado, arquivo JSON importado, edição/revisão/desfazer/refazer e rascunho recuperado. Dano/overshield/recuperação, frequência/rodada, filtro de coleções/favoritas e seleção de borda testados no navegador. Compensação de falhas, mechas e concorrência testados com documentos simulados. Integração real Foundry/Lancer e transporte de download não confirmados; ver VALIDATION.md.

final result: passed (revisão visual desktop; não valida integração real)


## Revisão 0.2.6 — controles e ficha

**Target and evidence**

Revisão da interface existente a pedido do usuário, preservando carvão/violeta da opção 1. Estrutura baseada nos componentes oficiais PilotNav, MechNav e perfis narrativa/tático de massifpress/compcon; não há novo mock a reproduzir. Comparação conjunta `token-sheet-comparison.jpg`, capturas antes/depois em 1363 × 936, densidade 1; perfil tático final `token-studio-v026-ficha.jpg`.

**Findings and comparison history**

- Corrigido P2: título afastado do retrato e contexto de unidade repetido. Identidade compacta, seletor persistente e navegação em três grupos.
- Corrigido P2: leitura parecia formulário desabilitado; valores e HASE agora têm hierarquia numérica, com inputs apenas na edição.
- Corrigido P2: descrições longas dominavam os cartões. Resumos limitados a três linhas, ranks adquiridos visíveis e regras completas expansíveis; categorias em abas com teclado.
- Corrigido P1 encontrado na regressão: desfazer a importação de mechas enquanto Combate estava aberto acessava unidade removida. Índice é normalizado antes de renderizar; repetição do mesmo fluxo retornou ao piloto sem erro.
- Sem P0/P1/P2 restante na revisão desktop. P3: revisão dedicada em smartphone ainda não realizada.

| Superfície | Avaliação |
| --- | --- |
| Tipografia | Inter, títulos compactos, valores claros e ranks com labels/ícones. |
| Layout | Dez seções em grupos, contexto persistente, cartões em duas colunas, rolagem interna e rodapé alcançável. |
| Cores | Carvão/violeta preservados; leitura/edição, seleção, ranks e inativas têm texto além da cor. |
| Imagens | Retrato preservado; atalhos usam miniaturas reais, seleção carrega original sem alterar proporção. |
| Conteúdo | Narrativa/tática/hangar, mecha/loadout escolhido, ações ativas isoladas, dados adicionais preservados. |

**Interactions and limits**

Roda real aumentou/reduziu zoom do token e retrato independentemente; desfazer restaurou um gesto. Favoritas persistiram após recarregar, ficaram primeiro e aplicaram o original pelo atalho. Edição e desfazer, abas com ArrowRight/Home, dois mechas, loadout reserva e ações inativas foram exercitados. Erro de aplicação durante a regressão foi corrigido e retestado; avisos da extensão de automação não pertencem à origem da aplicação. Integração Foundry/Lancer real ainda pendente.

final result: passed (desktop; integração real pendente)
