# Estacionamento SEAGRI — Frontend

MVP Angular com Dashboard (`/`) e Estacionamento (`/estacionamento`).
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
    parking/                       # Mapa, ocupante, entrada, confirmação e saída
  shared/
    icon/                          # Ícones SVG sem dependência externa
    metric-card/                   # Cards reutilizáveis
    parking-map/                   # Planta SVG e interação por mouse/teclado
  app.*                            # Layout administrativo e navegação
```

## Integração atual

- `VagasService`: `GET /vagas` e `GET /vagas/status`, usados nas duas páginas.
- `CarrosService`: `GET /carros`, para consulta e busca local no Dashboard e seleção no formulário de entrada.
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

## Convenção física e disponibilidade

As 27 posições são 1–18 na parte superior e 19–27 na inferior, inicialmente
centralizada. Ajuste `numeros` e `startColumn` em `core/parking-layout.ts` para
alinhar outra correspondência física. Todas têm a mesma largura e altura. Em
resoluções pequenas, a planta permite rolagem horizontal.

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

O botão Atualizar refaz cadastro e ocupação; no Dashboard, também refaz veículos.
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

Na revisão `e46451e` do backend, a consulta real ainda retorna `500`: o controller
chama `listarStatus()`, mas o service expõe `listarComStatus()`. O controller de saída
também está sem o import de `responderErro`. A correção desses pontos pela equipe
do backend é necessária para validar o fluxo completo pela API; os testes do
frontend usam respostas controladas do contrato entregue.

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

## Verificação

O fluxo de entrada foi conferido no Edge em desktop (1440 px) e celular (390 px),
com as rotas reais e PostgreSQL em banco temporário. Foram validados gravação,
confirmação, mapa, indicadores, conflito e recuperação de falha na atualização.
O banco temporário foi removido e os cadastros locais de demonstração preservados.

Os novos fluxos de ocupante, saída e filtro de veículos foram conferidos no Edge
em desktop (1440 px) e celular (390 px), com respostas controladas da API. Foram
validados confirmação, cancelamento, conflito, reentrada, retorno do veículo à
seleção, indicadores e recuperação após falha de consulta, sem rolagem horizontal
da página. Essa verificação não substitui a integração real pendente das correções
do controller descritas acima.

Os testes cobrem navegação e reaproveitamento de consultas, falhas independentes,
recuperação, busca, distinção entre número e ID, interpretação de `true`/`false`,
indicadores, respostas inválidas ou parciais, envio de entrada e saída com IDs,
detalhes do ocupante, confirmação e cancelamento, veículos fora do mapa, bloqueio de
duplicidade, mudança de registro, falhas e navegação durante os envios. Fixtures ficam
restritas aos testes. Não há dados mockados na aplicação.
Consulte os comandos de build e testes no README principal.
