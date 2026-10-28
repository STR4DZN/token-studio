# Desempenho local — candidato 0.4.0

Medições em 26/10/2026, mesma máquina Linux x86_64, Node 24.22.1, Chromium 153.0.8010.0 headless/SwiftShader, viewport 1280×740. Referência: 0.3.3 (`e56c39d`). Candidato: extração de seções e CSS da 0.4.0. Nenhuma biblioteca de renderização ou dependência de produção foi adicionada.

## Método e conjuntos

`npm run benchmark:interface` mede o editor compilado com host/documentos simulados. A fixture inclui os custos de navegação e da automação; os tempos não isolam apenas React. A primeira abertura inclui transformação/carregamento do harness e fontes. Cinco recargas aquecidas, cinco trocas de unidade com equipamento visível, cinco consultas com resultado conferido e cinco aberturas de galeria por conjunto. O JSON registra todas as amostras. Os comandos não impõem um limiar rígido de milissegundos na CI.

| Conjunto | JSON (UTF-8) | Mechas | Loadouts/mecha | Armas/loadout | Ações/arma |
| --- | ---: | ---: | ---: | ---: | ---: |
| Médio | 75.959 bytes | 3 | 2 | 6 | 4 |
| Grande | 1.840.510 bytes | 8 | 3 | 16 | 10 |

Dados determinísticos de `tests/fixtures/large-sheet.js`; nenhuma campanha foi utilizada. Imagem do ensaio: PNG de 1254×1254. A galeria confirmou 24 cartões por página. Regras e ramos JSON permanecem fechados até a interação.

A rodada inicial apresentou variações superiores a 20% em galeria e troca de unidade. O ensaio foi repetido em ordem referência → candidato → referência → candidato, mantendo os mesmos conjuntos e navegador. Processos e testes pontuais deste ambiente podem introduzir ruído; a amostra não é um benchmark estatístico de hardware dedicado. As medianas abaixo agrupam as dez amostras de cada operação nas duas repetições; a cadência usa a mediana de dois gestos.

## Resultados das repetições

| Operação | Médio 0.3.3 | Médio candidato | Grande 0.3.3 | Grande candidato |
| --- | ---: | ---: | ---: | ---: |
| Abertura aquecida | 131,96 ms | 139,83 ms | 218,70 ms | 225,39 ms |
| Troca de unidade | 15,78 ms | 13,78 ms | 17,57 ms | 20,11 ms |
| Filtro até resultado visível | 18,74 ms | 12,16 ms | 8,39 ms | 8,95 ms |
| Galeria até 24 cartões | 81,95 ms | 55,96 ms | 51,05 ms | 47,49 ms |
| Cadência rAF durante gesto | 55,94/s | 52,14/s | 57,00/s | 55,69/s |

O gesto combina 90 movimentos do mouse e oito eventos de roda, com intervalo solicitado de 16 ms e duração observada de aproximadamente 3,5–3,8 s. Não houve long task registrada nesse intervalo nas repetições. A cadência de `requestAnimationFrame` é um diagnóstico do Chromium headless: **não mede FPS pintado no PIXI/Foundry**, nem garante desempenho com GIFs enormes, outras GPUs ou outra carga do mundo. A exportação em alta resolução é uma operação diferente.

Abertura do candidato variou +6,0% no médio e +3,1% no grande; troca de unidade do grande, +14,5%; cadência, −6,8%/−2,3%. As diferenças ficaram abaixo da variação de 20% definida no plano após a repetição. Filtros ficaram abaixo da meta local de 200 ms e a cadência acima da meta diagnóstica de 30/s. Decisão: preservar o renderizador e a implementação, sem otimização adicional baseada nessa amostra. Valores menores em filtros/galeria não são apresentados como ganho universal causado pela extração.

## Reprodução

```sh
npm ci
npm run build:module
npx playwright install chromium
npm run benchmark:interface
npm run benchmark:sheet
```

Para comparar uma referência, compile-a em um worktree separado e copie apenas `scripts/editor.js` e `styles/editor.css` do pacote para `release/benchmark-baseline/scripts/` e `release/benchmark-baseline/styles/` no checkout do candidato. Use `npm run benchmark:interface -- baseline-repeat1`, depois `candidate-repeat1`, repetindo na mesma máquina. Não altere o código entre as rodadas. Navegador alternativo pode ser informado por `TOKEN_STUDIO_CHROMIUM`/`TOKEN_STUDIO_CHROMIUM_ARGS`, como no runner de regressão.

Os JSON ficam em `qa/interface-benchmark-*.json`; as capturas locais usam data fixa. O modo `--visual-only` repete apenas as telas, aguardando também o preenchimento do JSON em Dados completos. Ao comparar pixels, aguarde fontes e conteúdo; capturas antes do efeito que preenche o textarea não são uma comparação válida desse conteúdo.

O desempenho e a integração CSS reais continuam no roteiro de `HOMOLOGATION.md`. Nenhuma medição local amplia a compatibilidade do manifesto.
