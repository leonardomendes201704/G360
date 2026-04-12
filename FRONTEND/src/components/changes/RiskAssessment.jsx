import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

const RiskAssessment = ({ value, onChange, disabled }) => {
    const { mode } = useContext(ThemeContext);

    // Default answers if none provided
    const [answers, setAnswers] = useState(value || {
        affectsProduction: false,
        hasDowntime: false,
        tested: true,
        easyRollback: true
    });

    useEffect(() => {
        if (value) {
            setAnswers(value);
        }
    }, [value]);

    const handleChange = (key, val) => {
        const newAnswers = { ...answers, [key]: val };
        setAnswers(newAnswers);
        onChange(newAnswers);
    };

    const calculateRiskScore = () => {
        let score = 0;
        if (answers.affectsProduction) score += 5;
        if (answers.hasDowntime) score += 10;
        if (!answers.tested) score += 5;
        if (!answers.easyRollback) score += 5;
        return score;
    };

    const getRiskLabel = () => {
        const score = calculateRiskScore();
        if (score <= 5) return { label: 'BAIXO', color: '#10b981' };
        if (score <= 10) return { label: 'MEDIO', color: '#f59e0b' };
        if (score <= 15) return { label: 'ALTO', color: '#f97316' };
        return { label: 'CRITICO', color: '#ef4444' };
    };

    const risk = getRiskLabel();

    const QuestionRow = ({ label, prop }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--modal-border)'
        }}>
            <span style={{ fontSize: '14px', color: 'var(--modal-text-secondary)' }}>{label}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    type="button"
                    style={{
                        padding: '4px 12px',
                        border: answers[prop] === true ? '1px solid #10b981' : '1px solid var(--modal-border)',
                        background: answers[prop] === true ? 'rgba(16, 185, 129, 0.15)' : 'var(--modal-surface)',
                        borderRadius: '4px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        color: answers[prop] === true ? '#10b981' : 'var(--modal-text-muted)',
                        fontWeight: answers[prop] === true ? 600 : 400,
                        opacity: disabled ? 0.5 : 1,
                    }}
                    onClick={() => !disabled && handleChange(prop, true)}
                    disabled={disabled}
                >
                    Sim
                </button>
                <button
                    type="button"
                    style={{
                        padding: '4px 12px',
                        border: answers[prop] === false ? '1px solid #ef4444' : '1px solid var(--modal-border)',
                        background: answers[prop] === false ? 'rgba(239, 68, 68, 0.15)' : 'var(--modal-surface)',
                        borderRadius: '4px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        color: answers[prop] === false ? '#ef4444' : 'var(--modal-text-muted)',
                        fontWeight: answers[prop] === false ? 600 : 400,
                        opacity: disabled ? 0.5 : 1,
                    }}
                    onClick={() => !disabled && handleChange(prop, false)}
                    disabled={disabled}
                >
                    Nao
                </button>
            </div>
        </div>
    );

    return (
        <div style={{
            background: 'var(--modal-surface)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--modal-border)'
        }}>
            <h4 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--modal-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                Matriz de Risco
                <span style={{
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: `${risk.color}20`,
                    color: risk.color,
                    fontWeight: 600
                }}>
                    {risk.label}
                </span>
            </h4>

            <QuestionRow label="A mudanca afeta ambiente de Producao?" prop="affectsProduction" />
            <QuestionRow label="Havera indisponibilidade do servico?" prop="hasDowntime" />
            <QuestionRow label="A mudanca foi testada em Homologacao?" prop="tested" />
            <QuestionRow label="Existe plano de rollback simples?" prop="easyRollback" />

            <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--modal-text-muted)', fontStyle: 'italic' }}>
                * A pontuacao define automaticamente o Nivel de Risco.
            </div>
        </div>
    );
};

export default RiskAssessment;
