# Backup e recuperação manual — candidato 0.4.0

**Estado:** procedimento preparado e extração ensaiada localmente. A restauração pelos controles nativos do Foundry 13/Lancer ainda precisa de ensaio no mundo de teste. Este documento não é uma certificação de recuperação real.

## O que é salvo

Antes da primeira escrita da ficha, o módulo envia um JSON com schema `token-studio-foundry-backup-1`, data, ID do mundo e `documents`: os snapshots nativos dos atores existentes que serão tocados, incluindo seus itens, imagens, flags e token padrão. O caminho aparece na mensagem de aplicação bem-sucedida. Quando há falha, os snapshots são usados para tentar a compensação; uma mensagem de restauração parcial exige conferir o backup manualmente.

O backup não contém as notas privadas do Token Studio, que ficam no navegador. Não é uma cópia dos arquivos de imagem, de cenas, de todos os atores do mundo ou dos dados privados de outros clientes. Mechas novos ainda não existentes não têm um snapshot anterior; a compensação tenta remover os que criou. Não apague imagens antigas: o JSON conserva os caminhos, não os bytes desses arquivos.

## Preparar e conferir os snapshots

1. Trabalhe primeiro numa cópia do mundo, com as mesmas versões do Foundry e Lancer e os mesmos arquivos de imagem. Registre essas versões. Faça também um backup completo do mundo antes de qualquer recuperação.
2. Baixe o JSON do diretório `backups` dentro da pasta de saída configurada no módulo. Confira `schema`, `world` e `createdAt`. Um projeto portátil da ficha não substitui esse backup nativo. O arquivo contém dados do ator; mantenha-o em local privado.
3. Na pasta do módulo descompactado, execute o extrator abaixo, com uma pasta de saída nova. Ele apenas separa os snapshots em arquivos JSON, não se conecta ao Foundry e não altera nenhum documento:

```sh
python3 tools/extract-backup.py backup.json --output snapshots-recuperacao
```

No checkout do código, use `scripts/extract-backup.py`. O extrator recusa pastas de saída existentes, IDs repetidos/inválidos, tipos diferentes de piloto/mecha e envelopes que não sejam backups. IDs, referências, caminhos de imagem, campos desconhecidos e chaves literais pontuadas são preservados. Falta de espaço/permissão pode deixar uma pasta parcial; nesse caso examine o erro e escolha outra pasta nova.

4. Cada arquivo tem o ID do ator no nome. Liste os `_id` dos atores e de seus itens e anote o estado que se espera recuperar: nome, HP, overshield, calor, usos, loaded/destroyed/cascading, perfis, loadouts, vínculos piloto/mecha, imagem, flags e token padrão. Não renomeie IDs para encaixar o backup em outro ator.

## Ensaio de restauração na cópia do mundo

1. Antes da alteração de teste, exporte os atores e registre IDs e recursos. Faça uma mudança controlada da ficha pelo módulo; guarde o backup criado.
2. Feche editores concorrentes. Se houver outros clientes conectados, suspenda edições durante a recuperação. Confira que o ator de destino tem exatamente o `_id` e o tipo do snapshot; nomes iguais não identificam o destino.
3. Use **Importar dados / Import Data** no menu do ator existente e selecione seu snapshot individual. O envelope com `documents` não é um arquivo de importação nativo. Repita para os atores envolvidos, conferindo piloto e mechas como um conjunto. A API v13 disponibiliza `importFromJSON` e `importFromJSONDialog` para documentos do mundo; o schema efetivo e o comportamento da importação ainda precisam ser confirmados na versão instalada do Lancer.
4. Exporte novamente os atores recuperados. Compare os valores com o snapshot, inclusive os IDs dos itens e as referências nos loadouts. Reabra as fichas nativas; confira dados derivados, imagens, token padrão e vínculos. Recarregue o mundo e repita a conferência. Registre diferenças introduzidas pelo sistema, em vez de apagá-las da evidência.
5. Se um ator foi criado pela operação falha, ele não terá snapshot anterior. Identifique-o pelo registro da revisão/IDs, confira referências e só então decida sua remoção manual. Não remova atores com base apenas no nome. Se a importação nativa alterar IDs/referências ou não restaurar os campos esperados, o ensaio falhou: preserve os arquivos e volte ao backup completo do mundo. Não declare a recuperação aprovada.

A compensação automática e a importação manual não são uma transação distribuída. Uma recuperação deliberada substitui os dados do snapshot e pode apagar alterações feitas depois dele; faça-a com todos os envolvidos cientes e usando a cópia correta do mundo. Arquivos de imagem enviados durante a operação podem permanecer na pasta de saída.

## Registro obrigatório do ensaio real (E3-09, E6-11, RF-10)

| Campo | Registro |
| --- | --- |
| Foundry / Lancer / navegador | Pendente |
| Commit, versão e SHA-256 do ZIP | Pendente |
| Mundo de teste e snapshots | Pendente |
| IDs antes/depois e campos comparados | Pendente |
| Compensação automática / falha parcial | Pendente |
| Importação manual, reabertura e recarga | Pendente |
| Resultado e diferenças explicadas | Pendente |

Referências primárias: [ClientDocument v13 — importFromJSON / importFromJSONDialog](https://foundryvtt.com/api/v13/classes/foundry.ClientDocument.html), [Actor v13 — documentos e itens embutidos](https://foundryvtt.com/api/v13/classes/foundry.documents.Actor.html). Esses contratos de API orientam o roteiro; não substituem o ensaio do sistema instalado.
