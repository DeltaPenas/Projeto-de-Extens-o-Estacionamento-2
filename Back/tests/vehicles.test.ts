import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { CarroController } from "../src/controller/CarroController";
import { CarroService } from "../src/service/CarroService";
import { CarroRepository } from "../src/repository/CarroRepository";
import { RegistroController } from "../src/controller/RegistroController";
import { RegistroRepository } from "../src/repository/RegistroRepository";
import { VagaRepository } from "../src/repository/VagaRepository";

const carro = { id: 81, placa: "ABC1D23", modelo: "Onix", cor: "Branco" };
function request(id: unknown = "81", body?: unknown) {
  return { params: { id }, body } as unknown as Request;
}
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
    send() {
      return this;
    },
  } as Response;
  return { res, result };
}
const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Internal Prisma details", {
    code,
    clientVersion: "6.19.3",
  });

for (const id of [
  "0",
  "-1",
  "1.5",
  "1e2",
  "abc",
  "2147483648",
  undefined,
  ["81"],
]) {
  for (const action of ["atualizar", "deletar"] as const) {
    test(`${action} rejeita ID inválido ${JSON.stringify(id)} antes do service`, async (t) => {
      const chamada = t.mock.method(CarroService.prototype, action);
      const { res, result } = response();
      await new CarroController()[action](
        { params: { id }, body: carro } as unknown as Request,
        res,
      );
      assert.equal(result.status, 400);
      assert.equal(chamada.mock.callCount(), 0);
    });
  }
}
for (const body of [
  undefined,
  null,
  [],
  {},
  { id: 82 },
  { placa: null },
  { modelo: " " },
  { cor: 123 },
  { placa: "1234567" },
  { modelo: "x".repeat(81) },
  { cor: "x".repeat(41) },
]) {
  test(`edição rejeita corpo inválido ${JSON.stringify(body)}`, async (t) => {
    const chamada = t.mock.method(CarroService.prototype, "atualizar");
    const { res, result } = response();
    await new CarroController().atualizar(request("81", body), res);
    assert.equal(result.status, 400);
    assert.equal(chamada.mock.callCount(), 0);
  });
}

test("edição normaliza placa e textos, ignora ID no corpo e retorna o cadastro", async (t) => {
  const atualizar = t.mock.method(
    CarroService.prototype,
    "atualizar",
    async () => carro,
  );
  const { res, result } = response();
  await new CarroController().atualizar(
    request("81", {
      id: 999,
      placa: " abc-1d23 ",
      modelo: " Onix ",
      cor: " Branco ",
    }),
    res,
  );
  assert.deepEqual(atualizar.mock.calls[0]?.arguments, [
    81,
    { placa: carro.placa, modelo: carro.modelo, cor: carro.cor },
  ]);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, carro);
});

test("PUT preserva suporte à alteração parcial sem apagar os campos omitidos", async (t) => {
  const atualizar = t.mock.method(
    CarroService.prototype,
    "atualizar",
    async () => carro,
  );
  const { res, result } = response();
  await new CarroController().atualizar(request("81", { cor: " Azul " }), res);
  assert.deepEqual(atualizar.mock.calls[0]?.arguments, [81, { cor: "Azul" }]);
  assert.equal(result.status, 200);
});

test("cadastro usa a mesma normalização da edição e exige os três campos", async (t) => {
  const criar = t.mock.method(
    CarroService.prototype,
    "criar",
    async () => carro,
  );
  const { res, result } = response();
  await new CarroController().criar(
    request("81", { placa: " abc-1d23 ", modelo: " Onix ", cor: " Branco " }),
    res,
  );
  assert.deepEqual(criar.mock.calls[0]?.arguments, [
    "ABC1D23",
    "Onix",
    "Branco",
  ]);
  assert.equal(result.status, 201);
  await new CarroController().criar(request("81", { placa: "ABC1D23" }), res);
  assert.equal(result.status, 400);
  assert.equal(criar.mock.callCount(), 1);
});

test("edição de veículo estacionado mantém ID e não altera movimentações", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  const atualizar = t.mock.method(
    CarroRepository.prototype,
    "atualizar",
    async () => ({ ...carro, cor: "Azul" }),
  );
  const consultarAtivo = t.mock.method(
    CarroRepository.prototype,
    "buscarRegistoAtivo",
  );
  const { res, result } = response();
  await new CarroController().atualizar(request("81", { cor: "Azul" }), res);
  assert.equal(result.status, 200);
  assert.equal(atualizar.mock.callCount(), 1);
  assert.equal(consultarAtivo.mock.callCount(), 0);
});

for (const action of ["atualizar", "deletar"] as const) {
  test(`${action} retorna 404 para veículo ausente`, async (t) => {
    t.mock.method(CarroRepository.prototype, "listarPorId", async () => null);
    const { res, result } = response();
    await new CarroController()[action](request("81", { cor: "Azul" }), res);
    assert.equal(result.status, 404);
    assert.deepEqual(result.body, { erro: "Veículo não encontrado" });
  });
}

test("placa duplicada retorna 409 sem detalhes internos", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  t.mock.method(CarroRepository.prototype, "atualizar", async () => {
    throw prismaError("P2002");
  });
  const { res, result } = response();
  await new CarroController().atualizar(
    request("81", { placa: "DEF4G56" }),
    res,
  );
  assert.equal(result.status, 409);
  assert.deepEqual(result.body, { erro: "Esta placa já está cadastrada" });
});

test("veículo estacionado não é excluído e recebe orientação de saída", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  t.mock.method(
    CarroRepository.prototype,
    "buscarRegistoAtivo",
    async () => ({ id: 56 }) as never,
  );
  const deletar = t.mock.method(CarroRepository.prototype, "deletar");
  const { res, result } = response();
  await new CarroController().deletar(request(), res);
  assert.equal(result.status, 409);
  assert.match(JSON.stringify(result.body), /Registre a saída primeiro/);
  assert.equal(deletar.mock.callCount(), 0);
});

test("histórico encerrado impede exclusão e preserva as movimentações", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  t.mock.method(
    CarroRepository.prototype,
    "buscarRegistoAtivo",
    async () => null,
  );
  t.mock.method(CarroRepository.prototype, "possuiHistorico", async () => true);
  const deletar = t.mock.method(CarroRepository.prototype, "deletar");
  const { res, result } = response();
  await new CarroController().deletar(request(), res);
  assert.equal(result.status, 409);
  assert.match(JSON.stringify(result.body), /histórico/);
  assert.equal(deletar.mock.callCount(), 0);
});

test("cadastro sem movimentações é excluído uma vez com 204 sem corpo", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  t.mock.method(
    CarroRepository.prototype,
    "buscarRegistoAtivo",
    async () => null,
  );
  t.mock.method(
    CarroRepository.prototype,
    "possuiHistorico",
    async () => false,
  );
  const deletar = t.mock.method(
    CarroRepository.prototype,
    "deletar",
    async () => carro,
  );
  const { res, result } = response();
  await new CarroController().deletar(request(), res);
  assert.equal(result.status, 204);
  assert.equal(result.body, undefined);
  assert.deepEqual(deletar.mock.calls[0]?.arguments, [81]);
});

for (const [code, status] of [
  ["P2003", 409],
  ["P2025", 404],
] as const) {
  test(`exclusão trata corrida de persistência ${code} como ${status}`, async (t) => {
    t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
    t.mock.method(
      CarroRepository.prototype,
      "buscarRegistoAtivo",
      async () => null,
    );
    t.mock.method(
      CarroRepository.prototype,
      "possuiHistorico",
      async () => false,
    );
    t.mock.method(CarroRepository.prototype, "deletar", async () => {
      throw prismaError(code);
    });
    const { res, result } = response();
    await new CarroController().deletar(request(), res);
    assert.equal(result.status, status);
    assert.doesNotMatch(JSON.stringify(result.body), /Prisma|Internal/);
  });
}

test("falha inesperada retorna 500 JSON seguro", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  t.mock.method(CarroRepository.prototype, "atualizar", async () => {
    throw new Error("Internal database details");
  });
  t.mock.method(console, "error", () => undefined);
  const { res, result } = response();
  await new CarroController().atualizar(request("81", { cor: "Azul" }), res);
  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { erro: "Erro interno" });
});

test("entrada concorrente com exclusão retorna 404 seguro quando a FK rejeita o veículo removido", async (t) => {
  t.mock.method(CarroRepository.prototype, "listarPorId", async () => carro);
  t.mock.method(VagaRepository.prototype, "listarPorId", async () => ({
    id: 205,
    numero: 4,
  }));
  t.mock.method(
    RegistroRepository.prototype,
    "buscarAtivoPorCarro",
    async () => null,
  );
  t.mock.method(
    RegistroRepository.prototype,
    "buscarAtivoPorVaga",
    async () => null,
  );
  t.mock.method(RegistroRepository.prototype, "registrarEntrada", async () => {
    throw prismaError("P2003");
  });
  const { res, result } = response();
  await new RegistroController().ocupar(
    { body: { carroid: 81, vagaid: 205 } } as Request,
    res,
  );
  assert.equal(result.status, 404);
  assert.deepEqual(result.body, {
    erro: "O veículo ou a vaga foi removido. Atualize os cadastros antes de registrar a entrada",
  });
});
