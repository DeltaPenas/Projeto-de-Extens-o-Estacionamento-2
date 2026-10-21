import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Parking } from './parking';

describe('Mapa do estacionamento', () => {
  let fixture: ComponentFixture<Parking>;
  let http: HttpTestingController;
  let element: HTMLElement;

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

  it('associa pelo número, preserva ID diferente e permite seleção pelo teclado', () => {
    http.expectOne('/vagas').flush([
      { id: 101, numero: 1 },
      { id: 902, numero: 27 },
    ]);
    http.expectOne('/vagas/status').flush([
      { id: 902, numero: 27, status: true },
      { id: 101, numero: 1, status: false },
    ]);
    fixture.detectChanges();
    expect(element.querySelectorAll('g[role="button"]')).toHaveLength(27);
    const slot = element.querySelector<SVGGElement>('g[data-number="1"]')!;
    slot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    http.expectOne('/carros').flush([]);
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('101');
    expect(slot.getAttribute('aria-pressed')).toBe('true');
    expect(slot.classList.contains('parking-slot--livre')).toBe(true);
    expect(slot.getAttribute('aria-label')).toContain('Livre');
    expect(
      element.querySelector('g[data-number="27"]')?.classList.contains('parking-slot--ocupada'),
    ).toBe(true);
    expect(element.querySelector('#slot-details .status-label')?.textContent).toContain('Livre');
    expect(element.querySelector('app-entry-form')).not.toBeNull();
    expect(element.querySelectorAll('.future-actions button:disabled')).toHaveLength(1);
  });

  it('identifica cadastro ausente apenas após consulta bem-sucedida', () => {
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(0);
    http.expectOne('/vagas').flush([{ id: 901, numero: 27 }]);
    http.expectOne('/vagas/status').flush([{ id: 901, numero: 27, status: false }]);
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(26);
    element
      .querySelector('g[data-number="2"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('Não cadastrada');
    expect(element.querySelector('#slot-details')?.textContent).not.toContain('ID do cadastro');
  });

  it('mantém o cadastro não verificado em caso de falha de comunicação', () => {
    http.expectOne('/vagas').error(new ProgressEvent('error'));
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: false }]);
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(0);
    expect(element.textContent).toContain('Os cadastros não puderam ser verificados');
    expect(element.querySelectorAll('g[role="button"]')).toHaveLength(27);
    expect(element.querySelectorAll('.parking-slot--livre')).toHaveLength(0);
  });

  it('representa as 27 posições não cadastradas quando a lista está vazia', () => {
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(27);
    expect(element.textContent).toContain('Nenhuma posição tem cadastro correspondente');
  });

  it('informa registros fora do mapa sem substituir posições físicas', () => {
    http.expectOne('/vagas').flush([{ id: 200, numero: 200 }]);
    http.expectOne('/vagas/status').flush([{ id: 200, numero: 200, status: true }]);
    fixture.detectChanges();
    expect(element.textContent).toContain('cadastro possui numeração sem correspondência');
    expect(element.querySelectorAll('g[role="button"]')).toHaveLength(27);
    expect(element.querySelector('g[data-number="200"]')).toBeNull();
  });

  it('atualiza os detalhes selecionados após uma nova consulta', () => {
    http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: true }]);
    fixture.detectChanges();
    element
      .querySelector('g[data-number="1"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.page-heading button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('Não verificado');
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('Não cadastrada');
    expect(element.querySelector('#slot-details')?.textContent).not.toContain('ID do cadastro');
  });

  it('preserva o cadastro quando o status falha e permite repetir apenas a consulta de ocupação', () => {
    http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
    http.expectOne('/vagas/status').error(new ProgressEvent('error'));
    fixture.detectChanges();
    const slot = element.querySelector<SVGGElement>('g[data-number="1"]')!;
    slot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(slot.classList.contains('parking-slot--desconhecida')).toBe(true);
    expect(element.querySelector('#slot-details')?.textContent).toContain('101');
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(26);
    element.querySelector<HTMLButtonElement>('.occupancy-error button')!.click();
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: true }]);
    http.expectNone('/vagas');
    fixture.detectChanges();
    expect(slot.classList.contains('parking-slot--ocupada')).toBe(true);
    expect(element.querySelector('#slot-details .status-label')?.textContent).toContain('Ocupada');
    expect(element.querySelector('#slot-details')?.textContent).toContain(
      'Os dados do veículo e o horário de entrada ainda não estão disponíveis',
    );
  });

  it('mantém em cinza uma vaga cujo status não foi retornado', () => {
    http.expectOne('/vagas').flush([
      { id: 101, numero: 1 },
      { id: 205, numero: 2 },
    ]);
    http.expectOne('/vagas/status').flush([{ id: 101, numero: 1, status: false }]);
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--livre')).toHaveLength(1);
    expect(
      element.querySelector('g[data-number="2"]')?.classList.contains('parking-slot--desconhecida'),
    ).toBe(true);
    expect(element.textContent).toContain('Ocupação parcialmente informada');
  });

  it('exige correspondência de ID e número entre cadastro e status', () => {
    http.expectOne('/vagas').flush([
      { id: 101, numero: 1 },
      { id: 205, numero: 2 },
    ]);
    http.expectOne('/vagas/status').flush([
      { id: 999, numero: 1, status: false },
      { id: 205, numero: 3, status: true },
    ]);
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--desconhecida')).toHaveLength(2);
    expect(element.querySelectorAll('.parking-slot--livre, .parking-slot--ocupada')).toHaveLength(
      0,
    );
  });
});
