# Token Studio v0.2.4 — caminhos das molduras

Corrige os caminhos das miniaturas, molduras originais e imagens padrão quando a rota da pasta não termina em barra. O prefixo do servidor é preservado.

Os 356 originais e as 356 miniaturas da release anterior foram decodificados sem erros; seus bytes foram preservados. A junção incorreta podia gerar `assetsframes/...`, causando falha no carregamento.

A publicação verifica todos os arquivos do catálogo por HTTP com e sem prefixo, além dos testes de carregamento do editor e registro do menu/API.

Atualize para 0.2.4, recarregue o mundo com Ctrl+F5 e abra novamente o catálogo. A confirmação visual em Foundry 13 + Lancer reais continua pendente.
