# Estacionamento SEAGRI — Frontend

MVP Angular com Dashboard (`/`), Estacionamento (`/estacionamento`) e Veículos (`/veiculos`).
Requisitos, instalação, execução, proxy e comandos de build/testes estão no
[README principal](../README.md#instalação-e-execução-local).

## Organização dos componentes

```text
src/app/
  core/
    models/parking.ts              # Contratos atuais e estados visuais
    parking-layout.ts              # Numeração, alinhamento e dimensões físicas
    services/                      # HTTP e estado compartilhado das consultas
  pages/
    dashboard/                     # Indicadores e veículos cadastrados
    parking/                       # Mapa, ocupante, entrada, saída e histórico
    veiculos/                      # Consulta, cadastro, edição e exclusão pela API
  shared/
    icon/                          # Ícones SVG sem dependência externa
    metric-card/                   # Cards reutilizáveis
    parking-map/                   # Planta SVG e grade por setor para telas menores
  app.*                            # Layout administrativo e navegação
```

## Integração atual

- `VagasService`: `GET /vagas` e `GET /vagas/status`, usados nas duas páginas.
- `CarrosService`: `GET /carros`, compartilhado pelas três páginas, `POST /carros`, `PUT /carros/:id` e `DELETE /carros/:id` na página Veículos.
- `CadastroVeiculoService`: mantém o formulário, o contexto de edição, a confirmação de exclusão e os envios durante a sessão; valida as respostas e atualiza as consultas compartilhadas.
- Os dois services também oferecem consulta por ID nas rotas existentes; selecionar
  uma vaga já carregada não provoca uma requisição adicional.
- `API_BASE_URL`, em `core/services/api.config.ts`, permite configurar outra origem;
  por padrão, utiliza URLs relativas atendidas pelo proxy de desenvolvimento.
- `ParkingDataService` compartilha as listas e calcula os indicadores durante a sessão. Atualizar refaz as
  consultas; cadastro, ocupação e carros têm estados independentes, timeout de 15 segundos e
  validação do formato retornado. Resposta inválida não é tratada como lista vazia.
- A associação do status ao cadastro exige ID e número correspondentes. O contrato
  de ocupação é `{ id, numero, status, registroAtivo }`, com booleano obrigatório:
  `true` significa ocupada e `false`, livre. O registro ativo contém `id`, `carroId`,
  `vagaId`, `entrada`, `saida: null` e `carro: { id, placa, modelo, cor }`.
  Vagas livres retornam `registroAtivo: null`. Datas, IDs e vínculos são validados
  antes de habilitar a saída; dados de veículo ou horário não são inferidos.
- `RegistrosService`: `POST /registros/entrada`, com o contrato atual em minúsculas:
  `{ carroid: number, vagaid: number }`. Os valores são IDs do banco, não números físicos.
- O mesmo service envia `POST /registros/saida`, com `{ registroId: number }`,
  obtido automaticamente da vaga selecionada. Entradas e saídas compartilham o
  bloqueio de envio durante uma movimentação pendente.
- `ParkingHistoryService`: consulta `GET /registros`, valida itens e metadados de
  paginação e mantém os filtros aplicados na sessão. Consultas substituídas são
  canceladas; falhas têm tratamento independente das consultas do mapa.

## Situação dos veículos no Dashboard

A lista mostra veículo, situação, vaga e horário de entrada. A busca por placa,
modelo ou cor pode ser combinada com os filtros Estacionados, Disponíveis e Não
verificada. A situação só é confirmada quando a consulta de ocupação está completa
e consistente; falhas ou informações incompletas não apresentam veículos como disponíveis.

O atalho Ver no mapa abre `/estacionamento?vaga=4`, utilizando o número físico,
e seleciona a vaga correspondente. O endereço também funciona em acesso direto.
A seleção por URL leva o foco aos detalhes; valores inválidos não selecionam uma
posição. Veículos em vagas fora das 27 posições continuam identificados como
estacionados, com seu número e a indicação Fora do mapa, sem atalho inválido.

## Consulta, cadastro, edição e exclusão de veículos

A página `/veiculos` usa `ParkingDataService.carros`, sem lista local nem cadastros
fictícios. Reaproveita a consulta já feita nas outras páginas e oferece atualização,
pesquisa por placa/modelo/cor sem exigir acentos e estados distintos de carregamento,
erro, lista vazia e busca sem resultados.

O formulário envia `{ placa, modelo, cor }` a `POST /carros`. A placa é normalizada
para maiúsculas, sem espaços ou hífens, e aceita os formatos de sete caracteres
exemplificados por ABC1234 e ABC1D23. Modelo e cor são obrigatórios e têm suas
extremidades aparadas, com os limites de 80 e 40 caracteres. A validação do frontend
complementa as validações do servidor.

O bloqueio de envio duplicado e o formulário pertencem a `CadastroVeiculoService`,
com escopo da sessão. Navegar não cancela o cadastro e preserva um rascunho ainda
não enviado. Um `201` confirma a operação e limpa o formulário. O ID exibido vem
somente de uma resposta válida e correspondente aos dados enviados.

Após a resposta, `carros.reload()` cancela leituras anteriores e refaz `GET /carros`.
Veículos, Dashboard e seleção de entrada passam a consumir a mesma lista atualizada,
sem F5. Não há inserção de IDs inventados na lista. Falha nessa leitura preserva a
confirmação do cadastro e permite tentar novamente sem repetir o POST. Erros e falhas
incertas mantêm os campos preenchidos e não exibem mensagens internas do banco.

Os estilos da página reutilizam os estilos globais de painéis, botões, avisos e
estados vazios, além dos ícones compartilhados, sem alterar os budgets de CSS.
A lista organiza os dados e as ações em blocos no celular, sem comprimir as colunas.

Editar preenche o formulário com os dados do cadastro selecionado. Salvar envia
`PUT /carros/:id` com placa, modelo e cor normalizados, preservando o ID. Cancelar
edição não envia a operação e restaura o rascunho de novo cadastro anterior à edição.
Sucesso `200` encerra a edição; rejeições preservam os campos para correção. Placa
duplicada é conflito `409`; cadastro removido por outro operador retorna `404`.

Excluir abre um diálogo nativo com placa, modelo e cor. O foco inicial é Cancelar;
Cancelar ou Escape não enviam requisição. Confirmar envia `DELETE /carros/:id`
uma única vez e aguarda `204`. Durante o envio, os botões ficam bloqueados. O backend
devolve `409` com mensagens distintas para veículo estacionado ou com histórico,
mesmo encerrado. A saída de um veículo não remove seu histórico nem libera sua
exclusão. Uma segunda tentativa sobre um cadastro removido recebe `404`.

Cadastro, edição e exclusão compartilham um bloqueio de envio por sessão. O ID e os
dados da operação são capturados antes do envio; navegar não cancela a requisição
nem troca seu destino. Falhas de rede ou timeout deixam confirmação incerta e
provocam consultas, sem repetir a mutação. A confirmação persiste se a leitura falhar.

Após edição ou exclusão, o service refaz veículos, vagas, ocupação e o histórico
já carregado, cancelando leituras anteriores. As três páginas usam a lista atualizada
sem F5; detalhes do ocupante e histórico também recebem os novos atributos do cadastro.
O histórico mantém os vínculos e apresenta os dados atuais do veículo, sem cópia dos
atributos anteriores à edição. Os filtros aplicados são preservados na atualização.

## Layout para celular

Até 900 px, a marca ocupa um cabeçalho compacto e a navegação principal fica fixa
na parte inferior, com espaço reservado no conteúdo e respeito à área segura do
aparelho. Os três destinos mantêm a mesma rota e o indicador da página ativa.
As telas maiores preservam o menu lateral e a apresentação anterior.

O estacionamento usa uma grade de botões separada em Parte superior (01–18) e
Parte inferior (19–27), sem rolagem horizontal. As cores, os estados e a seleção
usam os mesmos dados da planta SVG. A grade agrupa as vagas por setor e não
representa distâncias ou escala física. Tocar em uma vaga leva o foco aos detalhes;
fechar devolve o foco ao botão correspondente. O painel sem seleção fica oculto
nessas larguras, e os mesmos formulários continuam registrando entradas e saídas.

Dashboard, histórico e Veículos compartilham `mobile-cards`: as tabelas viram
cartões com rótulos dos campos e ações acessíveis sem rolagem lateral. As listas
acompanham a rolagem da página, mantendo busca, filtros e paginação. Inputs e
seletores usam fonte de 16 px, e as ações e os botões de vaga têm pelo menos 44 px
de altura. Indicadores, formulários e botões recebem espaçamento para toque.

## Convenção física e disponibilidade

As 27 posições são 1–18 na parte superior e 19–27 na inferior, inicialmente
centralizada. Ajuste `numeros` e `startColumn` em `core/parking-layout.ts` para
alinhar outra correspondência física. Todas têm a mesma largura e altura. Em
larguras acima de 900 px, a planta mantém sua disposição e pode ser rolada dentro
do painel se necessário. Até 900 px, a grade por setor mantém a mesma numeração.

A associação usa `vaga.numero`. O ID do banco fica separado, é mostrado nos
detalhes e é o parâmetro de `buscarPorId()`, nunca o número físico.

| Resultado da consulta                           | Representação                                  |
| ----------------------------------------------- | ---------------------------------------------- |
| Cadastro e status `false` correspondentes       | Livre, em verde                                |
| Cadastro e status `true` correspondentes        | Ocupada, em vermelho                           |
| Cadastro encontrado, status ausente ou inválido | Disponibilidade desconhecida, em cinza         |
| Sucesso sem cadastro correspondente             | “Não cadastrada”, com hachura                  |
| Carregamento ou falha de cadastro               | Cadastro não verificado, sem concluir ausência |
| Cadastro fora da numeração física               | Aviso, sem criar ou substituir posições        |

Os indicadores contam somente vagas cadastradas dentro da numeração física do
mapa. A taxa é `ocupadas / cadastradas no mapa × 100`, exibida com até uma casa
decimal. Posições sem cadastro e cadastros fora do mapa ficam fora desse cálculo.
A base considerada aparece junto aos indicadores; a capacidade física permanece 27.

Uma falha nas consultas de cadastro ou ocupação, ou a ausência de status para
alguma vaga cadastrada no mapa, deixa os três indicadores com `—`. Os status
confirmados ainda são exibidos no mapa quando a resposta é válida e parcial.
Com cadastro e ocupação vazios, os totais são zero e a taxa fica indisponível,
evitando divisão por zero.

O botão Atualizar refaz cadastro e ocupação; no Dashboard, também refaz veículos e,
no Estacionamento, também consulta novamente o histórico.
Durante a consulta, a interface deixa de apresentar os status anteriores como
atuais. Falhas de ocupação têm opção de repetir apenas essa consulta, preservando
cadastros e veículos. A atualização feita em uma página é refletida na outra ao
navegar, sem recarregar o navegador. Não há polling automático.

## Detalhes do ocupante e registro de saída

Selecionar uma vaga ocupada mostra placa, modelo, cor, horário de entrada e ID do
registro ativo retornados na consulta de ocupação. O botão Registrar saída abre
uma confirmação com veículo e vaga. Cancelar não envia a operação; Confirmar saída
envia apenas o ID do registro ativo, sem digitação de placa. Trocar de vaga ou de
registro descarta a confirmação aberta. O envio revalida o registro contra o estado
consultado para evitar encerrar uma movimentação diferente da exibida.

O HTTP `200` confirma a saída. A resposta completa inclui o registro encerrado,
veículo, vaga e horário de saída; respostas incompletas não geram detalhes inventados.
O sucesso refaz cadastro e ocupação, liberando a vaga, atualizando indicadores e
devolvendo o veículo à seleção após confirmação pela consulta. Não há atualização
otimista que suponha a vaga livre antes da resposta.

Conflitos `409` e registros inexistentes `404` são apresentados sem detalhes internos.
Falhas de conexão, timeout e `500` deixam a operação com confirmação incerta e
provocam nova consulta, sem repetir o POST automaticamente. A última confirmação
permanece se essa consulta falhar. Navegar durante o envio não cancela a operação.

O controller de status utiliza `listarComStatus()` para consultar as ocupações.
A saída exige `registroId` numérico, inteiro e positivo; corpo ausente e IDs em texto,
booleanos ou listas retornam `400`. Erros de negócio passam pelo tratamento comum
da API: registro inexistente retorna `404` e registro já encerrado retorna `409`,
sempre em JSON.

## Registro de entrada

Selecionar uma vaga cadastrada com status livre confirmado apresenta o formulário
no painel de detalhes. Os veículos são carregados sob demanda e compartilhados
com o Dashboard. Há estados de carregamento, erro, lista vazia e atualização da
lista. O veículo é obrigatório. A seleção exclui todos os veículos com registro
ativo na consulta, inclusive em vagas cadastradas fora das 27 posições físicas.
Todos os cadastros precisam ter status correspondente; ocupantes incompletos ou
inconsistentes bloqueiam a seleção até uma nova consulta. Respostas antigas com
apenas o booleano continuam exibindo disponibilidade, mas não habilitam a seleção.
A interface diferencia ausência de cadastros de todos os veículos já estacionados.
Uma seleção que deixa de estar disponível é limpa e revalidada antes do envio.

O envio captura o veículo e a vaga selecionados e bloqueia uma segunda entrada
enquanto qualquer movimentação está pendente. A requisição pertence ao service da sessão:
trocar de vaga ou navegar para o Dashboard não cancela o envio nem troca seu destino.
Não há repetição automática do POST. Falhas de conexão ou timeout não são tratadas
como certeza de que nada foi gravado; a interface informa que a confirmação está
pendente e refaz as consultas.

Um `201` confirma o cadastro da entrada. A resposta completa é validada antes de
exibir ID do registro, número da vaga, placa, modelo, cor e horário do servidor.
Uma resposta incompleta mantém a confirmação do `201`, sem inventar detalhes.
O aviso identifica a última operação, permanece ao navegar entre as páginas e
pode ser dispensado. Ele não representa uma consulta do ocupante atual e não é
persistido após recarregar o navegador.

Após a resposta, cadastro e ocupação são consultados novamente, substituindo
consultas anteriores ainda em andamento para evitar dados anteriores à entrada.
Mapa, painel e indicadores compartilham esse resultado. Falhas nessa atualização
mantêm a confirmação da entrada e oferecem nova tentativa de consulta, sem
reenviar a operação.

O backend ainda precisa garantir exclusividade em requisições simultâneas de
outros clientes. O bloqueio local de envio duplicado não resolve essa pendência.

## Histórico abaixo do mapa

A seção ocupa a largura da página abaixo do conjunto mapa e detalhes. Exibe veículo,
vaga, entrada, saída, situação e permanência de movimentações encerradas. Movimentações
abertas mostram Em andamento, sem estimar horário de saída. A ordem é da entrada
mais recente para a mais antiga, com desempate pelo ID do registro.

Os filtros por placa parcial, período de entrada e situação são aplicados pelo
servidor, com paginação de 10, 20 ou 50 itens. O último dia selecionado é incluído
por inteiro no fuso do navegador. Um período invertido não envia a consulta.
Editar um campo não muda os filtros aplicados até clicar em Filtrar; Limpar
remove os filtros e volta à primeira página.

Filtros e resultados são compartilhados na sessão e reaproveitados ao navegar.
Após a resposta de entrada ou saída, o histórico já consultado volta à primeira
página com os filtros aplicados. Leituras anteriores são canceladas, evitando
que uma resposta antiga substitua o resultado da atualização. Falhas e respostas
incoerentes mostram erro com opção de repetir a consulta e preservam a confirmação
da movimentação. O contrato completo está no [README principal](../README.md#consulta-de-histórico).

## Verificação

O layout responsivo foi conferido no Edge em 320, 390, 760, 768 e 844 px, sem
rolagem horizontal da página, da grade ou dos cartões. Respostas controladas
permitiram comparar o desktop de 1440 px com a apresentação anterior. Foram
verificados os tamanhos dos botões, seleção das vagas 04 e 27, foco nos detalhes,
retorno à vaga e campos de entrada legíveis. Com as rotas reais e PostgreSQL em
banco temporário, também foram validados entrada, saída, edição, exclusão e seus
bloqueios em 320, 390 e 1440 px. O banco temporário foi removido e os dados locais
de demonstração foram preservados.

Edição e exclusão foram verificadas no Edge em desktop (1440 px) e celular (390 px),
com as rotas reais e PostgreSQL em banco temporário. Foram conferidos `200`, `204`,
placa duplicada, cancelamento e Escape, foco inicial, navegação durante a edição,
atualização do Dashboard, ocupante, seleção e histórico sem F5, bloqueios de exclusão
por ocupação e histórico, preservação das movimentações e persistência após recarregar.
Também foram validadas duas exclusões simultâneas e uma entrada concorrente com
exclusão, sem registros órfãos. O banco temporário foi removido e os dados locais
de demonstração foram preservados.

O cadastro de veículos foi validado no Edge em desktop (1440 px) e celular (390 px)
com as rotas reais da API e PostgreSQL em banco temporário. Foram conferidos `201`,
normalização dos campos, navegação durante o envio, atualização no Dashboard e na
seleção de entrada sem recarregar, entrada/saída do novo veículo e persistência após
recarregar a página. A duplicidade de placa, antes respondida como `400`, agora
retorna `409` no cadastro e na edição, com mensagem compreensível e preservação dos
campos. O banco temporário foi removido.

O fluxo de entrada foi conferido no Edge em desktop (1440 px) e celular (390 px),
com as rotas reais e PostgreSQL em banco temporário. Foram validados gravação,
confirmação, mapa, indicadores, conflito e recuperação de falha na atualização.
O banco temporário foi removido e os cadastros locais de demonstração preservados.

Os fluxos de ocupante, saída e filtro de veículos também foram conferidos no Edge
em desktop (1440 px) e celular (390 px), com as rotas reais da API e PostgreSQL em
banco temporário. Foram validados confirmação, cancelamento, saída persistida,
reentrada, retorno do veículo à seleção, exclusão de veículos em vagas fora do
mapa e indicadores, sem rolagem horizontal da página. O banco temporário foi
removido e os cadastros locais de demonstração preservados. Os testes com respostas
controladas cobrem conflitos e recuperação após falha de consulta.

A situação no Dashboard, o atalho para a vaga e o histórico abaixo do mapa foram
verificados no Edge nas mesmas larguras, usando as rotas reais e banco temporário.
Foram conferidos filtros combinados de placa, data e situação, paginação, ordenação,
permanência e atualização do histórico e do Dashboard após uma saída. O banco de
teste foi removido; as operações de auditoria não utilizaram os cadastros locais.

Os testes cobrem navegação e reaproveitamento de consultas, falhas independentes,
recuperação, busca, distinção entre número e ID, interpretação de `true`/`false`,
indicadores, respostas inválidas ou parciais, envio de entrada e saída com IDs,
detalhes do ocupante, confirmação e cancelamento, veículos fora do mapa, bloqueio de
duplicidade, mudança de registro, filtros e paginação do histórico, falhas e navegação durante os envios. Fixtures ficam
restritas aos testes. Não há dados mockados na aplicação.
Consulte os comandos de build e testes no README principal.
