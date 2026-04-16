const config = {
    appName: 'G360 Enterprise',
    baseUrl: 'http://localhost:5176', // Vite G360 (predefinido; ver FRONTEND_URL / vite.config)
    colors: {
        primary: '#2563eb', // Blue
        secondary: '#475569', // Slate
        success: '#16a34a', // Green
        warning: '#f59e0b', // Amber
        error: '#dc2626', // Red
        bg: '#f1f5f9',
        card: '#ffffff',
        text: '#1e293b',
        textLight: '#64748b',
        border: '#e2e8f0'
    }
};

class EmailTemplateService {

    static getWrapper(title, content, preheader = '', accentColor = config.colors.primary) {
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <!--[if mso]>
    <style>
      table {border-collapse: collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;}
    </style>
    <![endif]-->
    <style>
        body { margin: 0; padding: 0; background-color: ${config.colors.bg}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.6; }
        .wrapper { width: 100%; table-layout: fixed; background-color: ${config.colors.bg}; padding-bottom: 60px; }
        .main-table { background-color: ${config.colors.card}; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        .header { background-color: ${accentColor}; padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 40px 32px; color: ${config.colors.text}; }
        .footer { text-align: center; padding: 32px 20px; color: ${config.colors.textLight}; font-size: 13px; }
        .footer a { color: ${config.colors.textLight}; text-decoration: underline; }
        .btn { display: inline-block; padding: 14px 28px; background-color: ${accentColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .info-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 24px 0; border: 1px solid ${config.colors.border}; border-radius: 8px; overflow: hidden; }
        .info-table td { padding: 16px 20px; border-bottom: 1px solid ${config.colors.border}; vertical-align: middle; }
        .info-table tr:last-child td { border-bottom: none; }
        .info-table tr:nth-child(even) { background-color: #f8fafc; }
        .label { color: ${config.colors.textLight}; font-weight: 600; font-size: 14px; width: 30%; }
        .value { color: ${config.colors.text}; font-size: 15px; font-weight: 500; }
        .highlight { color: ${accentColor}; font-weight: 700; }
        .highlight-box { background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 5px solid ${accentColor}; }
        h2 { margin-top: 0; color: ${config.colors.text}; font-size: 22px; margin-bottom: 16px; }
        p { margin: 0 0 16px 0; font-size: 16px; }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </div>
    <div class="wrapper">
        <div style="height: 40px;"></div>
        <table class="main-table" align="center" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td class="header">
                    <h1>${config.appName}</h1>
                </td>
            </tr>
            <tr>
                <td class="content">
                    ${content}
                </td>
            </tr>
        </table>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${config.appName}. Todos os direitos reservados.</p>
            <p>Gerado automaticamente pela plataforma G360.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    static getProjectAssignmentTemplate(userName, projectName, projectId, role) {
        const title = `Novo Projeto: ${projectName}`;
        const accent = config.colors.primary;
        const content = `
            <h2>Olá, ${userName} 👋</h2>
            <p>Você foi designado para uma nova responsabilidade.</p>
            
            <table class="info-table">
                <tr>
                    <td class="label">Projeto</td>
                    <td class="value highlight">${projectName}</td>
                </tr>
                <tr>
                    <td class="label">Sua Função</td>
                    <td class="value" style="font-size: 18px; font-weight: bold;">${role === 'TECH_LEAD' ? 'Tech Lead 👨‍💻' : 'Gerente 💼'}</td>
                </tr>
            </table>

            <p>Acesse a plataforma para ver o escopo e o cronograma.</p>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/projects/${projectId}" class="btn">Acessar Projeto</a>
            </div>
        `;
        return this.getWrapper(title, content, `Você é o novo ${role} do projeto ${projectName}`, accent);
    }

    static getTaskAssignmentTemplate(userName, taskTitle, priority, taskId) {
        let accent = config.colors.secondary;
        if (priority === 'HIGH' || priority === 'CRITICAL') accent = config.colors.error;
        if (priority === 'MEDIUM') accent = config.colors.warning;

        const title = `Nova Tarefa: ${taskTitle}`;
        const content = `
            <h2>Nova Tarefa Atribuída 📋</h2>
            <p>Olá, <strong>${userName}</strong>. Uma tarefa requer sua atenção imediata.</p>
            
            <table class="info-table">
                <tr>
                    <td class="label">Tarefa</td>
                    <td class="value" style="font-weight: 700;">${taskTitle}</td>
                </tr>
                <tr>
                    <td class="label">Prioridade</td>
                    <td class="value" style="color: ${accent}; font-weight: bold; text-transform: uppercase;">${priority}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/tasks/${taskId}" class="btn">Ver Detalhes da Tarefa</a>
            </div>
        `;
        return this.getWrapper(title, content, `Nova tarefa: ${taskTitle}`, accent);
    }

    static getTaskCompletionTemplate(userName, taskTitle, taskId) {
        const accent = config.colors.success;
        const title = `Tarefa Concluída: ${taskTitle}`;
        const content = `
            <h2 style="color: ${accent};">Tarefa Concluída! ✅</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>A tarefa foi marcada como concluída.</p>
            
            <div class="highlight-box">
                <p style="margin: 0; color: #15803d; font-weight: 600;">${taskTitle}</p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/tasks/${taskId}" class="btn">Verificar Conclusão</a>
            </div>
        `;
        return this.getWrapper(title, content, `Tarefa concluída: ${taskTitle}`, accent);
    }

    static getGmudApprovalTemplate(userName, gmud) {
        const accent = config.colors.warning;
        const title = `Aprovação Necessária: ${gmud.code}`;
        const content = `
            <h2>Aprovação de Mudança (GMUD) 🛡️</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Uma nova GMUD requer sua aprovação técnica ou gerencial.</p>

            <table class="info-table">
                <tr>
                    <td class="label">Código</td>
                    <td class="value">${gmud.code}</td>
                </tr>
                <tr>
                    <td class="label">Título</td>
                    <td class="value highlight">${gmud.title}</td>
                </tr>
                <tr>
                    <td class="label">Risco</td>
                    <td class="value" style="color: ${gmud.riskLevel === 'CRITICO' ? config.colors.error : config.colors.text}; font-weight: bold;">${gmud.riskLevel}</td>
                </tr>
                <tr>
                    <td class="label">Início</td>
                    <td class="value">${new Date(gmud.scheduledStart).toLocaleString('pt-BR')}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/changes?id=${gmud.id}&action=approve" class="btn">Revisar e Aprovar</a>
            </div>
        `;
        return this.getWrapper(title, content, `Aprovação necessária para GMUD ${gmud.code}`, accent);
    }

    static getContractExpiryTemplate(userName, identifier, date) {
        const accent = config.colors.error; // Critical alert
        const title = `Alerta de Vencimento: ${identifier}`;
        const content = `
            <h2 style="color: ${accent};">Contrato Vencendo ⏳</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Atenção: O contrato abaixo está próximo do vencimento.</p>

            <table class="info-table">
                <tr>
                    <td class="label">Contrato</td>
                    <td class="value highlight">${identifier}</td>
                </tr>
                <tr>
                    <td class="label">Data de Vencimento</td>
                    <td class="value" style="color: ${accent}; font-weight: bold; font-size: 18px;">${new Date(date).toLocaleDateString()}</td>
                </tr>
            </table>

            <p style="text-align: center; color: ${config.colors.textLight};">Verifique se é necessário renovar ou encerrar este contrato.</p>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/contracts" class="btn">Gerenciar Contrato</a>
            </div>
        `;
        return this.getWrapper(title, content, `Contrato vencendo em breve`, accent);
    }

    static getLicenseExpiryTemplate(userName, count, licenses) {
        const accent = config.colors.error;
        const title = `${count} Licenças Expirando`;
        const listItems = licenses.map(l =>
            `<li style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${l.name}</strong> 
                    <span style="color: ${accent}; font-weight:bold;">${new Date(l.expirationDate).toLocaleDateString()}</span>
                </div>
             </li>`
        ).join('');

        const content = `
            <h2 style="color: ${accent};">Alerta de Licenças 💿</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Detectamos que <strong>${count} licenças</strong> expirarão em breve.</p>

            <div class="highlight-box" style="border-left-color: ${accent}; padding: 0 24px;">
                <ul style="list-style: none; padding: 0; margin: 20px 0;">
                    ${listItems}
                </ul>
                ${count > 10 ? `<p style="text-align:center; font-size: 13px; color: ${config.colors.textLight};">... e outras.</p>` : ''}
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/assets/licenses" class="btn">Renovar Licenças</a>
            </div>
        `;
        return this.getWrapper(title, content, `Alerta: ${count} licenças expirando`, accent);
    }

    static getProjectUpdateTemplate(userName, projectName, projectId, changes) {
        const accent = config.colors.primary;
        const title = `Atualização do Projeto: ${projectName}`;
        const content = `
            <h2>Atualização de Projeto 📊</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Atualizações recentes no projeto <strong>${projectName}</strong>:</p>
            
            <div class="highlight-box">
                <p style="margin: 0; color: ${config.colors.text}; white-space: pre-wrap; font-family: monospace;">${changes}</p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/projects/${projectId}" class="btn">Ver no Painel</a>
            </div>
        `;
        return this.getWrapper(title, content, `Atualização no projeto ${projectName}`, accent);
    }

    static getProjectApprovalOutcomeTemplate(userName, projectName, projectId, status, reason) {
        const isApproved = status === 'APPROVED';
        const accent = isApproved ? config.colors.success : config.colors.error;
        const title = `Projeto ${isApproved ? 'Aprovado' : 'Rejeitado'}: ${projectName}`;

        const content = `
            <h2 style="color: ${accent};">Projeto ${isApproved ? 'Aprovado! 🚀' : 'Não Aprovado 🛑'}</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>O status do projeto <strong>${projectName}</strong> foi atualizado.</p>
            
            ${reason ? `
            <div class="highlight-box" style="border-left-color: ${accent}; background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'};">
                <strong style="display:block; margin-bottom: 8px; color: ${accent};">Motivo/Comentário:</strong>
                <p style="margin: 0;">${reason}</p>
            </div>` : ''}

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/projects/${projectId}" class="btn">Acessar Projeto</a>
            </div>
        `;
        return this.getWrapper(title, content, `Resultado da aprovação: ${projectName}`, accent);
    }

    static getGmudConclusionTemplate(userName, gmudCode, gmudTitle, status, outcomeNotes) {
        const isSuccess = status === 'EXECUTED';
        const accent = isSuccess ? config.colors.success : config.colors.error;
        const title = `GMUD Finalizada: ${gmudCode}`;

        const content = `
            <h2 style="color: ${accent};">GMUD ${isSuccess ? 'Executada com Sucesso' : 'Falhou / Cancelada'}</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>A GMUD foi finalizada.</p>
            
            <table class="info-table">
                <tr>
                    <td class="label">Código</td>
                    <td class="value">${gmudCode}</td>
                </tr>
                 <tr>
                    <td class="label">Título</td>
                    <td class="value bold">${gmudTitle}</td>
                </tr>
                <tr>
                    <td class="label">Status Final</td>
                    <td class="value" style="color: ${accent}; font-weight: bold;">${status}</td>
                </tr>
                ${outcomeNotes ? `
                <tr>
                    <td class="label">Notas</td>
                    <td class="value">${outcomeNotes}</td>
                </tr>` : ''}
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/changes" class="btn">Ver GMUD</a>
            </div>
        `;
        return this.getWrapper(title, content, `GMUD ${gmudCode} finalizada`, accent);
    }

    static getIncidentCreatedTemplate(userName, incident) {
        const accent = config.colors.warning;
        const title = `Incidente Criado: ${incident.code}`;
        const content = `
            <h2>Incidente Registrado 🎫</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Recebemos o registro do seguinte incidente:</p>

            <table class="info-table">
                <tr>
                    <td class="label">Código</td>
                    <td class="value highlight">${incident.code}</td>
                </tr>
                <tr>
                    <td class="label">Título</td>
                    <td class="value">${incident.title}</td>
                </tr>
                <tr>
                    <td class="label">Prioridade</td>
                    <td class="value" style="font-weight: bold;">${incident.priority}</td>
                </tr>
            </table>

            <p>Estamos analisando e você será notificado sobre o progresso.</p>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/incidents?id=${incident.id}" class="btn">Acompanhar</a>
            </div>
        `;
        return this.getWrapper(title, content, `Novo incidente: ${incident.code}`, accent);
    }

    static getIncidentResolvedTemplate(userName, incident, solution) {
        const accent = config.colors.success;
        const title = `Incidente Resolvido: ${incident.code}`;
        const content = `
            <h2 style="color: ${accent};">Incidente Resolvido ✅</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>O incidente <strong>${incident.code}</strong> foi resolvido pela nossa equipe.</p>

            <div class="highlight-box" style="border-left-color: ${accent}; background-color: #f0fdf4;">
                <strong style="color: #166534; display: block; margin-bottom: 8px;">Solução Aplicada:</strong>
                <p style="margin: 0; color: #166534;">${solution}</p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/incidents?id=${incident.id}" class="btn">Ver Detalhes</a>
            </div>
        `;
        return this.getWrapper(title, content, `Incidente resolvido: ${incident.code}`, accent);
    }

    static getNewCommentTemplate(userName, moduleName, entityTitle, commentAuthor, commentBody, link) {
        const accent = config.colors.primary;
        const title = `Novo Comentário: ${entityTitle}`;
        const content = `
            <h2>Novo Comentário 💬</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p><strong>${commentAuthor}</strong> comentou em <strong>${entityTitle}</strong>.</p>

            <div class="highlight-box">
                <p style="margin: 0; font-style: italic; color: ${config.colors.text};">"${commentBody}"</p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}${link}" class="btn">Responder</a>
            </div>
        `;
        return this.getWrapper(title, content, `Novo comentário em ${entityTitle}`, accent);
    }

    static getContractActionTemplate(userName, contractNumber, supplierName, actionType, details) {
        const accent = config.colors.primary;
        const title = `Contrato ${actionType}: ${contractNumber}`;
        const content = `
            <h2>Atualização de Contrato 📄</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>O contrato com <strong>${supplierName}</strong> foi atualizado.</p>

            <table class="info-table">
                <tr>
                    <td class="label">Contrato</td>
                    <td class="value highlight">${contractNumber}</td>
                </tr>
                <tr>
                    <td class="label">Ação</td>
                    <td class="value" style="font-weight: bold; text-transform: uppercase;">${actionType}</td>
                </tr>
                <tr>
                    <td class="label">Detalhes</td>
                    <td class="value">${details}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/contracts" class="btn">Ver Contrato</a>
            </div>
        `;
        return this.getWrapper(title, content, `Contrato ${actionType}: ${contractNumber}`, accent);
    }

    static getExpenseCreatedTemplate(userName, amount, supplier, description, link) {
        const accent = config.colors.primary;
        const title = `Nova Despesa: R$ ${amount}`;
        const content = `
            <h2>Nova Despesa Registrada 💸</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Uma nova despesa foi lançada no seu centro de custo.</p>

            <div style="text-align: center; margin: 32px 0;">
                <span style="font-size: 32px; font-weight: 800; color: ${accent};">R$ ${amount}</span>
            </div>

            <table class="info-table">
                <tr>
                    <td class="label">Fornecedor</td>
                    <td class="value">${supplier || 'N/A'}</td>
                </tr>
                <tr>
                    <td class="label">Descrição</td>
                    <td class="value">${description}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}${link}" class="btn">Aprovar / Revisar</a>
            </div>
        `;
        return this.getWrapper(title, content, `Nova despesa de R$ ${amount}`, accent);
    }

    static getBudgetOverflowTemplate(userName, costCenterName, amount, budget, overflowAmount) {
        const accent = config.colors.error;
        const title = `ALERTA: Estouro de Orçamento - ${costCenterName}`;
        const content = `
            <h2 style="color: ${accent};">Estouro de Orçamento 🚨</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Atenção! O Centro de Custo <strong>${costCenterName}</strong> excedeu o limite orçamentário.</p>

            <div class="highlight-box" style="border-left-color: ${accent}; background-color: #fef2f2;">
                <p style="text-align: center; font-size: 14px; margin-bottom: 8px; color: ${config.colors.textLight};">Excedente Atual</p>
                <div style="text-align: center; font-size: 28px; font-weight: 800; color: ${accent};">R$ ${overflowAmount}</div>
            </div>

            <table class="info-table">
                <tr>
                    <td class="label">Orçamento Aprovado</td>
                    <td class="value">R$ ${budget}</td>
                </tr>
                <tr>
                    <td class="label">Total Gasto</td>
                    <td class="value" style="font-weight: bold;">R$ ${amount}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}/finance" class="btn" style="background-color: ${accent};">Verificar Imediatamente</a>
            </div>
        `;
        return this.getWrapper(title, content, `Alerta de orçamento: ${costCenterName}`, accent);
    }

    static getTicketCreatedTemplate(userName, ticketCode, ticketTitle, link) {
        const accent = config.colors.primary;
        const title = `Chamado aberto: ${ticketCode}`;
        const content = `
            <h2>Chamado registrado</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Seu chamado foi aberto com sucesso na Central de Atendimento.</p>

            <table class="info-table">
                <tr>
                    <td class="label">Código</td>
                    <td class="value highlight">${ticketCode}</td>
                </tr>
                <tr>
                    <td class="label">Título</td>
                    <td class="value">${ticketTitle}</td>
                </tr>
            </table>

            <p>Para acompanhar ou responder por e-mail, <strong>mantenha o código <code>${ticketCode}</code> no assunto</strong> da mensagem (responder a este e-mail já preserva o código).</p>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}${link}" class="btn">Abrir chamado</a>
            </div>
        `;
        return this.getWrapper(title, content, `Chamado ${ticketCode} aberto`, accent);
    }

    static getTicketMessageTemplate(userName, ticketCode, messageBody, link) {
        const accent = config.colors.primary;
        const title = `Nova resposta no chamado ${ticketCode}`;
        const safeBody = (messageBody || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const content = `
            <h2>Nova mensagem no seu chamado</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>A equipe respondeu ao chamado <strong>${ticketCode}</strong>:</p>

            <div class="highlight-box" style="white-space: pre-wrap; font-size: 15px;">${safeBody}</div>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}${link}" class="btn">Ver chamado</a>
            </div>
        `;
        return this.getWrapper(title, content, `Resposta no chamado ${ticketCode}`, accent);
    }

    static getTicketUpdateTemplate(userName, ticketCode, ticketTitle, newStatus, link) {
        let accent = config.colors.primary;
        if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') accent = config.colors.success;
        if (newStatus === 'IN_PROGRESS') accent = config.colors.warning;

        const title = `Atualização de Chamado: ${ticketCode}`;
        const content = `
            <h2>Atualização de Chamado 🎫</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            <p>Seu chamado <strong>${ticketCode} - ${ticketTitle}</strong> teve o status atualizado na Central de Atendimento.</p>

            <table class="info-table">
                <tr>
                    <td class="label">Novo Status</td>
                    <td class="value highlight" style="color: ${accent}">${newStatus}</td>
                </tr>
            </table>

            <div style="text-align: center; margin-top: 32px;">
                <a href="${config.baseUrl}${link}" class="btn">Visualizar Chamado</a>
            </div>
        `;
        return this.getWrapper(title, content, `Seu chamado ${ticketCode} mudou para ${newStatus}`, accent);
    }

    /** E-mail genérico para alertas (SLA, incidentes, etc.) */
    static getSimpleAlertEmail(userName, heading, detailHtml, linkPath, accentColor = config.colors.error) {
        const url = linkPath.startsWith('http') ? linkPath : `${config.baseUrl}${linkPath}`;
        const content = `
            <h2>${heading}</h2>
            <p>Olá, <strong>${userName}</strong>.</p>
            ${detailHtml}
            <div style="text-align: center; margin-top: 32px;">
                <a href="${url}" class="btn">Abrir no G360</a>
            </div>
        `;
        return this.getWrapper(heading, content, heading, accentColor);
    }
}

module.exports = EmailTemplateService;

