import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoImg from '../../assets/liotecnica_logo_official.png';

// ...

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ThemeContext } from '../../contexts/ThemeContext';

const TeamProjectsStatusReport = () => {
    const navigate = useNavigate();
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Theme Styles Calculation
    const themeStyles = useMemo(() => {
        const isDark = mode === 'dark';
        return {
            pageBackground: isDark ? '#0f1419' : '#f8fafc',
            textPrimary: isDark ? '#f1f5f9' : '#0f172a',
            textSecondary: isDark ? '#94a3b8' : '#475569',
            textMuted: isDark ? '#64748b' : '#64748b',
            cardBg: isDark ? '#161d26' : '#ffffff',
            cardBorder: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)',
            inputBg: isDark ? '#1c2632' : '#f1f5f9',
            tableHeaderBg: isDark ? '#1c2632' : '#f8fafc',
            tableRowHover: isDark ? 'rgba(37, 99, 235, 0.05)' : 'rgba(37, 99, 235, 0.08)',
            expandedRowBg: isDark ? '#1c2632' : '#f1f5f9',
            divider: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)',
            ambientGradient: isDark ?
                `radial-gradient(ellipse at 20% 20%, rgba(37, 99, 235, 0.06) 0%, transparent 50%),
                 radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.04) 0%, transparent 50%)` :
                `radial-gradient(ellipse at 20% 20%, rgba(37, 99, 235, 0.04) 0%, transparent 50%),
                 radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)`
        };
    }, [mode]);

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState({});

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper functions for PDF generation
    const getInitials = (name) => {
        if (!name) return 'NA';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getStatusConfig = (status) => {
        const configs = {
            'PLANNING': {
                label: 'Planning',
                class: 'planning',
                color: [245, 158, 11], // amber
                bgColor: [245, 158, 11, 0.15],
                avatarColor: [245, 158, 11],
                hex: '#f59e0b',
                textColor: [255, 255, 255]
            },
            'IN_PROGRESS': {
                label: 'Ativo',
                class: 'active',
                color: [16, 185, 129], // emerald
                bgColor: [16, 185, 129, 0.15],
                avatarColor: [16, 185, 129],
                hex: '#10b981',
                textColor: [255, 255, 255]
            },
            'ON_HOLD': {
                label: 'Em Risco',
                class: 'risk',
                color: [244, 63, 94], // rose
                bgColor: [244, 63, 94, 0.15],
                avatarColor: [244, 63, 94],
                hex: '#f43f5e',
                textColor: [255, 255, 255]
            },
            'COMPLETED': {
                label: 'Concluído',
                class: 'active',
                color: [139, 92, 246], // violet
                bgColor: [139, 92, 246, 0.15],
                avatarColor: [139, 92, 246],
                hex: '#3b82f6',
                textColor: [255, 255, 255]
            },
            'CANCELLED': {
                label: 'Cancelado',
                class: 'risk',
                color: [100, 116, 139],
                bgColor: [100, 116, 139, 0.15],
                avatarColor: [100, 116, 139],
                hex: '#64748b',
                textColor: [255, 255, 255]
            }
        };
        return configs[status] || {
            label: status,
            class: 'planning',
            color: [100, 116, 139],
            bgColor: [100, 116, 139, 0.15],
            avatarColor: [100, 116, 139],
            hex: '#64748b',
            textColor: [255, 255, 255]
        };
    };

    const handleExportPDF = () => {
        try {
            console.log('Starting PDF Executive Export (Landscape)...', { projectCount: filteredProjects.length });

            if (filteredProjects.length === 0) {
                alert('Nenhum projeto para exportar. Verifique os filtros aplicados.');
                return;
            }

            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 14;

            // Brand Colors (Professional Light Theme)
            const brand = {
                slate900: [15, 23, 42],
                slate800: [30, 41, 59],
                slate600: [71, 85, 105],
                slate500: [100, 116, 139],
                slate400: [148, 163, 184],
                slate200: [226, 232, 240], // dividers
                slate50: [248, 250, 252], // backgrounds
                indigo: [99, 102, 241],
                violet: [139, 92, 246]
            };

            // --- 1. COVER PAGE ---
            const generateCoverPage = () => {
                // Background Gradient Accent
                doc.setFillColor(...brand.indigo);
                doc.rect(0, 0, pageWidth, 6, 'F');
                doc.setFillColor(...brand.violet);
                doc.rect(pageWidth / 2, 0, pageWidth / 2, 6, 'F');

                // Logo Container
                const logoWidth = 40;
                const logoHeight = 12;
                const logoY = 45;
                const logoX = (pageWidth - logoWidth) / 2;

                try {
                    doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
                } catch (e) {
                    // Fallback if image fails
                    console.error('Error adding logo:', e);
                }

                // Title
                doc.setTextColor(...brand.slate900);
                doc.setFontSize(36);
                doc.setFont('helvetica', 'bold');
                doc.text('Status Report', pageWidth / 2, logoY + 45, { align: 'center' });

                doc.setTextColor(...brand.slate600);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'normal');
                doc.text('Relatório Executivo de Projetos', pageWidth / 2, logoY + 54, { align: 'center' });

                // Divider Line
                doc.setDrawColor(...brand.slate200);
                doc.setLineWidth(0.5);
                doc.line(pageWidth / 2 - 60, logoY + 65, pageWidth / 2 + 60, logoY + 65);

                // Meta Info (Date, Company)
                const reportDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                doc.setFontSize(10);
                doc.setTextColor(...brand.slate500);
                doc.text(reportDate, pageWidth / 2, logoY + 75, { align: 'center' });

                doc.setFontSize(9);
                doc.text('Liotecnica • Gestão Integrada', pageWidth / 2, pageHeight - 15, { align: 'center' });
            };

            // --- 2. SUMMARY DASHBOARD (New Page) ---
            const generateSummaryPage = () => {
                doc.addPage();
                let y = 15;

                // Page Title
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...brand.slate800);
                doc.text('Resumo Executivo', margin, y);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...brand.slate500);
                doc.text('Visão geral dos indicadores de status', margin, y + 5);

                y += 15;

                // KPI Cards
                const stats = {
                    total: filteredProjects.length,
                    active: filteredProjects.filter(p => p.status === 'IN_PROGRESS').length,
                    risk: filteredProjects.filter(p => p.status === 'ON_HOLD').length,
                    completed: filteredProjects.filter(p => p.status === 'COMPLETED').length
                };

                const cardWidth = 60;
                const cardHeight = 24;
                const gap = 10;
                const totalCardsWidth = (cardWidth * 4) + (gap * 3);
                const startX = (pageWidth - totalCardsWidth) / 2;

                const cards = [
                    { label: 'Total', value: stats.total, color: brand.indigo },
                    { label: 'Ativos', value: stats.active, color: [16, 185, 129] }, // Emerald
                    { label: 'Em Risco', value: stats.risk, color: [244, 63, 94] },   // Rose
                    { label: 'Concluídos', value: stats.completed, color: brand.violet }
                ];

                cards.forEach((card, i) => {
                    const x = startX + i * (cardWidth + gap);
                    // Bg
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(...brand.slate200);
                    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

                    // Left strip
                    doc.setFillColor(...card.color);
                    doc.roundedRect(x, y, 2, cardHeight, 3, 3, 'F');
                    doc.rect(x + 1, y, 2, cardHeight, 'F'); // Square off right side of strip

                    // Value
                    doc.setTextColor(...brand.slate900);
                    doc.setFontSize(18);
                    doc.setFont('helvetica', 'bold');
                    doc.text(String(card.value), x + 10, y + 10);

                    // Label
                    doc.setTextColor(...brand.slate500);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text(card.label.toUpperCase(), x + 10, y + 18);
                });

                return y + cardHeight + 15;
            };

            // --- 3. PROJECT DATA TABLE ---
            const generateTable = (startY) => {
                const tableBody = filteredProjects.map(project => {
                    const statusConfig = getStatusConfig(project.status);

                    // Format dates
                    const startDate = project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '-';
                    const endDate = project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '-';

                    // Get last follow-up
                    const lastFollowUp = project.followUps && project.followUps.length > 0
                        ? project.followUps[0] // Assuming sorted descending
                        : null;

                    const followUpText = lastFollowUp
                        ? `${format(new Date(lastFollowUp.date), 'dd/MM')}: ${lastFollowUp.highlights || lastFollowUp.description || ''}`
                        : '-';

                    return [
                        { content: project.name + `\n${project.code}`, styles: { fontStyle: 'bold' } },
                        statusConfig, // Pass full config object to raw cell for hooks
                        startDate,
                        endDate,
                        project.techLead?.name || '-',
                        { value: project.progress || 0 }, // Pass object for progress bar potential
                        followUpText
                    ];
                });

                autoTable(doc, {
                    startY: startY,
                    head: [['PROJETO', 'STATUS', 'INÍCIO', 'FIM', 'TECH LEAD', '%', 'ÚLTIMO FOLLOW-UP']],
                    body: tableBody,
                    theme: 'plain', // We'll draw our own lines/backgrounds
                    rowPageBreak: 'avoid', // Prevent rows from splitting across pages
                    margin: { top: 20, bottom: 20, left: margin, right: margin },
                    styles: {
                        fontSize: 9,
                        cellPadding: 3,
                        minCellHeight: 9,
                        valign: 'middle',
                        lineColor: brand.slate200,
                        lineWidth: 0,
                        overflow: 'linebreak'
                    },
                    headStyles: {
                        fillColor: brand.slate50,
                        textColor: brand.slate500,
                        fontSize: 10,
                        fontStyle: 'bold',
                        halign: 'left'
                    },
                    columnStyles: {
                        0: { cellWidth: 45 }, // PROJETO
                        1: { cellWidth: 22, halign: 'center' }, // STATUS
                        2: { cellWidth: 18, halign: 'center' }, // INÍCIO
                        3: { cellWidth: 18, halign: 'center' }, // FIM
                        4: { cellWidth: 28 }, // TECH LEAD
                        5: { cellWidth: 12, halign: 'center' }, // %
                        6: { cellWidth: 'auto' } // ÚLTIMO FOLLOW-UP
                    },
                    didParseCell: (data) => {
                        // Custom formatting for displaying text if we don't draw it
                        if (data.section === 'body') {
                            if (data.column.index === 1) { // Status Column
                                data.cell.text = '';
                            }
                            if (data.column.index === 5) { // Progress Column
                                data.cell.text = '';
                            }
                        }
                    },
                    didDrawCell: (data) => {
                        // Draw bottom border for every row
                        if (data.section === 'body') {
                            doc.setDrawColor(...brand.slate200);
                            doc.setLineWidth(0.1);
                            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                        }

                        // Custom Badge for Status (Col 1)
                        if (data.section === 'body' && data.column.index === 1) {
                            const config = data.cell.raw; // This is the statusConfig object
                            const cell = data.cell;

                            // Badge Rect
                            const badgeWidth = 18;
                            const badgeHeight = 5;
                            const x = cell.x + (cell.width - badgeWidth) / 2;
                            const y = cell.y + (cell.height - badgeHeight) / 2;

                            doc.setFillColor(...config.color);
                            doc.roundedRect(x, y, badgeWidth, badgeHeight, 2, 2, 'F');

                            // Badge Text
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(5);
                            doc.setFont('helvetica', 'bold');
                            doc.text(config.label.toUpperCase(), x + badgeWidth / 2, y + badgeHeight - 1.5, { align: 'center' });
                        }

                        // Progress Bar (Col 5)
                        if (data.section === 'body' && data.column.index === 5) {
                            const cell = data.cell;
                            const progress = data.cell.raw.value;

                            // Bar container (grey)
                            const barWidth = 10;
                            const barHeight = 4;
                            const x = cell.x + (cell.width - barWidth) / 2;
                            const y = cell.y + (cell.height - barHeight) / 2;

                            doc.setFillColor(226, 232, 240); // Slate 200
                            doc.roundedRect(x, y, barWidth, barHeight, 2, 2, 'F');

                            // Fill (based on percentage)
                            if (progress > 0) {
                                const fillWidth = (barWidth * progress) / 100;

                                // Color logic
                                if (progress === 100) doc.setFillColor(16, 185, 129); // Emerald
                                else if (progress < 30) doc.setFillColor(245, 158, 11); // Amber
                                else doc.setFillColor(99, 102, 241); // Indigo

                                doc.roundedRect(x, y, fillWidth, barHeight, 2, 2, 'F');
                            }

                            // Text below bar
                            doc.setTextColor(...brand.slate500);
                            doc.setFontSize(6);
                            doc.text(`${progress}%`, cell.x + cell.width / 2, y + barHeight + 3, { align: 'center' });
                        }
                    },
                    didDrawPage: (data) => {
                        // Header on data pages
                        if (doc.internal.getNumberOfPages() > 1) {
                            doc.setFillColor(...brand.slate50);
                            doc.rect(0, 0, pageWidth, 15, 'F');
                            doc.setFontSize(8);
                            doc.setTextColor(...brand.slate400);
                            doc.text('Relatório de Status', margin, 10);

                            // Page Number
                            const str = 'Pág ' + doc.internal.getNumberOfPages();
                            doc.text(str, pageWidth - margin, 10, { align: 'right' });
                        }
                    }
                });
            };

            // === EXECUTE ===
            generateCoverPage();
            const tableY = generateSummaryPage();
            generateTable(tableY);

            console.log('Saving PDF...');
            doc.save(`Status_Report_Executive_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            console.log('PDF export completed successfully');

        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert(`Erro ao exportar PDF: ${error.message}`);
        }
    };


    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const filteredProjects = projects.filter(project => {
        const matchesStatus = filterStatus === 'ALL' || project.status === filterStatus;
        const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.techLead?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: themeStyles.pageBackground,
            position: 'relative',
            transition: 'background 0.3s ease'
        }}>
            {/* Ambient Background */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                background: themeStyles.ambientGradient
            }} />

            {/* Page Content */}
            <div style={{ position: 'relative', zIndex: 1, padding: '32px' }}>
                {/* Page Header */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: themeStyles.textPrimary, marginBottom: '4px' }}>
                        Status Report
                    </h1>
                    <p style={{ color: themeStyles.textMuted, fontSize: '14px' }}>
                        Visão consolidada dos follow-ups de todos os projetos
                    </p>

                    {/* Export Button */}
                    <div style={{ marginTop: '16px' }}>
                        <button
                            onClick={handleExportPDF}
                            style={{
                                padding: '10px 18px',
                                background: 'transparent',
                                color: themeStyles.textMuted,
                                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'; e.currentTarget.style.color = themeStyles.textMuted; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="material-icons-round" style={{ fontSize: '18px', color: 'inherit' }}>picture_as_pdf</span>
                            Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Filter Section */}
                <div style={{
                    background: themeStyles.cardBg,
                    border: themeStyles.cardBorder,
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ flex: 1, position: 'relative', maxWidth: '400px' }}>
                        <span className="material-icons-round" style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '20px',
                            color: themeStyles.textMuted
                        }}>search</span>
                        <input
                            type="text"
                            placeholder="Filtrar por nome, código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 12px 10px 42px',
                                background: themeStyles.inputBg,
                                border: themeStyles.cardBorder,
                                borderRadius: '12px',
                                fontSize: '14px',
                                color: themeStyles.textPrimary,
                                fontFamily: 'inherit',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.06)'} // This hardcoded color might need adjustment for light mode, but border is subtle
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            minWidth: '160px',
                            padding: '10px 12px',
                            background: themeStyles.inputBg,
                            border: themeStyles.cardBorder,
                            borderRadius: '12px',
                            fontSize: '14px',
                            color: themeStyles.textPrimary,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="ALL">Todos os Status</option>
                        <option value="PLANNING">Planejamento</option>
                        <option value="IN_PROGRESS">Em Progresso</option>
                        <option value="ON_HOLD">Em Risco</option>
                        <option value="COMPLETED">Concluído</option>
                    </select>
                </div>

                {/* Table Section */}
                <div style={{
                    background: themeStyles.cardBg,
                    border: themeStyles.cardBorder,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: themeStyles.tableHeaderBg }}>
                            <tr>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder,
                                    width: '250px' // Reduced width for Start/End date space
                                }}>Projeto</th>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder,
                                    width: '100px'
                                }}>Início</th>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder,
                                    width: '100px'
                                }}>Fim</th>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder
                                }}>Tech Lead</th>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder
                                }}>Status</th>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder,
                                    width: '80px'
                                }}>Prog.</th>
                                <th style={{
                                    padding: '14px 20px',
                                    textAlign: 'left',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: themeStyles.textMuted,
                                    borderBottom: themeStyles.cardBorder
                                }}>Último Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                                        <div style={{ color: themeStyles.textMuted }}>Carregando...</div>
                                    </td>
                                </tr>
                            ) : filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: themeStyles.textMuted }}>
                                        Nenhum projeto encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map((project, idx) => {
                                    const latestFollowUp = project.followUps && project.followUps[0];
                                    const isExpanded = expandedRows[project.id];
                                    const statusConfig = getStatusConfig(project.status);
                                    const followUpDate = latestFollowUp ? format(new Date(latestFollowUp.date), "dd/MM/yyyy") : '-';
                                    const isLastRow = idx === filteredProjects.length - 1;

                                    return (
                                        <React.Fragment key={project.id}>
                                            {/* Main Row */}
                                            <tr
                                                onClick={() => toggleRow(project.id)}
                                                style={{
                                                    transition: 'background 0.2s',
                                                    cursor: 'pointer',
                                                    borderBottom: isExpanded || isLastRow ? 'none' : themeStyles.cardBorder
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = themeStyles.tableRowHover}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <button
                                                            style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                borderRadius: '8px',
                                                                background: themeStyles.inputBg,
                                                                border: themeStyles.cardBorder,
                                                                color: themeStyles.textMuted,
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleRow(project.id);
                                                            }}
                                                        >
                                                            <span className="material-icons-round" style={{ fontSize: '18px' }}>
                                                                {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                                                            </span>
                                                        </button>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '14px', color: themeStyles.textPrimary }}>{project.name}</div>
                                                            <div style={{ fontSize: '12px', color: themeStyles.textMuted }}>{project.code}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center', fontSize: '13px', color: themeStyles.textSecondary }}>
                                                    {project.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center', fontSize: '13px', color: themeStyles.textSecondary }}>
                                                    {project.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                                            color: 'white',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {project.techLead?.name?.substring(0, 2).toUpperCase() || 'TL'}
                                                        </div>
                                                        <span style={{ fontSize: '13px', color: themeStyles.textSecondary }}>
                                                            {project.techLead?.name || 'Não atribuído'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '5px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3px',
                                                        background: `${statusConfig.hex}26`,
                                                        color: statusConfig.hex
                                                    }}>
                                                        <span style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            background: statusConfig.hex
                                                        }} />
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: themeStyles.textPrimary }}>
                                                        {project.progress || 0}%
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                                                    {latestFollowUp ? (
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: themeStyles.textPrimary, marginBottom: '2px' }}>
                                                                {followUpDate}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: themeStyles.textMuted,
                                                                maxWidth: '200px',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {latestFollowUp.highlights || 'Sem destaques'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '12px', color: themeStyles.textMuted, fontStyle: 'italic' }}>
                                                            Nenhum registro
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Row */}
                                            {isExpanded && (
                                                <tr style={{ background: themeStyles.expandedRowBg }}>
                                                    <td colSpan="7" style={{ padding: 0, borderBottom: isLastRow ? 'none' : themeStyles.cardBorder }}>
                                                        <div style={{ padding: '20px 20px 20px 60px' }}>
                                                            {/* Detailed view of follow-ups */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                                {project.followUps && project.followUps.length > 0 ? (
                                                                    project.followUps.slice(0, 3).map((followUp, fuIdx) => (
                                                                        <div key={fuIdx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                                                                            {/* Timeline Line */}
                                                                            {fuIdx < project.followUps.slice(0, 3).length - 1 && (
                                                                                <div style={{
                                                                                    position: 'absolute',
                                                                                    left: '15px',
                                                                                    top: '32px',
                                                                                    bottom: '-16px',
                                                                                    width: '2px',
                                                                                    background: themeStyles.divider,
                                                                                    zIndex: 0
                                                                                }} />
                                                                            )}

                                                                            {/* Marker */}
                                                                            <div style={{
                                                                                width: '32px',
                                                                                height: '32px',
                                                                                borderRadius: '50%',
                                                                                background: 'rgba(6, 182, 212, 0.15)',
                                                                                border: '2px solid #06b6d4',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                flexShrink: 0,
                                                                                zIndex: 1
                                                                            }}>
                                                                                <span className="material-icons-round" style={{ fontSize: '16px', color: '#06b6d4' }}>
                                                                                    flag
                                                                                </span>
                                                                            </div>

                                                                            {/* Details */}
                                                                            <div style={{
                                                                                flex: 1,
                                                                                background: themeStyles.cardBg,
                                                                                border: themeStyles.cardBorder,
                                                                                borderRadius: '12px',
                                                                                padding: '14px 16px'
                                                                            }}>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: themeStyles.textPrimary }}>
                                                                                        Follow-up {format(new Date(followUp.date), 'dd/MM/yyyy')}
                                                                                    </div>
                                                                                    <div style={{ fontSize: '11px', color: themeStyles.textMuted }}>
                                                                                        {project.techLead?.name || 'N/A'}
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ fontSize: '13px', color: themeStyles.textSecondary, lineHeight: 1.5 }}>
                                                                                    {followUp.highlights || 'Sem destaques registrados'}
                                                                                </div>
                                                                                {(followUp.risks || followUp.nextSteps) && (
                                                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                                                                                        {followUp.risks && (
                                                                                            <span style={{
                                                                                                fontSize: '10px',
                                                                                                padding: '3px 8px',
                                                                                                borderRadius: '10px',
                                                                                                fontWeight: 600,
                                                                                                background: 'rgba(244, 63, 94, 0.15)',
                                                                                                color: '#f43f5e'
                                                                                            }}>Risco</span>
                                                                                        )}
                                                                                        {followUp.nextSteps && (
                                                                                            <span style={{
                                                                                                fontSize: '10px',
                                                                                                padding: '3px 8px',
                                                                                                borderRadius: '10px',
                                                                                                fontWeight: 600,
                                                                                                background: 'rgba(37, 99, 235, 0.15)',
                                                                                                color: '#2563eb'
                                                                                            }}>Próximos Passos</span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div style={{ fontSize: '13px', color: themeStyles.textMuted, fontStyle: 'italic', paddingLeft: '60px' }}>
                                                                        Nenhum follow-up registrado neste projeto.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    );
};

export default TeamProjectsStatusReport;
