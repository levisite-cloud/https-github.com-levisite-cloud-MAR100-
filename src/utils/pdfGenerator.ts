import { Atendimento, EmpresaConfig } from '../types';
import { formatDate, formatDateTime, formatMoeda, parseMoedaToNumber } from './formatters';

export function printOrcamentoPDF(atendimento: Atendimento, empresa: EmpresaConfig): boolean {
  const numOrc = String(atendimento.id).padStart(5, '0');
  const dataHoje = new Date().toLocaleDateString('pt-BR');
  const validade = atendimento.validadeOrcamento
    ? formatDate(atendimento.validadeOrcamento)
    : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

  const itens = atendimento.itensOrcamento || [];
  const totalCalculado = itens.reduce((sum, item) => sum + (item.quantidade || 0) * (item.valorUnit || 0), 0);
  const totalFinal = itens.length > 0 ? totalCalculado : parseMoedaToNumber(atendimento.orcamento);

  const logoHtml = empresa.logo
    ? `<img src="${empresa.logo}" alt="Logo" style="max-height: 75px; max-width: 180px; object-fit: contain;" />`
    : `<div style="width: 58px; height: 58px; border-radius: 8px; background: ${empresa.cor || '#0052cc'}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; letter-spacing: -1px;">${(empresa.nome || 'M').charAt(0)}</div>`;

  const rowsHtml = itens.length > 0
    ? itens
        .map(
          (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 10px 12px; font-weight: 600; color: #64748b; width: 40px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 600; color: #1e293b;">${escapeHtml(item.descricao || 'Item sem descrição')}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600; width: 80px; color: #334155;">
            ${item.quantidade} <span style="font-size: 11px; color: #64748b; font-weight: normal;">${item.unidade || 'un'}</span>
          </td>
          <td style="padding: 10px 12px; text-align: right; width: 120px; color: #334155;">
            R$ ${formatMoeda(item.valorUnit)}
          </td>
          <td style="padding: 10px 12px; text-align: right; width: 130px; font-weight: 700; color: #0f172a;">
            R$ ${formatMoeda((item.quantidade || 0) * (item.valorUnit || 0))}
          </td>
        </tr>
      `
        )
        .join('')
    : `
      <tr>
        <td colspan="5" style="padding: 24px 12px; text-align: center; color: #64748b; font-style: italic;">
          Descrição geral do serviço: ${escapeHtml(atendimento.servico)} em ${escapeHtml(atendimento.material)}
        </td>
      </tr>
    `;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento #${numOrc} — ${escapeHtml(empresa.nome)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
    }
    .sheet {
      max-width: 800px;
      margin: 0 auto;
      padding: 36px 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${empresa.cor || '#0052cc'};
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .company-title {
      font-size: 20px;
      font-weight: 800;
      color: ${empresa.cor || '#0052cc'};
      margin-bottom: 3px;
    }
    .company-slogan {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .company-meta {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.6;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-tag {
      display: inline-block;
      background: ${empresa.cor || '#0052cc'};
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.5px;
      padding: 5px 14px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .doc-meta {
      font-size: 11px;
      color: #475569;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: ${empresa.cor || '#0052cc'};
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .client-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 24px;
      font-size: 11.5px;
    }
    .field-label {
      font-weight: 600;
      color: #64748b;
      margin-right: 6px;
    }
    .field-val {
      color: #0f172a;
      font-weight: 500;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11.5px;
    }
    table.items-table th {
      background: ${empresa.cor || '#0052cc'};
      color: #ffffff;
      font-weight: 700;
      padding: 9px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .totals-box {
      margin-left: auto;
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 12px;
    }
    .total-main {
      border-top: 2px solid ${empresa.cor || '#0052cc'};
      margin-top: 6px;
      padding-top: 8px;
      font-size: 15px;
      font-weight: 800;
      color: ${empresa.cor || '#0052cc'};
    }
    .conditions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 24px;
    }
    .cond-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      font-size: 11px;
      color: #334155;
      line-height: 1.6;
    }
    .cond-box strong {
      color: #0f172a;
    }
    .signatures {
      margin-top: 36px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      padding-top: 10px;
    }
    .sig-col {
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      margin-bottom: 6px;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .sig-sub {
      font-size: 10px;
      color: #64748b;
    }
    .footer-stamp {
      margin-top: 24px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
    @media print {
      body { background: #fff !important; }
      .sheet { padding: 10px 14px; }
      @page { margin: 1.2cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div style="display: flex; gap: 14px; align-items: center;">
        ${logoHtml}
        <div>
          <h1 class="company-title">${escapeHtml(empresa.nome || 'Marmoraria')}</h1>
          ${empresa.slogan ? `<div class="company-slogan">${escapeHtml(empresa.slogan)}</div>` : ''}
          <div class="company-meta">
            ${empresa.cnpj ? `CNPJ: ${escapeHtml(empresa.cnpj)} • ` : ''}${empresa.tel ? `Tel: ${escapeHtml(empresa.tel)}` : ''}<br>
            ${empresa.email ? `E-mail: ${escapeHtml(empresa.email)} • ` : ''}${empresa.endereco ? `${escapeHtml(empresa.endereco)}` : ''}
          </div>
        </div>
      </div>
      <div class="doc-badge">
        <div class="doc-tag">ORÇAMENTO</div>
        <div class="doc-meta" style="font-weight: 700; color: #0f172a; font-size: 13px;">Nº ${numOrc}</div>
        <div class="doc-meta">Emissão: ${dataHoje}</div>
        <div class="doc-meta" style="color: #b45309; font-weight: 600;">Validade: ${validade}</div>
      </div>
    </div>

    <div class="section-title">1. Dados do Cliente e Obra</div>
    <div class="client-card">
      <div><span class="field-label">Cliente:</span> <span class="field-val" style="font-weight: 700;">${escapeHtml(atendimento.nome)}</span></div>
      <div><span class="field-label">Telefone:</span> <span class="field-val">${escapeHtml(atendimento.telefone)}</span></div>
      ${atendimento.email ? `<div><span class="field-label">E-mail:</span> <span class="field-val">${escapeHtml(atendimento.email)}</span></div>` : ''}
      ${atendimento.cpfCnpj ? `<div><span class="field-label">CPF / CNPJ:</span> <span class="field-val">${escapeHtml(atendimento.cpfCnpj)}</span></div>` : ''}
      <div style="grid-column: 1 / -1;"><span class="field-label">Endereço da Obra:</span> <span class="field-val">${escapeHtml(atendimento.endereco)}</span></div>
      <div><span class="field-label">Tipo de Serviço:</span> <span class="field-val">${escapeHtml(atendimento.servico)}</span></div>
      <div><span class="field-label">Material / Pedra:</span> <span class="field-val" style="color: ${empresa.cor || '#0052cc'}; font-weight: 700;">${escapeHtml(atendimento.material)}</span></div>
      ${atendimento.acabamento ? `<div style="grid-column: 1 / -1;"><span class="field-label">Acabamento de Borda:</span> <span class="field-val">${escapeHtml(atendimento.acabamento)}</span></div>` : ''}
      ${atendimento.responsavel ? `<div><span class="field-label">Atendente / Técnico:</span> <span class="field-val">${escapeHtml(atendimento.responsavel)}</span></div>` : ''}
      <div><span class="field-label">Data Prevista:</span> <span class="field-val">${formatDate(atendimento.dataPrevista)}</span></div>
    </div>

    <div class="section-title">2. Discriminação dos Serviços e Peças</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 40px;">#</th>
          <th>Descrição Detalhada</th>
          <th style="text-align: center; width: 80px;">Qtd / Medida</th>
          <th style="text-align: right; width: 120px;">Vlr. Unitário</th>
          <th style="text-align: right; width: 130px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals-box">
      <div class="total-row">
        <span style="color: #64748b;">Subtotal de Peças & Serviços:</span>
        <span style="font-weight: 600;">R$ ${formatMoeda(totalFinal)}</span>
      </div>
      ${atendimento.desconto ? `
      <div class="total-row" style="color: #16a34a;">
        <span>Desconto Concedido:</span>
        <span>- R$ ${formatMoeda(atendimento.desconto)}</span>
      </div>` : ''}
      <div class="total-row total-main">
        <span>VALOR TOTAL:</span>
        <span>R$ ${formatMoeda(totalFinal - (atendimento.desconto || 0))}</span>
      </div>
    </div>

    <div class="section-title">3. Condições Comerciais e Execução</div>
    <div class="conditions-grid">
      <div class="cond-box">
        <strong>💳 Condições de Pagamento:</strong><br>
        ${atendimento.condicoesPagamento ? escapeHtml(atendimento.condicoesPagamento) : '50% de entrada no fechamento + saldo na entrega/instalação.'}<br>
        ${empresa.pixKey ? `<br><strong>Chave PIX:</strong> ${escapeHtml(empresa.pixKey)}` : ''}
      </div>
      <div class="cond-box">
        <strong>📋 Termos Gerais e Garantia:</strong><br>
        ${escapeHtml(empresa.termosPadrao || 'Garantia de acabamento e colocação de acordo com os padrões técnicos de marmoraria. Pedras naturais estão sujeitas a variações de tonalidade e veios.')}
      </div>
    </div>

    ${atendimento.obs ? `
    <div class="cond-box" style="margin-bottom: 20px;">
      <strong>📝 Observações e Instruções Especiais:</strong><br>
      ${escapeHtml(atendimento.obs)}
    </div>` : ''}

    <div class="signatures">
      <div class="sig-col">
        <div class="sig-line">${escapeHtml(atendimento.nome)}</div>
        <div class="sig-sub">De acordo do Cliente (Aprovação)</div>
      </div>
      <div class="sig-col">
        <div class="sig-line">${escapeHtml(empresa.nome)}</div>
        <div class="sig-sub">Representante / Marmoraria</div>
      </div>
    </div>

    <div class="footer-stamp">
      Documento gerado eletronicamente em ${dataHoje} • ${escapeHtml(empresa.nome)} • Sistema de Gestão de Marmorarias
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes');
  if (!printWindow) {
    return false;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}
