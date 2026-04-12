import React from 'react';

interface ModernBadgeProps {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'info';
}

const ModernBadge: React.FC<ModernBadgeProps> = ({ label, variant = 'info' }) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold shadow-sm border transition-all hover:shadow-md cursor-default";

    const variants = {
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        error: "bg-rose-50 text-rose-700 border-rose-200",
        info: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };

    return (
        <span className={`${baseClasses} ${variants[variant]}`}>
            {label}
        </span>
    );
};

export default ModernBadge;
