# Ficha do mestre — Token Studio 0.2.5

## Carregar e revisar

Abra **Ficha do mestre** e cole um link público de piloto do COMP/CON v3 ou seu código de 12 caracteres. O link de referência foi lido com sucesso no navegador durante a validação: Zetherion / Angelus Principii, LL 8, 5 gatilhos, 4 talentos, 2 core bonuses, 2 loadouts, 45 ações descritas e nenhum mecha. Algumas ações são de ranks ainda não adquiridos e aparecem como inativas. A consulta usa o protocolo público de compartilhamento; não exige login nem dá acesso de escrita à conta COMP/CON.

A interface começa em visualização. Ative **Editar ficha** para modificar sua cópia. Identidade, HASE, biografia, descrições, ranks, equipamento, dados de mechas, recursos e campos adicionais são editáveis. Textos importados são sanitizados para exibição. Os dados originais e campos desconhecidos continuam preservados no projeto; alterar um texto pela interface passa a guardar sua versão sanitizada.

As seções são: Visão geral, Piloto e biografia, Habilidades, Equipamentos, Mechas, Combate e recursos, Notas do mestre, Importação e histórico e Dados completos. A busca examina os conteúdos e regras, com filtros por categoria. Listas são editáveis pela interface conforme os controles disponíveis, ou integralmente pelo editor JSON validado.

**Atualizar origem** lê uma versão nova e apresenta diferenças. Cada grupo tem uma seleção explícita: alterações locais começam preservadas; mudanças divergentes nos dois lados são destacadas como conflito. Listas e mudanças de tipo são grupos inteiros, para manter IDs e ordem. Nenhuma atualização remota é aplicada ao Foundry automaticamente.

## Recursos e regras

Os valores importados podem conter bônus homebrew. A prévia preserva esses valores, mas não implementa um calculador completo de Lancer. Modificar HASE, talentos ou equipamentos não recalcula automaticamente a vida, defesas ou outros derivados da cópia. A aplicação de build no Foundry entrega os itens ao sistema Lancer, que deve recalcular seus próprios valores. O ensaio real deve comparar os resultados, principalmente em homebrews.

**Aplicar dano final** recebe o valor depois de armadura, resistência e demais efeitos; consome overshield antes da vida. **Recuperar vida** respeita o máximo informado. Estrutura, stress, rolagens, core power, munição, efeitos especiais e testes exigem resolução pelo mestre; o painel não simula automaticamente a execução de uma ação.

**Registrar uso** é um contador. Formatos conhecidos N/Round, N/Scene e N/Mission bloqueiam o botão ao atingir N; frequências desconhecidas são exibidas sem inferência. Rodada reinicia seus usos; cena reinicia usos de cena e rodada; missão reinicia todos. Estes botões não restauram vida ou cargas. Contadores pertencem ao projeto, não ao action tracker nativo do Lancer. Após reorganizar itens ou ações pelo JSON, confira/limpe os registros, pois as chaves atuais usam seus caminhos de origem.

## Privacidade e persistência

Rascunhos são guardados localmente por navegador, usuário, mundo e personagem. Exporte o projeto para uma cópia portátil. Desfazer/refazer mantém até 40 operações durante a sessão; esse histórico não sobrevive ao recarregamento, mas a edição atual sobrevive.

**Notas do mestre** ficam em armazenamento local separado, sem entrar no JSON exportado nem nos flags públicos do personagem. Não são um cofre criptografado; quem tem acesso ao perfil do navegador pode acessar seus dados locais. Não sincronizam para outro computador. Salve após sair do campo e aguarde a gravação antes de fechar.

O projeto de ficha aplicado ao ator contém a ficha completa e a origem. Permissões normais do Foundry podem permitir que jogadores leiam esses flags; use somente Notas do mestre para informações que não devem entrar nessa cópia.

## Aplicação no Foundry

Abra em um ator **piloto**, usando o sistema **Lancer** e uma conta de mestre. A leitura nativa inclui o piloto, seus itens equipados e os mechas do mundo vinculados a ele. Mechas existentes não vinculados não são adotados automaticamente.

Após importar, clique **Vincular / atualizar ator…**. Escolha identidade/vínculo, retrato, build, recursos atuais e mechas; todos começam selecionados para uma importação completa. Desmarque recursos se precisar preservar o combate em andamento. Revise e aplique para atualizar o ator; carregar ou editar o rascunho sozinho não escreve na ficha nativa. Se um item externo tiver o mesmo tipo/ID, a revisão bloqueia duplicação e oferece adoção explícita. Por padrão, itens externos e itens gerenciados antigos são preservados; uma opção permite remover somente os gerenciados ausentes na build importada. Confira isso para não manter bônus antigos por engano. A mesma instância em vários loadouts vira um único item no Foundry.

A revisão apresenta documentos/campos, estados anteriores e posteriores, avisos e impedimentos de schema. A integração valida itens com o schema disponível no seu Lancer antes de escrever. Definições embutidas de deployables ficam preservadas; não criam atores de deployable. Condições registradas na cópia não geram ActiveEffects automaticamente. O build nativo de mechas usa o loadout ativo; demais loadouts ficam guardados no projeto. Campos homebrew não suportados pelo schema ficam no projeto, mas podem não produzir efeitos nativos.

O vínculo grava o UUID do ator, ID do piloto e código público no projeto e no ator; `system.cloud_id` e `system.last_cloud_update` alimentam a identificação e o estado de sincronização da ficha nativa. Importações JSON usam também o código legado `cloudID`, quando válido. O token padrão recebe o nome do piloto e `actorLink: true`. Tokens já colocados na cena não são convertidos por essa operação.

O retrato é lido de `img.cloud_portrait`/`img.portrait`, com suporte aos campos legados e imagens PNG/JPG/WebP/GIF embutidas. É baixado sem credenciais, validado/decodificado e guardado na pasta de saída, fora do módulo. A imagem atual do ator e o retrato no editor são atualizados, inclusive com o editor já aberto. A arte e todos os ajustes de um token personalizado são preservados. Somente uma arte padrão/vazia de token recebe o retrato como ponto de partida. Ajustes locais ainda não aplicados no editor são preservados. Uma ficha sem retrato conserva a imagem existente; falha de download impede a aplicação ao ator. A ficha do mestre também mostra o retrato de origem.

Antes de escrever, o módulo compara novamente a ficha/origem e os atores com a revisão após o download e após criar o JSON de backup. Em falha, tenta restaurar dados, imagem, token padrão e projeto dos documentos alterados; mostra erro explícito se a restauração falhar. Isso é compensação de falha, não uma transação atômica entre todos os clientes: suspenda edições simultâneas durante a aplicação.

O backup contém `documents`, com os estados completos anteriores dos atores. Não há botão de restauração de backup nesta versão. Para recuperar manualmente, guarde uma cópia do mundo e extraia cada entrada de `documents` para um JSON individual; importe-a pelo menu de importação do ator correspondente no Foundry. A criação de um mecha novo que falhar é revertida pela exclusão do documento recém-criado.

**A integração não foi executada em Foundry 13 + Lancer reais neste ambiente.** Use um piloto de teste ou cópia do mundo e siga VALIDATION.md antes de usar com a campanha.

## Se o servidor bloquear a consulta por link

Importe um JSON exportado pelo COMP/CON. Como alternativa, com Python 3, execute o resolvedor do código-fonte:

```sh
python3 scripts/compcon-fetch.py "https://compcon.app/link/pilot/SEU_CODIGO/full/" piloto.json
```

O resolvedor apenas baixa a cópia publicada para um novo arquivo, sem sobrescrever arquivos existentes. Importe esse JSON pelo painel. Não existe um proxy de terceiros nem um backend oculto no módulo. Consulta por link foi verificada na prévia deste ambiente; outros servidores/redes podem restringir CORS ou acesso à API.

## Fontes e independência

O adaptador próprio foi elaborado a partir do protocolo e schemas públicos de [COMP/CON](https://github.com/massif-press/compcon) e [Foundry VTT Lancer](https://github.com/Eranziel/foundryvtt-lancer). O código-fonte desses projetos não foi incorporado ao pacote. A consulta depende da disponibilidade da API pública; edição local, importação por arquivo, molduras e exportação não dependem do Tokenizer nem da disponibilidade do COMP/CON.
