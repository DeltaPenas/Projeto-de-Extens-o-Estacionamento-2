import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { VagaController } from '../src/controller/VagaController';
import { RegistroController } from '../src/controller/RegistroController';
import { VagaService } from '../src/service/VagaService';
import { RegistroService } from '../src/service/RegistroService';
import { AppError } from '../src/errors/AppError';

function response() {
  const result = { status: 200, body: undefined as unknown };
  const res = {
    status(code: number) {
      result.status = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as Response;
  return { res, result };
}

const req = (body?: unknown) => ({ body }) as Request;
const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
const vaga = { id: 205, numero: 4 };
const ativo = {
  id: 56, carroId: carro.id, vagaId: vaga.id,
  entrada: new Date('2026-10-21T12:00:00.000Z'), saida: null, carro,
};

test('status chama listarComStatus e retorna o registro ativo com o veículo', async (t) => {
  const vagas = [
    { ...vaga, status: true, registroAtivo: ativo },
    { id: 307, numero: 5, status: false, registroAtivo: null },
  ];
  const listar = t.mock.method(VagaService.prototype, 'listarComStatus', async () => vagas);
  const { res, result } = response();
  await new VagaController().listarStatus(req(), res);
  assert.equal(listar.mock.callCount(), 1);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, vagas);
});

test('saída encaminha o ID numérico do registro e retorna a movimentação encerrada', async (t) => {
  const encerrado = { ...ativo, vaga, saida: new Date('2026-10-21T14:00:00.000Z') };
  const liberar = t.mock.method(RegistroService.prototype, 'liberarVaga', async () => encerrado);
  const { res, result } = response();
  await new RegistroController().liberar(req({ registroId: 56 }), res);
  assert.deepEqual(liberar.mock.calls[0]?.arguments, [56]);
  assert.equal(liberar.mock.callCount(), 1);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, encerrado);
});

for (const [label, body] of [
  ['sem corpo', undefined], ['corpo nulo', null], ['corpo vazio', {}], ['lista vazia', []],
  ['ID zero', { registroId: 0 }], ['ID negativo', { registroId: -1 }],
  ['ID fracionário', { registroId: 1.5 }], ['ID textual', { registroId: '56' }],
  ['ID booleano', { registroId: true }], ['ID em lista', { registroId: [56] }],
] as const) {
  test(`saída rejeita ${label} com 400 JSON antes de acessar o service`, async (t) => {
    const liberar = t.mock.method(RegistroService.prototype, 'liberarVaga');
    const { res, result } = response();
    await new RegistroController().liberar(req(body), res);
    assert.equal(liberar.mock.callCount(), 0);
    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {
      erro: 'registroId é obrigatório e deve ser um número inteiro positivo',
    });
  });
}

for (const [status, mensagem] of [
  [404, 'Registro não encontrado'], [409, 'Este registro já foi encerrado'],
] as const) {
  test(`saída preserva o erro de negócio ${status} em JSON`, async (t) => {
    t.mock.method(RegistroService.prototype, 'liberarVaga', async () => {
      throw new AppError(mensagem, status);
    });
    const { res, result } = response();
    await new RegistroController().liberar(req({ registroId: 56 }), res);
    assert.equal(result.status, status);
    assert.deepEqual(result.body, { erro: mensagem });
  });
}

test('saída inesperada retorna 500 JSON sem expor detalhes internos', async (t) => {
  t.mock.method(RegistroService.prototype, 'liberarVaga', async () => {
    throw new Error('Detalhes internos do banco');
  });
  const log = t.mock.method(console, 'error', () => undefined);
  const { res, result } = response();
  await new RegistroController().liberar(req({ registroId: 56 }), res);
  assert.equal(log.mock.callCount(), 1);
  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { erro: 'Erro interno' });
});
