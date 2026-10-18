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

  it('exibe cadastros reais sem deduzir ocupação a partir dos veículos', () => {
    http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const values = Array.from(element.querySelectorAll('.metric-value')).map((node) =>
      node.textContent?.trim(),
    );
    expect(values).toEqual(['27vagas', '—', '—', '—']);
    expect(element.textContent).toContain('ABC1D23');
    expect(element.querySelector('.registration-value')?.textContent).toContain(
      '1 vaga cadastrada',
    );
  });

  it('mantém os veículos visíveis quando a consulta de vagas falha', () => {
    http.expectOne('/vagas').flush({}, { status: 500, statusText: 'Server Error' });
    http.expectOne('/carros').flush([car]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('ABC1D23');
    expect(element.textContent).toContain('Não foi possível consultar as vagas');
  });

  it('permite repetir uma consulta de veículos com erro', () => {
    http.expectOne('/vagas').flush([]);
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
    http.expectOne('/carros').flush({ data: [car] });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Nenhuma vaga foi cadastrada');
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    expect(element.textContent).not.toContain('Nenhum veículo cadastrado');
  });

  it('filtra modelos sem exigir acentos e informa busca sem resultados', () => {
    http.expectOne('/vagas').flush([]);
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
});
