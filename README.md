# Checkmat Brasil — protótipo de redesign

Conceito independente de uma página, em português, com layout responsivo, catálogo de academias, contatos e links de endereço no mapa, menu mobile e abas de jornada de treino.

## Catálogo de filiais

O diretório usa `dist/data/branches.json`, extraído do catálogo público em 8 de outubro de 2026. Foram percorridas todas as 252 combinações de país, estado e cidade dos selects originais, com deduplicação por ID_FILIAL.

- 402 filiais publicadas: Brasil 385, Argentina 7, Chile 5, Colômbia 1, Paraguai 4.
- O contador da fonte informa 404. Os dois cadastros adicionais não foram identificados pela consulta pública; a causa não foi confirmada.
- Nenhuma das 252 combinações de localização ficou sem cobertura na importação.
- As duas matrizes estão incluídas nos registros, sem duplicação.
- Documentação da coleta: `docs/catalog-import-summary.json` e `docs/catalog-coverage.json`.
- Planilha para revisão: `docs/filiais-checkmat.csv`.
- Importação reproduzível: `node scripts/import-branches.mjs`. O script emite um alerta e termina com código 2 se a lista divergir do contador, preservando o snapshot para revisão.

A busca inclui texto, país, estado/região e cidade, com 12 unidades por página. Os contatos e endereços são os que a fonte pública disponibiliza. A lista é um snapshot versionado; não há atualização automática nem conexão com sistemas administrativos. Links de mapa usam o endereço cadastrado, sem coordenadas geográficas verificadas.

As abas e a redação são propostas de conteúdo. O protótipo não agenda aulas nem envia mensagens.

## Fotos das academias

As imagens estão associadas por ID_FILIAL aos campos FOTO1, FOTO2 e FOTO3 do catálogo original. O snapshot contém 910 fotos disponíveis de 332 academias. Outras 67 unidades não fornecem fotos; três referências redirecionam para a página principal em vez de entregar uma imagem (HTTP 301). Todos os 402 cadastros permanecem acessíveis.

As fotos disponíveis foram copiadas para dist/assets/branches/<ID>/ e otimizadas em WebP, com miniaturas de até 640 × 480 px e versões ampliadas de até 1400 × 1400 px. As proporções e a orientação foram preservadas. O catálogo carrega miniaturas conforme necessário e abre uma galeria com navegação, teclado e seleção por miniaturas. Unidades sem imagem disponível exibem uma capa com o logotipo e uma indicação de ausência.

Cada imagem conserva sua URL de origem em sourcePhotos e photos.sourceUrl. A coleta não combina fotos entre unidades. Documentação: docs/photo-import-summary.json. Para atualizar, execute node scripts/import-branches.mjs e depois node scripts/sync-branch-photos.mjs; o sincronizador reaproveita os arquivos válidos já baixados. O processamento usa sharp (local ou no runtime de dependências do Codex).

## Fontes e imagens
- História e catálogo: https://checkmatbrasil.com.br/checkmat/
- Seletores públicos: php/LoadSelFilialPais.php, php/LoadSelFilialEstado.php, php/LoadSelFilialCidade.php.
- Filiais e fotos: php/FilialListAll.php, consultado com a mesma estrutura de filtros usada pelo frontend original. Imagens em https://checkmatbrasil.com.br/filial/imagens/academias/.
- Contador: graduacao/php/AcademiaContar.php.
- Fotografia de treino: https://www.checkmatjoinville.com.br/img/capa-1.JPG
- Equipe Fight Zone: https://www.checkmatbrasil.com.br/checkmat/sources/img/fightzonerj_02.jpg
- Logotipo: https://www.checkmatjiujitsu.com/ (asset público oficial).
- Fotografia e logotipo usados para revisão privada da proposta; confirmar direitos com os respectivos titulares para o site oficial.

## Verificação
Todos os 402 IDs ficaram acessíveis em 34 páginas, sem duplicação ou perda de registros. Filtros por cinco países e cascata Brasil/PR/Curitiba, busca por professor, limpeza, resultado vazio, telefones, mapa, falha e recuperação do carregamento passaram no navegador. Menu mobile e abas de treino foram preservados. Sem erros de JavaScript ou rolagem horizontal nas larguras 320, 390, 768 e 1440 px.

Também foram conferidas as associações de todas as 910 fotos aos IDs de origem e a existência dos 1820 arquivos locais. Galeria, navegação por teclado, miniaturas, retorno de foco, foto única, ausência de fotos e carregamento em celular passaram, sem erros de JavaScript.

O registro opcional WebMCP foi atualizado para os mesmos filtros. Validação em contexto nativo WebMCP indisponível porque o navegador de verificação não suporta essa API; a busca pela interface foi verificada.