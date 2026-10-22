import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ConsultaHistorico, RegistroHistorico } from '../../../core/models/parking';
import { ParkingHistoryService } from '../../../core/services/parking-history.service';
import { RegistrosService } from '../../../core/services/registros.service';
import { Icon } from '../../../shared/icon/icon';

function dataLocal(value: string, proximoDia = false): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [ano, mes, dia] = value.split('-').map(Number);
  const data = new Date(0);
  data.setFullYear(ano!, mes! - 1, dia!);
  data.setHours(0, 0, 0, 0);
  if (data.getFullYear() !== ano || data.getMonth() !== mes! - 1 || data.getDate() !== dia)
    return undefined;
  if (proximoDia) data.setDate(data.getDate() + 1);
  return data.toISOString();
}

function campoData(value?: string, ultimoDia = false): string {
  if (!value) return '';
  const data = new Date(Date.parse(value) - (ultimoDia ? 1 : 0));
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-parking-history',
  imports: [DatePipe, ReactiveFormsModule, Icon],
  templateUrl: './parking-history.html',
  styleUrl: './parking-history.css',
})
export class ParkingHistory {
  protected readonly historico = inject(ParkingHistoryService);
  protected readonly registros = inject(RegistrosService);
  protected readonly erroFiltro = signal('');
  protected readonly filtros = new FormGroup({
    placa: new FormControl(this.historico.consulta().placa ?? '', { nonNullable: true }),
    inicio: new FormControl(campoData(this.historico.consulta().dataInicio), { nonNullable: true }),
    fim: new FormControl(campoData(this.historico.consulta().dataFim, true), { nonNullable: true }),
    situacao: new FormControl(this.historico.consulta().situacao ?? '', { nonNullable: true }),
  });

  constructor() {
    this.historico.ensureLoaded();
  }

  protected aplicar(event: Event) {
    event.preventDefault();
    const filtros = this.filtros.getRawValue();
    if (filtros.inicio && filtros.fim && filtros.inicio > filtros.fim) {
      this.erroFiltro.set('A data final deve ser igual ou posterior à data inicial.');
      return;
    }
    this.erroFiltro.set('');
    const dataInicio = dataLocal(filtros.inicio);
    const dataFim = dataLocal(filtros.fim, true);
    if ((filtros.inicio && !dataInicio) || (filtros.fim && !dataFim)) {
      this.erroFiltro.set('Informe datas válidas para consultar o período.');
      return;
    }
    const placa = filtros.placa.trim();
    const situacao = filtros.situacao;
    const consulta: ConsultaHistorico = {
      page: 1,
      limit: this.historico.consulta().limit,
      ...(placa ? { placa } : {}),
      ...(dataInicio ? { dataInicio } : {}),
      ...(dataFim ? { dataFim } : {}),
      ...(situacao === 'abertos' || situacao === 'encerrados' ? { situacao } : {}),
    };
    this.historico.load(consulta);
  }

  protected limpar() {
    this.filtros.reset({ placa: '', inicio: '', fim: '', situacao: '' });
    this.erroFiltro.set('');
    this.historico.load({ page: 1, limit: this.historico.consulta().limit });
  }

  protected trocarPagina(page: number) {
    this.historico.load({ ...this.historico.consulta(), page });
  }

  protected trocarLimite(value: string) {
    this.historico.load({ ...this.historico.consulta(), page: 1, limit: Number(value) });
  }

  protected permanencia(registro: RegistroHistorico) {
    if (!registro.saida) return 'Em andamento';
    const minutos = Math.floor((Date.parse(registro.saida) - Date.parse(registro.entrada)) / 60000);
    if (minutos < 1) return 'Menos de 1 min';
    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const resto = minutos % 60;
    return [dias ? `${dias}d` : '', horas ? `${horas}h` : '', resto ? `${resto}min` : '']
      .filter(Boolean)
      .join(' ');
  }
}
