# Changelog

## 0.2.9 — Arte única e aplicação COMP/CON

- Corrige a importação ausente de `loadResources`, que quebrava arquivo, URL, moldura e projeto.
- Uma escolha de arte prepara retrato e token juntos: retrato sem borda e token com sua moldura, com enquadramentos separados. A opção avançada permite trocar só a edição atual.
- Aplicar começa com retrato e token padrão selecionados. URLs apenas para visualização não impedem aplicar o outro destino editável.
- Guarda metadados COMP/CON com chaves literais contendo pontos em JSON opaco ao Foundry; evita o conflito entre uma data e seus campos filhos, preservando todos os dados e a leitura de projetos antigos.
- Adiciona regressões para o erro real `Cannot use 'in' operator ... 'id' in 1790477053906`, aplicação e reabertura da ficha, e funções sem importação no editor.


## 0.2.8 — 2026-10-05

- O menu de escolhas mantém opções com altura mínima de 40 px e rolagem independente em janelas curtas, sem comprimir o texto.
- Retratos remotos de atores antigos, sem flags de acesso, aparecem em modo de visualização quando a hospedagem bloqueia CORS, em vez de deixar o editor vazio. Falhas de moldura continuam sendo tratadas como falhas de moldura.
- Gatilhos personalizados conservam descrição; licenças V3 usam nome/fabricante do `stub`, eliminando falsos avisos de definição ausente.
- Sinergias de itens, talentos e core system são convertidas para os checklists nativos do Lancer. Listas vazias não passam a afetar todos os tipos de arma.
- A revisão valida o ator completo em memória, com itens e referências do loadout, usando o sistema instalado. Após aplicar, prepara os dados e o template da ficha nativa; falhas acionam restauração e informam o ator/causa.
- O mecha favorito do COMP/CON passa a ser o mecha ativo do piloto. Erros de retrato identificam a unidade afetada e interrompem a aplicação antes de alterar documentos.
- A abertura da ficha no Foundry real ainda precisa ser conferida no mundo afetado; esta versão não declara compatibilidade verificada.


## 0.2.7 — 2026-10-05

- Regras por arma/sistema/talento/frame e demais origens, com contagens, ações/passivas/efeitos/descrições separados, filtros combinados e montagem do conteúdo ao abrir.
- Pendências da ficha com unidade, origem e caminhos dos dados preservados, incluindo referências ausentes e regras sem classificação.
- COMP/CON e imagens públicas usam URLs HTTPS validadas, sem upload automático de retrato; prévia, extração de Google imgurl/metadados acessíveis e avisos de expiração Discord.
- Retrato disponível apenas para visualização pode ser vinculado ao ator; edição/exportação ficam bloqueadas e a arte do token é preservada quando a hospedagem impede CORS.
- Arquivos locais e resultados exportados são reutilizados por SHA-256 entre atores, evitando cópias idênticas. Arquivos antigos não são apagados.
- Testes de regressão para agrupamento, None/passivas, URLs, permissões de imagem, deduplicação e preservação de tokens. Foundry 13 + Lancer reais continuam pendentes.

## 0.2.6 — 2026-10-05

- Adiciona zoom pela roda do mouse no palco de token/retrato, com limites de enquadramento e um desfazer por gesto; evita rolagem da janela durante o zoom.
- Coloca favoritas primeiro no catálogo e até seis atalhos na tela inicial, preservando busca, coleções e preferências salvas.
- Reorganiza a ficha em perfil narrativo, perfil tático, loadout do piloto e hangar, seguindo os contextos do COMP/CON. Mantém o seletor de unidade sempre acessível.
- Separa ações ativas por piloto/mecha, com busca, tipo e opção de consultar inativas. Agrupa talentos e demais categorias em abas navegáveis pelo teclado, com ranks adquiridos e regras expansíveis.
- Mostra apenas o loadout selecionado de cada mecha, com frame, traits, core system e indicação de montagens; melhora valores no modo de leitura e mantém edição e dados adicionais.
- Corrige a seleção ao desfazer/remover um mecha: retorna ao piloto antes da renderização. Seis testes de regressão novos; integração real Foundry/Lancer continua pendente.

## 0.2.5 — 2026-10-05

- Vincula a ficha COMP/CON ao piloto nativo: dados existentes, código público, data de sincronização e origem registrada no ator. O token padrão acompanha o nome e fica vinculado ao piloto.
- Importa o retrato v3/legado/embutido, valida e guarda o original no Foundry, atualiza a imagem da ficha e o editor já aberto.
- Preserva arte, moldura, enquadramento, escala e demais ajustes de tokens personalizados; usa o retrato somente quando a arte do token é padrão.
- Acrescenta retrato à revisão, ativa identidade/retrato/build/recursos/mechas por padrão e mantém a aplicação explícita. Mostra o retrato e o estado do vínculo na ficha do mestre.
- Reconfere alterações concorrentes após download e backup; recupera imagem e token junto dos dados quando a aplicação falha.
- Dez regressões novas cobrem vínculo completo, atualização, FilePicker e retorno ao editor, falhas de imagem, concorrência e restauração. Foundry 13 + Lancer reais ainda requerem confirmação.

## 0.2.4

- Corrige a junção dos caminhos das imagens quando a rota de assets não termina em barra, preservando prefixos do servidor.
- Usa a mesma função para miniaturas, originais e imagens padrão; os arquivos originais permanecem intactos.
- Adiciona regressão na passagem dos caminhos Foundry → editor e verifica por HTTP todos os arquivos do catálogo empacotado, com e sem prefixo.

## 0.2.3 — 2026-10-05

- Corrige o carregamento do módulo no navegador: o build em modo biblioteca agora substitui `process.env.NODE_ENV` por `production`. O React empacotado não exige mais a variável Node `process`.
- Reproduz o erro `ReferenceError: process is not defined` no ZIP oficial 0.2.2, que interrompia a importação antes do registro do menu, cabeçalhos e API.
- Adiciona testes do grafo real de módulos empacotados, incluindo React, sem globais Node e sem substituir o editor por uma simulação. Esses testes fazem parte da publicação e impedem a liberação de um pacote que falhe ao carregar.
- Mantém a integração de contexto `getActorContextOptions` da versão 13. Validação no Foundry real ainda depende da instalação do usuário.

## 0.2.2 — 2026-10-05

- Corrige a entrada Token Studio no menu de contexto dos atores: utiliza `getActorContextOptions`, evento público do Foundry 13, em vez do evento removido da versão 12.
- Resolve o ator clicado pela coleção do aplicativo e respeita permissão de edição; evita entradas duplicadas.
- Corrige a versão exposta pela API para acompanhar o módulo instalado.
- Adiciona testes de abertura pelo menu e pelos cabeçalhos V1/V2. A execução em Foundry 13 + Lancer reais ainda requer validação.

## 0.2.1 — 2026-10-05

- Prepara distribuição pelo GitHub com manifesto de instalação e ZIP fixado na tag `v0.2.1`.
- Mantém versões do código-fonte, manifesto e pacote em sincronia.
- Adiciona validação do pacote, checksums e workflow de publicação de releases.
- Reconstrói o ZIP de distribuição anterior que estava incompleto.
- Mantém o comportamento da 0.2.0. Validação em Foundry 13 + Lancer reais permanece pendente.

## 0.2.0 — 2026-10-05

- Catálogo de 330 molduras e preservação das 356 imagens fornecidas.
- Importação de ficha pública COMP/CON, edição local, comparação de atualizações e painel do mestre.
- Revisão e backup antes de aplicar alterações aos atores no Foundry.

## 0.1.0 — 2026-10-05

- Editor independente de retratos e tokens, enquadramentos separados, molduras, presets e exportação PNG/WebP.
