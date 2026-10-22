
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  cor: string;
}

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veiculos.html',
  styleUrl: './veiculos.css',
})
export class Veiculos {
  // Dados fictícios apenas para visualizar a página
  veiculos: Veiculo[] = [
    { id: 1, placa: 'ABC1D23', modelo: 'Fiat Uno', cor: 'Branco' },
    { id: 2, placa: 'XYZ1234', modelo: 'Volkswagen Gol', cor: 'Prata' },
  ];

  placa = '';
  modelo = '';
  cor = '';
  pesquisa = '';

  carregando = false;
  mensagem = '';
  tipoMensagem: 'sucesso' | 'erro' = 'sucesso';

  get veiculosFiltrados(): Veiculo[] {
    const termo = this.pesquisa.trim().toLowerCase();

    if (!termo) return this.veiculos;

    return this.veiculos.filter(v =>
      [v.placa, v.modelo, v.cor].some(valor =>
        valor.toLowerCase().includes(termo)
      )
    );
  }

  cadastrarVeiculo(): void {
    if (!this.placa.trim() || !this.modelo.trim() || !this.cor.trim()) {
      this.exibirMensagem('Preencha todos os campos.', 'erro');
      return;
    }

    this.veiculos.unshift({
      id: Date.now(),
      placa: this.placa.trim().toUpperCase(),
      modelo: this.modelo.trim(),
      cor: this.cor.trim(),
    });

    this.placa = '';
    this.modelo = '';
    this.cor = '';

    this.exibirMensagem('Veículo adicionado à lista visual.', 'sucesso');
  }

  excluirVeiculo(id: number): void {
    this.veiculos = this.veiculos.filter(v => v.id !== id);
    this.exibirMensagem('Veículo removido da lista visual.', 'sucesso');
  }

  limparPesquisa(): void {
    this.pesquisa = '';
  }

  private exibirMensagem(
    mensagem: string,
    tipo: 'sucesso' | 'erro'
  ): void {
    this.mensagem = mensagem;
    this.tipoMensagem = tipo;
  }
}
