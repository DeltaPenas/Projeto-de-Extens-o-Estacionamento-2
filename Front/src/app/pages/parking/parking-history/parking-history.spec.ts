import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParkingDataService } from '../../../core/services/parking-data.service';
import { ParkingHistoryService } from '../../../core/services/parking-history.service';
import { RegistrosService } from '../../../core/services/registros.service';
import { ParkingHistory } from './parking-history';

describe('Histórico de movimentações', () => {
  let fixture: ComponentFixture<ParkingHistory>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
  const vaga = { id: 205, numero: 4 };
  const registro = {
    id: 56,
    carroId: 81,
    vagaId: 205,
    carro,
    vaga,
    entrada: '2026-10-21T12:00:00.000Z',
    saida: '2026-10-21T13:25:00.000Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParkingHistory],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ParkingHistory);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });
  afterEach(() => http.verify());

  function request() {
    return http.expectOne((req) => req.url === '/registros');
  }
  function flush(req: TestRequest, total = 1, items = [registro]) {
    const page = Number(req.request.params.get('page'));
    const limit = Number(req.request.params.get('limit'));
    req.flush({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
    fixture.detectChanges();
  }
  function setControl(name: string, value: string) {
    const control = element.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[formControlName="${name}"]`,
    )!;
    control.value = value;
    control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
  }
  function submit() {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('carrega uma página e mostra veículo, horários, registro e permanência encerrada', () => {
    const req = request();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    flush(req);
    for (const text of [
      'ABC1D23',
      'Onix',
      'Branco',
      'Registro #56',
      '04',
      '21/10/2026',
      '1h 25min',
      'Encerrada',
    ])
      expect(element.textContent).toContain(text);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('representa movimentação aberta sem inventar saída ou permanência encerrada', () => {
    const req = request();
    req.flush({
      items: [{ ...registro, saida: null }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    fixture.detectChanges();
    expect(element.querySelector('.history-open')?.textContent).toContain('Em andamento');
    expect(element.querySelector('tbody')?.textContent).toContain('—');
  });

  it('aplica placa, situação e dias locais incluindo o último dia inteiro', () => {
    flush(request());
    setControl('placa', ' abc ');
    setControl('inicio', '2026-10-21');
    setControl('fim', '2026-10-21');
    setControl('situacao', 'encerrados');
    submit();
    const req = request();
    expect(req.request.params.get('placa')).toBe('abc');
    expect(req.request.params.get('situacao')).toBe('encerrados');
    expect(req.request.params.get('dataInicio')).toBe(new Date(2026, 9, 21).toISOString());
    expect(req.request.params.get('dataFim')).toBe(new Date(2026, 9, 22).toISOString());
    flush(req);
  });

  it('rejeita período invertido sem substituir a consulta aplicada', () => {
    flush(request());
    setControl('inicio', '2026-10-22');
    setControl('fim', '2026-10-21');
    submit();
    http.expectNone((req) => req.url === '/registros');
    expect(element.textContent).toContain('A data final deve ser igual ou posterior');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('pagina com os filtros aplicados e cancela uma consulta substituída', () => {
    flush(request());
    setControl('placa', 'ABC');
    submit();
    const old = request();
    setControl('placa', 'DEF');
    submit();
    expect(old.cancelled).toBe(true);
    const req = request();
    flush(
      req,
      11,
      Array.from({ length: 10 }, (_, i) => ({ ...registro, id: i + 1 })),
    );
    setControl('placa', 'nao-aplicado');
    const next = Array.from(element.querySelectorAll<HTMLButtonElement>('nav button')).find(
      (button) => button.textContent?.includes('Próxima'),
    )!;
    next.click();
    const second = request();
    expect(second.request.params.get('page')).toBe('2');
    expect(second.request.params.get('placa')).toBe('DEF');
    flush(second, 11);
    expect(element.textContent).toContain('Página 2 de 2');
    expect(element.querySelector<HTMLButtonElement>('nav button:last-child')!.disabled).toBe(true);
  });

  it('limpa filtros e volta à primeira página', () => {
    flush(request());
    setControl('placa', 'ABC');
    setControl('situacao', 'abertos');
    submit();
    flush(request());
    Array.from(element.querySelectorAll<HTMLButtonElement>('.filter-actions button'))
      .find((button) => button.textContent === 'Limpar')!
      .click();
    const req = request();
    expect(req.request.params.keys()).toEqual(['page', 'limit']);
    flush(req, 0, []);
    expect(element.textContent).toContain('Nenhuma movimentação encontrada');
  });

  it('recupera falha sem expor detalhes internos e preserva os filtros', () => {
    flush(request());
    setControl('placa', 'ABC');
    submit();
    request().flush({ erro: 'Prisma interno' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.textContent).toContain('Não foi possível carregar o histórico');
    expect(element.textContent).not.toContain('Prisma');
    element.querySelector<HTMLButtonElement>('.error-state button')!.click();
    const retry = request();
    expect(retry.request.params.get('placa')).toBe('ABC');
    flush(retry);
  });

  it.each([
    { items: [], total: 1, page: 1, limit: 10, totalPages: 1 },
    { items: [{ ...registro, vagaId: 999 }], total: 1, page: 1, limit: 10, totalPages: 1 },
    {
      items: [{ ...registro, saida: '2026-10-20T12:00:00Z' }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    { items: [registro], total: 1, page: 1, limit: 10, totalPages: 9 },
  ])('rejeita resposta incoerente: %j', (response) => {
    request().flush(response);
    fixture.detectChanges();
    expect(element.textContent).toContain('Não foi possível carregar o histórico');
    expect(element.querySelector('tbody')).toBeNull();
  });

  it('recarrega o histórico após a entrada, cancelando leituras anteriores e mantendo filtros', () => {
    flush(request());
    setControl('placa', 'ABC');
    submit();
    const previous = request();
    const data = TestBed.inject(ParkingDataService);
    data.ensureParkingLoaded();
    data.carros.ensureLoaded();
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: false, registroAtivo: null }]);
    http.expectOne('/carros').flush([carro]);
    const registros = TestBed.inject(RegistrosService);
    registros.registrarEntrada(carro, vaga);
    http
      .expectOne('/registros/entrada')
      .flush({ ...registro, saida: null }, { status: 201, statusText: 'Created' });
    expect(previous.cancelled).toBe(true);
    const reload = request();
    expect(reload.request.params.get('page')).toBe('1');
    expect(reload.request.params.get('placa')).toBe('ABC');
    http.expectOne('/vagas').flush([vaga]);
    http
      .expectOne('/vagas/status')
      .flush([{ ...vaga, status: true, registroAtivo: { ...registro, saida: null } }]);
    reload.error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(registros.resultado()?.tipo).toBe('success');
    expect(element.textContent).toContain('Não foi possível carregar o histórico');
    http.expectNone('/registros/entrada');
  });

  it('reutiliza o histórico e os filtros ao recriar a página', () => {
    flush(request());
    setControl('placa', 'ABC');
    submit();
    flush(request());
    fixture.destroy();
    fixture = TestBed.createComponent(ParkingHistory);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="placa"]').value).toBe('ABC');
    http.expectNone((req) => req.url === '/registros');
  });
});
