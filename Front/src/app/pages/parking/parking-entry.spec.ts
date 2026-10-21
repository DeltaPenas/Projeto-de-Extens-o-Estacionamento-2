import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Parking } from './parking';

describe('Entrada de veículo pelo painel da vaga', () => {
  let fixture: ComponentFixture<Parking>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const vagas = [
    { id: 101, numero: 1 },
    { id: 205, numero: 2 },
  ];
  const carros = [{ id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' }];
  const registro = {
    id: 56,
    carroId: 81,
    vagaId: 101,
    entrada: '2026-10-20T18:30:00.000Z',
    saida: null,
    carro: carros[0],
    vaga: vagas[0],
  };

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

  afterEach(() => http.verify());

  function loadParking(occupied = false) {
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').flush(vagas.map((vaga) => ({ ...vaga, status: occupied })));
    fixture.detectChanges();
  }

  function selectSlot(numero = 1) {
    element
      .querySelector(`g[data-number="${numero}"]`)!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  }

  function prepare() {
    loadParking();
    selectSlot();
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
  }

  function chooseCar() {
    const select = element.querySelector<HTMLSelectElement>('#entry-car')!;
    select.value = '81';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function submit() {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function refresh(occupied = true) {
    http.expectOne('/vagas').flush(vagas);
    http
      .expectOne('/vagas/status')
      .flush(vagas.map((vaga) => ({ ...vaga, status: occupied && vaga.id === 101 })));
    fixture.detectChanges();
  }

  it('exige selecionar um veículo antes de enviar', () => {
    prepare();
    submit();
    expect(element.querySelector('#entry-car')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.textContent).toContain('Selecione um veículo para continuar');
    http.expectNone('/registros/entrada');
  });

  it('envia IDs do banco, impede envios duplicados e confirma os dados retornados', () => {
    prepare();
    chooseCar();
    submit();
    const request = http.expectOne('/registros/entrada');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ carroid: 81, vagaid: 101 });
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    submit();
    http.expectNone('/registros/entrada');
    request.flush(registro, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(element.querySelector('.entry-success')?.textContent).toContain(
      'Entrada registrada com sucesso',
    );
    refresh();
    const confirmation = element.querySelector('.entry-confirmation')?.textContent;
    for (const text of ['56', '01', 'ABC1D23', 'Onix', 'Branco', '20/10/2026'])
      expect(confirmation).toContain(text);
    expect(
      element.querySelector('g[data-number="1"]')?.classList.contains('parking-slot--ocupada'),
    ).toBe(true);
    expect(element.querySelector('#slot-details .status-label')?.textContent).toContain('Ocupada');
    expect(element.querySelector('form')).toBeNull();
    http.expectNone('/carros');
    http.expectNone('/registros/saida');
  });

  it('preserva a confirmação se a atualização da ocupação falhar', () => {
    prepare();
    chooseCar();
    submit();
    http.expectOne('/registros/entrada').flush(registro, { status: 201, statusText: 'Created' });
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(element.querySelector('.entry-success')?.textContent).toContain(
      'Entrada registrada com sucesso',
    );
    expect(element.textContent).toContain('Não foi possível consultar a ocupação');
    expect(element.querySelector('form')).toBeNull();
    http.expectNone('/registros/entrada');
  });

  it('exibe o conflito retornado e consulta novamente a ocupação sem repetir o POST', () => {
    prepare();
    chooseCar();
    submit();
    http
      .expectOne('/registros/entrada')
      .flush(
        { erro: 'Carro já possui uma entrada ativa' },
        { status: 409, statusText: 'Conflict' },
      );
    refresh(false);
    expect(element.querySelector('.entry-warning')?.textContent).toContain(
      'Carro já possui uma entrada ativa',
    );
    expect(element.querySelector('.entry-success')).toBeNull();
    http.expectNone('/registros/entrada');
  });

  it('trata falha de conexão como confirmação pendente e verifica a situação atual', () => {
    prepare();
    chooseCar();
    submit();
    http.expectOne('/registros/entrada').error(new ProgressEvent('error'));
    refresh();
    expect(element.querySelector('.entry-warning')?.textContent).toContain(
      'Não foi possível confirmar a entrada',
    );
    expect(element.querySelector('.entry-success')).toBeNull();
    expect(element.querySelector('form')).toBeNull();
    http.expectNone('/registros/entrada');
  });

  it('reconhece o 201 sem inventar detalhes quando a resposta está incompleta', () => {
    prepare();
    chooseCar();
    submit();
    http.expectOne('/registros/entrada').flush({ id: 56 }, { status: 201, statusText: 'Created' });
    refresh();
    expect(element.querySelector('.entry-success')?.textContent).toContain(
      'Entrada registrada, mas os detalhes',
    );
    expect(element.querySelector('.entry-confirmation')).toBeNull();
    http.expectNone('/registros/entrada');
  });

  it('não exibe detalhes internos de falhas do servidor', () => {
    prepare();
    chooseCar();
    submit();
    http
      .expectOne('/registros/entrada')
      .flush(
        { erro: 'Prisma error: internal details' },
        { status: 500, statusText: 'Server Error' },
      );
    refresh(false);
    expect(element.querySelector('.entry-warning')?.textContent).toContain(
      'Confira a situação da vaga',
    );
    expect(element.textContent).not.toContain('Prisma');
    http.expectNone('/registros/entrada');
  });

  it('não oferece o formulário para vaga ocupada ou sem cadastro', () => {
    loadParking(true);
    selectSlot();
    expect(element.querySelector('app-entry-form')).toBeNull();
    selectSlot(3);
    expect(element.querySelector('app-entry-form')).toBeNull();
    http.expectNone('/carros');
    http.expectNone('/registros/entrada');
  });

  it('não oferece o formulário quando a ocupação é desconhecida', () => {
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').error(new ProgressEvent('error'));
    fixture.detectChanges();
    selectSlot();
    expect(element.querySelector('app-entry-form')).toBeNull();
    http.expectNone('/carros');
    http.expectNone('/registros/entrada');
  });

  it('informa a ausência de veículos cadastrados', () => {
    loadParking();
    selectSlot();
    http.expectOne('/carros').flush([]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Nenhum veículo cadastrado');
    expect(element.querySelector('form')).toBeNull();
    http.expectNone('/registros/entrada');
  });

  it('permite recuperar uma falha de consulta de veículos', () => {
    loadParking();
    selectSlot();
    http.expectOne('/carros').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    element.querySelector<HTMLButtonElement>('app-entry-form button')!.click();
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
    expect(element.querySelectorAll('#entry-car option')).toHaveLength(2);
  });

  it('mantém o destino original da entrada se outra vaga for selecionada durante o envio', () => {
    prepare();
    chooseCar();
    submit();
    const request = http.expectOne('/registros/entrada');
    selectSlot(2);
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    expect(element.querySelector<HTMLSelectElement>('#entry-car')?.value).toBe('');
    request.flush(registro, { status: 201, statusText: 'Created' });
    refresh();
    expect(element.querySelector('.entry-confirmation')?.textContent).toContain('01');
    expect(element.querySelector('#slot-details h3')?.textContent).toContain('02');
    expect(
      element.querySelector('g[data-number="1"]')?.classList.contains('parking-slot--ocupada'),
    ).toBe(true);
    http.expectNone('/registros/entrada');
  });
});
