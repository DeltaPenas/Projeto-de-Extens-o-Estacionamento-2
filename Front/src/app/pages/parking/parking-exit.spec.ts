import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { RegistrosService } from '../../core/services/registros.service';
import { Parking } from './parking';
import { flushEmptyHistory } from '../../testing/history';

describe('Ocupante, saída e veículos disponíveis', () => {
  let fixture: ComponentFixture<Parking>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const vagas = [
    { id: 101, numero: 1 },
    { id: 205, numero: 2 },
  ];
  const carros = [
    { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' },
    { id: 82, placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' },
  ];
  const ativo = {
    id: 56,
    carroId: 81,
    vagaId: 101,
    entrada: '2026-10-21T12:00:00.000Z',
    saida: null,
    carro: carros[0],
  };
  const encerrado = { ...ativo, saida: '2026-10-21T14:00:00.000Z', vaga: vagas[0] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Parking],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Parking);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });

  afterEach(() => {
    flushEmptyHistory(http);
    http.verify();
  });

  function statuses(occupied = true) {
    return vagas.map((vaga) => ({
      ...vaga,
      status: occupied && vaga.id === 101,
      registroAtivo: occupied && vaga.id === 101 ? ativo : null,
    }));
  }

  function load(occupied = true) {
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').flush(statuses(occupied));
    fixture.detectChanges();
  }

  function select(numero = 1) {
    element
      .querySelector(`g[data-number="${numero}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  }

  function clickExit() {
    element.querySelector<HTMLButtonElement>('app-exit-action .button')!.click();
    fixture.detectChanges();
  }

  function confirmExit() {
    element.querySelector<HTMLButtonElement>('.exit-confirmation .button-primary')!.click();
    fixture.detectChanges();
    return http.expectOne('/registros/saida');
  }

  function refresh(occupied = false) {
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').flush(statuses(occupied));
    fixture.detectChanges();
  }

  function carOptions() {
    return Array.from(
      element.querySelectorAll<HTMLOptionElement>('#entry-car option'),
      (o) => o.value,
    );
  }

  it('mostra o ocupante e o horário da consulta, sem buscar ou inferir a última entrada', () => {
    load();
    select();
    const details = element.querySelector('.vehicle-details')!.textContent;
    for (const text of ['ABC1D23', 'Onix', 'Branco', '21/10/2026', '56'])
      expect(details).toContain(text);
    expect(element.querySelector('app-exit-action')).not.toBeNull();
    expect(element.querySelector('app-entry-form')).toBeNull();
    http.expectNone('/carros');
    http.expectNone('/registros/saida');
  });

  it('permite conferir e cancelar a saída sem enviar a operação', () => {
    load();
    select();
    clickExit();
    expect(element.querySelector('.exit-confirmation')?.textContent).toContain('ABC1D23');
    expect(element.querySelector('.exit-confirmation')?.textContent).toContain('01');
    const buttons = element.querySelectorAll<HTMLButtonElement>('.exit-confirmation button');
    expect(document.activeElement).toBe(buttons[0]);
    buttons[1].click();
    fixture.detectChanges();
    expect(element.querySelector('.exit-confirmation')).toBeNull();
    expect(document.activeElement).toBe(element.querySelector('app-exit-action button'));
    http.expectNone('/registros/saida');
  });

  it('envia o ID do registro, bloqueia duplicidade, confirma a saída e devolve o carro à seleção', () => {
    load();
    select(2);
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(carOptions()).toEqual(['', '82']);
    select();
    clickExit();
    const request = confirmExit();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ registroId: 56 });
    expect(
      element.querySelector<HTMLButtonElement>('.exit-confirmation .button-primary')!.disabled,
    ).toBe(true);
    element.querySelector<HTMLButtonElement>('.exit-confirmation .button-primary')!.click();
    http.expectNone('/registros/saida');
    request.flush(encerrado);
    refresh();
    const receipt = element.querySelector('.exit-feedback.entry-success')?.textContent;
    for (const text of ['Saída registrada com sucesso', '56', 'ABC1D23', 'Saída', '21/10/2026'])
      expect(receipt).toContain(text);
    expect(element.querySelector('.vehicle-details')).toBeNull();
    expect(element.querySelector('app-exit-action')).toBeNull();
    expect(carOptions()).toEqual(['', '81', '82']);
    expect(TestBed.inject(ParkingDataService).occupancyMetrics()).toMatchObject({
      free: 2,
      occupied: 0,
      rate: 0,
    });
    http.expectNone('/carros');
  });

  it('exclui também o veículo que ocupa uma vaga fora da numeração física do mapa', () => {
    const fora = { id: 307, numero: 200 };
    http.expectOne('/vagas').flush([...vagas, fora]);
    http
      .expectOne('/vagas/status')
      .flush([
        ...statuses(false),
        { ...fora, status: true, registroAtivo: { ...ativo, vagaId: fora.id } },
      ]);
    fixture.detectChanges();
    select(2);
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(carOptions()).toEqual(['', '82']);
    expect(TestBed.inject(ParkingDataService).occupancyMetrics()?.occupied).toBe(0);
  });

  it('diferencia todos os veículos estacionados de ausência de cadastros', () => {
    load();
    select(2);
    http.expectOne('/carros').flush([carros[0]]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Nenhum veículo disponível para entrada');
    expect(element.textContent).not.toContain('Nenhum veículo cadastrado');
    expect(element.querySelector('app-entry-form form')).toBeNull();
  });

  it.each([
    ['ocupante ausente', undefined],
    ['vaga divergente', { ...ativo, vagaId: 999 }],
    ['carro divergente', { ...ativo, carroId: 999 }],
    ['registro encerrado', { ...ativo, saida: encerrado.saida }],
    ['data inválida', { ...ativo, entrada: 'inválida' }],
    ['ID inválido', { ...ativo, id: 0 }],
  ])('bloqueia saída e seleção de veículos com %s', (_label, registroAtivo) => {
    http.expectOne('/vagas').flush(vagas);
    http
      .expectOne('/vagas/status')
      .flush([{ ...vagas[0], status: true, registroAtivo }, statuses()[1]]);
    fixture.detectChanges();
    select();
    expect(element.querySelector('.vehicle-details')).toBeNull();
    expect(element.querySelector('app-exit-action')).toBeNull();
    select(2);
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(element.querySelector('#entry-car')).toBeNull();
    expect(element.textContent).toContain('Atualize a ocupação para verificar');
    http.expectNone('/registros/entrada');
    http.expectNone('/registros/saida');
  });

  it('não libera veículos quando a consulta está parcial ou ainda usa o contrato antigo', () => {
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').flush([{ ...vagas[1], status: false }]);
    fixture.detectChanges();
    select(2);
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(carOptions()).toEqual([]);
    TestBed.inject(RegistrosService).registrarEntrada(carros[0], vagas[1]);
    http.expectNone('/registros/entrada');
  });

  it('revalida a seleção caso o veículo estacione enquanto o formulário está aberto', () => {
    load(false);
    select(2);
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    const input = element.querySelector<HTMLSelectElement>('#entry-car')!;
    input.value = '81';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    TestBed.inject(ParkingDataService).ocupacao.load();
    http.expectOne('/vagas/status').flush(statuses());
    fixture.detectChanges();
    expect(element.querySelector<HTMLSelectElement>('#entry-car')?.value).toBe('');
    expect(carOptions()).toEqual(['', '82']);
    TestBed.inject(RegistrosService).registrarEntrada(carros[0], vagas[1]);
    http.expectNone('/registros/entrada');
  });

  it('descarta a confirmação se a vaga passar a exibir outro registro ativo', () => {
    load();
    select();
    clickExit();
    TestBed.inject(ParkingDataService).ocupacao.load();
    http.expectOne('/vagas/status').flush([
      {
        ...vagas[0],
        status: true,
        registroAtivo: { ...ativo, id: 57, carroId: 82, carro: carros[1] },
      },
      statuses()[1],
    ]);
    fixture.detectChanges();
    expect(element.querySelector('.exit-confirmation')).toBeNull();
    expect(element.querySelector('.vehicle-details')?.textContent).toContain('DEF4G56');
    TestBed.inject(RegistrosService).registrarSaida(vagas[0], {
      registroId: ativo.id,
      entrada: ativo.entrada,
      veiculo: ativo.carro,
    });
    http.expectNone('/registros/saida');
  });

  it('mantém o destino da saída e impede entrada concorrente na mesma sessão', () => {
    load();
    select();
    clickExit();
    const request = confirmExit();
    select(2);
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(element.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBe(true);
    TestBed.inject(RegistrosService).registrarEntrada(carros[1], vagas[1]);
    http.expectNone('/registros/entrada');
    request.flush(encerrado);
    refresh();
    expect(element.querySelector('#slot-details h3')?.textContent).toContain('02');
    expect(element.querySelector('.exit-feedback')?.textContent).toContain('ABC1D23');
  });

  it('trata registro já encerrado como conflito e atualiza sem repetir a saída', () => {
    load();
    select();
    clickExit();
    confirmExit().flush(
      { erro: 'Este registro já foi encerrado' },
      { status: 409, statusText: 'Conflict' },
    );
    refresh();
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(element.querySelector('.exit-feedback.entry-warning')?.textContent).toContain(
      'Este registro já foi encerrado',
    );
    expect(element.querySelector('.entry-success')).toBeNull();
    http.expectNone('/registros/saida');
  });

  it.each(['rede', 'servidor'])(
    'trata falha de %s como incerta e não exibe detalhes internos',
    (tipo) => {
      load();
      select();
      clickExit();
      const request = confirmExit();
      if (tipo === 'rede') request.error(new ProgressEvent('error'));
      else
        request.flush('<html>ReferenceError: responderErro Prisma</html>', {
          status: 500,
          statusText: 'Server Error',
        });
      refresh(true);
      expect(element.querySelector('.exit-feedback.entry-warning')?.textContent).toContain(
        'Não foi possível confirmar a saída',
      );
      expect(element.textContent).not.toContain('Prisma');
      expect(element.querySelector('.entry-success')).toBeNull();
      http.expectNone('/registros/saida');
    },
  );

  it('confirma HTTP 200 sem inventar horário quando a resposta não corresponde ao registro solicitado', () => {
    load();
    select();
    clickExit();
    confirmExit().flush({ ...encerrado, id: 999 });
    refresh(true);
    expect(element.querySelector('.exit-feedback.entry-success')?.textContent).toContain(
      'Saída registrada, mas os detalhes',
    );
    expect(element.querySelector('.entry-confirmation')).toBeNull();
  });

  it('preserva a confirmação e não repete a saída se a atualização falhar', () => {
    load();
    select();
    clickExit();
    confirmExit().flush(encerrado);
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(element.querySelector('.exit-feedback.entry-success')?.textContent).toContain(
      'Saída registrada com sucesso',
    );
    expect(element.querySelector('app-exit-action')).toBeNull();
    expect(element.textContent).toContain('Não foi possível consultar a ocupação');
    element.querySelector<HTMLButtonElement>('.occupancy-error button')!.click();
    http.expectOne('/vagas/status').flush(statuses(false));
    fixture.detectChanges();
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(carOptions()).toEqual(['', '81', '82']);
    http.expectNone('/registros/saida');
  });
});
