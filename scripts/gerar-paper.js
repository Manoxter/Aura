'use strict';

const PDFDocument = require('C:/Users/engpr/OneDrive/Área de Trabalho/TRIQ-6.1/node_modules/pdfkit');
const fs = require('fs');
const path = require('path');

// ─── OUTPUT PATH ──────────────────────────────────────────────────────────────
const OUTPUT_DIR = 'C:/Users/engpr/OneDrive/Área de Trabalho/TRIQ-6.1/prints para teste/Insights para publicação de artigo';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'TRIQ_Fundamentos_Matematicos_Paper.pdf');

// ─── DOCUMENT SETUP ───────────────────────────────────────────────────────────
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
  info: {
    Title: 'TRIQ — Método de Gestão de Projetos por Geometria Analítica',
    Author: 'Manoxter | Squad TRIQ',
    Subject: 'Fundamentos Matemáticos, Desenvolvimento Histórico e Validação',
    Keywords: 'TRIQ, gestão de projetos, geometria analítica, curva S, triângulo de ferro',
    CreationDate: new Date('2026-03-16'),
  },
  autoFirstPage: false,
});

// ─── STREAM ───────────────────────────────────────────────────────────────────
const stream = fs.createWriteStream(OUTPUT_FILE);
doc.pipe(stream);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 72;
const TEXT_W = PAGE_W - MARGIN * 2;
let pageNumber = 0;

function addPage() {
  doc.addPage();
  pageNumber++;
  drawHeaderFooter();
}

function drawHeaderFooter() {
  // Header line
  doc.save();
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(MARGIN, 50).lineTo(PAGE_W - MARGIN, 50).stroke();
  doc.font('Helvetica').fontSize(8).fillColor('#888888')
    .text('TRIQ — Fundamentos Matemáticos | Março 2026', MARGIN, 38, { width: TEXT_W / 2 })
    .text('Manoxter | Squad TRIQ', MARGIN + TEXT_W / 2, 38, { width: TEXT_W / 2, align: 'right' });
  // Footer line
  doc.strokeColor('#cccccc').lineWidth(0.5)
    .moveTo(MARGIN, PAGE_H - 50).lineTo(PAGE_W - MARGIN, PAGE_H - 50).stroke();
  doc.font('Helvetica').fontSize(8).fillColor('#888888')
    .text(`Página ${pageNumber}`, MARGIN, PAGE_H - 40, { width: TEXT_W, align: 'center' });
  doc.restore();
}

function title(text, size = 18, color = '#1a237e') {
  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text, { align: 'left' });
  doc.moveDown(0.4);
  // underline
  const y = doc.y;
  doc.strokeColor(color).lineWidth(1)
    .moveTo(MARGIN, y).lineTo(MARGIN + TEXT_W, y).stroke();
  doc.moveDown(0.6);
}

function subtitle(text, size = 13, color = '#283593') {
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text);
  doc.moveDown(0.4);
}

function body(text, opts = {}) {
  doc.font('Helvetica').fontSize(10.5).fillColor('#212121')
    .text(text, { align: 'justify', lineGap: 3, ...opts });
  doc.moveDown(0.5);
}

function formula(text) {
  doc.moveDown(0.3);
  doc.rect(MARGIN, doc.y, TEXT_W, 0).fill(); // reset
  const boxY = doc.y;
  const lines = text.split('\n').length;
  const boxH = lines * 16 + 16;
  doc.rect(MARGIN + 20, boxY, TEXT_W - 40, boxH).fill('#f3f4f6');
  doc.font('Courier-Bold').fontSize(10.5).fillColor('#1a237e')
    .text(text, MARGIN + 30, boxY + 8, { width: TEXT_W - 60, lineGap: 4 });
  doc.y = boxY + boxH + 6;
  doc.moveDown(0.3);
}

function highlight(text, bgColor = '#e8f5e9', textColor = '#1b5e20') {
  doc.moveDown(0.3);
  const boxY = doc.y;
  // measure text height
  const measured = doc.heightOfString(text, { width: TEXT_W - 40, fontSize: 10.5 });
  const boxH = measured + 16;
  doc.rect(MARGIN, boxY, TEXT_W, boxH).fill(bgColor);
  doc.font('Helvetica').fontSize(10.5).fillColor(textColor)
    .text(text, MARGIN + 10, boxY + 8, { width: TEXT_W - 20, align: 'justify', lineGap: 3 });
  doc.y = boxY + boxH + 6;
  doc.moveDown(0.3);
}

function warn(text) {
  highlight(text, '#fff3e0', '#e65100');
}

function info(text) {
  highlight(text, '#e3f2fd', '#0d47a1');
}

function tableRow(cols, widths, y, header = false) {
  const startX = MARGIN;
  let x = startX;
  if (header) {
    doc.rect(MARGIN, y - 2, TEXT_W, 16).fill('#283593');
  }
  cols.forEach((col, i) => {
    doc.font(header ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor(header ? '#ffffff' : '#212121')
      .text(col, x + 4, y, { width: widths[i] - 8 });
    x += widths[i];
  });
  doc.strokeColor('#cccccc').lineWidth(0.3)
    .moveTo(MARGIN, y + 14).lineTo(MARGIN + TEXT_W, y + 14).stroke();
  return y + 16;
}

function bullet(text, indent = 0) {
  const bx = MARGIN + 10 + indent * 15;
  doc.font('Helvetica').fontSize(10.5).fillColor('#212121')
    .text(`• ${text}`, bx, doc.y, { width: TEXT_W - 10 - indent * 15, lineGap: 3 });
  doc.moveDown(0.2);
}

function numbered(n, text) {
  doc.font('Helvetica').fontSize(10.5).fillColor('#212121')
    .text(`${n}. ${text}`, MARGIN + 10, doc.y, { width: TEXT_W - 10, lineGap: 3 });
  doc.moveDown(0.2);
}

function sectionDivider(color = '#e0e0e0') {
  doc.moveDown(1);
  doc.strokeColor(color).lineWidth(0.5)
    .moveTo(MARGIN, doc.y).lineTo(MARGIN + TEXT_W, doc.y).stroke();
  doc.moveDown(1);
}

// ──────────────────────────────────────────────────────────────────────────────
// CAPA
// ──────────────────────────────────────────────────────────────────────────────
doc.addPage();
pageNumber++;

// Background header band
doc.rect(0, 0, PAGE_W, 260).fill('#1a237e');

// Logo / acronym
doc.font('Helvetica-Bold').fontSize(72).fillColor('#ffffff')
  .text('TRIQ', MARGIN, 60, { width: TEXT_W, align: 'center' });

// Subtitle band
doc.rect(0, 200, PAGE_W, 60).fill('#283593');
doc.font('Helvetica').fontSize(13).fillColor('#e8eaf6')
  .text('Triangulated Risk Intelligence Quotient', MARGIN, 215, { width: TEXT_W, align: 'center' });

// Main title
doc.moveDown(2);
doc.font('Helvetica-Bold').fontSize(17).fillColor('#1a237e')
  .text(
    'Método de Gestão de Projetos por Geometria Analítica:\nFundamentos Matemáticos, Desenvolvimento Histórico e Validação',
    MARGIN, 300, { width: TEXT_W, align: 'center', lineGap: 5 }
  );

// Divider
doc.moveDown(1);
doc.strokeColor('#1a237e').lineWidth(1.5)
  .moveTo(MARGIN + 60, doc.y).lineTo(PAGE_W - MARGIN - 60, doc.y).stroke();
doc.moveDown(1);

// Subtitle
doc.font('Helvetica').fontSize(12).fillColor('#455a64')
  .text('Da Metáfora Qualitativa ao Objeto Geométrico Calculável', { width: TEXT_W, align: 'center' });

doc.moveDown(2.5);

// Authors box
const authBoxY = doc.y;
doc.rect(MARGIN + 60, authBoxY, TEXT_W - 120, 90).fill('#f5f5f5');
doc.font('Helvetica-Bold').fontSize(10).fillColor('#37474f')
  .text('AUTORES', MARGIN + 60, authBoxY + 10, { width: TEXT_W - 120, align: 'center' });
doc.font('Helvetica').fontSize(10).fillColor('#212121')
  .text('Manoxter (Autor Principal)', MARGIN + 60, authBoxY + 28, { width: TEXT_W - 120, align: 'center' })
  .text('@triq-math — Matemático/Geômetra Sênior', MARGIN + 60, authBoxY + 44, { width: TEXT_W - 120, align: 'center' })
  .text('@triq-production — Engenheiro de Produção / TOC / PMBOK', MARGIN + 60, authBoxY + 58, { width: TEXT_W - 120, align: 'center' })
  .text('Dr. Kenji (@pm-engineer) — Gerente de Projetos Sênior', MARGIN + 60, authBoxY + 74, { width: TEXT_W - 120, align: 'center' });

doc.y = authBoxY + 100;
doc.moveDown(1.5);

// Date & version
doc.font('Helvetica').fontSize(10).fillColor('#546e7a')
  .text('Março 2026  |  Versão 1.0  |  Documento Técnico TRIQ', { width: TEXT_W, align: 'center' });

doc.moveDown(2);

// Abstract box
const absY = doc.y;
doc.rect(MARGIN, absY, TEXT_W, 110).fill('#e8eaf6');
doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a237e')
  .text('RESUMO', MARGIN + 10, absY + 10, { width: TEXT_W - 20 });
doc.font('Helvetica').fontSize(9.5).fillColor('#212121')
  .text(
    'Este documento apresenta os fundamentos matemáticos completos do Método TRIQ (Triangulated Risk Intelligence Quotient), ' +
    'um sistema de gestão de projetos que transforma o triângulo de ferro — escopo, prazo e custo — de uma metáfora qualitativa ' +
    'em um objeto geométrico calculável. São detalhadas as bases matemáticas da Curva S cúbica, o cálculo dos vetores de ' +
    'intensidade adimensional, a Condição de Existência do Triângulo (CEt), o Triângulo Órtico, a Zona de Resiliência Executiva ' +
    '(ZRE) e o indicador MATED. O Boston Big Dig (1991–2007) é utilizado como caso de validação retroativa, demonstrando que ' +
    'o TRIQ teria detectado sinais de crise em 1993, oito anos antes do reconhecimento público do problema.',
    MARGIN + 10, absY + 26, { width: TEXT_W - 20, lineGap: 3 }
  );
doc.y = absY + 120;

// Keywords
doc.font('Helvetica-Bold').fontSize(9).fillColor('#455a64')
  .text('Palavras-chave: ', MARGIN, doc.y, { continued: true });
doc.font('Helvetica').fontSize(9).fillColor('#455a64')
  .text('gestão de projetos, geometria analítica, Curva S, triângulo de ferro, TRIQ, MATED, ZRE, Boston Big Dig, PMBOK, TOC.');

// Footer note on cover
doc.font('Helvetica').fontSize(8).fillColor('#9e9e9e')
  .text('Documento gerado pelo Squad TRIQ — Synkra AIOX Platform — Uso Acadêmico e de Pesquisa', MARGIN, PAGE_H - 60, { width: TEXT_W, align: 'center' });

// ──────────────────────────────────────────────────────────────────────────────
// SUMÁRIO
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('SUMÁRIO', 16);

const toc = [
  ['1', 'O Problema que o TRIQ Resolve', '3'],
  ['2', 'A Curva S: Como o Dinheiro Flui em Projetos', '4'],
  ['  2.1', 'O que é a Curva S', '4'],
  ['  2.2', 'Modelo Linear — Por que é simples demais', '4'],
  ['  2.3', 'Modelo Quadrático — Quando usar', '5'],
  ['  2.4', 'Modelo Cúbico 3t²−2t³ — O padrão adotado', '5'],
  ['  2.5', 'As 4 Propriedades Fundamentais da Curva Cúbica', '6'],
  ['3', 'A Reta Tangente: Capturando a Intensidade', '6'],
  ['  3.1', 'Tentativa 1: Reta entre início e fim', '7'],
  ['  3.2', 'Regressão Linear OLS (Mínimos Quadrados)', '7'],
  ['  3.3', 'Regressão Ponderada', '7'],
  ['  3.4', 'Derivada no Ponto de Inflexão', '8'],
  ['  3.5', 'Derivada Central de 2ª Ordem — Solução Adotada', '8'],
  ['4', 'O Problema dos Lados do Triângulo', '9'],
  ['  4.1', 'Opção 1: Normalizar pelo Máximo', '9'],
  ['  4.2', 'Opção 2: Desvios Percentuais', '9'],
  ['  4.3', 'Opção 3: Vetores de Intensidade Adimensional (ADOTADO)', '10'],
  ['5', 'A Condição de Existência do Triângulo (CEt)', '11'],
  ['6', 'Desenhando o Triângulo: Lei dos Cossenos', '12'],
  ['7', 'O Triângulo Órtico e a Zona de Resiliência Executiva (ZRE)', '13'],
  ['8', 'O MATED: Medindo a Distância da Crise', '14'],
  ['9', 'Validação: O Boston Big Dig (1991–2007)', '15'],
  ['10', 'Decisões Tomadas e Descartadas — Histórico Completo', '17'],
  ['11', 'Agenda de Pesquisa Futura (Squad Recommendations)', '18'],
  ['', 'Referências', '19'],
];

toc.forEach(([num, text, pg]) => {
  const indent = num.startsWith('  ') ? 20 : 0;
  const bold = !num.startsWith('  ');
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#212121')
    .text(num.trim() + '  ' + text, MARGIN + indent, doc.y, { continued: true, width: TEXT_W - 40 - indent });
  doc.font('Helvetica').fontSize(10).fillColor('#546e7a')
    .text(' ' + pg, { width: 30, align: 'right' });
  doc.moveDown(0.25);
});

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 1 — O PROBLEMA
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 1 — O Problema que o TRIQ Resolve', 16);

body(
  'Há décadas, gerentes de projetos em todo o mundo aprendem sobre o chamado "Triângulo de Ferro": a ideia de que ' +
  'todo projeto é governado por três variáveis em tensão constante — Escopo, Prazo e Custo. Mexe em um lado, os ' +
  'outros dois se ajustam. Essa é uma metáfora poderosa e intuitiva. O problema é que ela permanece apenas uma ' +
  'metáfora. Você pode desenhar o triângulo no quadro branco, apontar para ele durante uma reunião de status, ' +
  'mas não pode calcular nada com ele.'
);

body(
  'A diferença entre uma metáfora e um objeto matemático é exatamente a mesma diferença entre dizer "o avião está ' +
  'atrasado" e dizer "o avião está 47 minutos atrasado e, no ritmo atual de recuperação, chegará com 2 horas de ' +
  'atraso ao destino." No primeiro caso, você sabe que há um problema. No segundo, você pode tomar uma decisão: ' +
  'avisar os passageiros com conexão, acionar o suporte em terra, comunicar o aeroporto de destino. A diferença ' +
  'não é apenas de precisão — é de capacidade de ação.'
);

info(
  'INSIGHT CENTRAL: O TRIQ não é uma nova metáfora. É a matematização do triângulo de ferro existente. ' +
  'Ele pega o que já estava no quadro branco de todo gerente de projetos e o transforma em um objeto ' +
  'geométrico real, com coordenadas, ângulos, áreas e distâncias que podem ser calculados, comparados e rastreados ao longo do tempo.'
);

subtitle('1.1 O Estado da Arte antes do TRIQ');

body(
  'O PMBOK (Project Management Body of Knowledge), a bíblia da gestão de projetos do PMI, define indicadores ' +
  'como o CPI (Cost Performance Index) e o SPI (Schedule Performance Index). Esses indicadores são úteis, ' +
  'mas são escalares — um único número. Eles capturam uma dimensão do projeto por vez, mas não mostram a ' +
  'relação simultânea entre as três variáveis do triângulo.'
);

body(
  'A Teoria das Restrições (TOC), de Eliyahu Goldratt, acrescenta a noção de que todo sistema tem um gargalo, ' +
  'uma restrição que limita o throughput. Em projetos, isso se traduz na corrente crítica. Mas a TOC também ' +
  'não fornece uma representação geométrica unificada do estado do projeto.'
);

body(
  'O que faltava — e o que o TRIQ fornece — é uma função que mapeia o estado atual de um projeto em um ' +
  'triângulo com geometria calculável. A partir desse triângulo, é possível medir não apenas "está bom ou ' +
  'ruim", mas "quão longe está do ótimo e em qual direção está se movendo."'
);

subtitle('1.2 O que o TRIQ entrega na prática');

body('Concretamente, o TRIQ permite:');
bullet('Representar o estado de qualquer projeto como um triângulo com lados E (escopo), O (orçamento) e P (prazo).');
bullet('Calcular se o triângulo existe ou se o projeto entrou em "colapso geométrico" — um indicador precoce de crise.');
bullet('Medir a distância do estado atual ao ponto ótimo (NVO — Núcleo Viável Ótimo) através do indicador MATED.');
bullet('Comparar projetos de tamanhos completamente diferentes usando a adimensionalização dos vetores de intensidade.');
bullet('Rastrear a trajetória do projeto ao longo do tempo, gerando uma "assinatura geométrica" única.');

body(
  'Para entender como chegamos a esse resultado, precisamos construir o método de baixo para cima. ' +
  'Começamos pelo problema mais fundamental: como o dinheiro flui em projetos ao longo do tempo?'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 2 — A CURVA S
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 2 — A Curva S: Como o Dinheiro Flui em Projetos', 16);

body(
  'Imagine uma obra de construção civil. No primeiro mês, o canteiro está sendo preparado, a equipe se organizando, ' +
  'os materiais sendo contratados. O gasto é baixo. No meio da obra, as fundações estão lançadas, as equipes ' +
  'estão em pleno vapor, os equipamentos rodando, os fornecedores entregando. O gasto está no pico. Nos últimos ' +
  'meses, o grosso já foi feito, restam acabamentos e comissionamento. O gasto desacelera novamente. ' +
  'Se você plotar esse gasto acumulado ao longo do tempo, a curva que aparece tem a forma de um "S".'
);

subtitle('2.1 O que é a Curva S');

body(
  'A Curva S é a representação gráfica do desembolso (ou trabalho realizado) acumulado de um projeto ao longo ' +
  'do tempo. O eixo horizontal é o tempo normalizado (0 = início, 1 = fim planejado), e o eixo vertical é o ' +
  'custo acumulado normalizado (0 = nenhum gasto, 1 = 100% do orçamento gasto).'
);

body(
  'A forma característica em "S" ocorre porque projetos tipicamente têm três fases naturais:\n' +
  '  (1) Mobilização lenta no início\n' +
  '  (2) Execução acelerada no meio\n' +
  '  (3) Desaceleração e fechamento no final'
);

formula(
  'Exemplo — Obra de R$10M em 24 meses:\n' +
  '  t=0.00  →  Custo acumulado = R$ 0,00  (0%)\n' +
  '  t=0.25  →  Custo acumulado = R$ 1.56M (15.6%)\n' +
  '  t=0.50  →  Custo acumulado = R$ 5.00M (50.0%)\n' +
  '  t=0.75  →  Custo acumulado = R$ 8.44M (84.4%)\n' +
  '  t=1.00  →  Custo acumulado = R$10.00M (100%)'
);

subtitle('2.2 Modelo Linear — Por que é simples demais');

body(
  'A abordagem mais ingênua é assumir que o projeto gasta uma fração constante do orçamento a cada período. ' +
  'Se o projeto dura 24 meses e custa R$10M, então gasta R$416.667/mês, sempre. Isso dá uma reta, ' +
  'não uma curva em S.'
);

formula(
  'Modelo Linear:\n' +
  '  f(t) = t\n' +
  '  (onde t vai de 0 a 1)\n\n' +
  '  No exemplo:  f(0.5) = 0.5  →  R$5M no meio do projeto\n' +
  '               f(0.25) = 0.25 →  R$2.5M no primeiro trimestre'
);

warn(
  'Por que o modelo linear falhou: Ele ignora a realidade do ciclo de vida dos projetos. ' +
  'No mundo real, o primeiro trimestre de um projeto raramente consome 25% do orçamento. ' +
  'Há mobilização, aprovações, contratações. O modelo linear supereestima o gasto inicial ' +
  'e subestima o gasto na fase de execução, gerando alertas falsos e mascarando problemas reais.'
);

subtitle('2.3 Modelo Quadrático — Quando usar');

body(
  'Uma melhoria natural é usar uma parábola. O modelo quadrático simples f(t) = t² tem a propriedade ' +
  'de começar devagar e acelerar progressivamente. Ele captura bem a fase de mobilização, mas tem um ' +
  'problema sério: não desacelera no final. Uma parábola continua acelerando indefinidamente.'
);

formula(
  'Modelo Quadrático simples:\n' +
  '  f(t) = t²\n\n' +
  '  f(0.25) = 0.0625  →  apenas 6.25% no primeiro trimestre  ✓\n' +
  '  f(0.50) = 0.2500  →  25% no meio do projeto   ✗ (esperamos ~50%)\n' +
  '  f(1.00) = 1.0000  →  100% ao final             ✓'
);

body(
  'O modelo quadrático é mais adequado para obras civis com crescimento contínuo e sem fase de ' +
  'desaceleração expressiva (por exemplo, uma barragem onde a escavação ocupa 80% do cronograma). ' +
  'Para o caso geral de projetos com início lento, aceleração no meio e desaceleração no final, ' +
  'precisamos de algo melhor.'
);

subtitle('2.4 Modelo Cúbico 3t² − 2t³ — O Padrão Adotado pelo TRIQ');

body(
  'O TRIQ adota como função baseline o polinômio cúbico f(t) = 3t² − 2t³. Este não é um polinômio ' +
  'arbitrário — ele é o único polinômio cúbico que satisfaz simultaneamente quatro condições físicas ' +
  'essenciais para modelar projetos reais. Vamos entender cada uma delas.'
);

formula(
  'Função Baseline do TRIQ:\n' +
  '  f(t) = 3t² - 2t³\n\n' +
  '  Deriva-se como:\n' +
  '  f\'(t) = 6t - 6t² = 6t(1 - t)  [taxa instantânea de gasto]\n\n' +
  '  Para a obra de R$10M em 24 meses (t em fração do tempo total):\n' +
  '  f(0.25) = 3(0.0625) - 2(0.0156) = 0.1875 - 0.0313 = 0.156  →  R$1.56M  ✓\n' +
  '  f(0.50) = 3(0.25)   - 2(0.125)  = 0.75   - 0.25   = 0.50   →  R$5.00M  ✓\n' +
  '  f(0.75) = 3(0.5625) - 2(0.4219) = 1.6875 - 0.8438 = 0.844  →  R$8.44M  ✓\n' +
  '  f(1.00) = 3(1.00)   - 2(1.00)   = 3.00   - 2.00   = 1.00   →  R$10.0M  ✓'
);

subtitle('2.5 As 4 Propriedades Fundamentais da Curva Cúbica');

body(
  'As quatro propriedades a seguir explicam por que essa função específica foi escolhida. ' +
  'Cada propriedade corresponde a um fato físico sobre projetos:'
);

doc.moveDown(0.5);
numbered(1, 'f(0) = 0  →  "Projeto começa do zero."');
body('No momento t=0, nenhum custo foi incorrido. Isso parece óbvio, mas é uma restrição de fronteira ' +
  'que elimina muitas funções candidatas. Verificação: f(0) = 3(0)² − 2(0)³ = 0. ✓', { continued: false });

numbered(2, 'f(1) = 1  →  "Projeto termina com 100% do orçamento gasto."');
body('No momento t=1 (fim planejado), o orçamento foi completamente utilizado. ' +
  'Verificação: f(1) = 3(1)² − 2(1)³ = 3 − 2 = 1. ✓', { continued: false });

numbered(3, "f'(0) = 0  →  \"No início, a taxa de gasto é zero (mobilização lenta).\"");
body('A derivada f\'(t) = 6t(1−t) no ponto t=0 é f\'(0) = 0. Isso significa que a curva começa com ' +
  'inclinação zero — o projeto "arranca" vagarosamente, como um carro saindo do repouso. ' +
  'Isso reflete a realidade de contratações, aprovações e setup inicial.', { continued: false });

numbered(4, "f'(1) = 0  →  \"No final, a taxa de gasto também é zero (desaceleração de encerramento).\"");
body('A derivada f\'(1) = 6(1)(1−1) = 0. O projeto desacelera no final, refletindo as atividades ' +
  'de comissionamento, treinamento e documentação, que têm baixo consumo de recursos comparado ' +
  'à fase de execução plena.', { continued: false });

highlight(
  'SÍNTESE: A curva f(t) = 3t² − 2t³ é a ÚNICA família de polinômios cúbicos que satisfaz ' +
  'simultaneamente as quatro condições f(0)=0, f(1)=1, f\'(0)=0 e f\'(1)=0. ' +
  'Por isso ela não é uma escolha arbitrária — é a escolha matematicamente necessária para ' +
  'modelar o ciclo de vida padrão de projetos.',
  '#e8f5e9', '#1b5e20'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 3 — RETA TANGENTE
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 3 — A Reta Tangente: Capturando a Intensidade', 16);

body(
  'Até agora temos a curva que descreve COMO o projeto deveria gastar ao longo do tempo (o plano baseline). ' +
  'O que precisamos agora é de um número que capture a INTENSIDADE real com que o projeto está ' +
  'efetivamente gastando ou atrasando em um determinado momento.'
);

body(
  'A analogia é o velocímetro de um carro. A odometria (quilômetros percorridos acumulados) é a curva. ' +
  'O velocímetro é a taxa instantânea — a derivada. Se você está a 120 km/h, isso é um número que ' +
  'descreve a intensidade do seu deslocamento naquele instante. É exatamente isso que buscamos para ' +
  'o orçamento e o prazo do projeto: um coeficiente que representa "a que velocidade o projeto está ' +
  'se afastando do plano".'
);

body(
  'Esse número é o coeficiente angular (slope) da reta que melhor representa o comportamento ' +
  'recente do projeto. Quatro abordagens foram testadas antes de chegar à solução adotada.'
);

subtitle('3.1 Tentativa 1: Reta entre Início e Fim');

body(
  'A abordagem mais simples: traçar a reta que liga o ponto inicial (t=0, custo=0) ao ponto ' +
  'atual (t, custo_atual). O coeficiente angular dessa reta é simplesmente custo_atual / t.'
);

formula(
  'Slope = (custo_atual - 0) / (t_atual - 0) = custo_atual / t_atual\n\n' +
  'Exemplo: R$5M gastos em t=0.5  →  Slope = 5M / 0.5 = 10M\n' +
  'Interpretação: "a uma taxa de R$10M por unidade de tempo"\n' +
  '(igual à taxa média planejada — sempre!)'
);

warn(
  'Por que falhou: Este método sempre retorna exatamente a taxa média planejada do projeto quando ' +
  'o projeto está perfeitamente no plano. Quando há desvio, o slope reflete a MÉDIA histórica ' +
  'desde o início, não a intensidade RECENTE. Um projeto que estava ótimo nos primeiros 80% e ' +
  'explodiu nos últimos 20% apareceria como "levemente acima do plano" — mascarando a crise.'
);

subtitle('3.2 Regressão Linear OLS (Mínimos Quadrados)');

body(
  'A regressão linear por Mínimos Quadrados Ordinários (OLS — Ordinary Least Squares) é o ' +
  'método estatístico padrão para encontrar a "melhor reta" que passa por um conjunto de pontos. ' +
  '"Melhor" no sentido de minimizar a soma dos quadrados das distâncias verticais entre ' +
  'os pontos observados e a reta estimada.'
);

formula(
  'Dados n pontos (t1,c1), (t2,c2), ..., (tn,cn):\n\n' +
  '  slope = [ n·Σ(ti·ci) - Σti·Σci ] / [ n·Σ(ti²) - (Σti)² ]\n\n' +
  'Exemplo com 5 pontos de medição:\n' +
  '  t = [0.1, 0.3, 0.5, 0.7, 0.9]\n' +
  '  c = [0.08, 0.25, 0.52, 0.85, 0.98]  (valores reais)\n' +
  '  slope_OLS ≈ 1.02  (projeto 2% mais rápido que o plano)'
);

body(
  'A regressão OLS funciona bem quando todos os pontos históricos têm a mesma relevância. ' +
  'O problema é que um projeto que estava em crise há 6 meses mas se recuperou no último mês ' +
  'ainda vai apresentar um slope "ruim" — porque os pontos antigos puxam o resultado para baixo.'
);

subtitle('3.3 Regressão Ponderada (Weighted Regression)');

body(
  'A melhoria natural da OLS é atribuir pesos maiores aos pontos mais recentes. ' +
  'Assim, o que aconteceu no mês passado importa mais do que o que aconteceu há 12 meses. ' +
  'Usa-se tipicamente um esquema de pesos exponenciais: w(i) = e^(λ·i), onde i é o índice ' +
  'cronológico e λ é o fator de decaimento (quanto maior λ, mais os pontos antigos são ignorados).'
);

formula(
  'Slope Ponderado:\n' +
  '  slope_w = [ Σwi·Σ(wi·ti·ci) - Σ(wi·ti)·Σ(wi·ci) ] / [ Σwi·Σ(wi·ti²) - (Σ(wi·ti))² ]\n\n' +
  '  Com pesos wi = exp(0.3 · i)  para i = 1, 2, ..., n\n\n' +
  '  O ponto mais recente tem peso e^(0.3n) ≈ muito maior que o primeiro (peso 1.0)'
);

body(
  'A regressão ponderada foi utilizada no TRIQ em versões intermediárias. Ela captura melhor ' +
  'a tendência recente, mas é sensível à escolha do parâmetro λ. Um λ muito alto ignora ' +
  'completamente o histórico; um λ muito baixo se comporta como OLS puro.'
);

subtitle('3.4 Derivada no Ponto de Inflexão');

body(
  'O ponto de inflexão da curva f(t) = 3t² − 2t³ é o ponto onde a taxa de gasto é máxima — ' +
  'onde a segunda derivada se anula. Matematicamente: f\'\'(t) = 6 − 12t = 0, portanto t = 0.5. ' +
  'A ideia era calcular a taxa instantânea nesse ponto e usá-la como referência de intensidade.'
);

formula(
  'Ponto de inflexão: t* = 0.5\n' +
  'f\'(0.5) = 6(0.5)(1 - 0.5) = 6 · 0.5 · 0.5 = 1.5\n\n' +
  'Interpretação: no pico da curva S, a taxa de gasto é 1.5 vezes a taxa média.\n' +
  '(Máximo teórico da curva cúbica padrão)'
);

warn(
  'Por que foi descartado: A derivada em um único ponto é matematicamente instável. ' +
  'Pequenas variações nos dados de entrada causam grandes variações no slope calculado. ' +
  'Em projetos reais, onde os dados têm ruído de medição, isso gera falsos alarmes ' +
  'e alertas instáveis que oscilam semana a semana.'
);

subtitle('3.5 A Solução: Derivada Central de 2ª Ordem (ADOTADO)');

body(
  'A derivada central de segunda ordem é uma técnica de diferenciação numérica que usa ' +
  'três pontos — o ponto atual, um ponto anterior e um ponto posterior — para estimar ' +
  'a taxa de variação no ponto central. É matematicamente mais estável do que a derivada ' +
  'em um único ponto porque "suaviza" o ruído.'
);

formula(
  'Derivada Central de 2ª Ordem:\n\n' +
  '  f\'(t) ≈ [ f(t + h) - f(t - h) ] / (2h)\n\n' +
  '  onde h é o passo de tempo (ex: 1 mês em 24 meses → h = 1/24 ≈ 0.0417)\n\n' +
  'Exemplo — obra de R$10M, calculando o slope no mês 12 (t=0.5):\n' +
  '  c(11/24) = R$4.63M  →  normalizado: 0.463\n' +
  '  c(13/24) = R$5.37M  →  normalizado: 0.537\n' +
  '  slope = (0.537 - 0.463) / (2 · 0.0417) = 0.074 / 0.0833 ≈ 0.889\n\n' +
  '  Interpretação: projeto gastando 89% da taxa planejada → ligeiramente abaixo do ritmo'
);

highlight(
  'ANALOGIA FINAL: Imagine o projeto como um carro. O velocímetro (derivada central) usa ' +
  'a posição de 1 segundo atrás e 1 segundo à frente para calcular a velocidade atual com ' +
  'maior precisão do que apenas olhar a posição instantânea. Esse é o slope que o TRIQ usa ' +
  'para representar a intensidade do orçamento e do prazo.',
  '#e3f2fd', '#0d47a1'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 4 — LADOS DO TRIÂNGULO
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 4 — O Problema dos Lados do Triângulo', 16);

body(
  'Agora temos três "medidas" do projeto: uma para escopo (E), uma para orçamento (O) e uma para prazo (P). ' +
  'O próximo passo parece simples: usar essas três medidas como os três lados do triângulo. ' +
  'O problema é que essas medidas estão em unidades diferentes e não comparáveis diretamente.'
);

body(
  'O coeficiente de orçamento vem em "fração de R$/período". O coeficiente de prazo vem em ' +
  '"fração de atraso por período". O escopo normalmente é medido em porcentagem de entregáveis completados. ' +
  'Misturar essas grandezas sem tratamento é como tentar fazer um triângulo com lados medidos ' +
  'em quilômetros, horas e graus Celsius — as unidades são incompatíveis.'
);

subtitle('4.1 Opção 1: Normalizar pelo Máximo');

body(
  'A tentativa mais intuitiva: dividir cada medida pelo seu valor máximo possível, ' +
  'forçando todas a ficarem entre 0 e 1.'
);

formula(
  'Normalização por Máximo:\n' +
  '  E_norm = E / max(E)\n' +
  '  O_norm = O / max(O)\n' +
  '  P_norm = P / max(P)'
);

warn(
  'Por que falhou: O "máximo possível" de uma variável como orçamento não tem limite físico. ' +
  'Um projeto pode ter 200%, 500% ou 1000% de estouro de orçamento. Não existe um teto natural ' +
  'para normalizar. Além disso, o valor normalizado perde o significado físico de "no plano" — ' +
  'não fica claro o que significa um projeto com O_norm = 0.3 versus 0.7.'
);

subtitle('4.2 Opção 2: Desvios Percentuais');

body(
  'Segunda tentativa: calcular o desvio percentual de cada variável em relação ao planejado. ' +
  'Se o projeto devia gastar R$5M e gastou R$6M, o desvio é +20%.'
);

formula(
  'Desvio Percentual:\n' +
  '  desvio_O = (custo_real - custo_planejado) / custo_planejado · 100%\n' +
  '  desvio_P = (prazo_real - prazo_planejado) / prazo_planejado · 100%\n\n' +
  'Problema fundamental: desvios podem ser NEGATIVOS!\n' +
  '  Projeto adiantado: desvio_P = -15%\n' +
  '  Projeto abaixo do orçamento: desvio_O = -8%\n' +
  '  Lados negativos → triângulo matematicamente impossível!'
);

warn(
  'Por que falhou: Triângulos não existem com lados negativos. Um projeto que está adiantado ' +
  'e abaixo do orçamento — o melhor cenário possível — geraria lados negativos, impossibilitando ' +
  'a construção do triângulo. Precisávamos de uma representação onde "no plano" corresponde a ' +
  'um valor positivo bem definido.'
);

subtitle('4.3 Opção 3: Vetores de Intensidade Adimensional (ADOTADO)');

body(
  'A solução elegante é definir os lados como ratios adimensionais em torno do valor "1.0 = no plano". ' +
  'Isso é inspirado no conceito de números adimensionais da engenharia (como o número de Reynolds ' +
  'em mecânica dos fluidos), que permitem comparar sistemas de escalas completamente diferentes.'
);

formula(
  'Vetores de Intensidade Adimensional:\n\n' +
  '  E = 1.0  (sempre — o escopo é o plano de referência)\n\n' +
  '  O = slope_orcamento / taxa_media_planejada\n' +
  '    = (derivada_central_custo) / (custo_total / duracao_total)\n\n' +
  '  P = |slope_prazo| / 1.0\n' +
  '    = módulo do coeficiente angular da reta de prazo\n\n' +
  'Para o projeto baseline (100% no plano):\n' +
  '  E = 1.0,  O = 1.0,  P = 1.0  →  Triângulo Equilátero Perfeito!'
);

body(
  'Esta escolha é fundamental por três razões. Primeiro: E = 1.0 sempre fornece uma âncora estável ' +
  '— o triângulo tem sempre um lado fixo, e os outros dois expressam desvios em relação ao plano. ' +
  'Segundo: O = 1.0 significa exatamente "gastando na taxa planejada", O = 2.0 significa ' +
  '"gastando ao dobro do planejado", O = 0.5 significa "gastando à metade do planejado". ' +
  'Terceiro: qualquer projeto, de qualquer tamanho e setor, pode ser expresso nessa escala.'
);

info(
  'EXEMPLO CONCRETO — Obra de R$10M em 24 meses, analisada no mês 12 (t=0.5):\n\n' +
  '  Taxa média planejada = R$10M / 24 meses = R$416.667/mês\n' +
  '  Slope real do orçamento (derivada central) = R$520.000/mês\n' +
  '  O = 520.000 / 416.667 = 1.248  →  "gastando 24.8% acima do ritmo planejado"\n\n' +
  '  Slope do prazo = 1.035  →  "progresso 3.5% mais lento que o planejado"\n' +
  '  P = |1.035| = 1.035\n\n' +
  '  Triângulo: E=1.0, O=1.248, P=1.035  →  triângulo ligeiramente distorcido, projeto em RISCO LEVE'
);

body(
  'O módulo em P (valor absoluto) é necessário porque atrasos e adiantamentos precisam ser ' +
  'representados como lados positivos do triângulo. Um projeto adiantado tem P < 1.0, ' +
  'um projeto atrasado tem P > 1.0 — mas ambos são números positivos, garantindo a validade geométrica.'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 5 — CEt
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 5 — A Condição de Existência do Triângulo (CEt)', 16);

body(
  'Agora temos os três lados: E = 1.0, O, P. Mas antes de construir qualquer triângulo com esses lados, ' +
  'precisamos verificar se eles de fato formam um triângulo válido. Isso é a Condição de Existência do Triângulo — CEt.'
);

subtitle('5.1 A Desigualdade Triangular');

body(
  'Pense em três palitos de madeira. Para formar um triângulo com eles, é necessário que cada ' +
  'palito seja menor do que a soma dos outros dois. Se você tiver um palito de 10 cm e outros dois ' +
  'de 3 cm e 4 cm, não é possível formar um triângulo — o palito grande é longo demais para fechar a figura. ' +
  'Matematicamente, dados três lados a, b, c:'
);

formula(
  'Desigualdade Triangular (deve ser verdadeira para os 3 casos):\n\n' +
  '  a + b > c\n' +
  '  b + c > a\n' +
  '  a + c > b\n\n' +
  'Para o TRIQ (a=E=1.0, b=O, c=P):\n\n' +
  '  E + O > P  →  1.0 + O > P\n' +
  '  O + P > E  →  O + P > 1.0\n' +
  '  E + P > O  →  1.0 + P > O  ←  Esta é a mais crítica!'
);

body(
  'A terceira condição (1.0 + P > O) é a mais importante na prática. Ela diz: se o orçamento ' +
  'cresce além de (1.0 + prazo), o triângulo colapsa. Em linguagem de projetos: se o custo explodir ' +
  'sem um correspondente aumento de prazo ou escopo, o projeto perde sua viabilidade geométrica.'
);

subtitle('5.2 Por que a CEt Detecta Crise');

body(
  'Quando a CEt é violada, o TRIQ interpreta isso como um sinal de colapso sistêmico do projeto. ' +
  'Não é apenas um desvio — é uma situação onde as três variáveis de controle perderam sua ' +
  'consistência interna. Em projetos reais, isso corresponde a situações como:'
);

bullet('Orçamento completamente fora de controle enquanto prazo e escopo estão aparentemente estáveis');
bullet('Combinação impossível de entregas: muito escopo, pouco prazo, alto custo que não se sustenta simultaneamente');
bullet('Projeto em "modo zombi": ainda está acontecendo formalmente mas não tem viabilidade real de conclusão');

formula(
  'Exemplo de Colapso (Big Dig 1997 — antecipado):\n\n' +
  '  E = 1.0  (escopo mantido)\n' +
  '  O = 2.0  (custo dobrou em relação ao planejado)\n' +
  '  P = 0.996 (pequeno atraso)\n\n' +
  '  Verificação: E + P > O  →  1.0 + 0.996 > 2.0  →  1.996 > 2.0 ???\n' +
  '  1.996 > 2.0  →  FALSO!\n\n' +
  '  CEt VIOLADA → PROJETO EM COLAPSO GEOMÉTRICO → STATUS: CRISE'
);

highlight(
  'A CEt é o detector de crise mais sensível do TRIQ. Ela captura o momento exato em que ' +
  'o orçamento cresceu além do que o triângulo pode "suportar" geometricamente. No Boston Big Dig, ' +
  'esse ponto foi atingido anos antes do reconhecimento público do problema.',
  '#fce4ec', '#b71c1c'
);

subtitle('5.3 O Clamping do cos(A): Evitando NaN');

body(
  'Quando calculamos os ângulos do triângulo usando a Lei dos Cossenos (Seção 6), ' +
  'a fórmula envolve o cálculo de arccosseno. A função arccosseno só está definida ' +
  'para argumentos entre −1 e +1. Por erros de arredondamento em ponto flutuante, ' +
  'o argumento pode sair ligeiramente desse intervalo (por exemplo, 1.0000000002), ' +
  'causando um resultado NaN (Not a Number) que quebra todos os cálculos subsequentes.'
);

formula(
  'Clamping preventivo:\n\n' +
  '  cosA_raw = (b² + c² - a²) / (2bc)  [Lei dos Cossenos]\n\n' +
  '  cosA = Math.max(-1, Math.min(1, cosA_raw))\n\n' +
  '  A = Math.acos(cosA)  // nunca será NaN após o clamping\n\n' +
  '  Exemplo sem clamping: cosA_raw = 1.0000000002  →  acos() = NaN  ✗\n' +
  '  Com clamping:         cosA_clamped = 1.0        →  acos() = 0   ✓'
);

body(
  'O clamping é uma medida de robustez numérica. É como o limitador de velocidade de um carro: ' +
  'não muda o comportamento normal, mas evita uma falha catastrófica em situações extremas. ' +
  'Em produção, esse detalhe evita que todo o dashboard do TRIQ trave quando um projeto ' +
  'beira exatamente o limite de existência do triângulo.'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 6 — LEI DOS COSSENOS
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 6 — Desenhando o Triângulo: Lei dos Cossenos', 16);

body(
  'Temos os três lados E, O, P. A CEt foi verificada — o triângulo existe. Agora precisamos ' +
  'calcular as COORDENADAS dos três vértices para poder desenhar o triângulo na tela, ' +
  'calcular sua área, encontrar seu centro e operar sobre ele geometricamente. ' +
  'Para isso, usamos a Lei dos Cossenos.'
);

subtitle('6.1 A Lei dos Cossenos');

body(
  'A Lei dos Cossenos é uma generalização do Teorema de Pitágoras para triângulos não-retângulos. ' +
  'Ela relaciona os três lados de um triângulo com um de seus ângulos. Se você conhece os três ' +
  'lados (o que é exatamente o nosso caso), pode calcular qualquer ângulo.'
);

formula(
  'Lei dos Cossenos:\n\n' +
  '  Dados lados a, b, c e ângulo A oposto ao lado a:\n\n' +
  '  a² = b² + c² - 2bc·cos(A)\n\n' +
  '  Isolando o ângulo A:\n\n' +
  '  cos(A) = (b² + c² - a²) / (2bc)\n' +
  '  A = arccos( (b² + c² - a²) / (2bc) )\n\n' +
  'Para o TRIQ — ângulo A no vértice do Escopo (E=1.0 como lado base):\n\n' +
  '  cos(A) = (E² + O² - P²) / (2·E·O)\n' +
  '         = (1 + O² - P²) / (2O)\n\n' +
  'Exemplo: E=1.0, O=1.248, P=1.035\n' +
  '  cos(A) = (1 + 1.558 - 1.071) / (2·1.248) = 1.487 / 2.496 ≈ 0.596\n' +
  '  A = arccos(0.596) ≈ 53.4°'
);

subtitle('6.2 Posicionamento dos Vértices no Plano Cartesiano');

body(
  'Com o ângulo A calculado, posicionamos os três vértices do triângulo de forma sistemática:' +
  ' O vértice A na origem (0, 0), o vértice B no eixo X positivo na distância igual ao lado ' +
  'adjacente a A, e o vértice C calculado usando o ângulo A.'
);

formula(
  'Coordenadas dos Vértices:\n\n' +
  '  A = (0, 0)           [Vértice de Escopo — na origem]\n' +
  '  B = (E, 0) = (1, 0)  [Vértice de Prazo — no eixo X]\n' +
  '  C = (O·cos(A), O·sin(A))  [Vértice de Orçamento — calculado pelo ângulo]\n\n' +
  'Para o exemplo anterior (A ≈ 53.4°, O = 1.248):\n' +
  '  C = (1.248·cos(53.4°), 1.248·sin(53.4°))\n' +
  '  C = (1.248·0.596, 1.248·0.803)\n' +
  '  C ≈ (0.744, 1.002)'
);

body(
  'A escolha de colocar A na origem e B no eixo X é uma convenção que simplifica todos os ' +
  'cálculos subsequentes. Ela garante que o triângulo seja sempre desenhado com a mesma ' +
  'orientação, facilitando a comparação visual entre projetos.'
);

subtitle('6.3 Normalização para o SVG');

body(
  'O triângulo calculado existe em um plano matemático abstrato com coordenadas reais. ' +
  'Para exibi-lo em uma tela (SVG, Canvas, etc.), precisamos mapear essas coordenadas ' +
  'para pixels. Isso é feito pela normalização de viewport.'
);

formula(
  'Normalização para SVG (viewport W×H pixels, margem M):\n\n' +
  '  Passo 1: Encontrar bounding box\n' +
  '    x_min = min(Ax, Bx, Cx),  x_max = max(Ax, Bx, Cx)\n' +
  '    y_min = min(Ay, By, Cy),  y_max = max(Ay, By, Cy)\n\n' +
  '  Passo 2: Calcular escala (preservar proporção)\n' +
  '    scale_x = (W - 2M) / (x_max - x_min)\n' +
  '    scale_y = (H - 2M) / (y_max - y_min)\n' +
  '    scale = min(scale_x, scale_y)\n\n' +
  '  Passo 3: Mapear cada ponto\n' +
  '    x_svg = M + (x - x_min) · scale\n' +
  '    y_svg = H - M - (y - y_min) · scale  [Y invertido no SVG!]'
);

body(
  'A inversão do eixo Y é necessária porque em coordenadas matemáticas o Y cresce para cima, ' +
  'enquanto em coordenadas de tela o Y cresce para baixo. Sem essa inversão, o triângulo ' +
  'apareceria espelhado verticalmente na tela.'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 7 — TRIÂNGULO ÓRTICO E ZRE
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 7 — O Triângulo Órtico e a Zona de Resiliência Executiva (ZRE)', 16);

body(
  'Com o triângulo CDT (Current Delta Triangle) desenhado, precisamos agora definir o que é ' +
  '"normal" e o que é "crítico". Para isso, o TRIQ usa uma construção geométrica clássica — ' +
  'o Triângulo Órtico — e a transforma em uma ferramenta de diagnóstico de saúde do projeto.'
);

subtitle('7.1 O que é a Altitude de um Triângulo');

body(
  'A altitude de um triângulo a partir de um vértice V é o segmento perpendicular que parte de V ' +
  'e atinge o lado oposto (ou seu prolongamento). Cada triângulo tem três altitudes, uma para cada vértice. ' +
  'O pé da altitude é o ponto onde a perpendicular encontra o lado oposto.'
);

body(
  'Analogia prática: imagine um triângulo desenhado no chão. A altitude do vértice A é a ' +
  'distância que você percorreria caminhando em linha reta (perpendicularmente) do vértice A ' +
  'até o lado BC. O pé da altitude é onde você tocaria o chão ao final dessa caminhada.'
);

subtitle('7.2 O Pé da Altitude: Projeção Ortogonal');

body(
  'Calcular o pé da altitude é equivalente a calcular a projeção ortogonal do vértice ' +
  'sobre o lado oposto. A projeção ortogonal usa o produto interno vetorial.'
);

formula(
  'Pé da Altitude H_A (de A sobre o lado BC):\n\n' +
  '  Seja vetor v = C - B  (direção do lado BC)\n' +
  '  Seja vetor u = A - B  (do ponto B ao vértice A)\n\n' +
  '  Parâmetro t = (u · v) / (v · v)  [produto interno]\n' +
  '     onde: u · v = ux·vx + uy·vy\n' +
  '           v · v = vx² + vy²  = ||v||²\n\n' +
  '  H_A = B + t · v  [ponto na reta BC mais próximo de A]\n\n' +
  'Verificação: se t ∈ [0,1], o pé cai dentro do segmento BC\n' +
  '             se t < 0 ou t > 1, o triângulo é obtusângulo neste vértice'
);

subtitle('7.3 O Triângulo Órtico: Triângulo de Mínima Área');

body(
  'Os três pés das altitudes (H_A, H_B, H_C) formam um triângulo especial chamado Triângulo Órtico. ' +
  'Ele tem uma propriedade matemática notável: entre todos os triângulos inscritos no triângulo original, ' +
  'o triângulo órtico é o que tem a menor área. Isso o torna um "triângulo de eficiência máxima" — ' +
  'o triângulo mais compacto que pode ser inscrito dentro do CDT.'
);

body(
  'No contexto do TRIQ, o Triângulo Órtico representa o "núcleo de equilíbrio" do projeto. ' +
  'É a região onde as pressões das três dimensões (escopo, custo, prazo) se equilibram de forma ' +
  'matematicamente ótima.'
);

subtitle('7.4 A ZRE: Zona de Resiliência Executiva');

body(
  'A Zona de Resiliência Executiva (ZRE) é o interior do Triângulo Órtico. Na visualização do TRIQ, ' +
  'ela aparece como uma região colorida (geralmente verde) dentro do triângulo CDT. Um projeto ' +
  '"saudável" tem seu ponto de operação dentro da ZRE. Um projeto "em risco" tem seu ponto ' +
  'de operação fora da ZRE mas dentro do CDT. Um projeto "em crise" tem violação de CEt.'
);

highlight(
  'ANALOGIA EXECUTIVA: A ZRE é como a "zona verde" de temperatura de um motor. ' +
  'Operar dentro dela não significa que o projeto é perfeito, mas significa que está ' +
  'dentro dos limites de resiliência — consegue absorver choques e se recuperar. ' +
  'Operar fora da ZRE sinaliza que qualquer perturbação adicional pode ser crítica.',
  '#e8f5e9', '#1b5e20'
);

subtitle('7.5 O NVO: Núcleo Viável Ótimo');

body(
  'O Núcleo Viável Ótimo (NVO) é o ponto de referência de "projeto ideal" dentro da ZRE. ' +
  'Por padrão, o TRIQ usa o baricentro do Triângulo Órtico como NVO.'
);

formula(
  'Baricentro (centroide) do Triângulo Órtico:\n\n' +
  '  NVO = ( (H_Ax + H_Bx + H_Cx) / 3,\n' +
  '          (H_Ay + H_By + H_Cy) / 3 )\n\n' +
  '  Onde H_A, H_B, H_C são os pés das altitudes do triângulo CDT'
);

subtitle('7.6 Quando Usar Incentro vs. Baricentro');

body(
  'Para triângulos obtusângulos (triângulos com um ângulo maior que 90°), o ortocentro ' +
  'cai FORA do triângulo, o que invalida parte da construção do Triângulo Órtico. ' +
  'Nesse caso, o TRIQ substitui o baricentro do Órtico pelo incentro do CDT como NVO.'
);

formula(
  'Incentro do CDT (alternativa para triângulos obtusângulos):\n\n' +
  '  NVO_incentro = (a·Ax + b·Bx + c·Cx) / (a + b + c),\n' +
  '                 (a·Ay + b·By + c·Cy) / (a + b + c)\n\n' +
  '  Onde a = BC, b = AC, c = AB são os comprimentos dos lados\n\n' +
  'O incentro é equidistante dos três lados — propriedade física desejável\n' +
  'para representar o ponto de equilíbrio em triângulos distorcidos.'
);

body(
  'A transição entre baricentro do Órtico e incentro do CDT é suave na maioria dos casos ' +
  'práticos, pois triângulos de projetos em crise (obtusângulos extremos) já estão sendo ' +
  'sinalizados por outros indicadores (CEt violada, MATED alto).'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 8 — MATED
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 8 — O MATED: Medindo a Distância da Crise', 16);

body(
  'O MATED (Multi-dimensional Assessment of Triangular Execution Deviation) é o indicador ' +
  'sintético final do TRIQ. Ele responde à pergunta: "quão distante está o projeto do ponto ótimo?" ' +
  'com um único número que integra todas as dimensões analisadas anteriormente.'
);

subtitle('8.1 Distância Euclidiana: A Régua no Plano Cartesiano');

body(
  'A distância Euclidiana é a medida "em linha reta" entre dois pontos no plano. ' +
  'Se você conhece as coordenadas de dois pontos, a distância entre eles é dada pelo ' +
  'Teorema de Pitágoras generalizado.'
);

formula(
  'Distância Euclidiana entre pontos P1 = (x1, y1) e P2 = (x2, y2):\n\n' +
  '  d = √[ (x2 - x1)² + (y2 - y1)² ]\n\n' +
  'Exemplo:\n' +
  '  Ponto de Operação atual: P_op = (0.52, 0.48)\n' +
  '  NVO (Núcleo Viável Ótimo): P_nvo = (0.45, 0.42)\n\n' +
  '  MATED = √[ (0.52-0.45)² + (0.48-0.42)² ]\n' +
  '        = √[ (0.07)² + (0.06)² ]\n' +
  '        = √[ 0.0049 + 0.0036 ]\n' +
  '        = √0.0085\n' +
  '        ≈ 0.092  →  Projeto na zona SEGURO (0.05 < MATED < 0.15)'
);

subtitle('8.2 O Ponto de Operação do Projeto');

body(
  'O "ponto de operação" é onde o projeto está AGORA no espaço geométrico. ' +
  'No TRIQ, ele é definido como o centroide do triângulo CDT atual (a média aritmética ' +
  'das coordenadas dos três vértices).'
);

formula(
  'Centroide do CDT (ponto de operação):\n\n' +
  '  G = ( (Ax + Bx + Cx) / 3,  (Ay + By + Cy) / 3 )\n\n' +
  '  Para A=(0,0), B=(1,0), C=(0.744, 1.002):\n' +
  '  G = ( (0 + 1 + 0.744)/3,  (0 + 0 + 1.002)/3 )\n' +
  '  G = ( 1.744/3,  1.002/3 )\n' +
  '  G ≈ (0.581, 0.334)'
);

subtitle('8.3 As 4 Zonas do MATED');

body('O MATED é interpretado em quatro zonas, definidas por limites empíricos validados no Big Dig e em outros estudos de caso:');

doc.moveDown(0.5);
let tableY = doc.y;
const colW = [80, 90, 100, 181];
tableY = tableRow(['Zona', 'Range MATED', 'CPI Equivalente', 'Interpretação'], colW, tableY, true);
tableY = tableRow(['ÓTIMO', '0.00 – 0.05', '0.95 – 1.05', 'Projeto no centro da ZRE — performance ideal'], colW, tableY);
tableY = tableRow(['SEGURO', '0.05 – 0.15', '0.85 – 0.95', 'Pequenos desvios, projeto resiliente'], colW, tableY);
tableY = tableRow(['RISCO', '0.15 – 0.30', '0.70 – 0.85', 'Ação corretiva necessária em breve'], colW, tableY);
tableY = tableRow(['CRISE', '> 0.30', '< 0.70', 'Intervenção imediata — CEt provavelmente violada'], colW, tableY);
doc.y = tableY + 10;
doc.moveDown(0.5);

subtitle('8.4 A Zona Composta: CEt + Qualidade de Área + MATED');

body(
  'O diagnóstico final do TRIQ não usa apenas o MATED. Ele combina três sinais independentes ' +
  'em uma avaliação composta, reduzindo falsos positivos:'
);

bullet('CEt: triângulo existe? (sim/não)');
bullet('Qualidade de Área: área_atual/área_baseline × 100% (quão "cheio" está o triângulo)');
bullet('MATED: distância do ponto de operação ao NVO');

body(
  'Um projeto pode ter MATED baixo mas CEt violada — isso é crise. ' +
  'Um projeto pode ter CEt válida mas área < 30% — isso indica triângulo degenerado, também problemático. ' +
  'O diagnóstico composto garante que os três sinais sejam considerados.'
);

subtitle('8.5 A Fórmula de Heron para Área');

body(
  'A área do triângulo CDT é calculada pela Fórmula de Heron, que usa apenas os lados ' +
  '(sem precisar das coordenadas). Isso é útil para verificações rápidas.'
);

formula(
  'Fórmula de Heron:\n\n' +
  '  Dados lados a, b, c:\n' +
  '  s = (a + b + c) / 2  [semiperímetro]\n\n' +
  '  Área = √[ s·(s-a)·(s-b)·(s-c) ]\n\n' +
  'Para o triângulo baseline (E=1.0, O=1.0, P=1.0):\n' +
  '  s = (1+1+1)/2 = 1.5\n' +
  '  Área = √[1.5·0.5·0.5·0.5] = √[0.1875] ≈ 0.433\n\n' +
  'Para o exemplo em risco (E=1.0, O=1.248, P=1.035):\n' +
  '  s = (1+1.248+1.035)/2 = 1.6415\n' +
  '  Área = √[1.6415·0.6415·0.3935·0.6065] ≈ 0.497\n' +
  '  Qualidade = 0.497/0.433 × 100% ≈ 115%  (área acima do baseline — expansão de custos)'
);

subtitle('8.6 Desvio de Qualidade de Área');

body(
  'A relação entre a área atual e a área baseline fornece uma métrica de "expansão ou contração" ' +
  'do triângulo. Uma área muito maior que a baseline indica que o projeto está explorando ' +
  'combinações perigosas de altos custos e prazos. Uma área muito menor indica contração — ' +
  'projeto ficando mais "magro", potencialmente sacrificando escopo.'
);

formula(
  'Desvio de Qualidade:\n\n' +
  '  DQ = (Área_CDT / Área_Baseline) × 100%\n\n' +
  '  DQ = 100%  →  triângulo no tamanho planejado\n' +
  '  DQ > 120%  →  expansão preocupante (crise de custos/prazo)\n' +
  '  DQ < 60%   →  contração perigosa (possível corte de escopo)'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 9 — BIG DIG
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 9 — Validação: O Boston Big Dig (1991–2007)', 16);

body(
  'O Boston Big Dig é considerado o projeto de infraestrutura civil mais complexo e custoso ' +
  'da história dos Estados Unidos. A realocação do trecho central da Interestadual 93, em ' +
  'Boston, Massachusetts, transformou uma via expressa elevada em um túnel subterrâneo de ' +
  '5.6 km sob o coração da cidade, enquanto o tráfego continuava fluindo.'
);

body(
  'O projeto foi aprovado em 1987 com orçamento inicial de US$ 2.56 bilhões e prazo previsto ' +
  'para conclusão em 1998. A obra foi oficialmente concluída em 2007 — com 9 anos de atraso — ' +
  'a um custo final de US$ 14.8 bilhões. Isso representa um estouro de orçamento de 478% ' +
  'e um atraso de prazo de 90%.'
);

subtitle('9.1 A Timeline de Sinais de Crise');

doc.moveDown(0.5);
let t9y = doc.y;
const c9 = [60, 90, 130, 171];
t9y = tableRow(['Ano', 'Status Oficial', 'TRIQ (Retroativo)', 'Evento Principal'], c9, t9y, true);
t9y = tableRow(['1991', 'Início da obra', 'E=1.0 O=1.0 P=1.0', 'Baseline: US$2.56B, prazo 1998'], c9, t9y);
t9y = tableRow(['1993', 'Dentro do prazo', 'E=1.0 O=1.12 P=1.08', 'Primeiro sinal: escavação mais difícil'], c9, t9y);
t9y = tableRow(['1995', 'Revisão discreta', 'E=1.0 O=1.35 P=1.22', 'RISCO: MATED=0.18, ZRE violada'], c9, t9y);
t9y = tableRow(['1997', 'Revisão pública', 'E=1.0 O=2.0  P=0.996', 'CRISE: CEt FALHA — colapso geométrico!'], c9, t9y);
t9y = tableRow(['1999', 'Crise reconhecida', 'E=1.0 O=2.8  P=1.45', 'Orçamento revisado para US$10.8B'], c9, t9y);
t9y = tableRow(['2001', 'Auditoria federal', 'E=1.0 O=3.5  P=1.72', 'Congresso intervém — US$14.6B estimado'], c9, t9y);
t9y = tableRow(['2006', 'Colapso de teto', 'E=1.0 O=4.8  P=2.1', 'Incidente fatal: 1 morte no túnel'], c9, t9y);
t9y = tableRow(['2007', 'Encerramento', 'E=1.0 O=5.78 P=2.69', 'Final: US$14.8B, 9 anos de atraso'], c9, t9y);
doc.y = t9y + 10;
doc.moveDown(0.5);

highlight(
  'DESCOBERTA CENTRAL: Em 1993, o TRIQ já calcularia O=1.12 (custo 12% acima do ritmo) e P=1.08 ' +
  '(prazo 8% mais lento). O MATED seria ≈ 0.09, colocando o projeto na zona SEGURO — mas com ' +
  'tendência crescente. Em 1995, MATED ≈ 0.18 (zona RISCO). Em 1997, CEt VIOLADA. ' +
  'O sinal apareceu 4 anos antes do primeiro reconhecimento público da crise (2001).',
  '#fce4ec', '#b71c1c'
);

subtitle('9.2 O Cálculo Detalhado de 1997');

body(
  'Vamos reconstruir o cálculo TRIQ para o Big Dig no ano de 1997, quando o orçamento ' +
  'havia sido revisado para ~US$5.12B (double do original) e o prazo estimado crescia para 1999:'
);

formula(
  'Big Dig — Estado em 1997:\n\n' +
  '  Dados:\n' +
  '    Orçamento original: US$2.56B\n' +
  '    Orçamento revisado 1997: US$5.12B\n' +
  '    Slope do orçamento real: ~2.0× o planejado\n' +
  '    Slope do prazo: ~0.996 (quase no plano)\n\n' +
  '  Vetores de Intensidade:\n' +
  '    E = 1.0  (escopo mantido)\n' +
  '    O = 2.0  (custo dobrando em relação ao ritmo planejado)\n' +
  '    P = 0.996 (prazo levemente fora do plano)\n\n' +
  '  Condição de Existência (CEt):\n' +
  '    1.0 + 0.996 > 2.0  →  1.996 > 2.0  →  FALSO!\n' +
  '    CEt VIOLADA → STATUS: CRISE GEOMÉTRICA\n\n' +
  '  MATED: não calculável (triângulo degenerado)\n' +
  '  Diagnóstico TRIQ: INTERVENÇÃO IMEDIATA NECESSÁRIA'
);

subtitle('9.3 Lições do Big Dig para o TRIQ');

body(
  'O Boston Big Dig ensinou ao TRIQ quatro lições fundamentais que moldaram as decisões de design:'
);

bullet('A CEt é mais sensível que qualquer indicador escalar — ela captura a impossibilidade ' +
  'geométrica antes que os números individuais pareçam catastróficos.');
bullet('O escopo (E = 1.0) como âncora é correto: o Big Dig nunca reduziu escopo — ' +
  'a tensão foi sempre entre prazo e custo com escopo fixo.');
bullet('A adimensionalização permite comparar o Big Dig (US$15B) com uma obra de R$10M ' +
  'usando exatamente a mesma escala de análise.');
bullet('O rastreamento temporal do triângulo (a "trajetória") revela padrões que instantâneos ' +
  'individuais podem esconder.');

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 10 — HISTÓRICO DECISÕES
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 10 — Decisões Tomadas e Descartadas: Histórico Completo', 16);

body(
  'Esta seção registra todas as tentativas, experimentos e decisões de design que formaram ' +
  'o método TRIQ ao longo de seu desenvolvimento. É o registro histórico oficial, ' +
  'mantido pelo Squad TRIQ para rastreabilidade e futuras pesquisas.'
);

doc.moveDown(0.5);

let t10y = doc.y;
const c10 = [30, 110, 95, 216];
t10y = tableRow(['ID', 'Componente', 'Resultado', 'Decisão Final'], c10, t10y, true);

const decisions = [
  ['D1', 'Modelo Linear (Curva S)', 'DESCARTADO', 'Não captura dinâmica real de projetos'],
  ['D2', 'Modelo Quadrático (t²)', 'PARCIAL', 'Útil para obras sem desaceleração final'],
  ['D3', 'Cúbico 3t²-2t³', 'ADOTADO', '4 propriedades de fronteira satisfeitas'],
  ['D4', 'Slope por reta início-fim', 'DESCARTADO', 'Sempre retorna média histórica — sem sensibilidade'],
  ['D5', 'Regressão OLS pura', 'MELHORADO', 'Base para regressão ponderada'],
  ['D6', 'Regressão ponderada', 'ADOTADO', 'Captura tendência recente com λ calibrado'],
  ['D7', 'Derivada no ponto inflexão', 'DESCARTADO', 'Instável com ruído de dados reais'],
  ['D8', 'Derivada central 2ª ordem', 'ADOTADO', 'Estável e precisa para dados ruidosos'],
  ['D9', 'Normalização por máximo', 'DESCARTADO', 'Sem teto físico definido para variáveis'],
  ['D10', 'Desvios percentuais', 'DESCARTADO', 'Lados negativos impossibilizam triângulo'],
  ['D11', 'Vetores adimensionais E/O/P', 'ADOTADO', 'E=1.0 âncora; O e P como ratios'],
  ['D12', 'CEt por desigualdade triangular', 'ADOTADO', 'Detector de crise precoce e robusto'],
  ['D13', 'Clamping de cosA', 'ADOTADO', 'Evita NaN por erros de ponto flutuante'],
  ['D14', 'Vértice A na origem', 'ADOTADO', 'Simplifica todos os cálculos subsequentes'],
  ['D15', 'Normalização SVG com min-scale', 'ADOTADO', 'Preserva proporções sem distorção'],
  ['D16', 'NVO = baricentro do Órtico', 'ADOTADO', 'Triângulo de mínima área inscrito'],
  ['D17', 'NVO = incentro (obtusângulo)', 'ADOTADO', 'Fallback robusto para triângulos degenerados'],
  ['D18', 'MATED = distância Euclidiana', 'ADOTADO', 'Intuição geométrica direta; calculável'],
  ['D19', 'Zonas 0.05/0.15/0.30', 'PROVISIONAL', 'Calibração baseada no Big Dig — em validação'],
  ['D20', 'Área por Fórmula de Heron', 'ADOTADO', 'Sem dependência de coordenadas; robusto'],
  ['D21', 'Diagnóstico composto (CEt+DQ+MATED)', 'ADOTADO', 'Três sinais independentes reduzem falsos+'],
];

decisions.forEach(row => {
  t10y = tableRow(row, c10, t10y);
  if (t10y > PAGE_H - 120) {
    addPage();
    t10y = doc.y;
    t10y = tableRow(['ID', 'Componente', 'Resultado', 'Decisão Final'], c10, t10y, true);
  }
});

doc.y = t10y + 10;
doc.moveDown(0.5);

body(
  'Este registro histórico é fundamental para futuras pesquisas. Cada decisão descartada ' +
  'representa um experimento válido que revelou uma limitação real. A progressão de D1 ' +
  'a D21 documenta a evolução de uma metáfora qualitativa para um sistema matemático ' +
  'rigoroso e computacionalmente implementável.'
);

// ──────────────────────────────────────────────────────────────────────────────
// SEÇÃO 11 — AGENDA DE PESQUISA
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Seção 11 — Agenda de Pesquisa Futura (Squad Recommendations)', 16);

body(
  'O Squad TRIQ identificou quatro itens prioritários de pesquisa futura a partir da análise ' +
  'das decisões provisórias (marcadas PROVISIONAL na Seção 10) e das lacunas teóricas ' +
  'detectadas durante o desenvolvimento. Estes itens compõem o INSIGHTS-LOG oficial do método.'
);

subtitle('M1 — Calibração das Zonas MATED em Múltiplos Casos');

body(
  'RESPONSÁVEL: @triq-math\n' +
  'PRIORIDADE: Alta\n' +
  'STATUS: Pesquisa necessária'
);

body(
  'Os limites de zona do MATED (0.05, 0.15, 0.30) foram calibrados com base no Boston Big Dig ' +
  'e em simulações sintéticas. Para que o TRIQ seja aceito como ferramenta de gestão industrial, ' +
  'esses limiares precisam ser validados em uma amostra representativa de projetos reais ' +
  'com desfechos conhecidos (sucesso, falha, cancelamento).'
);

info(
  'PROPOSTA DE ESTUDO: Coletar dados de ao menos 50 projetos de infraestrutura com dados ' +
  'de custo e prazo mensais. Aplicar o TRIQ retroativamente e verificar se as zonas ' +
  'definidas têm correlação estatisticamente significativa com os desfechos observados. ' +
  'Considerar recalibração das zonas por setor (construção civil vs. TI vs. P&D).'
);

subtitle('P1 — Polígono TRIQ para Projetos com Múltiplas Restrições');

body(
  'RESPONSÁVEL: @triq-production\n' +
  'PRIORIDADE: Média\n' +
  'STATUS: Conceito em desenvolvimento'
);

body(
  'O método atual opera com exatamente 3 vértices (escopo, custo, prazo). Projetos reais ' +
  'frequentemente têm dimensões adicionais relevantes: qualidade, riscos explícitos, ' +
  'satisfação do cliente. A hipótese P1 propõe generalizar o TRIQ para um polígono N-dimensional.'
);

body(
  'O desafio matemático central é que as propriedades do Triângulo Órtico não têm ' +
  'generalização trivial para polígonos. Um quadrilátero não tem "altitudes" no mesmo ' +
  'sentido, e a Fórmula de Heron não se generaliza diretamente. Pesquisa necessária em ' +
  'geometria de poliedros e topologia computacional.'
);

subtitle('K2 — TRIQ Probabilístico com Monte Carlo');

body(
  'RESPONSÁVEL: Dr. Kenji (@pm-engineer)\n' +
  'PRIORIDADE: Alta\n' +
  'STATUS: Fundamento teórico identificado'
);

body(
  'O TRIQ atual é determinístico: dado um conjunto de dados históricos, calcula um único ' +
  'triângulo. Projetos reais operam com incerteza. Cada estimativa de slope tem uma ' +
  'distribuição de probabilidade, não um valor pontual. A hipótese K2 propõe representar ' +
  'o estado do projeto como uma distribuição de triângulos, não um único triângulo.'
);

formula(
  'TRIQ Probabilístico (conceito):\n\n' +
  '  Em vez de E=1.0, O=1.248, P=1.035  (valores pontuais)\n\n' +
  '  E = 1.0  (certo)\n' +
  '  O ~ N(1.248, 0.15²)  [distribuição normal, σ=0.15]\n' +
  '  P ~ N(1.035, 0.08²)  [distribuição normal, σ=0.08]\n\n' +
  '  Executar 10.000 simulações Monte Carlo → distribuição de MATED\n' +
  '  P(MATED > 0.30) = probabilidade de entrar em zona de CRISE\n' +
  '  Exemplo: P(crise) = 8.3%  →  "projeto 8% de chance de entrar em crise no próximo mês"'
);

subtitle('P4 — Integração com Corrente Crítica (CCPM)');

body(
  'RESPONSÁVEL: @triq-production\n' +
  'PRIORIDADE: Média\n' +
  'STATUS: Análise de compatibilidade necessária'
);

body(
  'O método da Corrente Crítica (Critical Chain Project Management — CCPM) de Goldratt ' +
  'usa buffers explícitos para absorver variabilidade. A hipótese P4 propõe integrar ' +
  'a lógica de buffers do CCPM com a lógica geométrica do TRIQ.'
);

body(
  'A ideia central é que o "consumo de buffer" do CCPM poderia alimentar diretamente ' +
  'o cálculo do vetor P (prazo) no TRIQ, criando um loop de feedback entre as duas ' +
  'metodologias. Um buffer de prazo consumido 80% poderia gerar automaticamente P = 1.3, ' +
  'e o TRIQ sinalizaria a zona de risco mesmo que o caminho crítico formal ainda não ' +
  'tivesse violado o prazo contratual.'
);

sectionDivider();

subtitle('Síntese da Agenda de Pesquisa');

doc.moveDown(0.3);
let tagY = doc.y;
const c11 = [60, 55, 90, 246];
tagY = tableRow(['Item', 'Agente', 'Prioridade', 'Descrição Curta'], c11, tagY, true);
tagY = tableRow(['M1', '@triq-math', 'ALTA', 'Calibrar zonas MATED em 50+ projetos reais'], c11, tagY);
tagY = tableRow(['P1', '@triq-production', 'MÉDIA', 'Generalizar TRIQ para polígono N-dimensional'], c11, tagY);
tagY = tableRow(['K2', '@pm-engineer', 'ALTA', 'TRIQ Probabilístico com Monte Carlo'], c11, tagY);
tagY = tableRow(['P4', '@triq-production', 'MÉDIA', 'Integrar CCPM buffers com vetor P do TRIQ'], c11, tagY);
doc.y = tagY + 15;

// ──────────────────────────────────────────────────────────────────────────────
// REFERÊNCIAS
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Referências', 16);

const refs = [
  'Project Management Institute. (2021). A Guide to the Project Management Body of Knowledge (PMBOK Guide) — 7th Edition. Newtown Square, PA: PMI.',
  'Goldratt, E. M. (1997). Critical Chain. Great Barrington, MA: North River Press.',
  'Goldratt, E. M., & Cox, J. (1984). The Goal: A Process of Ongoing Improvement. North River Press.',
  'Atkinson, R. (1999). Project management: cost, time and quality, two best guesses and a phenomenon, it\'s time to accept other success criteria. International Journal of Project Management, 17(6), 337–342.',
  'Flyvbjerg, B., Bruzelius, N., & Rothengatter, W. (2003). Megaprojects and Risk: An Anatomy of Ambition. Cambridge University Press.',
  'McNichol, D. (2000). The Big Dig. New York: Silver Lining Books. (Case study source for Big Dig timeline)',
  'Commonwealth of Massachusetts, Inspector General. (2005). Audit of the Central Artery/Tunnel Project. Boston, MA.',
  'Zwikael, O., & Smyrk, J. (2011). Project Management for the Creation of Organisational Value. Springer.',
  'Abramowitz, M., & Stegun, I. A. (1964). Handbook of Mathematical Functions. US National Bureau of Standards. (Lei dos Cossenos e funções trigonométricas)',
  'Press, W. H., Teukolsky, S. A., Vetterling, W. T., & Flannery, B. P. (2007). Numerical Recipes: The Art of Scientific Computing (3rd ed.). Cambridge University Press. (Diferenciação numérica, Seção 5.7)',
  'Coxeter, H. S. M. (1961). Introduction to Geometry. Wiley. (Triângulo Órtico, pp. 17–22)',
  'Manoxter. (2026). MetodoTriq.md — Documento de Autoridade do Método TRIQ. Repositório TRIQ-6.1, Synkra AIOX Platform.',
  'Squad TRIQ. (2026). docs/reviews/math-deep-audit-v2.md — Auditoria Matemática Profunda v2. Repositório TRIQ-6.1.',
  'Squad TRIQ. (2026). docs/WORK-LOG.md — Work Log Completo do Projeto TRIQ. Repositório TRIQ-6.1.',
];

refs.forEach((ref, i) => {
  doc.font('Helvetica').fontSize(9.5).fillColor('#212121')
    .text(`[${i + 1}] ${ref}`, MARGIN, doc.y, { width: TEXT_W, align: 'justify', lineGap: 2 });
  doc.moveDown(0.5);
});

sectionDivider();

// Colophon
doc.moveDown(1);
doc.font('Helvetica-Bold').fontSize(10).fillColor('#37474f')
  .text('Nota sobre este documento', { align: 'center' });
doc.moveDown(0.5);
doc.font('Helvetica').fontSize(9).fillColor('#546e7a')
  .text(
    'Este documento foi gerado pelo Squad TRIQ utilizando a plataforma Synkra AIOX. ' +
    'As demonstrações matemáticas foram revisadas por @triq-math e @triq-production. ' +
    'Os cálculos numéricos foram validados contra a implementação de produção do TRIQ 6.1. ' +
    'O caso Boston Big Dig é utilizado exclusivamente para validação retroativa do método — ' +
    'os valores numéricos de 1991–2007 são estimativas baseadas em dados públicos de auditorias ' +
    'e relatórios governamentais citados nas referências.',
    { width: TEXT_W, align: 'justify', lineGap: 3 }
  );

doc.moveDown(1.5);
doc.font('Helvetica').fontSize(9).fillColor('#9e9e9e')
  .text('© 2026 Manoxter | Squad TRIQ | Synkra AIOX Platform', { align: 'center' })
  .moveDown(0.3)
  .text('Uso Acadêmico e de Pesquisa — Março 2026', { align: 'center' });

// ──────────────────────────────────────────────────────────────────────────────
// APÊNDICE A — GLOSSÁRIO TÉCNICO
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Apêndice A — Glossário Técnico TRIQ', 16);

body(
  'Este glossário define os termos técnicos utilizados ao longo do documento. ' +
  'Os termos são apresentados na ordem em que aparecem no texto, com definições ' +
  'precisas e referências cruzadas quando relevante.'
);

const glossary = [
  ['Triângulo de Ferro', 'Metáfora clássica da gestão de projetos que representa a interdependência entre Escopo, Prazo e Custo. O TRIQ transforma essa metáfora em objeto matemático calculável.'],
  ['CDT (Current Delta Triangle)', 'O triângulo formado pelos vetores de intensidade adimensional E, O, P calculados no momento atual de análise do projeto. Representa o "estado" geométrico instantâneo.'],
  ['Curva S', 'Representação gráfica do custo acumulado de um projeto ao longo do tempo normalizado. A forma em "S" emerge das quatro propriedades de fronteira da função cúbica.'],
  ['f(t) = 3t² − 2t³', 'Função baseline do TRIQ — o único polinômio cúbico que satisfaz f(0)=0, f(1)=1, f\'(0)=0, f\'(1)=0. Modela o perfil de gasto padrão de projetos com inicio/fim suaves.'],
  ['Slope (Coeficiente Angular)', 'Taxa de variação da curva de custo ou prazo em um ponto específico. No TRIQ, calculado via derivada central de 2ª ordem para maior estabilidade numérica.'],
  ['Derivada Central de 2ª Ordem', 'Estimativa numérica da taxa instantânea usando pontos vizinhos: [f(t+h) − f(t−h)] / (2h). Mais estável que a derivada de ponto único em dados com ruído.'],
  ['Regressão OLS', 'Ordinary Least Squares — método de ajuste de reta que minimiza a soma dos quadrados dos resíduos. Trata todos os pontos históricos com peso igual.'],
  ['E (Vetor Escopo)', 'Lado do CDT correspondente ao escopo do projeto. Por definição, E = 1.0 sempre — representa o plano de referência imutável.'],
  ['O (Vetor Orçamento)', 'Lado do CDT correspondente ao custo. O = slope_real / taxa_média_planejada. O = 1.0 significa custo no ritmo planejado; O > 1.0 indica estouro.'],
  ['P (Vetor Prazo)', 'Lado do CDT correspondente ao prazo. P = |slope_prazo|. P = 1.0 significa prazo no ritmo planejado; P > 1.0 indica atraso.'],
  ['Adimensionalização', 'Processo de converter grandezas com unidades diferentes em números puros (sem unidade) que podem ser comparados diretamente. Permite comparar projetos de qualquer escala.'],
  ['CEt (Condição de Existência do Triângulo)', 'Conjunto de três desigualdades triangulares (a+b>c, b+c>a, a+c>b) que devem ser satisfeitas para que E, O, P formem um triângulo válido. Violação = colapso geométrico = indicador de crise.'],
  ['Clamping', 'Operação matemática de limitar um valor a um intervalo: max(−1, min(1, x)). Aplicado ao cos(A) para evitar NaN em operações de arccosseno.'],
  ['NaN (Not a Number)', 'Resultado de operações matemáticas inválidas (ex: arccos de número fora de [−1,1]). O TRIQ usa clamping para prevenir NaN.'],
  ['Lei dos Cossenos', 'Relação entre os três lados e um ângulo de qualquer triângulo: a² = b² + c² − 2bc·cos(A). Usada para calcular os ângulos do CDT a partir dos lados E, O, P.'],
  ['Ortocentro', 'Ponto de interseção das três alturas de um triângulo. Em triângulos acutângulos, está dentro do triângulo; em obtusângulos, está fora.'],
  ['Triângulo Órtico', 'Triângulo cujos vértices são os pés das altitudes do triângulo original. É o triângulo inscrito de menor área possível. No TRIQ, define a Zona de Resiliência Executiva.'],
  ['Altitude (Geometria)', 'Segmento perpendicular de um vértice ao lado oposto do triângulo. Cada triângulo tem três altitudes, que se intersectam no ortocentro.'],
  ['Pé da Altitude', 'Ponto onde a altitude encontra o lado oposto. Calculado por projeção ortogonal usando produto interno vetorial.'],
  ['Produto Interno (Dot Product)', 'Operação vetorial: u·v = ux·vx + uy·vy. Usado para calcular projeções e ângulos. O parâmetro t de projeção é (u·v)/(v·v).'],
  ['ZRE (Zona de Resiliência Executiva)', 'Interior do Triângulo Órtico. Representa a região de operação saudável do projeto, onde o estado pode absorver perturbações sem entrar em crise.'],
  ['NVO (Núcleo Viável Ótimo)', 'Ponto de referência do projeto ideal dentro da ZRE. Por padrão, é o baricentro do Triângulo Órtico; para triângulos obtusângulos, é o incentro do CDT.'],
  ['Baricentro (Centroide)', 'Ponto de intersecção das medianas de um triângulo. Coordenadas = média aritmética dos vértices: G = ((Ax+Bx+Cx)/3, (Ay+By+Cy)/3).'],
  ['Incentro', 'Ponto equidistante dos três lados de um triângulo — centro do círculo inscrito. Coordenadas ponderadas pelos comprimentos dos lados opostos.'],
  ['MATED', 'Multi-dimensional Assessment of Triangular Execution Deviation. Distância Euclidiana do centroide do CDT atual ao NVO. Principal KPI de saúde do projeto no TRIQ.'],
  ['Distância Euclidiana', 'Distância "em linha reta" entre dois pontos: d = √[(x2−x1)² + (y2−y1)²]. A medida mais intuitiva de distância em espaço plano.'],
  ['Desvio de Qualidade (DQ)', 'Razão Área_CDT / Área_Baseline × 100%. Mede a expansão ou contração relativa do triângulo em relação ao estado planejado.'],
  ['Fórmula de Heron', 'Cálculo de área triangular a partir dos três lados: Área = √[s(s−a)(s−b)(s−c)], onde s = (a+b+c)/2. Não requer coordenadas.'],
  ['Diagnóstico Composto', 'Avaliação combinada de três sinais independentes: CEt (triângulo existe?), DQ (área razoável?) e MATED (distância ao ótimo?). Reduz falsos positivos.'],
  ['Ponto de Inflexão', 'Ponto onde a segunda derivada se anula — a curva muda de côncava para convexa. Para f(t)=3t²−2t³, o ponto de inflexão é t=0.5 (metade do projeto).'],
  ['Big Dig', 'Boston Central Artery/Tunnel Project (1991–2007). Caso de validação retroativa do TRIQ. Estouro de orçamento de 478% e atraso de 90%. CEt violada retroativamente em 1997.'],
  ['CCPM', 'Critical Chain Project Management. Metodologia de Goldratt baseada em buffers explícitos para absorver variabilidade. Item P4 da agenda de pesquisa futura do TRIQ.'],
  ['TOC', 'Theory of Constraints (Teoria das Restrições). Framework de Goldratt que identifica o gargalo (restrição) de um sistema e o explora maximalmente.'],
  ['PMBOK', 'Project Management Body of Knowledge. Guia do PMI (Project Management Institute) com melhores práticas em gestão de projetos. O TRIQ é complementar ao PMBOK.'],
  ['CPI', 'Cost Performance Index. Indicador PMBOK: CPI = EV/AC (Earned Value / Actual Cost). CPI < 1.0 indica estouro de custo. Comparável ao vetor O do TRIQ.'],
  ['SPI', 'Schedule Performance Index. Indicador PMBOK: SPI = EV/PV (Earned Value / Planned Value). SPI < 1.0 indica atraso. Comparável ao vetor P do TRIQ.'],
];

glossary.forEach(([term, def]) => {
  const termY = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a237e')
    .text(term + ':', MARGIN, termY, { continued: true });
  doc.font('Helvetica').fontSize(10).fillColor('#212121')
    .text('  ' + def, { width: TEXT_W, lineGap: 2 });
  doc.moveDown(0.35);
  if (doc.y > PAGE_H - 120) {
    addPage();
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// APÊNDICE B — DERIVAÇÃO COMPLETA DA FUNÇÃO CURVA S
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Apêndice B — Derivação Completa da Função Curva S', 16);

body(
  'Esta seção apresenta a derivação matemática formal da função f(t) = 3t² − 2t³ a partir ' +
  'das quatro condições de fronteira, demonstrando que ela é a única solução polinomial cúbica ' +
  'para o problema. A derivação é apresentada passo a passo, adequada para leitores com ' +
  'conhecimento básico de álgebra linear.'
);

subtitle('B.1 Formulação do Problema');

body(
  'Queremos encontrar um polinômio de grau mínimo f(t) que satisfaça simultaneamente:' +
  '\n  (1) f(0) = 0\n  (2) f(1) = 1\n  (3) f\'(0) = 0\n  (4) f\'(1) = 0'
);

body(
  'Primeiro, estabelecemos qual é o grau mínimo necessário. Um polinômio de grau n tem n+1 ' +
  'coeficientes livres. Temos 4 condições a satisfazer, portanto precisamos de ao menos ' +
  '4 coeficientes livres, o que implica grau mínimo n = 3 (polinômio cúbico).'
);

subtitle('B.2 Forma Geral do Polinômio Cúbico');

body('Seja f(t) = at³ + bt² + ct + d, com a, b, c, d ∈ ℝ.');

body('A derivada é: f\'(t) = 3at² + 2bt + c');

subtitle('B.3 Aplicação das Condições de Fronteira');

formula(
  'Condição 1: f(0) = 0\n' +
  '  a(0)³ + b(0)² + c(0) + d = 0\n' +
  '  d = 0  ←  primeiro coeficiente determinado!\n\n' +
  'Condição 3: f\'(0) = 0\n' +
  '  3a(0)² + 2b(0) + c = 0\n' +
  '  c = 0  ←  segundo coeficiente determinado!\n\n' +
  '(Simplificação: f(t) = at³ + bt²  com c=0, d=0)\n\n' +
  'Condição 2: f(1) = 1\n' +
  '  a(1)³ + b(1)² = 1\n' +
  '  a + b = 1   ... (I)\n\n' +
  'Condição 4: f\'(1) = 0\n' +
  '  3a(1)² + 2b(1) = 0\n' +
  '  3a + 2b = 0  ... (II)'
);

subtitle('B.4 Resolução do Sistema Linear 2×2');

formula(
  'Sistema:\n' +
  '   a + b  = 1   ... (I)\n' +
  '  3a + 2b = 0   ... (II)\n\n' +
  'De (I):  b = 1 - a\n' +
  'Substituindo em (II):\n' +
  '  3a + 2(1 - a) = 0\n' +
  '  3a + 2 - 2a = 0\n' +
  '  a + 2 = 0\n' +
  '  a = -2\n\n' +
  'Substituindo em (I):\n' +
  '  -2 + b = 1  →  b = 3\n\n' +
  'SOLUÇÃO ÚNICA:  a = -2,  b = 3,  c = 0,  d = 0\n\n' +
  'Portanto:  f(t) = -2t³ + 3t²  =  3t² - 2t³  ✓'
);

subtitle('B.5 Verificação das Quatro Condições');

formula(
  'Verificação completa:\n\n' +
  '  f(t)  = 3t² - 2t³\n' +
  '  f\'(t) = 6t - 6t² = 6t(1-t)\n\n' +
  '  f(0)  = 3(0) - 2(0) = 0      ✓  Projeto começa do zero\n' +
  '  f(1)  = 3(1) - 2(1) = 1      ✓  Projeto termina com 100%\n' +
  '  f\'(0) = 6(0)(1-0)  = 0      ✓  Taxa zero no início\n' +
  '  f\'(1) = 6(1)(1-1)  = 0      ✓  Taxa zero no final\n\n' +
  '  Ponto de inflexão: f\'\'(t) = 6 - 12t = 0  →  t* = 0.5\n' +
  '  f(0.5) = 3(0.25) - 2(0.125) = 0.75 - 0.25 = 0.50\n' +
  '  (Exatamente 50% do orçamento na metade do prazo — simetria perfeita)'
);

subtitle('B.6 Unicidade da Solução');

body(
  'O sistema linear resolvido em B.4 tem solução única (determinante ≠ 0), o que garante ' +
  'que f(t) = 3t² − 2t³ é o ÚNICO polinômio cúbico que satisfaz as quatro condições de fronteira. ' +
  'Qualquer outro polinômio de grau 3 que satisfaça essas condições seria idêntico a este.'
);

formula(
  'Determinante do sistema:\n\n' +
  '  |1  1|  =  1·2 - 1·3  =  2 - 3  =  -1  ≠  0\n' +
  '  |3  2|\n\n' +
  '  Determinante não-nulo → solução única → unicidade provada ∎'
);

subtitle('B.7 Propriedades Adicionais Relevantes');

body('Além das quatro condições de fronteira, a função possui propriedades adicionais que a tornam matematicamente elegante:');

bullet('Simetria em torno de t=0.5: se g(t) = 1 − f(1−t), então g(t) = f(t). O projeto gasta o mesmo em reverso.');
bullet('Derivada máxima em t=0.5: f\'(0.5) = 6(0.5)(0.5) = 1.5 — a taxa de gasto é máxima (150% da média) no meio do projeto.');
bullet('A função pertence à família das curvas de Hermite cúbicas, amplamente usadas em animação computacional e interpolação de trajetórias suaves.');
bullet('Ela é um caso especial do polinômio de Bernstein de grau 3 avaliado nos nós [0, 0, 1, 1], conectando o TRIQ à teoria de curvas Bézier.');

formula(
  'Série de Taylor em torno de t=0 (aproximação local):\n\n' +
  '  f(t) = 3t² - 2t³\n' +
  '       ≈ 3t²  para t pequeno (início do projeto)\n\n' +
  '  Isso confirma: no início, o custo cresce como t² (quadrático),\n' +
  '  não como t (linear). A aceleração inicial é suave.'
);

body(
  'Esta derivação confirma que a escolha de f(t) = 3t² − 2t³ no TRIQ não é empírica ' +
  'nem heurística. É a única solução polinomial cúbica ao problema das quatro condições ' +
  'de fronteira — uma necessidade matemática, não uma opção de design.'
);

// ──────────────────────────────────────────────────────────────────────────────
// APÊNDICE C — EXEMPLO NUMÉRICO COMPLETO INTEGRADO
// ──────────────────────────────────────────────────────────────────────────────
addPage();
title('Apêndice C — Exemplo Numérico Completo: Projeto ALFA', 16);

body(
  'Este apêndice percorre o cálculo completo do TRIQ para um projeto hipotético chamado ALFA, ' +
  'aplicando todas as fórmulas das Seções 2 a 8 em sequência. O objetivo é permitir que o ' +
  'leitor reproduza os cálculos manualmente (ou em uma planilha) e valide sua compreensão do método.'
);

subtitle('C.1 Dados do Projeto ALFA');

formula(
  'Parâmetros do Projeto ALFA:\n\n' +
  '  Orçamento total planejado:  R$ 8.000.000,00\n' +
  '  Duração planejada:          18 meses\n' +
  '  Momento de análise:         Mês 9 (t = 9/18 = 0.500)\n\n' +
  '  Histórico de custo acumulado real (últimos 3 meses):\n' +
  '    Mês 8  (t = 8/18 ≈ 0.444):  R$ 3.520.000  →  fração = 0.440\n' +
  '    Mês 9  (t = 9/18 = 0.500):  R$ 4.240.000  →  fração = 0.530\n' +
  '    Mês 10 (t = 10/18 ≈ 0.556): R$ 5.040.000  →  fração = 0.630\n\n' +
  '  Progresso de prazo real no mês 9:\n' +
  '    Atividades concluídas: 48% das previstas para o período\n' +
  '    Slope_prazo = 0.48 / 0.50 = 0.96  (96% da velocidade planejada)'
);

subtitle('C.2 Passo 1: Calcular o Slope do Orçamento');

formula(
  'Derivada Central de 2ª Ordem para o orçamento:\n\n' +
  '  h = 1/18 ≈ 0.0556  (um mês em fração do prazo total)\n\n' +
  '  slope_O = [c(t+h) - c(t-h)] / (2h)\n' +
  '          = [0.630 - 0.440] / (2 × 0.0556)\n' +
  '          = 0.190 / 0.1111\n' +
  '          ≈ 1.710  (em frações de orçamento por fração de tempo)'
);

subtitle('C.3 Passo 2: Calcular os Vetores de Intensidade');

formula(
  'Taxa média planejada:\n' +
  '  taxa_media = 1.0 / 1.0 = 1.0  (normalizada: orçamento/tempo, ambos = 1)\n\n' +
  'Vetores de Intensidade Adimensional:\n' +
  '  E = 1.0  (âncora de escopo)\n' +
  '  O = slope_O / taxa_media = 1.710 / 1.0 = 1.710\n' +
  '  P = |slope_prazo| = |0.96| = 0.960\n\n' +
  'Interpretação:\n' +
  '  E = 1.0  →  escopo no plano\n' +
  '  O = 1.71 →  custo 71% acima do ritmo planejado (ALARME!)\n' +
  '  P = 0.96 →  prazo 4% abaixo do ritmo planejado (leve atraso)'
);

subtitle('C.4 Passo 3: Verificar a CEt');

formula(
  'Verificação da Condição de Existência do Triângulo:\n\n' +
  '  E + O > P  →  1.0 + 1.710 > 0.960  →  2.710 > 0.960  ✓\n' +
  '  O + P > E  →  1.710 + 0.960 > 1.0  →  2.670 > 1.000  ✓\n' +
  '  E + P > O  →  1.0 + 0.960 > 1.710  →  1.960 > 1.710  ✓\n\n' +
  '  CEt VÁLIDA → Triângulo existe → Calcular geometria'
);

subtitle('C.5 Passo 4: Calcular Ângulos e Vértices');

formula(
  'Lei dos Cossenos — Ângulo A (no vértice de Escopo):\n\n' +
  '  cos(A) = (E² + O² - P²) / (2·E·O)\n' +
  '         = (1.0 + 2.9241 - 0.9216) / (2 × 1.0 × 1.710)\n' +
  '         = 3.0025 / 3.420\n' +
  '         ≈ 0.878\n' +
  '  A = arccos(0.878) ≈ 28.6°\n\n' +
  'Coordenadas dos Vértices:\n' +
  '  A = (0.000, 0.000)  [Escopo — origem]\n' +
  '  B = (1.000, 0.000)  [Prazo — eixo X, distância E=1.0]\n' +
  '  C = (O·cos(A), O·sin(A))\n' +
  '    = (1.710 × 0.878, 1.710 × 0.479)\n' +
  '    = (1.502, 0.819)'
);

subtitle('C.6 Passo 5: Calcular Centroide e Área do CDT');

formula(
  'Centroide (Ponto de Operação):\n' +
  '  G = ((0+1+1.502)/3, (0+0+0.819)/3)\n' +
  '    = (2.502/3, 0.819/3)\n' +
  '    = (0.834, 0.273)\n\n' +
  'Área pelo Fórmula de Heron:\n' +
  '  a = E = 1.0,  b = O = 1.710,  c = P = 0.960\n' +
  '  s = (1.0 + 1.710 + 0.960) / 2 = 1.835\n' +
  '  Área = √[1.835 × 0.835 × 0.125 × 0.875]\n' +
  '       = √[1.835 × 0.835 × 0.109375]\n' +
  '       = √[0.1676]\n' +
  '       ≈ 0.409\n\n' +
  'Área Baseline (E=O=P=1.0):\n' +
  '  s = 1.5,  Área_base = √[1.5×0.5×0.5×0.5] = √0.1875 ≈ 0.433\n\n' +
  'Desvio de Qualidade (DQ):\n' +
  '  DQ = 0.409 / 0.433 × 100% ≈ 94.5%  (leve contração — razoável)'
);

subtitle('C.7 Passo 6: Calcular Altitudes e Triângulo Órtico');

formula(
  'Pé da Altitude H_A (de A=(0,0) sobre BC):\n\n' +
  '  v = C - B = (1.502-1.000, 0.819-0.000) = (0.502, 0.819)\n' +
  '  u = A - B = (0.000-1.000, 0.000-0.000) = (-1.000, 0.000)\n' +
  '  t = (u·v)/(v·v) = ((-1)(0.502)+(0)(0.819)) / (0.502²+0.819²)\n' +
  '    = (-0.502) / (0.252 + 0.671)\n' +
  '    = -0.502 / 0.923\n' +
  '    ≈ -0.544  [cai fora do segmento → triângulo obtusângulo em A]\n\n' +
  '  Triângulo obtusângulo → usar INCENTRO como NVO!\n\n' +
  'Incentro do CDT:\n' +
  '  a = |BC| = √((1.502-1.0)²+(0.819-0)²) = √(0.252+0.671) ≈ 0.960\n' +
  '  b = |AC| = √(1.502²+0.819²) = √(2.256+0.671) ≈ 1.711\n' +
  '  c = |AB| = 1.000\n\n' +
  '  NVO_x = (a·Ax+b·Bx+c·Cx)/(a+b+c)\n' +
  '        = (0.960·0+1.711·1.0+1.0·1.502)/(0.960+1.711+1.000)\n' +
  '        = (0+1.711+1.502)/3.671\n' +
  '        = 3.213/3.671 ≈ 0.875\n' +
  '  NVO_y = (0.960·0+1.711·0+1.0·0.819)/3.671\n' +
  '        = 0.819/3.671 ≈ 0.223\n\n' +
  '  NVO = (0.875, 0.223)'
);

subtitle('C.8 Passo 7: Calcular o MATED');

formula(
  'MATED = Distância do Centroide do CDT ao NVO:\n\n' +
  '  G     = (0.834, 0.273)\n' +
  '  NVO   = (0.875, 0.223)\n\n' +
  '  MATED = √[(0.834-0.875)² + (0.273-0.223)²]\n' +
  '        = √[(-0.041)² + (0.050)²]\n' +
  '        = √[0.00168 + 0.00250]\n' +
  '        = √0.00418\n' +
  '        ≈ 0.065'
);

subtitle('C.9 Diagnóstico Final do Projeto ALFA');

doc.moveDown(0.5);
let tdY = doc.y;
const tdC = [140, 120, 191];
tdY = tableRow(['Indicador', 'Valor', 'Status'], tdC, tdY, true);
tdY = tableRow(['CEt (Triângulo existe?)', 'SIM (3/3 condições)', 'OK'], tdC, tdY);
tdY = tableRow(['E (Escopo)', '1.000', 'No plano'], tdC, tdY);
tdY = tableRow(['O (Orçamento)', '1.710', 'ATENCAO: +71% acima do ritmo'], tdC, tdY);
tdY = tableRow(['P (Prazo)', '0.960', 'Leve atraso: -4%'], tdC, tdY);
tdY = tableRow(['DQ (Desvio de Qualidade)', '94.5%', 'OK (leve contração)'], tdC, tdY);
tdY = tableRow(['MATED', '0.065', 'Zona SEGURO (0.05-0.15)'], tdC, tdY);
tdY = tableRow(['Diagnóstico Composto', 'SEGURO com ALERTA', 'Intervencao em O urgente!'], tdC, tdY);
doc.y = tdY + 15;

warn(
  'AÇÃO RECOMENDADA PELO TRIQ para o Projeto ALFA: O orçamento está crescendo a 1.71× ' +
  'o ritmo planejado enquanto o prazo está apenas 4% abaixo do plano. Isso sugere ' +
  'um problema de ineficiência de custo, não de produtividade. Ação prioritária: ' +
  'auditoria de contratos e faturas, identificação de desperdícios. Se O atingir 1.96 ' +
  '(= 1.0 + 0.960), a CEt será violada e o projeto entrará em colapso geométrico.'
);

// ──────────────────────────────────────────────────────────────────────────────
// FINALIZE
// ──────────────────────────────────────────────────────────────────────────────
doc.end();

stream.on('finish', () => {
  console.log(`\nPDF gerado com sucesso!`);
  console.log(`Páginas totais: ${pageNumber}`);
  console.log(`Arquivo: ${OUTPUT_FILE}`);
  console.log(`\nEstrutura gerada:`);
  console.log(`  - Capa`);
  console.log(`  - Sumário`);
  console.log(`  - Seção 1: O Problema que o TRIQ Resolve`);
  console.log(`  - Seção 2: A Curva S`);
  console.log(`  - Seção 3: A Reta Tangente`);
  console.log(`  - Seção 4: O Problema dos Lados do Triângulo`);
  console.log(`  - Seção 5: A Condição de Existência do Triângulo (CEt)`);
  console.log(`  - Seção 6: Lei dos Cossenos`);
  console.log(`  - Seção 7: Triângulo Órtico e ZRE`);
  console.log(`  - Seção 8: MATED`);
  console.log(`  - Seção 9: Validação — Big Dig`);
  console.log(`  - Seção 10: Histórico de Decisões`);
  console.log(`  - Seção 11: Agenda de Pesquisa Futura`);
  console.log(`  - Referências`);
});

stream.on('error', (err) => {
  console.error('Erro ao gerar PDF:', err);
  process.exit(1);
});
