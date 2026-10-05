# Validação — Token Studio 0.2.7

## Organização e URLs na 0.2.7

- 74 testes de domínio/bootstrap passam. As regressões novas cobrem origem/categoria/ranks/loadouts, regras None, dados extras, URLs/HTML/imagens, links Discord, hash e upload único entre dois atores.
- Retrato por URL validado antes da aplicação, sem upload de imagem. Testes simulados conferem vínculo direto, token personalizado preservado e token padrão preservado quando a URL permite somente visualização.
- Navegador: ficha pública Zetherion com Partidora dos Céus organizada em 5 ações, 4 passivas, 1 efeito e 3 descrições; registro de uso e desfazer. Mecha sintético com 90 ações ficou em cinco origens fechadas de 18 ações cada. Filtros de sistemas/passivas e busca de reserva respeitaram a unidade/loadout; item sem definição apareceu com caminho exato em Pendências. Fixture sintética removida após a conferência.
- Retrato CloudFront da referência foi decodificado (814 × 1200), aceito apenas para visualização da ficha, com aviso de bloqueio para edição/exportação e preservação do token. Não houve upload dessa imagem.
- URL pública do PNG do próprio repositório foi validada no navegador (1254 × 1254, disponível para edição); o fluxo mantém o endereço remoto. Cinco testes do pacote compilado e quatro da prévia também passaram, totalizando 83 testes.
- Os testes do adaptador usam atores/FilePicker simulados. Não foi possível executar a integração em uma instalação real de Foundry 13 + Lancer neste ambiente.

## Navegação e controles na 0.2.6

- 59 testes de domínio/bootstrap, cinco testes do pacote compilado e quatro testes da prévia. Os seis novos testes cobrem scroll e limites, favoritas persistidas/ordenadas, isolamento de ações/loadouts e retorno ao piloto após remover o mecha selecionado.
- Exercitado no navegador: roda real do mouse no token/retrato com desfazer, favoritos após recarregar e seleção do original, edição/desfazer, teclado nas abas, dois mechas com loadouts/ações distintos e retorno ao piloto após desfazer importação em Combate.
- Comparação visual antes/depois em 1363 × 936; perfil tático revisado com a ficha pública de referência. Fontes: componentes oficiais de navegação narrativa/tática e hangar em massifpress/compcon.
- Build, manifestos e ZIP são conferidos antes da publicação. Os testes de integração usam documentos simulados; Foundry 13 + Lancer reais continuam pendentes.

## Vínculo COMP/CON na 0.2.5

- 53 testes de domínio/bootstrap simulados passam, incluindo dez regressões novas; os cinco testes do pacote compilado fazem parte obrigatória da publicação.
- Testado: retrato v3/legado/embutido, bytes/tipo de imagem, erros de rede/HTML/tamanho, upload pelo FilePicker simulado e retorno de nome/retrato/código/vínculo para o editor aberto.
- Testado: aplicação e atualização de retrato junto de código/data, token padrão vinculado, preservação dos ajustes do token personalizado e leitura nativa da origem.
- Testado: concorrência durante download/backup, troca do código após revisão, falha antes de escrita e falha em mecha com recuperação da imagem e token do piloto.
- Build e pacote devem ser verificados no GitHub Actions e no ZIP publicado. A verificação dentro de uma instalação real de Foundry + Lancer segue pendente.

## Correção das rotas de molduras na 0.2.4

- As capturas do usuário mostram miniaturas quebradas e erro ao escolher uma moldura.
- Os 356 originais e 356 miniaturas do ZIP oficial 0.2.3 foram decodificados com Pillow, sem erros. Os arquivos não estão corrompidos.
- A concatenação pressupunha que `getRoute` preservasse a barra final da pasta. Uma rota normalizada sem barra gerava `assetsframes/...`, fora da pasta de assets. A documentação garante uma rota absoluta com prefixo, não um separador final de diretório.
- O teste do adaptador falhou antes da correção com `/vtt/modules/token-studio/assets` e passou após a normalização.
- A publicação passa a verificar por HTTP os 712 arquivos do catálogo e as duas imagens padrão, sem prefixo e com `/vtt`, comparando os bytes servidos.
- A confirmação na instalação Foundry real do usuário continua pendente.

## Falha de carregamento corrigida na 0.2.3

- O ZIP oficial 0.2.2 foi baixado da release e seu SHA-256 confirmado: `7dbe35b8262d9a3ed1f9cb779bd667e8688bbeecab1447890da8c3251819c6f8`. Continha 12 referências a `process.env.NODE_ENV` no editor compilado.
- Três testes novos carregando os arquivos reais da release, em um contexto JavaScript sem `process`, falharam com `ReferenceError: process is not defined`, incluindo o ponto de entrada do manifesto. Isso impedia o registro dos hooks e da API; mudar somente o evento do menu não resolvia o carregamento.
- O build em modo biblioteca foi corrigido com a substituição explícita de `process.env.NODE_ENV`. A publicação passa a exigir testes do editor compilado e do grafo real de dependências, além dos 42 testes de domínio e bootstrap existentes.
- Os testes anteriores de bootstrap substituíam o editor por uma função simulada e por isso não detectavam esse erro no bundle. A confirmação visual e funcional em Foundry 13 + Lancer reais continua pendente.

## Correção 0.2.2

- A captura do usuário mostrou ausência de Token Studio no menu de atores. O código usava o evento removido `getActorDirectoryEntryContext`. Corrigido para `getActorContextOptions`, conforme a API pública v13 e foundryvtt/foundryvtt#12335.
- Novos testes simulam o evento v13, o ator clicado, a coleção do aplicativo, permissões, duplicatas e abertura pelos cabeçalhos V1/V2. Esses testes não substituem a confirmação na instalação real do usuário.

## Verificado neste ambiente

- **42 testes automatizados de domínio/integração simulada passaram**, mais **4 testes da prévia Sites**. Cobrem geometria, estados separados, aplicação de imagens e compensação de falha; bootstrap/permissões/janela; validação do link e JSON, preservação de extensões, protocolo público, conflitos, grupos atômicos, ranks/loadouts, caminhos de mods/montagens, dano/recuperação e frequências; revisão de ficha sem escrita, destinos, adoção, remoção restrita, instâncias em vários loadouts, concorrência, schema recusado, rollback, falha de backup, leitura de mecha e referências nativas.
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
7. Confira o backup JSON na pasta de saída e compare equipamentos, referências do loadout, HASE, nível e estatísticas recalculadas. Recursos antigos de combate e imagem devem permanecer quando suas opções forem desmarcadas. Em outra revisão, marque Retrato e confira a imagem COMP/CON na ficha e no editor, código/data nativos e nome/vínculo do token padrão. A arte, escala, anéis e demais ajustes de um token personalizado devem permanecer.
8. Faça uma revisão separada de recursos; teste dano final e usos no rascunho. Confira que condições da cópia não produzem ActiveEffects nativos sem uma automação externa.
9. Use outra ficha que realmente contenha mechas para testar frame, montagens, extra/integrated, mods, sistemas integrados, recursos e vínculos. Registre divergências de homebrew. Teste falha somente num mundo de teste e confira restauração.
10. Acrescente `compatibility.verified` apenas depois de um ensaio real aprovado e documentado.

Execute `npm test`, `npm run test:sites`, `npm run build` e `npm run build:module` para reproduzir as verificações locais. Consulte COMP_CON_GUIDE.md para funcionamento e recuperação manual de backup.
