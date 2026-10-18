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
    fixture.detectChanges();
    expect(element.querySelectorAll('g[role="button"]')).toHaveLength(27);
    const slot = element.querySelector<SVGGElement>('g[data-number="1"]')!;
    slot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('101');
    expect(slot.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelectorAll('.parking-slot--livre, .parking-slot--ocupada')).toHaveLength(
      0,
    );
    expect(element.querySelectorAll('.future-actions button:disabled')).toHaveLength(2);
  });

  it('identifica cadastro ausente apenas após consulta bem-sucedida', () => {
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(0);
    http.expectOne('/vagas').flush([{ id: 901, numero: 27 }]);
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
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(0);
    expect(element.textContent).toContain('Os cadastros não puderam ser verificados');
    expect(element.querySelectorAll('g[role="button"]')).toHaveLength(27);
  });

  it('representa as 27 posições não cadastradas quando a lista está vazia', () => {
    http.expectOne('/vagas').flush([]);
    fixture.detectChanges();
    expect(element.querySelectorAll('.parking-slot--nao-cadastrada')).toHaveLength(27);
    expect(element.textContent).toContain('Nenhuma posição tem cadastro correspondente');
  });

  it('informa registros fora do mapa sem substituir posições físicas', () => {
    http.expectOne('/vagas').flush([{ id: 200, numero: 200 }]);
    fixture.detectChanges();
    expect(element.textContent).toContain('cadastro possui numeração sem correspondência');
    expect(element.querySelectorAll('g[role="button"]')).toHaveLength(27);
    expect(element.querySelector('g[data-number="200"]')).toBeNull();
  });

  it('atualiza os detalhes selecionados após uma nova consulta', () => {
    http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
    fixture.detectChanges();
    element
      .querySelector('g[data-number="1"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.page-heading button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('Não verificado');
    http.expectOne('/vagas').flush([]);
    fixture.detectChanges();
    expect(element.querySelector('#slot-details')?.textContent).toContain('Não cadastrada');
    expect(element.querySelector('#slot-details')?.textContent).not.toContain('ID do cadastro');
  });
});
