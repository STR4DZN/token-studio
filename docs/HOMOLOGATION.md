# Homologação pendente — Token Studio 0.4.0

Este candidato conclui a preparação técnica local do escopo de estabilização. **Não é a versão final 1.0.0.** Nenhuma instalação licenciada do Foundry, versão exata do Lancer ou mundo de teste foi disponibilizado para esta execução. Testes com documentos simulados, Canvas e pacote compilado não aprovam os itens abaixo.

## Identificar o ambiente

Preencher Foundry 13 (build exata), Lancer (versão exata), navegador/SO, mundo de teste, versão/commit/checksum do pacote. Use uma cópia do mundo e atores sintéticos; mantenha as imagens disponíveis nos caminhos originais. A compatibilidade verificada do manifesto permanece ausente até esse ensaio.

## Roteiro de passagem

| Plano | Ensaio no runtime real | Evidência exigida | Estado |
| --- | --- | --- | --- |
| E6-01 / T23 | Instalação limpa do ZIP e atualização de 0.3.0 | Módulo listado, arquivos carregados, projeto antigo intacto | Bloqueado |
| E6-02 | Cabeçalho, contexto, macro e restrições de jogador/permissão | Abertura e recusas corretas | Bloqueado |
| E6-03 / T01–02 | Leitura inicial, rascunho, contexto de token | Dados antes/depois; nenhuma escrita ao abrir | Bloqueado |
| E6-04 / T11–15 | Arraste/roda/desfazer, imagens extremas, GIF, molduras, anel | Arquivos exportados/decodificados e mapa PIXI | Bloqueado |
| E6-05–06 / T16 | Destinos isolados e conjunto elegível da cena | Texturas, escala, posição, luz/visão e outras cenas intactas | Bloqueado |
| E6-07 / T17,24 | JSON e link COMP/CON; remotos editável/display-only/expirado | Cópia local preservada; sem escrita remota | Bloqueado |
| E6-08 / T03–05 | Build sem/com combate, adoção e estado remoto ausente | HP/limites/estados dos itens antes/depois; derivados explicados | Bloqueado |
| E6-09–10 / T06–10 | Instâncias repetidas/compartilhadas, mods/montagens e mechas | IDs/loadouts/referências, ficha nativa e favoritos | Bloqueado |
| E6-11 / T19–21 | Falhas controladas, compensação e recuperação manual | Procedimento de RECOVERY.md aprovado e sem notas privadas | Bloqueado |
| E6-12 / T18 | Dois clientes; edição após revisão/durante backup | Recusa de revisão desatualizada; sem bloqueio distribuído presumido | Bloqueado |
| E6-13–14 | Reiniciar, reabrir e repetir cenários alterados | Persistência e correções aprovadas no candidato exato | Bloqueado |
| E7-08–09 / RF-12 | Smoke test do pacote final | Abrir, editar, exportar, aplicar imagem/ficha e reabrir | Bloqueado |

## Evidência e decisão

Para cada linha registre fixture, passos, esperado, obtido, versões, commit e logs úteis sem dados privados de campanha. A matriz completa de tamanhos inclui 1360×900, 1280×740, 780×600, zoom nativo de 125% e CSS efetivo do host. As medidas do Chromium headless são diagnósticas; confirme o enquadramento com a carga e GPU reais.

Reproduza a CI no Node 22 e registre o resultado remoto do commit candidato. A CI está preparada, mas não foi executada no GitHub nesta entrega. Não publique tag/release nem declare 1.0.0 até G6/G7 serem aprovados. Se o código mudar durante a homologação, gere novo ZIP/checksum e repita os testes afetados antes do smoke test final.
