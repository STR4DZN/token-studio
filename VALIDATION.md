# Validação — Token Studio 0.2.0

## Verificado neste ambiente

- **39 testes automatizados de domínio/integração simulada passaram**, mais **4 testes da prévia Sites**. Cobrem geometria, estados separados, aplicação de imagens e compensação de falha; bootstrap/permissões/janela; validação do link e JSON, preservação de extensões, protocolo público, conflitos, grupos atômicos, ranks/loadouts, caminhos de mods/montagens, dano/recuperação e frequências; revisão de ficha sem escrita, destinos, adoção, remoção restrita, instâncias em vários loadouts, concorrência, schema recusado, rollback, falha de backup, leitura de mecha e referências nativas.
- Build da prévia e do módulo concluídos. Manifesto e caminhos dos arquivos empacotados conferidos. O manifesto não declara compatibilidade verificada.
- Link real `https://compcon.app/link/pilot/1HM40U8YCU35/full/` carregado pelo próprio painel no navegador. Resultado: Zetherion / Angelus Principii, LL 8, 5 gatilhos, 4 talentos, 2 core bonuses, 2 loadouts, 45 ações descritas e 0 mechas. O conteúdo homebrew foi preservado. O resolvedor Python também baixou a cópia publicada com sucesso.
- No navegador: editar nome, atualização do mesmo piloto preservando o valor local por padrão, seleção explícita do valor remoto, aplicação ao rascunho, desfazer/refazer e recuperação após recarregamento. Importação do mesmo JSON por seletor de arquivo resultou em revisão sem diferenças.
- Combate no navegador: vida 25, overshield 3, dano final 7 → vida 21, overshield 0; recuperação 7 → vida 25. Hot Pursuit (1/Round) passou de 0 para 1 uso e bloqueou novo registro; Nova rodada voltou a 0 e habilitou o botão. Os testes de mecha usam dados sintéticos; o piloto de referência não contém mechas.
- Catálogo: filtro por coleção, favoritas persistidas após recarregamento, escolha de moldura original volfied blue and silver e detecção da abertura. A grade tem no máximo 24 miniaturas por página. Os **356 originais foram comparados byte a byte** com os arquivos extraídos: 330 molduras e 26 imagens de apoio.
- Editor de imagem: validação anterior preservada — arraste/zoom, rotação, estados independentes, desfazer/refazer, preset, rascunho, importação transparente e PNG/WebP decodificados com dimensões corretas. O catálogo novo foi exercitado sobre esse editor.
- Visual final: viewport 1363 × 936, densidade 1, 9 seções, sem rolagem horizontal. Painel e catálogo inspecionados em capturas; grade, filtros e paginação legíveis. Fechamento de modal por Escape e devolução de foco exercitados.
- Logs finais: sem erro/aviso da origem da aplicação no trecho inspecionado. Erros de metadados da extensão de automação aparecem separados.

## Ainda não verificado / limites

- **Não havia instalação real do Foundry 13 + sistema Lancer neste ambiente.** Documentos e ApplicationV2 são simulados nos testes; não substituem o ensaio real nem garantem compatibilidade com todas as versões/LCPs.
- A prévia preparou o projeto JSON e seu link Blob. O adaptador não confirmou o evento de conclusão do download para o disco. A geração de imagens e sua decodificação já foram confirmadas na interface; o transporte do download permanece não confirmado neste ambiente.
- Homebrews têm textos e dados completos preservados. Seus efeitos especiais, rolagens, derivados da cópia, ActiveEffects e atores de deployable não são executados/criados automaticamente. Nem todo campo personalizado tem equivalência nativa no Lancer.
- Animação completa, vídeo/WebM, processamento em lote e restauração de backup pela interface não estão implementados.
- Smartphones/tablets, múltiplos usuários reais simultâneos, servidores externos com CORS restrito e projeto portátil levado a outro navegador não receberam validação integral.
- Notas privadas são locais ao perfil do navegador; não são armazenadas no ator, sincronizadas ou exportadas.

## Primeiro ensaio no seu Foundry

1. Guarde uma cópia do mundo. Registre versões exatas de Foundry, Lancer e navegador; use um piloto de teste.
2. Instale/ative o módulo. Abra pelo cabeçalho ou macro. Confira imagem da ficha, token padrão, token na cena, recursos e itens antes de aplicar.
3. Escolha uma moldura real; confira abertura, enquadramentos independentes e recuperação de rascunho. Aplique retrato/token separadamente e confira destinos, anéis, escala, visão e posição.
4. Abra Ficha do mestre e consulte o link. Confira todos os talentos/ranks, armadura, duas armas, três equipamentos, descrições/actions e dois loadouts. Nenhum mecha deve aparecer no piloto de referência.
5. Edite um campo, consulte novamente e confira que a edição começa preservada. Exporte o projeto; abra outra cópia para confirmar a recuperação portátil. Confira que notas privadas não entram no export.
6. Prepare a revisão de identidade/build com combate e mechas desmarcados. Resolva avisos de itens já existentes via adoção explícita; decida sobre gerenciados antigos. Confirme schema e conteúdo antes de aplicar.
7. Confira o backup JSON na pasta de saída e compare equipamentos, referências do loadout, HASE, nível e estatísticas recalculadas. Recursos antigos de combate, imagens e token devem permanecer.
8. Faça uma revisão separada de recursos; teste dano final e usos no rascunho. Confira que condições da cópia não produzem ActiveEffects nativos sem uma automação externa.
9. Use outra ficha que realmente contenha mechas para testar frame, montagens, extra/integrated, mods, sistemas integrados, recursos e vínculos. Registre divergências de homebrew. Teste falha somente num mundo de teste e confira restauração.
10. Acrescente `compatibility.verified` apenas depois de um ensaio real aprovado e documentado.

Execute `npm test`, `npm run test:sites`, `npm run build` e `npm run build:module` para reproduzir as verificações locais. Consulte COMP_CON_GUIDE.md para funcionamento e recuperação manual de backup.
