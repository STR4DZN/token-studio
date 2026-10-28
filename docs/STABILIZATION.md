# Estabilização 0.4.0 — fechamento técnico local

Data: 2026-10-26. Base local recuperada: `e56c39d` (0.3.3); base do GitHub: `7aaf8bd` (0.3.0). Branch `work/final-stabilization`. Não publicado. **O plano completo/1.0.0 permanece bloqueado pela homologação real Foundry 13 + Lancer.**

## Entrega

- Recuperados os commits locais de 0.3.1–0.3.3 citados no plano; não foram descartadas as correções anteriores nem alterada a branch principal remota.
- As 11 seções da ficha têm componentes próprios em `src/sheet-sections/`, com contratos explícitos; persistência/importação/revisão continuam nos hooks já extraídos. O componente central caiu de 2.055 para 1.135 linhas. Não houve migração de projeto ou alteração de dados só por abrir a janela.
- CSS organizado em arquivos de responsabilidade com importação na ordem anterior. Removidas 16 declarações comprovadamente substituídas por seletores/propriedades/prioridades equivalentes. Removida a altura de janela já sobrescrita por `host.css`, que continua sendo a autoridade para as dimensões. `:where(.ts-app)` restringe as regras sem aumentar especificidade; ícones permanecem isolados.
- Comparação final das 11 telas, incluindo o JSON de Dados completos já preenchido, sem diferença de pixels em 1280×740 frente à 0.3.3. A primeira coleta capturava o textarea antes de seu preenchimento assíncrono; o harness foi corrigido para aguardar o conteúdo antes de comparar.
- Perfil médio/grande de abertura, unidade, filtros, galeria e gesto documentado em [PERFORMANCE.md](PERFORMANCE.md), com repetições diante de variação >20%. Não houve troca de renderizador nem nova dependência de produção.
- **N01 (P2):** o caminho do backup não aparecia na revisão após falha de escrita. O novo ensaio falhou antes da correção (caminho ausente); agora o caminho fica visível na falha e na confirmação de sucesso. A revisão continua exigindo nova preparação após erro.
- Extrator de snapshots nativos: somente arquivos locais, sem conexão/escrita no Foundry, preserva IDs/referências/estado/campos desconhecidos/chaves pontuadas e recusa sobrescrita. Roteiro manual e matriz de homologação incluídos no pacote; nenhum botão destrutivo de restauração foi acrescentado.
- README, guia, especificação, histórico, instalação/atualização/retorno e limites alinhados ao candidato 0.4.0. CI conserva builds/testes e passa a guardar os JSON da validação, além de executar o perfil diagnóstico sem limiar de tempo rígido.

## Evidência local

132 testes principais (incluindo três de extração de backup), quatro testes Sites originais e cinco testes do pacote: **141 testes automatizados**. As suítes anteriores permaneceram ativas. A suíte do navegador conserva as 334 verificações Canvas, export/download PNG/WebP com decodificação/hash, GIF/WebP e ciclo de projeto, rascunhos/notas/contextos, ficha grande e host adversarial.

Novos ensaios exercitam seis classes de estilo e ícones fora do editor sem vazamento no fonte/compilado, e a falha de escrita após backup com restauração do ator simulado e caminho de recuperação disponível. As medições usam fixtures de 75.959 e 1.840.510 bytes, imagem 1254×1254, galeria com 24 cartões e regras/árvores sob demanda. Os resultados são locais, não FPS pintado no Foundry.

Capturas/JSON em `qa/` são evidência de desenvolvimento. Arquivos protegidos de hospedagem, worker, teste original Sites e bytes das imagens originais preservados. Não foi adicionada compatibilidade `verified`; não houve push, tag ou release.

## Gates e bloqueios

| Área | Situação após esta entrega |
| --- | --- |
| G0/G1/G2 | Base e proteção técnica local reproduzidas; cenários nativos seguem na matriz real |
| G3 | Persistência/compensação simuladas aprovadas; extração comprovada; restauração manual real pendente |
| G4 | Aceite local preservado, incluindo janelas curtas, foco, estados e conteúdo sob demanda |
| G5 | Seções, CSS e perfil local concluídos; integração CSS/desempenho no host real incluídos em G6 |
| G6 | **Bloqueado:** instalação licenciada do Foundry 13, versão exata do Lancer e mundo de teste não disponíveis |
| G7 | Pacote/documentação preparados; instalação/smoke nativos, aceite 1.0 e publicação pendentes |

O roteiro executável de [HOMOLOGATION.md](HOMOLOGATION.md) registra E6-01 a E6-14, versões, recursos, referências, dois clientes e reinício. [RECOVERY.md](RECOVERY.md) mantém o registro do ensaio nativo em branco/pending até ele existir. CI configurada não equivale à execução remota da CI. A entrega é um candidato revisável e instalável, sem alegação de plano integralmente concluído.

---

# Estabilização 0.3.3 — revisão, isolamento e organização

Data: 2026-10-26. Continuação do candidato 0.3.2 (`1528663`). Branch `work/stabilization-2026-10-26`. Não publicado; a homologação Foundry 13 + Lancer real e a versão 1.0 continuam pendentes.

## Mudanças

- Extração/formatação mecânica no commit `f253f8e`, antes das mudanças de comportamento. Persistência, importação/merge, preparação/aplicação e seus diálogos saíram do componente central. O adaptador separa conversão de itens, leitura nativa, montagem de loadout e execução, preservando a fachada pública. Prettier 3.6.2 foi usado como ferramenta temporária, sem nova dependência do módulo.
- Revisão por chave de destino, incluindo piloto/mechas com nomes iguais. Impedimentos e avisos ficam separados; itens gerenciados antigos que permanecerão são listados com seu documento. Continuam podendo influenciar a build. Remoção e aplicação permanecem explícitas.
- Lista da revisão usa a rolagem principal do diálogo e mantém ações acessíveis em janela curta. Valores extensos têm blocos independentes sob demanda. O foco inclui summaries nativos e permanece no modal quando não há controle habilitado.
- Após falha da aplicação, o motivo fica na revisão e a confirmação fica desabilitada até preparar novamente. A UI preserva a cópia local e não presume rollback completo; a mensagem da execução deve ser consultada para saber o resultado. Erros de importação/preparação aparecem dentro do diálogo correspondente, com ação de recuperação.
- Estado da Suite isolado por `host.key`. Trocar a chave recria a sessão e recupera os rascunhos do novo contexto. O formato das chaves existentes não foi alterado. Downloads de ficha limitados a três; URLs descartadas e encerradas são liberadas.
- O editor explica a troca de arte nos dois destinos e o enquadramento independente. Falha de aplicação/exportação de imagens informa que os ajustes continuam no rascunho. A indicação de cópia local da ficha permanece visível também em janela curta.

## Evidência

- 129 testes principais, quatro testes Sites originais em fixture isolada e cinco testes do pacote compilado: **138 testes automatizados**, sem falhas nem skips. Build web e release validados em checkout limpo.
- Duas regressões do adaptador falharam antes dos novos metadados de revisão: separação de impedimentos/itens mantidos e destinos homônimos. Continuam protegidas junto dos contratos de combate/identidade/rollback anteriores.
- O ensaio de troca de chave falhou ao retirar a sessão isolada: o contexto seguinte herdava o estado de edição anterior. Com a correção, cinco contextos recuperaram nomes/notas próprios e o primeiro foi reaberto com seu rascunho. Este é um ensaio de lifecycle com troca explícita da chave, não evidência de troca dinâmica de mundo/usuário no Foundry real.
- Bootstrap simulado confere o formato exato das chaves de mundo, usuário, ator e token. Notas privadas não aparecem no projeto portátil. Quatro exports deixam três links ativos e o unmount libera todos os Object URLs criados nesse fluxo.
- 334 verificações Canvas, testes anteriores de animação/ficha grande e fluxos novos executados no código-fonte e no editor compilado em Chromium 153.0.8010.0.
- Revisão de piloto + mecha, item antigo mantido, impedimento de schema, concorrência após revisão (zero escritas/backup), nova preparação e aplicação com combate preservado. JSON inválido foi recusado com mensagem no diálogo e substituído por importação válida para o rascunho, sem escrever no ator.
- Retrato aplicado pela ficha propagado ao editor e retrato aplicado pelo editor propagado à ficha. Token personalizado manteve zoom 2 e moldura própria. Original/project e DOM foram conferidos com imagens sintéticas e o asset de teste do repositório.
- Estados de carregando, pronto, somente visualização, indisponível e falha de aplicação exercitados. Somente visualização é uma capacidade explícita do host simulado; não é homologação de CORS no servidor real.
- Prévias visíveis durante a rolagem dos ajustes em 1360×900, 1280×740, 900×680 e 780×600, com rodapé acessível e sem overflow horizontal. Catálogo limita a página a 24 cartões; favoritar não seleciona, selecionar não baixa o original e a confirmação baixa o arquivo. Altura do cartão mantida na amostra.
- A extração mecânica manteve a tela de regras pixel a pixel na amostra 1280×740, com fontes carregadas. Depois disso, as mudanças intencionais de revisão/textos foram inspecionadas visualmente. Não há redesenho de identidade.

Os cenários usam documentos/host simulados, não o runtime completo do Foundry/Lancer. Node local: 24.22.1; Python 3.12.14. CI Node 22 configurada, ainda não executada remotamente. O Chromium portátil local foi usado sem os argumentos de processo único e desativação da segurança web; a CI usa a instalação padrão do Playwright.

## Reprodução e limites

```sh
npm ci
npm test
npm run build
npm run test:sites
npm run release:assets
npx playwright install chromium
npm run test:browser
npm run benchmark:sheet
```

`test:browser` depende do pacote atualizado. Capturas/JSON em `qa/` são evidência local de desenvolvimento. Os arquivos protegidos de hospedagem e as imagens originais permanecem intactos. O CHANGELOG também é incluído e exigido no pacote instalável. Nenhum push/publicação foi feito.

A extração das seções da ficha ainda não foi completada. Permanecem a consolidação completa de CSS, perfil de desempenho médio/grande incluindo galeria/enquadramento/FPS, e a homologação de instalação/atualização, backup manual, concorrência entre clientes e defaults/derivados no ambiente real. A medição de abertura do catálogo no runner é diagnóstica, sem garantia de latência ou limiar rígido. Não se declara toda a etapa 5 concluída.

---

## Histórico da segunda entrega — 0.3.2

Data: 2026-10-26. Continuação da 0.3.1 (`6abbbf0`), branch `work/stabilization-2026-10-26`. Não publicado e não homologado como 1.0. Foundry 13 + Lancer reais permanecem indisponíveis neste ambiente.

## Mudanças desta entrega

- Animação: inspeção estrutural de GIF e RIFF/WebP, sem depender do nome/extensão nem da presença de texto `ANIM` nos primeiros 512 bytes. GIF de um quadro e WebP estático são distinguidos de animação; falha de leitura, truncamento não conclusivo e APNG ficam desconhecidos. PNG comum/JPEG são classificados como estáticos. É inspeção do contêiner, não um decodificador nem validador completo do formato.
- A opção de manter o retrato animado conserva os bytes originais e continua separada da composição estática do token. Metadados são mantidos/reconferidos na importação do projeto. Presets não transferem fonte, animação, displayOnly ou sourceCrop para outra vista.
- Navegação: trocar seção/unidade limpa busca, categoria, ativação e inativas. Consultar outro loadout mantém o ativo. Um atalho de foco permite chegar ao conteúdo rolável pelo teclado.
- Renderização: Dados completos monta filhos somente ao abrir cada ramo. Regras longas continuam sob demanda. O índice de busca é preparado por dados/unidade somente na seção de ações e reutilizado entre consultas; caminhos e JSON bruto permanecem intactos.
- Organização: componentes de apresentação extraídos em commit mecânico `c90ccfa`, antes das alterações funcionais. Limpeza de declarações CSS comprovadamente substituídas e contenção de rolagem nas regiões independentes. Sem mudança de identidade visual.
- Distribuição: módulo de inspeção incluído/validado no pacote. A CI prepara a release antes do ensaio do editor compilado e somente disponibiliza o artefato após esse ensaio.

Referências dos contêineres: [GIF89a](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) e [WebP RIFF](https://developers.google.com/speed/webp/docs/riff_container).

## Evidência local da 0.3.2

- 123 testes principais, quatro testes Sites originais em fixture isolada e cinco testes do pacote compilado: 132 testes automatizados, sem falhas nem skips.
- 334 verificações Canvas e fluxos de recuperação, edição, recarga, notas privadas, zoom/desfazer e PNG/WebP baixados com SHA-256 conferido.
- GIF/WebP animados sem extensão, WebP com chunk ANIM além de 512 bytes, GIF/WebP/PNG estáticos, aviso de origem desconhecida e ciclo importar/aplicar/recarregar/importar projeto. Original comparado byte a byte; o token composto permanece estático.
- Ficha sintética de 1.840.510 bytes: oito mechas × três loadouts × 16 armas × dez ações, mais dez ações do piloto. A unidade ativa exibe 17 origens; incluir inativas expõe 49. Não usa dados de campanha.
- Código-fonte e editor realmente compilado montados no Chromium 153.0.8010.0 com host simulado. Filtros, consulta de loadout, foco na região principal, PageDown, modal/retorno de foco, Home/End das abas e reduced-motion aprovados.
- Uma única rolagem ancestral no conteúdo da seção, sem rolagem vertical da janela. Rodapé acessível em 1280×740; simulação de escala CSS de 125% em 1360×900 sem overflow horizontal. A simulação CSS não equivale a ensaio de zoom nativo em todas as plataformas.
- Comparação pixel a pixel da tela de regras em 1280×740, mesma fixture e fontes carregadas: nenhuma diferença no layout visível da amostra antes/depois.

### Medidas e limites

Mesma máquina, Node 24.22.1, Chromium 153.0.8010.0. Baseline: 0.3.1 em checkout separado; candidato: 0.3.2. Medidas pequenas e locais, sem garantia de latência em Foundry real.

| Medida | Baseline 0.3.1 | Candidato 0.3.2 | Interpretação |
| --- | ---: | ---: | --- |
| Busca isolada, mediana de 80 consultas | 2,500 ms | 0,103 ms | Candidato usa índice já preparado; custo inicial medido à parte: 8,61 ms |
| Busca isolada, p95 | 5,826 ms | 0,219 ms | Somente processamento de filtros, não a interface inteira |
| Abertura do editor compilado, mediana de três recargas aquecidas | 184,2 ms | 186,7 ms | Próximas; sem evidência de ganho na abertura |
| Consulta até resultado visível, mediana de cinco buscas no compilado | 13,0 ms | 9,1 ms | Medida ponta a ponta do ensaio local; amostra curta |
| Primeira abertura do compilado | 503,0 ms | 603,2 ms | Variação de inicialização observada; não alegar melhora universal |

`npm run benchmark:sheet` reproduz a medição isolada do candidato e escreve JSON em `qa/`. O runner do navegador também registra tempos; não há limiar rígido de milissegundos na CI. A otimização atende ao custo observado de reconstruir a mesma busca a cada tecla. Abertura, galeria, enquadramento e FPS ainda precisam de perfil completo em ambiente real. Capturas e JSON em `qa/` são evidências locais de desenvolvimento, não homologação Foundry/Lancer.

## Reprodução

```sh
npm ci
npm test
npm run build
npm run test:sites
npm run release:assets
npx playwright install chromium
npm run test:browser
npm run benchmark:sheet
```

`test:browser` exige `release/token-studio` atualizado. O build genérico dispensa configuração Sites; build:sites exige os metadados legítimos. Os arquivos protegidos de hospedagem permanecem intactos. O navegador portátil foi usado como descrito no histórico abaixo; a CI utiliza o Chromium padrão do Playwright. Node 22 está configurado na CI; sua execução remota ainda não foi feita neste trabalho.

## Pendências para a versão final

Continuam pendentes a recuperação manual de backup em mundo real, concorrência entre clientes Foundry, schemas/defaults/derivados da versão instalada do Lancer, instalação/atualização do ZIP e homologação. A extração de importação/merge, revisão/aplicação, persistência e seções ainda não foi concluída; o adaptador e a consolidação completa de CSS também permanecem no plano. Não foram introduzidas bibliotecas de renderização. Nenhuma compatibilidade foi marcada como verificada.

---

## Histórico da primeira entrega — 0.3.1

Data: 2026-10-26. Base: `7aaf8bd2b647b59e7f9deca35fb537acf4b11218` (0.3.0).
Branch: `work/stabilization-2026-10-26`. O remoto main continuava nessa base na conferência inicial.
Este candidato não foi publicado e não é a homologação 1.0.0.

## Base reproduzida

- 100 testes principais aprovados antes de editar.
- Build web original falhou por ausência de `.openai/hosting.json`.
- Oito novas regressões falharam antes das correções: estado de equipamento, identidade, perfil, diagnóstico e animação.
- Node 24.22.1, Python 3.12.14. CI configurada para Node 22, ainda sem execução remota neste trabalho.
- Foundry e Lancer reais indisponíveis no ambiente de execução.

## Mudanças e contratos

| Achado | Mudança | Evidência automatizada |
| --- | --- | --- |
| F01 | Envelope comum para leitura inicial e explícita; recuperação de candidatos válidos | `sheet-recovery.test.mjs`, teste da interface real com host simulado |
| F02 | Estado de sessão separado da definição; ausência remota preserva campos existentes | `item-state.test.mjs`, regressões no plano/aplicação em `sheet-adapter.test.mjs` |
| F03 | Identidade compartilhada camelCase/snake_case/UUID; bloqueio de conflitos/ambiguidade | Adaptador e diagnósticos, instâncias compartilhadas e distintas |
| F04 | Build web independente; Sites explicitamente preparado e testado em fixture | `test-sites.mjs` executa os quatro testes originais, que permaneceram intactos |
| F05 | README/guia/especificação com estado atual e histórico distinguido | Revisão documental; fechamento integral da release continua pendente |
| F06 | Metadados de animação existentes não são apagados na inicialização | GIF embutido, WebP animado e imagem estática |
| Melhoria local | Limite comum de zoom até 8; proteção de notas quando a leitura falha | Limites do motor/roda; navegador comprova zero gravações privadas após falha |

Itens novos sem importação de combate usam defaults do DataModel instalado. Estados de itens existentes/adotados são preservados quando combate está desmarcado. Perfis removidos e valores de contador fora dos novos limites bloqueiam a aplicação. Máximos derivados continuam a cargo do Lancer; não há promessa de congelá-los.

O vínculo legado só é reconciliado quando há correspondência não ambígua; o aviso aparece na revisão. Nenhuma migração é gravada só por abrir a janela. Fontes e dados desconhecidos permanecem separados dos patches aplicados.

## Conjuntos de teste preservados

- Piloto simples e completo, gatilhos/stubs V3, homebrews e chaves literais com pontos: testes COMP/CON, adaptador e stored-data.
- Mechas, frame, sistemas, montagens extras/integradas, mods e loadouts: testes do adaptador/navegação.
- Instâncias distintas e compartilhadas, legado snake_case, conflitos e duplicidades: novas regressões de adaptador/diagnóstico.
- HP/overshield e estado de armas/sistemas/mods/armadura/gear: engine, item-state e plano/aplicação.
- Imagens altas/largas, token composto, subject nativo, molduras abertas/fechadas: engine e página Canvas com 330 molduras.
- URLs válidas/inválidas, display-only e expiração: rules-images e bootstrap simulados.
- Contexto de cena, permissões, wildcard, rollback, backup e concorrência: suítes preexistentes, reexecutadas.

## Validação local

- 115 testes principais aprovados, sem falhas nem skips.
- Quatro testes Sites originais aprovados em fixture temporária compilada pelo Vite e preparada pelo script original.
- Cinco testes do pacote compilado aprovados em checkout limpo da 0.3.1, com validação dos manifestos e do ZIP.
- 334 verificações Canvas aprovadas em Chromium 153.0.8010.0.
- Interface: leitura inicial sem escrita, edição, recuperação após recarga, zoom/desfazer e falha de notas sem gravação vazia.
- Layout inspecionado em 1360×900, 1280×740 e 780×600 sob CSS de host adversarial; sem overflow horizontal, rodapé visível.
- PNG/WebP exportados, decodificados e baixados; SHA-256 do arquivo baixado comparado ao Blob decodificado.
- Capturas/medidas locais em `qa/` são evidência de desenvolvimento com dados sintéticos, não de Foundry real.

O download padrão do navegador retornou um arquivo inválido neste ambiente. A execução local usou um Chromium portátil obtido pelo pacote npm `@sparticuz/chromium` 153.0.0 em diretório temporário, sem adicioná-lo ao módulo. O runner aceita executável/argumentos por `TOKEN_STUDIO_CHROMIUM` e `TOKEN_STUDIO_CHROMIUM_ARGS`. A CI usa a instalação padrão do Playwright.

## Comandos

```sh
npm ci
npm test
npm run build
npm run test:sites
npx playwright install chromium
npm run test:browser
npm run release:assets
```

A preparação Sites real é `npm run build:sites`, seguida de `npm run test:sites:deployment`, e exige configuração legítima. A fixture não contém ID de produção e não substitui esses metadados.

A instalação de dependências, 115 testes, build web, quatro testes Sites e geração da release foram repetidos em um checkout destacado e limpo. A documentação de estabilização também é incluída no ZIP e exigida pelo validador.

## O que continua pendente no plano

- Recuperação manual de backup em mundo real e testes de concorrência com clientes Foundry reais.
- Compatibilidade exata do Lancer, schemas/defaults e comportamento de máximos derivados após mudança de build.
- Identificação de animação sem metadado confiável; esta correção cobre preservação de metadado conhecido, não um decodificador completo de animação.
- Revisão completa de UX com ficha grande/mechas, desempenho e comparação visual com baseline.
- Refatoração mais ampla do componente/adaptador e consolidação de CSS somente após evidência dos fluxos maiores.
- Homologação da instalação/atualização do ZIP, preenchimento de compatibility.verified quando apropriado e publicação.

As etapas 3–5 tiveram avanços locais pontuais; não estão declaradas concluídas. A etapa 6 permanece bloqueada pela ausência do ambiente Foundry/Lancer. Este relatório não transforma testes simulados em compatibilidade verificada.
