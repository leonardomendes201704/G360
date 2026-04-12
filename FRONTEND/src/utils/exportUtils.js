/**
 * Utilitário de Exportação de Dados
 * Suporta CSV e Excel (XLSX simulado via CSV com BOM)
 */

/**
 * Exporta dados como arquivo CSV
 * @param {Array<Object>} data - Array de objetos para exportar
 * @param {Array<{key: string, label: string}>} columns - Definição das colunas
 * @param {string} filename - Nome do arquivo (sem extensão)
 */
export const exportToCSV = (data, columns, filename = 'exportacao') => {
    if (!data || data.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
    }

    // BOM para suporte UTF-8 no Excel
    const BOM = '\uFEFF';

    // Cabeçalho
    const header = columns.map(col => `"${col.label}"`).join(';');

    // Linhas de dados
    const rows = data.map(item =>
        columns.map(col => {
            let value = col.key.split('.').reduce((obj, key) => obj?.[key], item);

            // Formatação de valores especiais
            if (value === null || value === undefined) value = '';
            if (value instanceof Date) value = value.toLocaleDateString('pt-BR');
            if (typeof value === 'boolean') value = value ? 'Sim' : 'Não';
            if (typeof value === 'object') value = JSON.stringify(value);

            // Transformação customizada
            if (col.transform) value = col.transform(value, item);

            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(';')
    );

    const csvContent = BOM + header + '\n' + rows.join('\n');

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Exporta dados como arquivo Excel (.xlsx) via CSV compatível
 * O arquivo usa separador ; e BOM UTF-8, que é compatível com Excel
 * @param {Array<Object>} data - Array de objetos para exportar  
 * @param {Array<{key: string, label: string}>} columns - Definição das colunas
 * @param {string} filename - Nome do arquivo (sem extensão)
 */
export const exportToExcel = (data, columns, filename = 'exportacao') => {
    // Reutiliza o CSV com extensão .xlsx para compatibilidade Excel
    if (!data || data.length === 0) {
        console.warn('Nenhum dado para exportar');
        return;
    }

    const BOM = '\uFEFF';
    const header = columns.map(col => `"${col.label}"`).join('\t');

    const rows = data.map(item =>
        columns.map(col => {
            let value = col.key.split('.').reduce((obj, key) => obj?.[key], item);

            if (value === null || value === undefined) value = '';
            if (value instanceof Date) value = value.toLocaleDateString('pt-BR');
            if (typeof value === 'boolean') value = value ? 'Sim' : 'Não';
            if (typeof value === 'object') value = JSON.stringify(value);
            if (col.transform) value = col.transform(value, item);

            return `"${String(value).replace(/"/g, '""')}"`;
        }).join('\t')
    );

    const content = BOM + header + '\n' + rows.join('\n');
    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Configurações de colunas pré-definidas por módulo
 */
export const EXPORT_COLUMNS = {
    projects: [
        { key: 'code', label: 'Código' },
        { key: 'name', label: 'Nome' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Prioridade' },
        { key: 'manager.name', label: 'Gerente' },
        { key: 'startDate', label: 'Início', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
        { key: 'endDate', label: 'Fim', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
        { key: 'budget', label: 'Orçamento', transform: (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : '' },
    ],
    incidents: [
        { key: 'code', label: 'Código' },
        { key: 'title', label: 'Título' },
        { key: 'status', label: 'Status' },
        { key: 'priority', label: 'Prioridade' },
        { key: 'category.name', label: 'Categoria' },
        { key: 'assignee.name', label: 'Responsável' },
        { key: 'slaBreached', label: 'SLA Estourado', transform: (v) => v ? 'Sim' : 'Não' },
        { key: 'createdAt', label: 'Criado Em', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
    ],
    changes: [
        { key: 'code', label: 'Código' },
        { key: 'title', label: 'Título' },
        { key: 'status', label: 'Status' },
        { key: 'type', label: 'Tipo' },
        { key: 'riskLevel', label: 'Nível de Risco' },
        { key: 'impact', label: 'Impacto' },
        { key: 'requester.name', label: 'Solicitante' },
        { key: 'scheduledStart', label: 'Início Previsto', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
    ],
    risks: [
        { key: 'title', label: 'Título' },
        { key: 'category', label: 'Categoria' },
        { key: 'probability', label: 'Probabilidade' },
        { key: 'impact', label: 'Impacto' },
        { key: 'status', label: 'Status' },
        { key: 'owner.name', label: 'Responsável' },
    ],
    contracts: [
        { key: 'name', label: 'Nome' },
        { key: 'supplier.name', label: 'Fornecedor' },
        { key: 'status', label: 'Status' },
        { key: 'type', label: 'Tipo' },
        { key: 'value', label: 'Valor', transform: (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : '' },
        { key: 'startDate', label: 'Início', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
        { key: 'endDate', label: 'Fim', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
    ],
    suppliers: [
        { key: 'name', label: 'Nome' },
        { key: 'cnpj', label: 'CNPJ' },
        { key: 'status', label: 'Status' },
        { key: 'category', label: 'Categoria' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Telefone' },
    ],
    assets: [
        { key: 'name', label: 'Nome' },
        { key: 'type', label: 'Tipo' },
        { key: 'status', label: 'Status' },
        { key: 'serialNumber', label: 'Nº Série' },
        { key: 'acquisitionDate', label: 'Data Aquisição', transform: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '' },
        { key: 'value', label: 'Valor', transform: (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR')}` : '' },
    ],
};
