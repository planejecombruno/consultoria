import { getNumber, getBool, formatBRL } from "./script.js";

//! ==============================================
//! PROJEÇÃO FINANCEIRA
//! ==============================================

function calcularProjecao() {
  // Entradas do formulário
  const capitalInicial = getNumber("portfolioInvestimentos");
  const aporteMensal = getNumber("aposentadoria-aporte");
  // Determine projection length in years based on birthdate + desired retirement age.
  // Fallback to `inputPeriodoAplicacao` when data is missing.
  let tempoAnos;
  const birthVal = document.getElementById("data_nascimento")?.value;
  const targetAge = getNumber("aposentadoria-idade");
  if (birthVal && targetAge) {
    const birthDate = new Date(birthVal);
    const today = new Date();
    let currentAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      currentAge -= 1;
    }
    // Years remaining until desired retirement age. Never negative.
    tempoAnos = Math.max(0, Math.round(targetAge - currentAge));
  } else {
    // Preserve previous behavior when inputs are missing
    tempoAnos = getNumber("inputPeriodoAplicacao") || 0;
  }
  const taxaAnual = getNumber("inputTaxaRentabilidade");
  const inflacaoAnual = getNumber("inputTaxaInflacao");
  const irRate = getNumber("inputTaxaIR");
  const growthAnual = getNumber("inputCrescimento");

  // Conversão para taxas mensais
  const taxaMensal = Math.pow(1 + taxaAnual, 1 / 12) - 1;
  const inflacaoMensal = Math.pow(1 + inflacaoAnual, 1 / 12) - 1;
  const growthMensal = Math.pow(1 + growthAnual, 1 / 12) - 1;

  // Checkboxes
  const corrigirAportes = getBool("checkCorrigirAportes");
  const usarCrescimentoReal = getBool("checkCrescimento");
  const corrigirInflacao = getBool("checkCorrigirInflacao");
  const incluirIr = getBool("checkIR");

  const tempoMeses = Math.ceil(tempoAnos * 12);
  const plRealArray = [];

  // Acumuladores
  let patrimonio = capitalInicial,
    totalAportes = capitalInicial,
    totalJuros = 0,
    totalIr = 0,
    totalPerda = 0,
    saldoCorrecao = 0,
    plReal = 0;

  for (let mes = 1; mes <= tempoMeses; mes++) {
    const correcao =
      (corrigirAportes && usarCrescimentoReal
        ? (1 + inflacaoMensal) * (1 + growthMensal)
        : corrigirAportes
        ? 1 + inflacaoMensal
        : usarCrescimentoReal
        ? 1 + growthMensal
        : 1) *
        (1 + saldoCorrecao) -
      1;
    saldoCorrecao = correcao;

    const aporte =
      corrigirAportes || usarCrescimentoReal
        ? aporteMensal * (1 + correcao)
        : aporteMensal;

    totalAportes += aporte;
    const juros = (patrimonio + aporte) * taxaMensal;
    const ir = incluirIr ? juros * irRate : 0;

    patrimonio += aporte + juros;
    totalJuros += juros;
    totalIr += ir;

    const perda = corrigirInflacao ? patrimonio * inflacaoMensal : 0;
    totalPerda += perda;

    plReal = patrimonio - totalIr - totalPerda;
    plRealArray.push(plReal.toFixed(2));
  }

  // ─── CÁLCULO ATÉ 600 MESES ──────────────────────────────
  // Mantém o comportamento original: sempre exibir até 50 anos para o gráfico de composição
  const ANOS_EXIBIDOS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const composicao = {};
  let patrimonioComp = capitalInicial,
    totalAportesComp = capitalInicial,
    totalJurosComp = 0,
    totalIrComp = 0,
    totalPerdaComp = 0,
    saldoCorrecaoComp = 0;

  for (let mes = 1; mes <= 600; mes++) {
    const correcao =
      (corrigirAportes && usarCrescimentoReal
        ? (1 + inflacaoMensal) * (1 + growthMensal)
        : corrigirAportes
        ? 1 + inflacaoMensal
        : usarCrescimentoReal
        ? 1 + growthMensal
        : 1) *
        (1 + saldoCorrecaoComp) -
      1;
    saldoCorrecaoComp = correcao;

    const aporteComp =
      corrigirAportes || usarCrescimentoReal
        ? aporteMensal * (1 + correcao)
        : aporteMensal;
    totalAportesComp += aporteComp;

    const jurosComp = (patrimonioComp + aporteComp) * taxaMensal;
    totalJurosComp += jurosComp;

    const irComp = incluirIr ? jurosComp * irRate : 0;
    totalIrComp += irComp;

    patrimonioComp += aporteComp + jurosComp;
    totalPerdaComp += corrigirInflacao ? patrimonioComp * inflacaoMensal : 0;

    if (mes % 12 === 0 && ANOS_EXIBIDOS.includes(mes / 12)) {
      const ano = mes / 12;
      const bruto = patrimonioComp;
      composicao[ano] = {
        aporte: (totalAportesComp / bruto) * 100,
        juros: (totalJurosComp / bruto) * 100,
      };
    }
  }

  // Atualiza UI
  atualizarResumo(
    plReal,
    capitalInicial,
    totalAportes,
    totalJuros,
    tempoAnos,
    plRealArray,
    inflacaoMensal,
    taxaMensal,
    corrigirAportes,
    corrigirInflacao,
    aporteMensal,
    taxaAnual,
    inflacaoAnual,
    usarCrescimentoReal,
    incluirIr,
    irRate
  );
  desenharGraficoPl(plRealArray);
  atualizarSubtitulos();
  desenharGraficoComposicao(composicao, ANOS_EXIBIDOS);
  // Atualiza resumo de objetivos (PGTO mensal para alcançar cada objetivo)
  if (typeof atualizarResumoObjetivos === "function") {
    try {
      atualizarResumoObjetivos();
    } catch (e) {
      console.warn("atualizarResumoObjetivos falhou", e);
    }
  }
}

function atualizarResumo(
  patrimonioLiquidoReal,
  capitalInicial,
  aportesTotal,
  jurosTotal,
  tempoAnos,
  plRealArray,
  taxaInflaMensal,
  taxaRentMensal,
  corrigirAportes,
  corrigirInflacao,
  aporteMensal,
  taxaAnual,
  inflacaoAnual,
  usarCrescimentoReal,
  incluirIr,
  irRate
) {
  const formatCurrency = (valor) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatPercent = (valor) =>
    (valor * 100).toFixed(2).replace(".", ",") + "%";

  const setTexto = (seletor, valor) => {
    const el = document.querySelector(`[data-projecao="${seletor}"]`);
    if (el) el.textContent = valor;
  };

  const calcularIdade = (dataNascimento) => {
    if (!dataNascimento) return 0;
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const aniversarioNaoChegou =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() &&
        hoje.getDate() < nascimento.getDate());
    return aniversarioNaoChegou ? idade - 1 : idade;
  };

  const calcularPrimeiroMilhao = () => {
    for (let i = 0; i < plRealArray.length; i++) {
      if (Number(plRealArray[i]) >= 1_000_000) {
        const d = new Date();
        d.setMonth(d.getMonth() + i + 1);
        return {
          ano: d.getFullYear(),
          mes: d.getMonth() + 1,
          anos: Math.floor((i + 1) / 12),
          meses: i + 1,
        };
      }
    }
    return null;
  };

  // 1) Valores principais
  setTexto("patrimonioFinal", formatCurrency(patrimonioLiquidoReal));
  setTexto("valorAportesTotal", formatCurrency(aportesTotal));
  setTexto("valorJurosTotal", formatCurrency(jurosTotal));

  // 2) Idade e período
  const idadeHoje = calcularIdade(
    document.getElementById("data_nascimento")?.value
  );
  setTexto("idadeAtual", idadeHoje);
  setTexto("idadeFinal", idadeHoje + tempoAnos);
  setTexto("tempo", tempoAnos);

  // 3) Novos campos fixos
  setTexto("valorCarteira", formatCurrency(capitalInicial));
  setTexto("aporteMensal", formatCurrency(aporteMensal));
  setTexto("periodoAplicacao", tempoAnos);
  setTexto("taxaRetorno", formatPercent(taxaAnual));
  setTexto("taxaInflacao", formatPercent(inflacaoAnual));
  setTexto("correcaoPatrimonio", corrigirInflacao ? "SIM" : "NÃO");
  setTexto("correcaoAporte", corrigirAportes ? "SIM" : "NÃO");
  setTexto("crescimentoAportes", usarCrescimentoReal ? "SIM" : "NÃO");

  // 4) Controle do parágrafo de IR
  const paragrafoIR = document.getElementById("premissas-incluirIR");
  setTexto("taxaIR", formatPercent(irRate));
  if (paragrafoIR) {
    if (incluirIr) paragrafoIR.classList.remove("hidden");
    else paragrafoIR.classList.add("hidden");
  }

  // 5) Primeiro milhão
  const primeiroMilhao = calcularPrimeiroMilhao();
  const itemMilhao = document.querySelectorAll(".projecao-informacoes-item")[1];
  if (primeiroMilhao) {
    const mesExt = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
      new Date(primeiroMilhao.ano, primeiroMilhao.mes - 1)
    );
    const mesAno =
      mesExt.charAt(0).toUpperCase() +
      mesExt.slice(1) +
      "/" +
      primeiroMilhao.ano;
    setTexto("dataPriMilhao", mesAno);
    setTexto("anosPriMilhao", primeiroMilhao.anos);
    setTexto("mesesPriMilhao", primeiroMilhao.meses);
    if (itemMilhao) itemMilhao.style.display = "";
  } else {
    if (itemMilhao) itemMilhao.style.display = "none";
  }

  // 6) Percentuais corrigido
  const somaBruta = aportesTotal + jurosTotal;
  const percAportes = somaBruta ? aportesTotal / somaBruta : 0;
  const percJuros = 1 - percAportes;

  setTexto("percentualAportes", formatPercent(percAportes));
  setTexto("percentualJuros", formatPercent(percJuros));

  // 7) Renda passiva mensal
  const rentabilidadeReal = (1 + taxaRentMensal) / (1 + taxaInflaMensal) - 1;
  const rendaMensal =
    corrigirAportes || corrigirInflacao
      ? patrimonioLiquidoReal * rentabilidadeReal
      : patrimonioLiquidoReal * taxaRentMensal;
  setTexto("rendaPassivaMensal", formatCurrency(rendaMensal));
}

function desenharGraficoPl(plRealArray) {
  const canvas = document.getElementById("graficoPlReal");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  // Destrói gráfico anterior se existir
  if (window.graficoPl && typeof window.graficoPl.destroy === "function") {
    try {
      window.graficoPl.destroy();
    } catch (e) {
      /* ignore */
    }
  }
  const cor =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      ?.trim() || "14,40,65";
  const totalMeses = plRealArray.length;
  const anosCheios = Math.floor(totalMeses / 12);
  const restoMeses = totalMeses % 12;
  const labels = [];
  const valores = [];

  // preenche labels/valores
  for (let i = 1; i <= anosCheios; i++) {
    labels.push(i.toString());
    valores.push(parseFloat(plRealArray[i * 12 - 1]));
  }
  if (restoMeses > 0) {
    labels.push((totalMeses / 12).toFixed(1).replace(".", ","));
    valores.push(parseFloat(plRealArray[totalMeses - 1]));
  }

  window.graficoPl = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: valores,
          backgroundColor: `rgb(${cor})`,
          barThickness: "flex",
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 40, bottom: 30, left: 20, right: 20 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.raw.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              }),
          },
        },
        datalabels: {
          anchor: "end",
          align: "top",
          offset: 5,
          color: "#000",
          rotation: 90,
          font: { size: 16 },
          formatter: (v) =>
            `${Math.round(v / 1000).toLocaleString("pt-BR")} mil`,
          clip: false,
        },
      },
      scales: {
        x: {
          ticks: {
            font: { size: 14 },
            padding: 5,
            autoSkip: false,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { display: false },
          grid: { display: false },
          border: { display: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function atualizarSubtitulos() {
  const getBool = (id) => document.getElementById(id).checked;

  const corrigirAportes = getBool("checkCorrigirAportes");
  const usarCrescimentoReal = getBool("checkCrescimento");
  const corrigirInflacao = getBool("checkCorrigirInflacao");
  const incluirIR = getBool("checkIR");

  // Info1: Patrimônio Real ou Nominal
  const info1 =
    corrigirInflacao || corrigirAportes
      ? "Patrimônio Real"
      : "Patrimônio Nominal";
  document.getElementById("subtitle-graficoPlReal-info1").textContent = info1;

  // Info2: Com ou Sem crescimento dos aportes
  const info2 = usarCrescimentoReal
    ? "Com crescimento do valor de aportes"
    : "Sem crescimento do valor de aportes";
  document.getElementById("subtitle-graficoPlReal-info2").textContent = info2;

  // Info3: Com ou Sem IR
  const info3 = incluirIR ? "Com IR" : "Sem IR";
  document.getElementById("subtitle-graficoPlReal-info3").textContent = info3;
}

function calcularComposicaoProjecao(config) {
  const composicao = {};
  const anosExibidos = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

  let patrimonio = config.patrimonioInicial;
  let aporteTotal = 0;
  let jurosTotal = 0;

  for (let mes = 1; mes <= 600; mes++) {
    const rendimento = patrimonio * (config.rentabilidade / 12);
    jurosTotal += rendimento;
    aporteTotal += config.aporteMensal;
    patrimonio += rendimento + config.aporteMensal;

    // Verifica se o mês corresponde a um dos anos-chave
    const ano = mes / 12;
    if (anosExibidos.includes(ano)) {
      const total = patrimonio;
      composicao[ano] = {
        aporte: (aporteTotal / total) * 100,
        juros: (jurosTotal / total) * 100,
      };
    }
  }
  return composicao;
}

function desenharGraficoComposicao(composicao, anos) {
  const labels = anos.map(String);
  const aporte = anos.map((a) => composicao[a]?.aporte || 0);
  const juros = anos.map((a) => composicao[a]?.juros || 0);
  const canvas = document.getElementById("graficoComposicao");
  const ctx = canvas.getContext("2d");

  // Destrói gráfico anterior se existir
  if (window.graficoComp && typeof window.graficoComp.destroy === "function") {
    try {
      window.graficoComp.destroy();
    } catch (e) {
      /* ignore */
    }
  }

  window.graficoComp = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Juros", data: juros, backgroundColor: "#0e2841" },
        {
          label: "Aportes",
          data: aporte,
          backgroundColor: getComputedStyle(document.documentElement)
            .getPropertyValue("--color-primary-500")
            .trim(),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { font: { size: 14 } },
        },
        datalabels: {
          color: "#fff",
          anchor: "center",
          align: "center",
          font: { weight: "bold", size: 12 },
          formatter: (v) => `${v.toFixed(0)}%`,
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            callback: (val, i) => {
              const ano = labels[i];
              return i === 0 || i === labels.length - 1 || ano % 5 === 0
                ? ano
                : "";
            },
            font: { size: 14 },
          },
          title: { display: true, text: "Anos", font: { size: 16 } },
          grid: { display: false },
        },
        y: {
          stacked: true,
          display: false,
          max: 100,
          grid: { display: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// Calcula e atualiza o grid de objetivos no resumo (3x3)
function atualizarResumoObjetivos() {
  const hoje = new Date();

  const goals = [
    { key: "imovel", label: "Imóveis", nameDate: "goal-imovel-data", nameValorCandidates: ["goal-imovel-value", "goal-imovel-valor"] },
    { key: "veiculo", label: "Veículos", nameDate: "goal-veiculo-data", nameValorCandidates: ["goal-veiculo-valor"] },
    { key: "profissional", label: "Profissional", nameDate: "goal-profissional-data", nameValorCandidates: ["goal-profissional-valor"] },
    { key: "viagens", label: "Viagens", nameDate: "goal-viagens-data", nameValorCandidates: ["goal-viagens-valor"] },
    { key: "casamento", label: "Casamento", nameDate: "goal-casamento-data", nameValorCandidates: ["goal-casamento-valor"] },
    { key: "empreender", label: "Empreender", nameDate: "goal-empreender-data", nameValorCandidates: ["goal-empreender-valor"] },
    { key: "dividas", label: "Sanar dívidas", nameDate: "goal-dividas-data", nameValorCandidates: ["goal-dividas-valor"] },
    { key: "outros", label: "Outros", nameDate: "goal-outros-data", nameValorCandidates: ["goal-outros-valor"] },
  ];

  const taxaRent = getNumber("inputTaxaRentabilidade") || 0;
  const taxaInf = getNumber("inputTaxaInflacao") || 0;
  // taxa real anual conforme especificado
  const taxaRealAnual = (1 + taxaRent) / (1 + taxaInf) - 1;
  const taxaRealMensal = Math.pow(1 + taxaRealAnual, 1 / 12) - 1;

  const formatCurrency = (v) => formatBRL(v || 0);

  let totalFuturo = 0;
  let totalPmt = 0;

  const container = document.getElementById("resumo-objetivos");
  if (!container) return;

  // carrega objetivos selecionados do localStorage
  const selectedGoals = JSON.parse(localStorage.getItem("selectedGoals") || "[]");

  goals.forEach((g) => {
    const card = container.querySelector(`.objetivo-card[data-goal="${g.key}"]`);
    if (!card) return;

    // Se o objetivo não foi selecionado, ocultar o cartão
    const isSelected = selectedGoals.includes(g.key);
    card.style.display = isSelected ? "block" : "none";
    if (!isSelected) return;

    // pega data
    const dateInput = document.getElementsByName(g.nameDate)[0];
    const dateVal = dateInput ? dateInput.value : null;
    let dateText = "-";
    let nperMonths = 0;
    if (dateVal) {
      const target = new Date(dateVal);
      if (!isNaN(target)) {
        dateText = new Intl.DateTimeFormat("pt-BR", { year: "numeric", month: "short" }).format(target);
        // fração de ano entre hoje e target
        const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
        const diffMs = target.getTime() - hoje.getTime();
        const yearsFraction = Math.max(0, diffMs / msPerYear);
        nperMonths = yearsFraction * 12;
      }
    }

    // pega valor (procura entre candidatos) e tenta usar dataset.rawValue primeiro
    let valorNum = 0;
    for (const n of g.nameValorCandidates) {
      const elByName = document.getElementsByName(n)[0];
      if (!elByName) continue;
      // valor bruto no dataset.rawValue (quando formatadores são usados)
      const raw = elByName.dataset && elByName.dataset.rawValue;
      if (raw !== undefined && raw !== "") {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          valorNum = parsed;
          break;
        }
      }
      // fallback: parsear value textual (ex: "R$ 1.234,56")
      if (elByName.value && elByName.value.trim() !== "") {
        const cleaned = elByName.value.replace(/[R$\s\.]/g, "").replace(/,/g, ".");
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
          valorNum = parsed;
          break;
        }
      }
    }

    // calcula PMT mensal para alcançar valor futuro a partir de PV=0
    let pmt = 0;
    if (nperMonths <= 0 || valorNum <= 0) {
      pmt = 0;
    } else if (Math.abs(taxaRealMensal) < 1e-12) {
      pmt = valorNum / nperMonths;
    } else {
      const r = taxaRealMensal;
      // PMT formula for future value when PV = 0: FV = PMT * (( (1+r)^n -1)/r )
      // so PMT = FV * r / ( (1+r)^n -1 )
      pmt = (valorNum * r) / (Math.pow(1 + r, nperMonths) - 1);
    }

    totalFuturo += valorNum;
    totalPmt += pmt;

    // atualiza UI
    const elDate = card.querySelector('[data-field="date"]');
    const elValor = card.querySelector('[data-field="valor"]');
    const elPmt = card.querySelector('[data-field="pmt"]');
    if (elDate) elDate.textContent = dateText;
    if (elValor) elValor.textContent = valorNum ? formatCurrency(valorNum) : "-";
    if (elPmt) elPmt.textContent = pmt ? formatCurrency(pmt) : "-";
  });

  // atualiza cartão resumo
  const resumoCard = container.querySelector('.objetivo-card[data-goal="resumo"]');
  if (resumoCard) {
    const elTotalFut = resumoCard.querySelector('[data-field="total-futuro"]');
    const elTotalPmt = resumoCard.querySelector('[data-field="total-pmt"]');
    const elTaxaReal = resumoCard.querySelector('[data-field="taxa-real"]');
    if (elTotalFut) elTotalFut.textContent = totalFuturo ? formatCurrency(totalFuturo) : "-";
    if (elTotalPmt) elTotalPmt.textContent = totalPmt ? formatCurrency(totalPmt) : "-";
    if (elTaxaReal) elTaxaReal.textContent = (taxaRealAnual * 100).toFixed(2).replace('.', ',') + "%";
  }
}

//! ==============================================
//! RESUMO PATRIMONIAL
//! ==============================================

function resumoPatrimonial() {
  // Utilitário para somar valores de inputs com atributo 'field-format="number"' dentro de um container
  const somarValores = (containerSelector) => {
    let total = 0;
    document
      .querySelectorAll(`${containerSelector} [field-format="number"]`)
      .forEach((input) => {
        const raw = input.dataset?.rawValue;
        if (raw !== undefined) {
          total += parseFloat(raw) || 0;
        }
      });
    return total;
  };

  // Ativos
  const totalImoveis = somarValores("#properties-container");
  const totalVeiculos = somarValores("#vehicle-container");
  const totalOutrosAtivos = somarValores("#otherasset-container");
  const totalInvestimentos = getNumber("portfolioInvestimentos");

  const totalAtivos =
    totalImoveis + totalVeiculos + totalOutrosAtivos + totalInvestimentos;

  // Passivos (somar apenas saldo_devedor, não valor_contrato)
  let totalPassivos = 0;
  document
    .querySelectorAll(
      '#liabilities-container [name="liabilities[saldo_devedor][]"]'
    )
    .forEach((input) => {
      const raw = input.dataset?.rawValue;
      if (raw !== undefined) {
        totalPassivos += parseFloat(raw) || 0;
      }
    });

  // Patrimônio Líquido
  const patrimonioLiquido = totalAtivos - totalPassivos;

  // === ORÇAMENTO: comparação 50/30/20 vs estado atual ===
  // Pega valores do formulário de orçamento (campos hidden ou inputs)
  const totalReceitas = getNumber("hidden-total-receitas") || 0;
  const totalDespesasOrc = getNumber("hidden-total-despesas") || 0;
  const totalInvestimentosOrc = getNumber("hidden-total-investimentos") || 0;

  // Recomendação 50/30/20 (aplicada sobre receita anual)
  const recNecessidades = totalReceitas * 0.5;
  const recDesejos = totalReceitas * 0.3;
  const recPoupanca = totalReceitas * 0.2;

  const setTextIfExists = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatBRL(val);
  };

  setTextIfExists("orc-total-receitas", totalReceitas);
  setTextIfExists("orc-recomendado-necessidades", recNecessidades);
  setTextIfExists("orc-recomendado-desejos", recDesejos);
  setTextIfExists("orc-recomendado-poupanca", recPoupanca);

  // Estado atual: sumariza as despesas fixas/variáveis e investimentos a partir do formulário de orçamento
  const somarOrcamento = (selector) => {
    let total = 0;
    document
      .querySelectorAll(`#collect-orcamento-orcamento ${selector}`)
      .forEach((input) => {
        const raw = input?.dataset?.rawValue;
        if (raw !== undefined) total += parseFloat(raw) || 0;
        else {
          const v = (input.value || "")
            .toString()
            .replace(/[^0-9\-,.]/g, "")
            .replace(/\./g, "")
            .replace(",", ".");
          total += parseFloat(v) || 0;
        }
      });
    return total;
  };

  const atualFixas = somarOrcamento(".despesa-fixa");
  const atualVariaveis = somarOrcamento(".despesa-variavel");
  const atualInvestimentos =
    totalInvestimentosOrc || somarOrcamento(".orcamento-investimento");

  setTextIfExists("orc-atual-receitas", totalReceitas);
  setTextIfExists("orc-atual-necessidades", atualFixas);
  setTextIfExists("orc-atual-desejos", atualVariaveis);
  setTextIfExists("orc-atual-poupanca", atualInvestimentos);

  // Desenha gráfico do patrimônio (ativos, passivos, líquido)
  desenharGraficoPatrimonio(totalAtivos, totalPassivos, patrimonioLiquido);
  // Desenha comparativo de patrimônio protegido por categoria (Imóveis, Automóveis, Outros)
  desenharGraficoPatrimonioProtegido(totalImoveis, totalVeiculos, totalOutrosAtivos);
  
  // Desenha gráficos de Metodologia 50-30-20 e Orçamento Atual
  desenhargraficoMetodologia503020();
  atualizarTextoOrcamentoAtual();
}

function desenharGraficoPatrimonio(
  totalAtivos,
  totalPassivos,
  patrimonioLiquido
) {
  const canvas = document.getElementById("graficoPatrimonioTotal") || document.getElementById("graficoPatrimonio");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Destrói gráfico anterior se existir
  if (window.graficoPatrimonio && typeof window.graficoPatrimonio.destroy === "function") {
    try {
      window.graficoPatrimonio.destroy();
    } catch (e) {
      /* ignore */
    }
  }

  const labels = ["Ativos", "Passivos", "Patrimônio Líquido"];
  const data = [Number(totalAtivos || 0), Number(totalPassivos || 0), Number(patrimonioLiquido || 0)];

  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-500").trim();
  const primary200 = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-200")?.trim() || "rgb(233,203,178)";
  const secondColor = getComputedStyle(document.documentElement).getPropertyValue("--second-color")?.trim() || "rgb(1,37,70)";

  const colors = [primaryColor, primary200, secondColor];

  window.graficoPatrimonio = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "R$",
          data,
          backgroundColor: colors,
          barThickness: "flex",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24, bottom: 10, left: 10, right: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.raw.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              }),
          },
        },
        datalabels: {
          anchor: "end",
          align: "end",
          offset: 4,
          clip: false,
          color: "#000",
          font: { size: 12, weight: "600" },
          formatter: (v) => formatBRL(v),
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: {
          display: false,
          beginAtZero: true,
          grid: { display: false, drawBorder: false },
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// Desenha gráfico de quanto do patrimônio está protegido pelos seguros
function desenharGraficoPatrimonioProtegido(imoveisBruto, veiculosBruto, outrosBruto) {
  const canvas = document.getElementById("graficoPatrimonioProtegido");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Destrói gráfico anterior se existir
  if (window.graficoPatrimonioProt && typeof window.graficoPatrimonioProt.destroy === "function") {
    try {
      window.graficoPatrimonioProt.destroy();
    } catch (e) {
      /* ignore */
    }
  }

  // Valores brutos por categoria
  const bruto = [Number(imoveisBruto || 0), Number(veiculosBruto || 0), Number(outrosBruto || 0)];
  const labels = ["Imóveis", "Automóveis", "Outros"];

  // Prêmios/recursos de proteção (usados como proxy de cobertura)
  const seguroVida = Number(getNumber("vida-premio") || 0);
  const seguroPatrimonio = Number(getNumber("patrimonio-premio") || 0);
  const seguroVeiculo = Number(getNumber("veicular-premio") || 0);
  const outrasProtecoes = Number(getNumber("outrasprotecoes-premio") || 0);

  const totalBruto = bruto.reduce((a, b) => a + b, 0) || 0;
  const brutoImoveisOutros = bruto[0] + bruto[2];

  // Alocação das coberturas:
  // - `seguropatrimonio` é alocado entre Imóveis e Outros proporcionalmente ao peso entre esses dois
  // - `seguroveiculo` cobre Automóveis
  // - `segurovida` e `outrasProtecoes` são alocados proporcionalmente entre todas as categorias pela participação bruta

  const alocadoSegPatrImoveis = brutoImoveisOutros > 0 ? seguroPatrimonio * (bruto[0] / brutoImoveisOutros) : 0;
  const alocadoSegPatrOutros = seguroPatrimonio - alocadoSegPatrImoveis;

  const shareImoveis = totalBruto > 0 ? bruto[0] / totalBruto : 0;
  const shareVeiculos = totalBruto > 0 ? bruto[1] / totalBruto : 0;
  const shareOutros = totalBruto > 0 ? bruto[2] / totalBruto : 0;

  const alocadoOutrasImoveis = outrasProtecoes * shareImoveis;
  const alocadoOutrasVeiculos = outrasProtecoes * shareVeiculos;
  const alocadoOutrasOutros = outrasProtecoes * shareOutros;

  const alocadoVidaImoveis = seguroVida * shareImoveis;
  const alocadoVidaVeiculos = seguroVida * shareVeiculos;
  const alocadoVidaOutros = seguroVida * shareOutros;

  // Protegido por categoria (teto no bruto da própria categoria)
  const protegidoImoveis = Math.min(bruto[0], alocadoSegPatrImoveis + alocadoOutrasImoveis + alocadoVidaImoveis);
  const protegidoVeiculos = Math.min(bruto[1], seguroVeiculo + alocadoOutrasVeiculos + alocadoVidaVeiculos);
  const protegidoOutros = Math.min(bruto[2], alocadoSegPatrOutros + alocadoOutrasOutros + alocadoVidaOutros);

  const protegidoVals = [protegidoImoveis, protegidoVeiculos, protegidoOutros];

  // Percentuais para gráfico 100%
  const protegidoPct = bruto.map((b, i) => (b > 0 ? (protegidoVals[i] / b) * 100 : 0));
  const naoProtegidoPct = protegidoPct.map((p) => Math.max(0, 100 - p));

  // Cores
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-500").trim();
  const secondColor = getComputedStyle(document.documentElement).getPropertyValue("--second-color")?.trim() || "rgb(1,37,70)";
  const protectedColor = primaryColor;
  const notProtectedColor = "#e9ecef";

  window.graficoPatrimonioProt = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Protegido",
          data: protegidoPct,
          backgroundColor: protectedColor,
          stack: "stack1",
        },
        {
          label: "Não protegido",
          data: naoProtegidoPct,
          backgroundColor: notProtectedColor,
          stack: "stack1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 24, bottom: 10, left: 10, right: 10 } },
      plugins: {
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const idx = ctx.dataIndex;
              const datasetLabel = ctx.dataset.label || "";
              const pct = ctx.raw || 0;
              const brutoVal = bruto[idx] || 0;
              const valorReal = Math.round((pct / 100) * brutoVal * 100) / 100;
              return `${datasetLabel}: ${formatBRL(valorReal)} (${pct.toFixed(1)}%)`;
            },
          },
        },
        datalabels: {
          color: "#000",
          font: { weight: "700", size: 12 },
          formatter: function (v, ctx) {
            // show label for both datasets if value > 0; hide when exactly 0
            if (!v || v === 0) return null;
            const rounded = Math.round(v);
            if (rounded === 0) return "<1%";
            return `${rounded}%`;
          },
          anchor: "center",
          align: "center",
          clip: false,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: {
          display: false,
          stacked: true,
          beginAtZero: true,
          max: 100,
          grid: { display: false },
        },
      },
      indexAxis: "x",
    },
    plugins: [ChartDataLabels],
  });

  // Informação no console (opcional)
  console.info("Proteção por categoria (bruto):", { bruto, protegidoVals });
}

// Make these functions available globally for other modules to call
window.calcularProjecao = calcularProjecao;
window.atualizarResumo = atualizarResumo;
window.desenharGraficoPl = desenharGraficoPl;
window.desenharGraficoComposicao = desenharGraficoComposicao;
window.resumoPatrimonial = resumoPatrimonial;

//! ==============================================
//! METODOLOGIA 50-30-20 E ORÇAMENTO ATUAL
//! ==============================================

function desenhargraficoMetodologia503020() {
  const canvas = document.getElementById("graficoMetodologia503020");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Destrói gráfico anterior se existir
  if (window.graficoMetodologia && typeof window.graficoMetodologia.destroy === "function") {
    try {
      window.graficoMetodologia.destroy();
    } catch (e) {
      /* ignore */
    }
  }

  const totalReceitas = getNumber("hidden-total-receitas") || 0;
  const valores = [totalReceitas * 0.5, totalReceitas * 0.3, totalReceitas * 0.2];
  const labels = ["Necessidades", "Desejos", "Investimentos"];
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-500").trim();
  const primary200 = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-200")?.trim() || "rgb(233,203,178)";
  const secondColor = getComputedStyle(document.documentElement).getPropertyValue("--second-color")?.trim() || "rgb(1,37,70)";
  const colors = [primaryColor, primary200, secondColor];

  window.graficoMetodologia = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: valores,
          backgroundColor: colors,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 12 },
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const valor = ctx.raw || 0;
              const pct = totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0;
              return `${ctx.label}: ${formatBRL(valor)} (${pct.toFixed(1)}%)`;
            },
          },
        },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 14 },
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? (v / total) * 100 : 0;
            return `${pct.toFixed(0)}%`;
          },
          anchor: "center",
          align: "center",
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function desenharGraficoOrcamentoAtual() {
  const canvas = document.getElementById("graficoOrcamentoAtual");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Destrói gráfico anterior se existir
  if (window.graficoOrcamento && typeof window.graficoOrcamento.destroy === "function") {
    try {
      window.graficoOrcamento.destroy();
    } catch (e) {
      /* ignore */
    }
  }

  // Calcula totais do orçamento atual
  const somarOrcamento = (selector) => {
    let total = 0;
    document
      .querySelectorAll(`#collect-orcamento-orcamento ${selector}`)
      .forEach((input) => {
        const raw = input?.dataset?.rawValue;
        if (raw !== undefined) total += parseFloat(raw) || 0;
        else {
          const v = (input.value || "")
            .toString()
            .replace(/[^0-9\-,.]/g, "")
            .replace(/\./g, "")
            .replace(",", ".");
          total += parseFloat(v) || 0;
        }
      });
    return total;
  };

  const totalReceitas = getNumber("hidden-total-receitas") || 0;
  const atualFixas = somarOrcamento(".despesa-fixa");
  const atualVariaveis = somarOrcamento(".despesa-variavel");
  const totalInvestimentosOrc = getNumber("hidden-total-investimentos") || 0;
  const atualInvestimentos =
    totalInvestimentosOrc || somarOrcamento(".orcamento-investimento");
  // Calcula percentuais e valores reais
  const totalDespesas = atualFixas + atualVariaveis + atualInvestimentos;
  const basePercent = totalReceitas > 0 ? totalReceitas : totalDespesas || 1;

  const valores = [atualFixas, atualVariaveis, atualInvestimentos];
  const labels = ["Necessidades", "Desejos", "Investimentos"];
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-500").trim();
  const primary200 = getComputedStyle(document.documentElement).getPropertyValue("--color-primary-200")?.trim() || "rgb(233,203,178)";
  const secondColor = getComputedStyle(document.documentElement).getPropertyValue("--second-color")?.trim() || "rgb(1,37,70)";
  const colors = [primaryColor, primary200, secondColor];

  window.graficoOrcamento = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: valores,
          backgroundColor: colors,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 12 },
            padding: 15,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const valor = ctx.raw || 0;
              const pct = basePercent > 0 ? (valor / basePercent) * 100 : 0;
              return `${ctx.label}: ${formatBRL(valor)} (${pct.toFixed(1)}%)`;
            },
          },
        },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 14 },
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? (v / total) * 100 : 0;
            return `${pct.toFixed(0)}%`;
          },
          anchor: "center",
          align: "center",
        },
      },
    },
    plugins: [ChartDataLabels],
  });
}

function atualizarTextoOrcamentoAtual() {
  const somarOrcamento = (selector) => {
    let total = 0;
    document
      .querySelectorAll(`#collect-orcamento-orcamento ${selector}`)
      .forEach((input) => {
        const raw = input?.dataset?.rawValue;
        if (raw !== undefined) total += parseFloat(raw) || 0;
        else {
          const v = (input.value || "")
            .toString()
            .replace(/[^0-9\-,.]/g, "")
            .replace(/\./g, "")
            .replace(",", ".");
          total += parseFloat(v) || 0;
        }
      });
    return total;
  };

  const totalReceitas = getNumber("hidden-total-receitas") || 0;
  const atualFixas = somarOrcamento(".despesa-fixa");
  const atualVariaveis = somarOrcamento(".despesa-variavel");
  const totalInvestimentosOrc = getNumber("hidden-total-investimentos") || 0;
  const atualInvestimentos =
    totalInvestimentosOrc || somarOrcamento(".orcamento-investimento");

  const fluxoCaixa = totalReceitas - atualFixas - atualVariaveis;

  const container = document.getElementById("orcamento-alerta");
  if (!container) return;

  let htmlContent = "";

  if (fluxoCaixa < 0) {
    // Fluxo negativo
    htmlContent = `
      <div class="alerta-negativo">
        <strong style="font-size: 1.1em;">⚠️ Alerta Vermelho</strong>
        <p style="margin-top: 10px;">Isso gera dívidas e um ciclo vicioso de juros, comprometendo o futuro. Use o gráfico para atacar as maiores categorias de gastos e reduza o padrão de vida imediatamente, negociando dívidas e evitando novas parcelas. Sem correção rápida, o endividamento cresce; comece diagnosticando por 30 dias para virar o jogo.</p>
      </div>
    `;
  } else if (atualInvestimentos === 0 && fluxoCaixa > 0) {
    // Equilíbrio básico mas sem investimento
    htmlContent = `
      <div class="alerta-equilibrio">
        <strong style="font-size: 1.1em;">⚖️ Equilíbrio Básico</strong>
        <p style="margin-top: 10px;">Você está no equilíbrio básico, mas estagnado: sem sobras para emergências ou crescimento. Analise o gráfico de gastos para eliminar despesas desnecessárias, como pequenos impulsos diários, e crie margem criando um orçamento "ganhos menos sonhos menos gastos". Pequenos ajustes aqui liberam recursos para investimentos iniciais e constroem segurança financeira.</p>
      </div>
    `;
  } else if (fluxoCaixa > 0) {
    // Fluxo positivo e com investimentos
    htmlContent = `
      <div class="alerta-positivo">
        <strong style="font-size: 1.1em;">✅ Parabéns!</strong>
        <p style="margin-top: 10px;">Essa é a base da prosperidade financeira, permitindo acumular reservas e investir para o futuro. Priorize separar uma parte da renda para sonhos e investimentos logo no início do mês, ajustando os gastos ao que sobra. Com o gráfico de composição de gastos ao lado, identifique categorias supérfluas para cortar ainda mais e acelerar seu patrimônio.</p>
      </div>
    `;
  }

  container.innerHTML = htmlContent;
  desenharGraficoOrcamentoAtual();
  atualizarReservaEmergencia();
}

// Reserva de Emergência: calcula e atualiza valores na tela
function atualizarReservaEmergencia() {
  // Considera despesas essenciais = despesas fixas
  const somarOrcamento = (selector) => {
    let total = 0;
    document
      .querySelectorAll(`#collect-orcamento-orcamento ${selector}`)
      .forEach((input) => {
        const raw = input?.dataset?.rawValue;
        if (raw !== undefined) total += parseFloat(raw) || 0;
        else {
          const v = (input.value || "")
            .toString()
            .replace(/[^0-9\-,.]/g, "")
            .replace(/\./g, "")
            .replace(",", ".");
          total += parseFloat(v) || 0;
        }
      });
    return total;
  };
  const despesasEssenciais = somarOrcamento(".despesa-fixa");
  const reservaMinima = despesasEssenciais * 3;
  const reservaRecomendada = despesasEssenciais * 6;
  const elMin = document.getElementById("reserva-minima-valor");
  const elRec = document.getElementById("reserva-recomendada-valor");
  if (elMin) elMin.textContent = formatBRL(reservaMinima);
  if (elRec) elRec.textContent = formatBRL(reservaRecomendada);
}

// Expõe funções globalmente
window.desenhargraficoMetodologia503020 = desenhargraficoMetodologia503020;
window.desenharGraficoOrcamentoAtual = desenharGraficoOrcamentoAtual;
window.atualizarTextoOrcamentoAtual = atualizarTextoOrcamentoAtual;
