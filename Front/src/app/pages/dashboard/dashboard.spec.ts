import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let http: HttpTestingController;
  const car = { id: 81, placa: 'ABC1D23', modelo: 'Ônix', cor: 'Branco' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('mostra ocupação e disponibilidade, filtra situação e cria atalho pelo número físico', () => {
    const vaga = { id: 205, numero: 4 };
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([
      {
        ...vaga,
        status: true,
        registroAtivo: {
          id: 56,
          entrada: '2026-10-21T12:00:00Z',
          saida: null,
          carroId: 81,
          vagaId: 205,
          carro: car,
        },
      },
    ]);
    http
      .expectOne('/carros')
      .flush([car, { id: 82, placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' }]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const rows = element.querySelectorAll('tbody tr');
    expect(rows[0]?.textContent).toContain('Estacionado');
    expect(rows[0]?.textContent).toContain('04');
    expect(rows[0]?.textContent).toContain('21/10/2026');
    expect(rows[1]?.textContent).toContain('Disponível');
    expect(rows[0]?.querySelector('a')?.getAttribute('href')).toBe('/estacionamento?vaga=4');
    const select = element.querySelector<HTMLSelectElement>('.status-filter select')!;
    select.value = 'disponivel';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain('DEF4G56');
  });

  it('não apresenta disponibilidade nem atalho quando a ocupação não foi verificada', () => {
    http.expectOne('/vagas').flush([{ id: 205, numero: 4 }]);
    http.expectOne('/vagas/status').error(new ProgressEvent('error'));
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr')!;
    expect(row.textContent).toContain('Não verificada');
    expect(row.querySelector('a')).toBeNull();
    expect(row.textContent).not.toContain('Disponível');
  });

  it('identifica veículo estacionado fora do mapa sem criar um atalho inválido', () => {
    const vaga = { id: 999, numero: 200 };
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([
      {
        ...vaga,
        status: true,
        registroAtivo: {
          id: 56,
          entrada: '2026-10-21T12:00:00Z',
          saida: null,
          carroId: 81,
          vagaId: 999,
          carro: car,
        },
      },
    ]);
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr')!;
    expect(row.textContent).toContain('Estacionado');
    expect(row.textContent).toContain('200');
    expect(row.textContent).toContain('Fora do mapa');
    expect(row.querySelector('a')).toBeNull();
  });

  it('calcula a ocupação das vagas do mapa sem contar veículos ou cadastros fora dele', () => {
    const vagas = [
      { id: 101, numero: 1 },
      { id: 205, numero: 2 },
      { id: 307, numero: 27 },
      { id: 999, numero: 200 },
    ];
    http.expectOne('/vagas').flush(vagas);
    http
      .expectOne('/vagas/status')
      .flush(vagas.map((vaga) => ({ ...vaga, status: vaga.id === 101 || vaga.id === 999 })));
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const values = Array.from(element.querySelectorAll('.metric-value')).map((node) =>
      node.textContent?.trim(),
    );
    expect(values).toEqual(['27vagas', '2', '1', '33,3%']);
    expect(element.textContent).toContain('ABC1D23');
    expect(element.querySelector('.registration-value')?.textContent).toContain(
      '4 vagas cadastradas',
    );
    expect(element.querySelector('.occupancy-notice')?.textContent).toContain(
      '3 vagas cadastradas no mapa',
    );
  });

  it('mantém os veículos visíveis quando a consulta de vagas falha', () => {
    http.expectOne('/vagas').flush({}, { status: 500, statusText: 'Server Error' });
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: false }]);
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('ABC1D23');
    expect(element.textContent).toContain('Não foi possível consultar as vagas');
    expect(element.querySelectorAll('.metric-unavailable')).toHaveLength(3);
  });

  it('permite repetir uma consulta de veículos com erro', () => {
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    http.expectOne('/carros').error(new ProgressEvent('error'));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    element.querySelector<HTMLButtonElement>('.error-state button')?.click();
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    expect(element.textContent).toContain('ABC1D23');
  });

  it('diferencia listas vazias de respostas inválidas', () => {
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    http.expectOne('/carros').flush({ data: [car] });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Nenhuma vaga foi cadastrada');
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    expect(element.textContent).not.toContain('Nenhum veículo cadastrado');
    expect(
      Array.from(element.querySelectorAll('.metric-value'), (node) => node.textContent?.trim()),
    ).toEqual(['27vagas', '0', '0', '—']);
  });

  it('filtra modelos sem exigir acentos e informa busca sem resultados', () => {
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    http
      .expectOne('/carros')
      .flush([car, { id: 82, placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' }]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('input')!;
    input.value = 'onix';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain('ABC1D23');
    input.value = 'inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.textContent).toContain('Nenhum resultado encontrado');
  });

  it('recupera a ocupação sem repetir as consultas de veículos e cadastros', () => {
    http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
    http.expectOne('/vagas/status').error(new ProgressEvent('error'));
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('ABC1D23');
    expect(element.querySelectorAll('.metric-unavailable')).toHaveLength(3);
    element.querySelector<HTMLButtonElement>('.occupancy-notice button')!.click();
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: false }]);
    http.expectNone('/vagas');
    http.expectNone('/carros');
    fixture.detectChanges();
    expect(
      Array.from(element.querySelectorAll('.metric-value'), (node) => node.textContent?.trim()),
    ).toEqual(['27vagas', '1', '0', '0%']);
  });

  it('mantém os indicadores indisponíveis quando falta status para uma vaga cadastrada', () => {
    http.expectOne('/vagas').flush([
      { id: 101, numero: 1 },
      { id: 205, numero: 2 },
    ]);
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: false }]);
    http.expectOne('/carros').flush([]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Ocupação parcialmente informada');
    expect(element.querySelectorAll('.metric-unavailable')).toHaveLength(3);
  });

  it.each([null, { data: [] }, [{ id: 101, numero: 1, status: 'false' }]])(
    'rejeita resposta de ocupação inválida: %j',
    (response) => {
      http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
      http.expectOne('/vagas/status').flush(response);
      http.expectOne('/carros').flush([]);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain('Não foi possível consultar a ocupação');
      expect(element.querySelectorAll('.metric-unavailable')).toHaveLength(3);
    },
  );

  it('atualiza os indicadores e aguarda todas as consultas ao usar Atualizar', () => {
    const vaga = { id: 101, numero: 1 };
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: false }]);
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const refresh = element.querySelector<HTMLButtonElement>('.page-heading button')!;
    refresh.click();
    fixture.detectChanges();
    expect(refresh.disabled).toBe(true);
    expect(element.querySelectorAll('.metric-unavailable')).toHaveLength(3);
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    expect(refresh.disabled).toBe(true);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: true }]);
    fixture.detectChanges();
    expect(refresh.disabled).toBe(false);
    expect(
      Array.from(element.querySelectorAll('.metric-value'), (node) => node.textContent?.trim()),
    ).toEqual(['27vagas', '0', '1', '100%']);
  });
});
