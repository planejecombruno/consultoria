//! ==============================================
//! CONSTANTES E VARIÁVEIS GLOBAIS
//! ==============================================

// Estado da aplicação
let currentStep = 0;
const selectedGoals = JSON.parse(localStorage.getItem("selectedGoals") || "[]");
const goalsFormData = JSON.parse(localStorage.getItem("goalsFormData") || "{}");
const stepToCategory = [0, 0, 1, 1, 2, 2, 2, 2, 2, 3, 4];

// Elementos do DOM
const steps = document.querySelectorAll(".step");
const sidebarItems = document.querySelectorAll(".sidebar li");
const btnNext = document.getElementById("btn-next");
const btnPrev = document.getElementById("btn-prev");
const grid = document.getElementById("goals-grid");
const formsContainer = document.getElementById("forms-container");

// Configurações
const settingsForm = document.getElementById("proposta-settings-form");
const percentInput = document.getElementById("settings-input-percentual");
const minInput = document.getElementById("settings-input-minimo");
const acompInput = document.getElementById("settings-input-acompanhamento");
const parcelasSelect = document.getElementById("settings-input-parcelas");

// Modo noturno
const darkModeSetting = localStorage.getItem('dark-mode');
const toggle = document.getElementById('toggleDarkMode');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Objetivos
const goals = [
  { id: "imovel", label: "Imóveis", icon: "apartment" },
  { id: "veiculo", label: "Veículos", icon: "directions_car" },
  { id: "profissional", label: "Profissional", icon: "work" },
  { id: "viagens", label: "Viagens", icon: "flight" },
  { id: "casamento", label: "Casamento", icon: "favorite" },
  { id: "empreender", label: "Empreender", icon: "lightbulb_2" },
  { id: "dividas", label: "Sanar dívidas", icon: "money_off" },
  { id: "outros", label: "Outros", icon: "more_horiz" },
];

//* Formatação de Número, Percentual e Phone 
const formatadores = {
  number: {
    // Converte valor numérico para formato pt-BR exibição
    formatar: (valor) => {
      if (isNaN(valor) || valor === '') return '';
      const num = parseFloat(valor);
      return isNaN(num) ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num);
    },
    // Converte entrada de usuário (formatada ou não) para número limpo
    parse: (valor) => {
      if (!valor) return 0;
      let normalized = String(valor).trim().replace(/\s/g, '');
      // padrão pt-BR: 1.234,56 (ponto=milhar, vírgula=decimal)
      normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
      const numero = parseFloat(normalized);
      return isNaN(numero) ? 0 : numero;
    }
  },

  percent: {
    // formatador de percentuais: armazena como fração (ex: 0.08) mas exibe como '8,00%'
    formatar: (valor) => {
      if (valor === null || valor === undefined || valor === '') return '';
      const num = parseFloat(valor);
      if (isNaN(num)) return '';
      // valor armazenado é 0.08 => exibir 8,00%
      const display = num * 100;
      return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(display) + '%';
    },
    parse: (valor) => {
      if (!valor && valor !== 0) return 0;
      let normalized = String(valor).trim().replace(/\s/g, '').replace(/%/g, '');
      normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
      const numero = parseFloat(normalized);
      // retornamos o valor em fração (ex: 8 -> 0.08)
      return isNaN(numero) ? 0 : numero / 100;
    }
  },

  phone: {
    formatar: (valor) => {
      if (!valor) return '';
      const nums = String(valor).replace(/\D/g, '');
      const parts = [];
      if (nums.length > 0) parts.push(`(${nums.slice(0, 2)}`);
      if (nums.length > 2) parts.push(`) ${nums.slice(2, 7)}`);
      if (nums.length > 7) parts.push(`-${nums.slice(7, 11)}`);
      return parts.join('');
    },
    parse: (valor) => String(valor).replace(/\D/g, '')
  }
};

function configurarFormatacao(input) {
  const tipo = input.getAttribute('field-format');
  const formatador = formatadores[tipo];

  if (!formatador) return;
  
  // Se já tem listeners (evita duplicatas após dinamismo)
  if (input.dataset.formattersAttached) return;
  input.dataset.formattersAttached = 'true';

  // AO DIGITAR: parseia e armazena limpo, mas mostra limpo temporariamente
  input.addEventListener('input', function () {
    const rawValue = formatador.parse(this.value);
    this.dataset.rawValue = String(rawValue);
    // Não formata durante digitação - deixa o usuário digitar livremente
  });

  // AO PERDER FOCO (BLUR): formata para exibição
  input.addEventListener('blur', function () {
    const rawValue = formatador.parse(this.value);
    this.dataset.rawValue = String(rawValue);
    this.value = formatador.formatar(rawValue);
  });

  // AO RECEBER FOCO (FOCUS): mostra valor limpo para edição
  input.addEventListener('focus', function () {
    const raw = this.dataset.rawValue;
    if (tipo === 'percent') {
      if (raw === undefined || raw === '') {
        this.value = '';
      } else {
        const display = parseFloat(raw) * 100;
        // Mostrar sem separadores de milhar; usar vírgula como separador decimal opcional
        this.value = Number.isInteger(display) ? String(display) : String(display).replace('.', ',');
      }
    } else {
      this.value = raw !== undefined ? String(raw) : '';
    }
  });
}

function initFormatting() {
  document.querySelectorAll('[field-format]').forEach(input => {
    const tipo = input.getAttribute('field-format');
    const formatador = formatadores[tipo];

    if (!formatador) return;

    // Inicializa: parseia o que tem, armazena limpo e exibe formatado
    const rawValue = formatador.parse(input.value);
    input.dataset.rawValue = String(rawValue);
    input.value = formatador.formatar(rawValue);

    configurarFormatacao(input);
  });
}

const getNumber = id => {
  const el = document.getElementById(id);
  const raw = el?.dataset?.rawValue;
  if (raw !== undefined) {
    return parseFloat(raw) || 0;
  }
  return parseFloat(el?.value) || 0;
};

const getBool = id => document.getElementById(id)?.checked;

// Formata valores em reais (R$)
function formatBRL(val) {
  return Number(val).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  });
}

//! ==============================================
//! FUNÇÕES DE NAVEGAÇÃO
//! ==============================================

const stepButtonText = {
  0: { prev: null, next: "Continuar" },
  1: { prev: null, next: "Ir para objetivos" },
  2: { prev: "Voltar à apresentação", next: "Continuar" },
  3: { prev: "Voltar", next: "Ir para coleta de dados" },
  4: { prev: "Voltar aos Objetivos", next: "Continuar" },
  5: { prev: "Voltar", next: "Continuar" },
  6: { prev: "Voltar", next: "Continuar" },
  7: { prev: "Voltar", next: "Continuar" },
  8: { prev: "Voltar", next: "Continuar" },
  9: { prev: "Voltar", next: "Ir à proposta de trabalho" },
  10: { prev: "Voltar à proposta de trabalho", next: null }
};

function showStep(n) {
  hideSettings();
  currentStep = n;
  steps.forEach((sec, i) => sec.classList.toggle("hidden", i !== n));
  const activeCat = stepToCategory[n];
  sidebarItems.forEach((li, i) =>
    li.classList.toggle("active", i === activeCat)
  );

  // Atualiza os textos dos botões
  const config = stepButtonText[n] || { prev: "Voltar", next: "Continuar" };
  btnPrev.textContent = config.prev || "";
  btnPrev.style.display = config.prev ? "inline-block" : "none";
  btnNext.textContent = config.next || "";
  btnNext.style.display = config.next ? "inline-block" : "none";

  // Triggers de lógica específica por passo — funções específicas foram movidas para módulos.
  if (typeof showObjetivosSelect === 'function') showObjetivosSelect();
  if (typeof showObjetivosForm === 'function') showObjetivosForm();
  // Só renderiza a proposta quando estivermos no passo 9 (Proposta de Trabalho)
  if (n === 9 && typeof renderProposal === 'function') {
    try {
      renderProposal();
    } catch (err) {
      console.error('Erro ao renderizar proposta:', err);
    }
  }

  // Se a etapa exibida contém a área de resumo/projeção, garanta que as macros de cálculo sejam executadas
  try {
    const stepEl = steps[n];
    if (stepEl && (stepEl.querySelector('#resumo-financeiro') || stepEl.querySelector('#resumo-patrimonial') || stepEl.querySelector('#graficoPlReal') || stepEl.querySelector('#graficoPatrimonio'))) {
      if (typeof calcOrcamentoTotals === 'function') {
        try { calcOrcamentoTotals(); } catch (e) { console.warn('calcOrcamentoTotals falhou', e); }
      }
      if (typeof calcularProjecao === 'function') {
        try { calcularProjecao(); } catch (e) { console.warn('calcularProjecao falhou', e); }
      }
      if (typeof resumoPatrimonial === 'function') {
        try { resumoPatrimonial(); } catch (e) { console.warn('resumoPatrimonial falhou', e); }
      }
    }
  } catch (err) {
    console.error('Erro ao disparar cálculos de resumo:', err);
  }
}

function initNavigation() {
  // Navegação lateral
  sidebarItems.forEach((li, i) =>
    li.addEventListener("click", () => {
      const step = stepToCategory.findIndex(cat => cat === i);
      showStep(step < 0 ? 0 : step);
      hideSettings();
    })
  );

  // Botões próximo/anterior
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      // Se está no step-8 (projeção), executar o cálculo antes de avançar (se disponível)
      if (currentStep === 8 && typeof calcularProjecao === 'function') {
        try {
          calcularProjecao();
        } catch (e) {
          console.warn('calcularProjecao falhou:', e);
        }
      }
      showStep(currentStep === 1 ? 2 : Math.min(currentStep + 1, steps.length - 1));
      hideSettings();
      // Rolar para o topo da página
      window.scrollTo(0, 0);
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      showStep(currentStep === 2 ? 1 : Math.max(currentStep - 1, 0));
      hideSettings();
      // Rolar para o topo da página
      window.scrollTo(0, 0);
    });
  }

  // Navegação da coleta de dados personalizada
  const stepMap = [4, 5, 6, 7];
  document.querySelectorAll('.collection-nav').forEach(nav =>
    nav.querySelectorAll('li').forEach((li, idx) =>
      li.addEventListener('click', () => {
        const step = stepMap[idx];
        if (typeof step !== "undefined") {
          showStep(step);
        }
      })
    )
  );
}

function hideSettings() {
  document.getElementById('main-settings').classList.add('hidden');
}

//! ==============================================
//! CONFIGURAÇÕES
//! ==============================================
const juros = {
  "1": 1.041212774,
  "2": 1.05031091,
  "3": 1.058966287,
  "4": 1.067192982,
  "5": 1.07552025,
  "6": 1.083802803,
  "7": 1.096772004,
  "8": 1.104995733,
  "9": 1.113224014,
  "10": 1.121567106,
  "11": 1.129843683,
  "12": 1.138119297
};

//! ==============================================
//! EXPORTAÇÃO DE DADOS
//! ==============================================

function exportToJSON() {
  const steps = document.querySelectorAll('.step');
  const data = {};

  steps.forEach(step => {
    const sectionBodies = step.querySelectorAll('.section-body');
    sectionBodies.forEach(sectionBody => {
      const baseForms = sectionBody.querySelectorAll('.base-form:not(.hidden)');
      baseForms.forEach(form => {
        const formName = form.getAttribute('form-name') || 'form_sem_nome';
        data[formName] = {};
        form.querySelectorAll('input[name], select[name], textarea[name]').forEach(field => {
          data[formName][field.name] = field.value;
        });
      });
    });
  });

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dados.json';
  a.click();
  URL.revokeObjectURL(url);
}

//! ==============================================
//! MODOS DE TELA
//! ==============================================

function initDarkMode() {
  if (!toggle) return;

  if (darkModeSetting === 'enabled' || (!darkModeSetting && prefersDark)) {
    document.body.classList.add('dark-mode');
    toggle.checked = true;
  }

  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('dark-mode', 'enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('dark-mode', 'disabled');
    }
  });
}

//! ==============================================
//! INICIALIZAÇÃO DA APLICAÇÃO
//! ==============================================

function initApp() {
  // Configurações - mantém apenas a abertura do painel de settings
  document.querySelector('.sidebar-settings .sidebar-icons')?.addEventListener('click', e => {
    e.stopPropagation();
    steps.forEach(s => s.classList.add('hidden'));
    document.getElementById('main-settings').classList.remove('hidden');
    // Renderizar prévia ao abrir configurações
    if (typeof renderPrevia === 'function') {
      try { renderPrevia(); } catch (err) { console.error('Erro ao renderizar prévia:', err); }
    }
  });

  // Eventos globais: se módulos externos fornecerem handlers, eles serão usados.
  if (typeof handleYesNo === 'function') {
    document.addEventListener("click", e => {
      const btn = e.target.closest(".yes-no-buttons button");
      if (!btn) return;
      const group = btn.closest(".yes-no-buttons");
      handleYesNo(group, btn);
    });
  }

  // Menu e sidebar
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      overlay?.classList.toggle('active');
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
      });
    }
  }

  // Inicializações essenciais compartilhadas
  initDarkMode();
  initNavigation();
  initFormatting();
  initFormToggles();
  initDynamicForms();
  initOrcamento();

  // Atualizar prévia da proposta ao interagir com o formulário de configurações
  const proposalSettingsForm = document.getElementById('proposal-settings-form');
  if (proposalSettingsForm) {
    const triggerPrevia = () => { if (typeof renderPrevia === 'function') { try { renderPrevia(); } catch (e) { console.error('Erro ao renderizar prévia:', e); } } };
    proposalSettingsForm.addEventListener('click', triggerPrevia);
    proposalSettingsForm.addEventListener('focusin', triggerPrevia);
  }

  // Estado inicial
  showStep(0);
}

//! ==============================================
//! FUNÇÕES DE FORMULÁRIOS (movidas de outro local)
//! ==============================================

function initFormToggles() {
  document.querySelectorAll('.base-form-header').forEach(header => {
    if (header.dataset.toggleReady) return;
    const body = document.getElementById(header.dataset.toggleTarget);
    const icon = header.querySelector('.google-icons.base-form-item');
    if (!body) return;

    // Configura estado inicial
    if (body.classList.contains('hidden')) {
      body.style.display = 'none';
      if (icon) icon.textContent = 'expand_more';
      header.classList.add('collapsed');
    }

    header.addEventListener('click', () => {
      const isHidden = body.style.display === 'none';

      // Alterna a visibilidade com transição suave
      if (isHidden) {
        body.style.display = 'flex'; // ou o display que você usa
        if (icon) icon.textContent = 'expand_less';
        header.classList.remove('collapsed');
      } else {
        body.style.display = 'none';
        if (icon) icon.textContent = 'expand_more';
        header.classList.add('collapsed');
      }
    });

    header.dataset.toggleReady = "true";
  });
}

function handleYesNo(group, btn) {
  if (!btn) return;

  group.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  const campoId = btn.dataset.ocultarCampo;
  if (!campoId) return;

  const valor = btn.dataset.value;
  const bloco = group.closest(".base-form-body");
  const campo = bloco?.querySelector(
    campoId.startsWith('.') ? campoId : `#${campoId}`
  ) || document.getElementById(campoId);
  if (!campo) return;

  campo.classList.toggle("hidden", valor !== "true");

  if (valor !== "true") {
    if (campoId === "form-filhosDependentes")
      document.getElementById('dependents-container').innerHTML = '';
    if (campoId === "form-imoveis")
      document.getElementById('properties-container').innerHTML = '';
    if (campoId === "form-vehicle")
      document.getElementById('vehicle-container').innerHTML = '';
  }

  const nomeCampo = group.dataset.name;
  if (nomeCampo) {
    const form = group.closest(".base-form");
    const hiddenInput = form.querySelector(`input[name="${nomeCampo}"]`);
    if (hiddenInput) hiddenInput.value = valor;

    const formName = form.getAttribute("form-name");
    if (formName) {
      if (!goalsFormData[formName]) goalsFormData[formName] = {};
      goalsFormData[formName][nomeCampo] = valor;
      localStorage.setItem("goalsFormData", JSON.stringify(goalsFormData));
    }
  }
}

function initDynamicForms() {
  // Dependentes
  const addDepBtn = document.getElementById('add-dependent-btn');
  const depContainer = document.getElementById('dependents-container');
  const depTpl = document.getElementById('dependent-template');
  addDepBtn?.addEventListener('click', () => {
    depContainer.appendChild(depTpl.content.cloneNode(true));
    initFormatting();
  });
  depContainer?.addEventListener('click', e => {
    if (e.target.matches('.remove-dependent-btn'))
      e.target.closest('.rangeFilhoDependente').remove();
  });

  // Imóveis
  const addPropBtn = document.getElementById('add-property-btn');
  const propContainer = document.getElementById('properties-container');
  const propTpl = document.getElementById('property-template');
  addPropBtn?.addEventListener('click', () => {
    propContainer.appendChild(propTpl.content.cloneNode(true));
    initFormatting();
  });
  propContainer?.addEventListener('click', e => {
    if (e.target.matches('.remove-property-btn'))
      e.target.closest('.property-block').remove();
  });

  // Veículos
  const addVehiBtn = document.getElementById('add-vehicle-btn');
  const vehiContainer = document.getElementById('vehicle-container');
  const vehiTpl = document.getElementById('vehicle-template');
  addVehiBtn?.addEventListener('click', () => {
    vehiContainer.appendChild(vehiTpl.content.cloneNode(true));
    initFormatting();
  });
  vehiContainer?.addEventListener('click', e => {
    if (e.target.matches('.remove-vehicle-btn')) {
      e.target.closest('.vehicle-block').remove();
    }
  });

  // Outro Ativo
  const addOtherAssetBtn = document.getElementById('add-otherasset-btn');
  const OtherAssetContainer = document.getElementById('otherasset-container');
  const OtherAssetTpl = document.getElementById('otherasset-template');
  addOtherAssetBtn?.addEventListener('click', () => {
    OtherAssetContainer.appendChild(OtherAssetTpl.content.cloneNode(true));
    initFormatting();
  });
  OtherAssetContainer?.addEventListener('click', e => {
    if (e.target.matches('.remove-otherasset-btn')) {
      e.target.closest('.otherasset-block').remove();
    }
  });

  // Passivos
  const addliabilitiesBtn = document.getElementById('add-liabilities-btn');
  const liabilitiesContainer = document.getElementById('liabilities-container');
  const liabilitiesTpl = document.getElementById('liabilities-template');
  addliabilitiesBtn?.addEventListener('click', () => {
    liabilitiesContainer.appendChild(liabilitiesTpl.content.cloneNode(true));
    initFormatting();
  });
  liabilitiesContainer?.addEventListener('click', e => {
    if (e.target.matches('.remove-liabilities-btn')) {
      e.target.closest('.liabilities-block').remove();
    }
  });
}

//! ==============================================
//! ORÇAMENTO
//! ==============================================

// Calcula e armazena os totais do formulário de Orçamento
function calcOrcamentoTotals() {
  const container = document.getElementById('collect-orcamento-orcamento');
  if (!container) return;

  const parseInput = (input) => {
    if (!input) return 0;
    const raw = input.dataset?.rawValue;
    if (raw !== undefined) return parseFloat(raw) || 0;
    const v = (input.value || '').toString().replace(/[^0-9\-.,]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(v) || 0;
  };

  const sumSelector = (selector) => {
    let total = 0;
    container.querySelectorAll(selector).forEach(inp => total += parseInput(inp));
    return total;
  };

  const totalReceitas = sumSelector('.orcamento-receita');
  const totalFixas = sumSelector('.despesa-fixa');
  const totalVariaveis = sumSelector('.despesa-variavel');
  const investimentoMensal = (() => {
    const el = container.querySelector('.orcamento-investimento') || document.getElementById('input-investimentos-total');
    return parseInput(el);
  })();

  const totalDespesas = totalFixas + totalVariaveis + investimentoMensal;
  const fluxo = totalReceitas - totalDespesas;

  // Atualiza displays (spans)
  const setDisplay = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = formatBRL(value);
  };

  setDisplay('display-total-receitas', totalReceitas);
  setDisplay('display-subtotal-receitas', totalReceitas);
  setDisplay('display-despesas-fixas', totalFixas);
  setDisplay('display-despesas-variaveis', totalVariaveis);
  setDisplay('display-total-despesas', totalDespesas);
  setDisplay('display-fluxo-caixa', fluxo);

  // Atualiza campos hidden para exportação
  const setHidden = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(value);
    el.dataset.rawValue = String(value);
  };

  setHidden('hidden-total-receitas', totalReceitas);
  setHidden('hidden-total-despesas', totalDespesas);
  setHidden('hidden-fluxo-caixa', fluxo);
  setHidden('hidden-total-investimentos', investimentoMensal);

  const orc = { totalReceitas, totalDespesas, fluxo, totalInvestimentos: investimentoMensal };
  localStorage.setItem('orcamentoTotals', JSON.stringify(orc));
}

function initOrcamento() {
  const container = document.getElementById('collect-orcamento-orcamento');
  if (!container) return;

  // Recalcula ao digitar nas células da tabela
  container.querySelectorAll('.table-input').forEach(input => {
    input.addEventListener('input', () => setTimeout(calcOrcamentoTotals, 50));
  });

  // Run once at init
  calcOrcamentoTotals();
}

// Exports for modules
export {
  selectedGoals,
  goalsFormData,
  goals,
  grid,
  formsContainer,
  getNumber,
  getBool,
  formatBRL,
  initFormatting,
  initFormToggles,
  handleYesNo,
  initDynamicForms,
  calcOrcamentoTotals,
  initOrcamento,
  juros,
  initDarkMode,
  initNavigation,
  showStep,
  hideSettings,
  initApp,
  exportToJSON
};

// Note: initialization is performed by `scripts/main.js` which imports modules and calls `initApp()`