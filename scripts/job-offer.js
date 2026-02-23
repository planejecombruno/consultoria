//! ==============================================
//! PROPOSTA COMERCIAL
//! ==============================================

import { getNumber, formatBRL, juros, calcOrcamentoTotals } from './script.js';

function selecionarOpcao(div) {
  document.querySelectorAll('.proposal-investimento-opcao').forEach(el =>
    el.classList.remove('selecionado')
  );
  div.classList.add('selecionado');
}

//* Proposta
// Atualiza todos os elementos com o atributo resultado-proposta correspondente
function exibirProposta(nome, valor) {
  document.querySelectorAll(`[resultado-proposta="${nome}"]`)
    .forEach(el => el.textContent = valor);
}

// Pega e estrutura todos os valores da proposta
function inputsProposta() {
  return {
    percentInput: getNumber('settings-input-percentual'),
    minInput: getNumber('settings-input-minimo'),
    parcelasSelect: parseInt(document.getElementById('settings-input-parcelas')?.value || '12', 10) || 12,
    semestralMonths: parseInt(document.getElementById('settings-meses-livre')?.value || '6', 10) || 6,
    txAdicional: getNumber('settings-input-txadicional')
  };
}

// Cálculo e atualização da proposta (12 meses e N meses livres)
function renderProposal() {
  const v = inputsProposta();

  // Garantir que os totais do orçamento estejam atualizados (atualiza hidden-fluxo-caixa)
  try { calcOrcamentoTotals(); } catch (e) { /* se não existir em tempo de execução, ignora */ }

  // Renda mensal usada como base: usar fluxo de caixa calculado no orçamento
  const rendaMensal = getNumber('hidden-fluxo-caixa') || 0;

  // ========== PLANO 12 MESES ==========
  // base_consultoria = Renda Mensal * 12 * txPercentual
  let baseConsultoria = rendaMensal * 12 * v.percentInput;
  if (baseConsultoria < v.minInput) baseConsultoria = v.minInput;

  // consultoria_12m = base_consultoria * (1+juros)
  const numParcelas12 = v.parcelasSelect;
  const fatorJuros12 = juros[numParcelas12.toString()] || 1.0;
  const consultoria12 = baseConsultoria * fatorJuros12;
  
  // consultoria_parcelada = consultoria / n parcelas
  const valorParcelado12 = consultoria12 / numParcelas12;
  
  // consultoria_a_vista = base_consultoria (SEM JUROS)
  const valorVista12 = baseConsultoria;

  exibirProposta('valorParcelado12', formatBRL(valorParcelado12));
  exibirProposta('numParcelas12', String(numParcelas12));
  exibirProposta('valorVista12', formatBRL(valorVista12));

  // ========== PLANO N MESES (LIVRE) ==========
  // base_consultoria_livre = (base_consultoria/12)*n meses livres
  const nMesesLivre = v.semestralMonths || 6;
  const baseConsultoriaLivre = (baseConsultoria / 12) * nMesesLivre;
  
  // consultoria_livre = (base_consultoria_livre * (1+tx Adicional))*(1+juros_parcelas)
  // sendo o número de parcelas = n meses livres
  const txAdd = v.txAdicional || 0; // decimal (ex: 0.20)
  const fatorJurosLivre = juros[nMesesLivre.toString()] || 1.0;
  const consultoriaLivre = (baseConsultoriaLivre * (1 + txAdd)) * fatorJurosLivre;
  
  // consultoria_livre_parcelada = consultoria_livre/n meses livres
  const valorParceladoLivre = consultoriaLivre / nMesesLivre;
  
  // consultoria_livre_a_vista = base_consultoria_livre * (1 + txAdicional) (SEM JUROS)
  const valorVistaLivre = baseConsultoriaLivre * (1 + txAdd);

  exibirProposta('valorParceladoLivre', formatBRL(valorParceladoLivre));
  exibirProposta('numParcelasLivre', String(nMesesLivre));
  exibirProposta('valorVistaLivre', formatBRL(valorVistaLivre));
  exibirProposta('labelNMeses', `${nMesesLivre} meses`);
}

//* Prévia
function obterPrevia() {
  return {
    previaReceitaAnualBruta: getNumber('receitaAnualBrutaExemplo'),
    previaPercentInput: getNumber('settings-input-percentual'),
    previaMinInput: getNumber('settings-input-minimo'),
    previaParcelasSelect: parseInt(document.getElementById('settings-input-parcelas')?.value || '12', 10) || 12,
    previaSemestralMonths: parseInt(document.getElementById('settings-meses-livre')?.value || '6', 10) || 6,
    previaTxAdicional: getNumber('settings-input-txadicional')
  };
}

function renderPrevia() {
  const v = obterPrevia();
  const rendaAnual = v.previaReceitaAnualBruta || 0;
  const rendaMensal = rendaAnual / 12;

  // ========== PLANO 12 MESES (PRÉVIA) ==========
  let baseConsultoria = rendaMensal * 12 * v.previaPercentInput;
  if (baseConsultoria < v.previaMinInput) baseConsultoria = v.previaMinInput;

  const numParcelas12 = v.previaParcelasSelect;
  const fatorJuros12 = juros[numParcelas12.toString()] || 1.0;
  const consultoria12 = baseConsultoria * fatorJuros12;
  const valorParcelado12 = consultoria12 / numParcelas12;
  const valorVista12 = baseConsultoria; // SEM JUROS

  exibirProposta('previaValorParcelado12', formatBRL(valorParcelado12));
  exibirProposta('previaNumeroParcelas12', String(numParcelas12));
  exibirProposta('previaValorVista12', formatBRL(valorVista12));

  // ========== PLANO N MESES (LIVRE) (PRÉVIA) ==========
  const nMesesLivre = v.previaSemestralMonths;
  const baseConsultoriaLivre = (baseConsultoria / 12) * nMesesLivre;
  
  const txAdd = v.previaTxAdicional || 0;
  const fatorJurosLivre = juros[nMesesLivre.toString()] || 1.0;
  const consultoriaLivre = (baseConsultoriaLivre * (1 + txAdd)) * fatorJurosLivre;
  
  const valorParceladoLivre = consultoriaLivre / nMesesLivre;
  const valorVistaLivre = baseConsultoriaLivre * (1 + txAdd); // SEM JUROS

  exibirProposta('previaValorParceladoLivre', formatBRL(valorParceladoLivre));
  exibirProposta('previaNumeroParcelasLivre', String(nMesesLivre));
  exibirProposta('previaValorVistaLivre', formatBRL(valorVistaLivre));
  exibirProposta('previewLabelNMeses', `${nMesesLivre} meses`);
}

//! ==============================================
//! PDF E IMPRESSÃO
//! ==============================================

function printData() {
  // Pegar o nome do cliente
  const nome = document.querySelector('#collect-dadosPessoais-nome')?.value || '';
  const nomeClientes = document.querySelectorAll('[printData="nomeCliente"]');
  nomeClientes.forEach(el => {
    el.textContent = nome;
  });

  // Pegar data e hora atuais
  const agora = new Date();
  const dia = agora.getDate().toString().padStart(2, '0');
  const ano = agora.getFullYear();
  const hora = agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Nome do mês por extenso (em português)
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mes = meses[agora.getMonth()];

  // Preencher os elementos de data
  document.querySelectorAll('[printData="diaRelatorio"]').forEach(el => el.textContent = dia);
  document.querySelectorAll('[printData="mesRelatorio"]').forEach(el => el.textContent = mes);
  document.querySelectorAll('[printData="anoRelatorio"]').forEach(el => el.textContent = ano);
  document.querySelectorAll('[printData="horaRelatorio"]').forEach(el => el.textContent = hora);
}

function substituirCanvasPorImagem(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas com id "${canvasId}" não encontrado.`);
    return null;
  }

  const imagem = new Image();
  imagem.src = canvas.toDataURL('image/png');
  imagem.alt = 'Gráfico gerado';
  imagem.style.maxWidth = '100%';
  imagem.style.height = 'auto';

  canvas.parentNode.insertBefore(imagem, canvas);
  canvas.style.display = 'none';

  return imagem;
}

function imprimirRelatorio() {
  resumoPatrimonial();
  printData();
  window.print();
}

// Make these functions available globally for showStep() to call
window.renderProposal = renderProposal;
window.selecionarOpcao = selecionarOpcao;
window.renderPrevia = renderPrevia;
window.printData = printData;
window.imprimirRelatorio = imprimirRelatorio;

