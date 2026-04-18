import React, { useContext } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ThemeContext } from '../../contexts/ThemeContext';

const locales = {
    'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const ChangeCalendar = ({ changes, onViewChange }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const [view, setView] = React.useState('month');
    const [date, setDate] = React.useState(new Date());

    const onNavigate = React.useCallback((newDate) => setDate(newDate), [setDate]);
    const onView = React.useCallback((newView) => setView(newView), [setView]);

    const events = changes.map(change => ({
        id: change.id,
        title: `${change.code} - ${change.title}`,
        start: new Date(change.scheduledStart),
        end: new Date(change.scheduledEnd),
        resource: change,
        allDay: false
    }));

    const eventStyleGetter = (event) => {
        let backgroundColor = '#2563eb';
        switch (event.resource.riskLevel) {
            case 'CRITICO': backgroundColor = '#ef4444'; break;
            case 'ALTO': backgroundColor = '#f97316'; break;
            case 'MEDIO': backgroundColor = '#f59e0b'; break;
            case 'BAIXO': backgroundColor = '#10b981'; break;
            default: break;
        }

        if (event.resource.status === 'APPROVED') backgroundColor = '#10b981';

        return {
            style: {
                backgroundColor,
                borderRadius: '8px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontWeight: 500,
                fontSize: '12px',
            }
        };
    };

    return (
        <div className={isDark ? 'dark-calendar-wrapper' : 'light-calendar-wrapper'}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 550 }}
                culture="pt-BR"
                view={view}
                date={date}
                onNavigate={onNavigate}
                onView={onView}
                messages={{
                    next: 'Proximo',
                    previous: 'Anterior',
                    today: 'Hoje',
                    month: 'Mes',
                    week: 'Semana',
                    day: 'Dia',
                    agenda: 'Agenda',
                    date: 'Data',
                    time: 'Hora',
                    event: 'Evento',
                    noEventsInRange: 'Sem mudancas neste periodo.'
                }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => onViewChange(event.resource)}
            />

            <style>{`
                .light-calendar-wrapper,
                .dark-calendar-wrapper {
                    padding: 20px;
                    border-radius: 8px;
                }

                .dark-calendar-wrapper {
                    background: #161d26;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                }

                .light-calendar-wrapper {
                    background: #ffffff;
                    border: 1px solid rgba(0, 0, 0, 0.08);
                }

                .dark-calendar-wrapper .rbc-calendar {
                    background: transparent;
                    color: #f1f5f9;
                }

                .light-calendar-wrapper .rbc-calendar {
                    background: transparent;
                    color: #0f172a;
                }

                .dark-calendar-wrapper .rbc-toolbar,
                .light-calendar-wrapper .rbc-toolbar {
                    margin-bottom: 16px;
                    padding-bottom: 16px;
                }

                .dark-calendar-wrapper .rbc-toolbar {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .light-calendar-wrapper .rbc-toolbar {
                    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
                }

                .dark-calendar-wrapper .rbc-toolbar button,
                .light-calendar-wrapper .rbc-toolbar button {
                    padding: 8px 14px;
                    border-radius: 8px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .dark-calendar-wrapper .rbc-toolbar button {
                    background: #1c2632;
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    color: #94a3b8;
                }

                .light-calendar-wrapper .rbc-toolbar button {
                    background: #ffffff;
                    border: 1px solid rgba(0, 0, 0, 0.12);
                    color: #475569;
                }

                .dark-calendar-wrapper .rbc-toolbar button:hover {
                    background: rgba(37, 99, 235, 0.1);
                    border-color: rgba(37, 99, 235, 0.3);
                    color: #2563eb;
                }

                .light-calendar-wrapper .rbc-toolbar button:hover {
                    background: rgba(37, 99, 235, 0.08);
                    border-color: rgba(37, 99, 235, 0.3);
                    color: #1d4ed8;
                }

                .dark-calendar-wrapper .rbc-toolbar button.rbc-active {
                    background: rgba(37, 99, 235, 0.15);
                    border-color: #2563eb;
                    color: #2563eb;
                    font-weight: 600;
                }

                .light-calendar-wrapper .rbc-toolbar button.rbc-active {
                    background: rgba(37, 99, 235, 0.12);
                    border-color: #1d4ed8;
                    color: #1d4ed8;
                    font-weight: 600;
                }

                .dark-calendar-wrapper .rbc-toolbar-label,
                .light-calendar-wrapper .rbc-toolbar-label {
                    font-size: 16px;
                    font-weight: 600;
                }

                .dark-calendar-wrapper .rbc-toolbar-label {
                    color: #f1f5f9;
                }

                .light-calendar-wrapper .rbc-toolbar-label {
                    color: #0f172a;
                }

                .dark-calendar-wrapper .rbc-header {
                    background: #1c2632;
                    color: #94a3b8;
                    border-color: rgba(255, 255, 255, 0.06);
                    padding: 12px 8px;
                    font-size: 13px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .light-calendar-wrapper .rbc-header {
                    background: #f8fafc;
                    color: #64748b;
                    border-color: rgba(0, 0, 0, 0.08);
                    padding: 12px 8px;
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .dark-calendar-wrapper .rbc-month-view,
                .dark-calendar-wrapper .rbc-time-view,
                .dark-calendar-wrapper .rbc-agenda-view {
                    border-color: rgba(255, 255, 255, 0.06);
                    background: transparent;
                    border-radius: 8px;
                }

                .light-calendar-wrapper .rbc-month-view,
                .light-calendar-wrapper .rbc-time-view,
                .light-calendar-wrapper .rbc-agenda-view {
                    border-color: rgba(0, 0, 0, 0.08);
                    background: transparent;
                    border-radius: 8px;
                }

                .dark-calendar-wrapper .rbc-month-row,
                .dark-calendar-wrapper .rbc-day-bg {
                    border-color: rgba(255, 255, 255, 0.06);
                }

                .light-calendar-wrapper .rbc-month-row,
                .light-calendar-wrapper .rbc-day-bg {
                    border-color: rgba(0, 0, 0, 0.08);
                }

                .dark-calendar-wrapper .rbc-off-range-bg {
                    background: rgba(0, 0, 0, 0.2);
                }

                .light-calendar-wrapper .rbc-off-range-bg {
                    background: #f1f5f9;
                }

                .dark-calendar-wrapper .rbc-off-range {
                    color: #4a5568;
                }

                .light-calendar-wrapper .rbc-off-range {
                    color: #94a3b8;
                }

                .dark-calendar-wrapper .rbc-today,
                .light-calendar-wrapper .rbc-today {
                    background: rgba(37, 99, 235, 0.08);
                }

                .dark-calendar-wrapper .rbc-date-cell {
                    color: #94a3b8;
                    padding: 8px;
                    font-size: 14px;
                }

                .light-calendar-wrapper .rbc-date-cell {
                    color: #334155;
                    padding: 8px;
                    font-size: 14px;
                }

                .dark-calendar-wrapper .rbc-date-cell.rbc-now {
                    color: #2563eb;
                    font-weight: 600;
                }

                .light-calendar-wrapper .rbc-date-cell.rbc-now {
                    color: #1d4ed8;
                    font-weight: 600;
                }

                .dark-calendar-wrapper .rbc-event,
                .light-calendar-wrapper .rbc-event {
                    padding: 4px 8px;
                }

                .dark-calendar-wrapper .rbc-event-label {
                    color: white;
                }

                .dark-calendar-wrapper .rbc-show-more {
                    color: #2563eb;
                    font-weight: 500;
                    background: transparent;
                }

                .light-calendar-wrapper .rbc-show-more {
                    color: #1d4ed8;
                    font-weight: 500;
                    background: transparent;
                }

                .dark-calendar-wrapper .rbc-agenda-table {
                    border-color: rgba(255, 255, 255, 0.06);
                }

                .light-calendar-wrapper .rbc-agenda-table {
                    border-color: rgba(0, 0, 0, 0.08);
                }

                .dark-calendar-wrapper .rbc-agenda-table tbody > tr > td {
                    border-color: rgba(255, 255, 255, 0.06);
                    color: #94a3b8;
                    padding: 12px 8px;
                }

                .light-calendar-wrapper .rbc-agenda-table tbody > tr > td {
                    border-color: rgba(0, 0, 0, 0.08);
                    color: #475569;
                    padding: 12px 8px;
                }

                .dark-calendar-wrapper .rbc-agenda-table thead > tr > th {
                    border-color: rgba(255, 255, 255, 0.06);
                    color: #f1f5f9;
                    background: #1c2632;
                    padding: 12px 8px;
                }

                .light-calendar-wrapper .rbc-agenda-table thead > tr > th {
                    border-color: rgba(0, 0, 0, 0.08);
                    color: #0f172a;
                    background: #f8fafc;
                    padding: 12px 8px;
                }

                .dark-calendar-wrapper .rbc-agenda-date-cell,
                .dark-calendar-wrapper .rbc-agenda-time-cell {
                    color: #f1f5f9;
                }

                .light-calendar-wrapper .rbc-agenda-date-cell,
                .light-calendar-wrapper .rbc-agenda-time-cell {
                    color: #0f172a;
                }

                .dark-calendar-wrapper .rbc-time-header,
                .dark-calendar-wrapper .rbc-time-content {
                    border-color: rgba(255, 255, 255, 0.06);
                }

                .light-calendar-wrapper .rbc-time-header,
                .light-calendar-wrapper .rbc-time-content {
                    border-color: rgba(0, 0, 0, 0.08);
                }

                .dark-calendar-wrapper .rbc-timeslot-group {
                    border-color: rgba(255, 255, 255, 0.06);
                }

                .light-calendar-wrapper .rbc-timeslot-group {
                    border-color: rgba(0, 0, 0, 0.08);
                }

                .dark-calendar-wrapper .rbc-time-slot,
                .light-calendar-wrapper .rbc-time-slot {
                    color: #64748b;
                    font-size: 12px;
                }

                .dark-calendar-wrapper .rbc-current-time-indicator {
                    background-color: #2563eb;
                }

                .light-calendar-wrapper .rbc-current-time-indicator {
                    background-color: #1d4ed8;
                }
            `}</style>
        </div>
    );
};

export default ChangeCalendar;
