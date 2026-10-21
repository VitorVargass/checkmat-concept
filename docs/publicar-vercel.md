# Publicar na Vercel

Esta versão usa HTML, CSS e JavaScript. A Vercel publica os arquivos da pasta dist, incluindo o catálogo das 402 academias e as 910 fotos disponíveis. Não é necessário instalar dependências nem executar um build para hospedar o site. Os scripts de importação de dados são ferramentas de manutenção e não precisam rodar na Vercel.

## Publicação pelo terminal

1. Abra um terminal na pasta que contém vercel.json e dist.
2. Execute npx vercel login e entre com sua conta no navegador.
3. Execute npx vercel para criar uma versão de prévia. Selecione a equipe desejada e o nome checkmat-brasil. A configuração já está em vercel.json.
4. Confira a prévia. Para publicar no endereço de produção, execute npx vercel --prod.

A primeira execução de npx pode pedir autorização para instalar o Vercel CLI. Não é necessário compartilhar tokens ou senhas.

## Publicação por GitHub

Crie um repositório com o conteúdo desta pasta, incluindo vercel.json e toda a pasta dist. Importe esse repositório em Add New → Project na Vercel.

- Framework Preset: Other.
- Root Directory: a pasta que contém vercel.json (a raiz do repositório, se você enviou este projeto como um repositório separado).
- Build Command: vazio.
- Install Command: vazio.
- Output Directory: dist.
- Environment Variables: nenhuma necessária.

Ao usar a integração Git, os próximos commits atualizam a versão publicada conforme a configuração da branch de produção do projeto.

## Dados e imagens

Os dados são um snapshot do cadastro público. A hospedagem não atualiza o catálogo automaticamente. Para uma nova coleta, execute scripts/import-branches.mjs e scripts/sync-branch-photos.mjs em um ambiente de manutenção e publique novamente dist. A ausência de duas unidades em relação ao contador oficial e de fotos em algumas academias está documentada em README.md.

Documentação oficial: https://vercel.com/docs/project-configuration/vercel-json e https://vercel.com/docs/cli/deploying-from-cli.
