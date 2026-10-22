# Sistema de Controle de Estacionamento — SEAGRI

Projeto de extensão universitária desenvolvido para auxiliar na organização do estacionamento da Secretaria de Estado da Agricultura e Pecuária de Alagoas. O objetivo é facilitar o controle de vagas, veículos, entradas e saídas, com três páginas e **27 posições físicas: 18 superiores e 9 inferiores**.

## Estado atual

O frontend oferece Dashboard com indicadores de ocupação, consulta e busca local de veículos, mapa SVG interativo e painel com veículo, horário de entrada e registro ativo da vaga ocupada. O formulário de entrada oferece somente veículos disponíveis. A saída é solicitada pelo painel, com confirmação e envio automático do ID do registro. A associação usa `vaga.numero`; o ID do banco permanece separado.

O Dashboard mostra a situação de cada veículo, sua vaga e horário de entrada, com filtros e atalho para abrir a vaga selecionada no mapa. A página Estacionamento também apresenta o histórico abaixo do mapa e dos detalhes, com placa, veículo, vaga, entrada, saída, permanência encerrada, situação e paginação. É possível filtrar por placa, período de entrada e movimentações abertas ou encerradas.

A página Veículos consulta `GET /carros`, cadastra por `POST /carros`, edita por `PUT /carros/:id` e exclui por `DELETE /carros/:id`. A edição preenche o formulário existente; a exclusão pede confirmação e respeita os bloqueios de veículos estacionados ou com histórico. As operações atualizam os dados compartilhados com o Dashboard e a seleção de entrada, sem recarregar o navegador. Há validação dos campos, bloqueio de envio duplicado, confirmação e recuperação de falhas. A listagem tem pesquisa local e estados de carregamento, erro e lista vazia.

A ocupação é consultada em `GET /vagas/status`: `true` significa ocupada e `false`, livre; `registroAtivo` identifica a movimentação aberta e o veículo, ou é `null` quando livre. Os indicadores consideram somente vagas cadastradas que correspondem às posições físicas do mapa. Falhas ou status incompletos mantêm os indicadores indisponíveis e as vagas afetadas em cinza. Entradas e saídas apresentam confirmação e refazem as consultas do mapa e dos indicadores. Não há dados mockados na aplicação; os cadastros são consultados no banco configurado.

Os fluxos de ocupante, entrada e saída foram verificados no navegador com as rotas reais e PostgreSQL em banco temporário. A consulta de status utiliza `listarComStatus()` e os erros de negócio da saída são tratados em JSON, com validação estrita do ID recebido. Os cadastros locais de demonstração foram preservados.

## Tecnologias e pré-requisitos

| Área               | Tecnologias do repositório                                        |
| ------------------ | ----------------------------------------------------------------- |
| Frontend           | Angular 21.2, TypeScript 5.9, Router, HttpClient, RxJS, CSS e SVG |
| Testes do frontend | Vitest e jsdom, executados pelo Angular CLI                       |
| Backend            | Node.js, Express 5.2, TypeScript 7.0 e `tsx`                      |
| Banco e ORM        | PostgreSQL e Prisma ORM/Client 6.19.3                             |

Instale Git, Node.js com npm e PostgreSQL com o cliente `psql`:

- **Node.js:** use a linha 22 LTS, versão 22.12 ou superior. O lockfile do Angular admite `^20.19.0 || ^22.12.0 || >=24.0.0`; os manifests não definem `engines` próprios.
- **npm:** `Front/package.json` declara `npm@11.8.0`. A validação anterior também funcionou com npm 10.9.9. Angular e Prisma são instalados localmente, sem instalação global.
- **PostgreSQL:** versão 15 ou superior, conforme `Back/.env.example`, com usuário autorizado a criar o banco e aplicar migrations.

Os lockfiles reproduzem as dependências de cada aplicação.

## Estrutura

```text
Back/src/
  routes/        # Rotas Express
  controller/    # Requisições e respostas HTTP
  service/       # Regras de negócio
  repository/    # Acesso ao banco com Prisma Client
  models/        # Classes de domínio existentes
  prisma/        # Schema, migrations e artefatos de banco
  server.ts      # API na porta 3000
Front/
  src/app/
    core/        # Interfaces, configuração física e services
    pages/       # Dashboard, Estacionamento e Veículos
    shared/      # Mapa SVG, cards e ícones
  proxy.conf.json
  start.ps1
postman/         # Configuração de workspace; sem coleção de endpoints
```

O `package.json` da raiz tem apenas uma dependência de Express, sem scripts ou workspaces. Instale e execute `Back/` e `Front/` separadamente. Detalhes dos componentes estão em [Front/README.md](Front/README.md).

## Instalação e execução local

Os comandos usam PowerShell.

### 1. Clonar e instalar

No diretório em que deseja guardar o projeto:

```powershell
git clone https://github.com/DeltaPenas/Projeto-de-Extens-o-Estacionamento-2.git
cd Projeto-de-Extens-o-Estacionamento-2
cd Back
npm ci
cd ..\Front
npm ci
cd ..
```

O último comando retorna à raiz.

### 2. Configurar ambiente e PostgreSQL

Inicie o serviço PostgreSQL instalado no computador. No Windows, use o aplicativo Serviços; o nome do serviço depende da instalação. Se `psql` não for reconhecido, disponibilize a pasta `bin` da instalação no `PATH`.

Em um clone novo, a partir da raiz:

```powershell
cd Back
Copy-Item .env.example .env
```

Edite `Back/.env` com a conexão do seu ambiente:

```dotenv
DATABASE_URL="postgresql://<USUARIO>:<SENHA>@localhost:5432/estacionamento?schema=public"
```

Substitua os campos entre `< >`; são placeholders, não credenciais válidas. Caracteres reservados em usuário/senha precisam de codificação de URL. `.env` é ignorado pelo Git; se já existir, preserve sua configuração.

Ainda em `Back/`, crie o banco caso não exista:

```powershell
psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE estacionamento;"
```

`postgres` é o administrador padrão deste exemplo; substitua-o se necessário. A senha é solicitada pelo cliente. O usuário configurado em `DATABASE_URL` deve ter acesso ao banco.

### 3. Aplicar migrations e gerar o Prisma Client

Em `Back/`, após configurar `.env`:

```powershell
npx prisma validate --schema=src/prisma/schema.prisma
npx prisma migrate deploy --schema=src/prisma/schema.prisma
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate status --schema=src/prisma/schema.prisma
```

Os comandos usam o Prisma 6 instalado por `npm ci`. `migrate deploy` aplica as migrations existentes; `generate` gera o Client separadamente. A migration inicial cria as três tabelas, **sem cadastrar as 27 vagas**. [Referência do Prisma 6](https://www.prisma.io/docs/orm/v6/reference/prisma-cli-reference#migrate-deploy).

O schema efetivo está indicado em `Back/package.json`. Há artefatos de Prisma Next divergentes em `Back/`, sem uso pelos repositories atuais. O fluxo acima utiliza `src/prisma/schema.prisma`, em vez dos comandos de Prisma Next de `Back/prisma-next.md`. Divergências em bancos já existentes devem ser reconciliadas pela equipe antes de aplicar migrations.

### 4. Iniciar o backend

Em `Back/`, mantenha este terminal aberto:

```powershell
node --env-file=.env ./node_modules/tsx/dist/cli.mjs watch src/server.ts
```

O comando usa o executável declarado pelo pacote `tsx` e carrega `.env` explicitamente pelo Node. O script **`npm run dev`** também existe (`tsx watch src/server.ts`) e pode ser usado com o ambiente configurado. A opção [`--env-file`](https://nodejs.org/api/cli.html#--env-filefile) disponibiliza as variáveis ao processo sem alterar o código.

API: **http://localhost:3000**. A porta é fixa em `Back/src/server.ts`; não há rota `GET /` nem health check. Uma consulta existente, após iniciar a API:

```powershell
Invoke-RestMethod http://localhost:3000/vagas
```

As consultas de vagas, ocupação e veículos podem ser verificadas com a API e o PostgreSQL locais. Os cadastros disponíveis dependem do banco configurado; não há seed versionado de vagas ou veículos.

### 5. Iniciar o frontend

Em outro terminal, a partir da raiz:

```powershell
cd Front
npm start
```

Abra **http://localhost:4200**: `/` é o Dashboard, `/estacionamento` é o Mapa e `/veiculos` é o cadastro e consulta de veículos. Encerre os servidores com `Ctrl+C` nos respectivos terminais.

Alternativa no Windows, também em `Front/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

O script usa Node/npm instalados ou um runtime portátil já presente em `.tools/`, instala dependências se o pacote de build estiver ausente e executa `npm start`. **O runtime portátil não acompanha o clone**: `.tools/` é ignorado pelo Git. Uma instalação comum de Node/npm atende ao fluxo principal.

### 6. Build e testes

Em `Front/`:

```powershell
npm run build
npm test -- --watch=false
```

Saída do build: `Front/dist/estacionamento/`. Os 112 testes cobrem navegação entre as três páginas, cadastro, edição e exclusão de veículos, confirmação e cancelamento, atualização compartilhada sem F5, situação dos veículos e atalho para a vaga, cores do mapa, indicadores, entrada e saída, histórico com filtros e paginação, atualização e tratamento de falhas. Fixtures ficam restritas aos testes. O CSS da página Veículos reutiliza estilos globais e atende aos budgets existentes, sem aumentar os limites.

Em `Back/`, execute `npm test` para rodar os 78 testes de regressão de status, saída, histórico e veículos. Eles verificam contratos, normalização, filtros, paginação, IDs inválidos, bloqueios de exclusão e erros `400`, `404`, `409` e `500`, substituindo services ou repositories durante o teste, sem consultar ou alterar o banco. Não há scripts de build ou start de produção no backend.

A verificação de tipos com `npx tsc --noEmit` ainda aponta uma dependência ausente (`@prisma/orm-postgres/runtime`) no artefato antigo `src/prisma/db.ts`. Esse arquivo de Prisma Next não é utilizado pelas rotas atuais, que usam Prisma Client 6; a pendência não impede a execução da API nem dos testes de controllers.

## Integração e principais rotas

O Angular centraliza o HTTP em `Front/src/app/core/services/`, com URLs relativas e sem prefixo `/api`. O proxy de `angular.json` encaminha `/vagas`, `/vagas/**`, `/carros`, `/carros/**`, `/registros` e `/registros/**` para `http://127.0.0.1:3000`, preservando caminhos. A interface chama `GET /vagas`, `GET /vagas/status`, `GET /carros`, `POST /carros`, `PUT /carros/:id`, `DELETE /carros/:id`, `GET /registros`, `POST /registros/entrada` e `POST /registros/saida`.

| Rotas existentes                                        | Situação                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /vagas`, `GET /vagas/:id`                          | ID e número; sem ocupação                                             |
| `GET /vagas/status`                                     | ID, número, status e registro ativo com veículo; integrado ao mapa e aos indicadores |
| `POST /vagas`, `PUT /vagas/:id`, `DELETE /vagas/:id`    | Cadastro, alteração e exclusão implementados no código                |
| `GET /carros`, `GET /carros/:id`                        | Consulta de veículos                                                  |
| `POST /carros`                                          | Cadastro integrado à página Veículos com `{ placa, modelo, cor }` e retorno `201` |
| `PUT /carros/:id`, `DELETE /carros/:id`                 | Edição integrada com retorno `200`; exclusão com confirmação e retorno `204`, bloqueada para veículos estacionados ou com histórico |
| `POST /registros/entrada`                               | Integrado com `{ carroid, vagaid }`; concorrência pendente no backend |
| `POST /registros/saida`                                 | Integrado com `{ registroId }` inteiro e positivo; erros de negócio em JSON |
| `GET /registros`                                       | Histórico paginado com veículo, vaga e filtros por placa, período de entrada e situação |

O proxy só funciona no desenvolvimento. Em produção, encaminhe as rotas à API na mesma origem ou configure outra origem com CORS. Não há autenticação ou configuração de CORS na API atual.

## Cadastro de veículos

A página `/veiculos` usa a mesma lista de `ParkingDataService` consumida pelo Dashboard e pelo formulário de entrada. `POST /carros` envia apenas `placa`, `modelo` e `cor`; o ID é atribuído pelo banco. Frontend e backend convertem a placa para maiúsculas e removem espaços e hífens; modelo e cor têm espaços das extremidades removidos. Os campos são obrigatórios, com os limites de 80 caracteres no modelo e 40 na cor. Uma placa já cadastrada retorna `409` em JSON, sem detalhes internos do banco.

O envio e o rascunho ficam na sessão. Navegar durante o cadastro não cancela o POST; o `201` confirma o cadastro e limpa o formulário. A resposta é validada antes de exibir o ID, e a lista é consultada novamente, cancelando leituras anteriores que poderiam substituir o resultado por dados desatualizados. O novo veículo aparece no Dashboard e na seleção de entrada após essa consulta, sem F5.

Falha de atualização da lista preserva a confirmação e permite repetir somente a leitura. Uma falha de conexão ou timeout mantém os dados preenchidos e apresenta confirmação incerta, orientando a conferir a placa na lista antes de tentar cadastrar novamente. O POST não é repetido automaticamente. Mensagens internas do Prisma não são exibidas na interface.

Editar preenche o mesmo formulário com placa, modelo e cor do veículo selecionado. Salvar envia esses campos a `PUT /carros/:id`, mantendo o ID original; o `200` confirma a alteração. Cancelar não envia requisição e restaura um eventual rascunho de novo cadastro. É possível corrigir dados de um veículo estacionado sem alterar sua movimentação. A API continua aceitando alterações parciais, preservando os campos omitidos.

Excluir abre uma confirmação com os dados do cadastro; Cancelar ou Escape não enviam `DELETE`. Confirmar envia `DELETE /carros/:id`, sem corpo, e o `204` confirma a remoção. Veículo inexistente retorna `404`; estacionado retorna `409` com orientação para registrar a saída; qualquer histórico, mesmo encerrado, também bloqueia a exclusão com `409`. Registrar a saída não libera a exclusão de um veículo que já tem histórico. Nenhuma movimentação é apagada. A FK existente protege os vínculos se uma entrada acontecer durante a exclusão; se o cadastro for removido antes da entrada, a entrada rejeitada pela FK retorna `404` em JSON. Não há nova migration.

Edição e exclusão refazem as consultas de veículos e ocupação, além do histórico caso já tenha sido carregado, cancelando leituras anteriores. Dashboard, seleção de entrada, detalhes do ocupante e histórico passam a mostrar os dados atuais sem F5. O histórico usa os dados atuais do cadastro vinculado, sem uma cópia dos atributos antigos do veículo. Os envios pertencem à sessão e não são cancelados pela navegação; nenhuma mutação é repetida automaticamente após falha de rede ou timeout. A confirmação permanece mesmo se uma consulta posterior falhar.

## Consulta de histórico

`GET /registros` retorna movimentações abertas e encerradas, em ordem de `entrada` decrescente, com desempate por `id` decrescente. A consulta é somente leitura e utiliza as tabelas existentes, sem nova migration.

| Parâmetro | Comportamento |
| --------- | ------------- |
| `page` | Inteiro positivo; padrão `1`. |
| `limit` | Inteiro de `1` a `100`; padrão `20`. O frontend utiliza `10`, `20` ou `50`. |
| `placa` | Busca parcial, sem diferenciar maiúsculas/minúsculas, com até 20 caracteres. |
| `situacao` | `abertos` para saída nula, `encerrados` para saída preenchida; omitir inclui ambos. |
| `dataInicio` | Horário de entrada a partir deste instante, inclusive; data ISO com horário e fuso. |
| `dataFim` | Horário de entrada anterior a este instante, exclusivo; data ISO com horário e fuso. |

Exemplo: `GET /registros?page=1&limit=10&placa=ABC&situacao=encerrados`.

```json
{
  "items": [
    {
      "id": 56,
      "entrada": "2026-10-21T12:00:00.000Z",
      "saida": "2026-10-21T13:25:00.000Z",
      "carroId": 81,
      "vagaId": 205,
      "carro": { "id": 81, "placa": "ABC1D23", "modelo": "Onix", "cor": "Branco" },
      "vaga": { "id": 205, "numero": 4 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

Os filtros são combinados. Itens e total são consultados na mesma transação com snapshot consistente. Parâmetros inválidos retornam `400` com `{ "erro": "..." }`; falhas internas retornam `500` com mensagem genérica. Uma página além do total retorna itens vazios e mantém o total e a página solicitada; sem resultados, `totalPages` é `0`.

Na interface, as datas seguem o fuso do navegador e o último dia selecionado é incluído integralmente. O frontend converte seu fim para o início do dia seguinte antes de consultar a API. Após entradas e saídas, o histórico já carregado é consultado novamente na primeira página, mantendo os filtros aplicados. Falha nessa leitura não desfaz a confirmação da movimentação.

## Limitações e próximas entregas

- Os detalhes do ocupante e a saída exigem um registro ativo válido e correspondente à vaga. Dados ausentes ou inconsistentes desabilitam a saída. Para filtrar os veículos de entrada, a consulta deve cobrir todos os cadastros, inclusive vagas fora do mapa; informações incompletas bloqueiam a seleção.
- O backend permite reutilizar vagas após a saída, mas ainda precisa garantir uma entrada ativa por vaga e por veículo em requisições simultâneas. O bloqueio de envio duplicado no frontend se aplica somente à sessão atual.
- A confirmação da última movimentação mostra registro, vaga, veículo e horários retornados pela operação. Ela fica apenas na sessão e não substitui a consulta do ocupante atual. Falhas na atualização preservam a confirmação, sem repetir o envio.
- A exclusão de veículos com movimentações, abertas ou encerradas, é bloqueada para preservar o histórico. Arquivamento de cadastros ainda não existe.
- Não há seed versionado dos cadastros.
- Uma posição só aparece como “Não cadastrada” após consulta bem-sucedida sem registro correspondente. Falhas permanecem como cadastro não verificado.
- O botão Atualizar refaz as consultas; não há atualização automática. O estado compartilhado mantém mapa e Dashboard coerentes ao navegar entre as páginas.
