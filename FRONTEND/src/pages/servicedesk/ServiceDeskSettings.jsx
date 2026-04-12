import React, { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Autocomplete
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { getHelpdeskConfig, updateHelpdeskConfig } from '../../services/helpdesk-config.service';
import {
  getAllSupportGroups,
  createSupportGroup,
  updateSupportGroup,
  deactivateSupportGroup
} from '../../services/support-group.service';
import SlaPolicyService from '../../services/sla-policy.service';
import { getUsers } from '../../services/user.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { getIanaTimezones } from '../../utils/ianaTimezones';
import { getBrazilFederalHolidaysForYears } from '../../utils/brazilFederalHolidays';
import { useOrgThemeStyles } from '../config/useOrgThemeStyles';

const WEEKDAYS = [
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
  { v: 7, l: 'Dom' }
];

function minutesToHHmm(totalMinutes) {
  const m = Math.max(0, Math.min(24 * 60 - 1, Number(totalMinutes) || 0));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function hhmmToMinutes(str) {
  if (!str || typeof str !== 'string') return 9 * 60;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 9 * 60;
  let h = parseInt(m[1], 10);
  let min = parseInt(m[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min) || min > 59 || h > 24) return 9 * 60;
  if (h === 24 && min > 0) return 24 * 60 - 1;
  return Math.min(24 * 60 - 1, h * 60 + min);
}

function newHolidayRow(date = '', name = '') {
  return { id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, date, name };
}

const HOLIDAY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_START_MINUTES = 9 * 60;
const DEFAULT_END_MINUTES = 18 * 60;

function defaultDaySchedules() {
  return WEEKDAYS.map((d) => ({
    weekday: d.v,
    enabled: d.v >= 1 && d.v <= 5,
    startTime: minutesToHHmm(DEFAULT_START_MINUTES),
    endTime: minutesToHHmm(DEFAULT_END_MINUTES)
  }));
}

function normalizeDaySchedulesFromCalendar(cal) {
  const byWeekday = new Map();
  const hasDaySchedules = cal && typeof cal.daySchedules === 'object' && cal.daySchedules !== null;
  if (hasDaySchedules) {
    for (const d of WEEKDAYS) {
      const raw = cal.daySchedules[d.v] || cal.daySchedules[String(d.v)];
      if (!raw || typeof raw !== 'object') continue;
      const start = Number.isFinite(raw.startMinutes) ? raw.startMinutes : DEFAULT_START_MINUTES;
      const end = Number.isFinite(raw.endMinutes) ? raw.endMinutes : DEFAULT_END_MINUTES;
      byWeekday.set(d.v, {
        weekday: d.v,
        enabled: raw.enabled !== false,
        startTime: minutesToHHmm(start),
        endTime: minutesToHHmm(end)
      });
    }
  }

  if (byWeekday.size === WEEKDAYS.length) {
    return WEEKDAYS.map((d) => byWeekday.get(d.v));
  }

  const workdays = Array.isArray(cal?.workdays) ? cal.workdays : [1, 2, 3, 4, 5];
  const start = Number.isFinite(cal?.startMinutes) ? cal.startMinutes : DEFAULT_START_MINUTES;
  const end = Number.isFinite(cal?.endMinutes) ? cal.endMinutes : DEFAULT_END_MINUTES;
  return WEEKDAYS.map((d) => ({
    weekday: d.v,
    enabled: workdays.includes(d.v),
    startTime: minutesToHHmm(start),
    endTime: minutesToHHmm(end)
  }));
}

/** Cantos mais retos (evita “pill”) nos campos do bloco horário operacional. */
const operationalInputRadiusSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '4px'
  }
};

/** Mesma “altura de caixa” do TextField medium do Autocomplete de fuso; hora centralizada (evita corte). */
const scheduleTimeFieldSx = {
  ...operationalInputRadiusSx,
  '& .MuiOutlinedInput-root': {
    borderRadius: '4px',
    minHeight: 40,
    alignItems: 'center'
  },
  '& .MuiOutlinedInput-input': {
    textAlign: 'center',
    fontSize: '1rem',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.02em',
    py: '10px',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    height: 'auto'
  },
  '& .MuiOutlinedInput-input.Mui-disabled': {
    WebkitTextFillColor: 'unset'
  }
};

/** Nome do feriado: mesma altura (medium); texto centralizado (sem tabular no nome longo). */
const holidayNameFieldSx = {
  ...operationalInputRadiusSx,
  '& .MuiOutlinedInput-root': {
    borderRadius: '4px',
    minHeight: 40,
    alignItems: 'center'
  },
  '& .MuiOutlinedInput-input': {
    textAlign: 'center',
    fontSize: '1rem',
    py: '10px',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    height: 'auto'
  },
  '& .MuiOutlinedInput-input.Mui-disabled': {
    WebkitTextFillColor: 'unset'
  }
};

const primaryBtnSx = {
  padding: '10px 20px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  color: 'white',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
  flexShrink: 0,
  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
};

const importOutlineBtnSx = {
  padding: '10px 20px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'none',
  flexShrink: 0,
  borderWidth: 2,
  borderColor: 'rgba(37, 99, 235, 0.55)',
  color: '#2563eb',
  '&:hover': { borderWidth: 2, borderColor: '#2563eb', bgcolor: 'rgba(37, 99, 235, 0.06)' }
};

export const ServiceDeskSettingsPanel = ({ embedded = false }) => {
  const { textPrimary, textSecondary, textMuted, cardStyle, tableHeaderStyle, tableCellStyle, rowHoverBg, actionBtnStyle } =
    useOrgThemeStyles();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useBiz, setUseBiz] = useState(true);
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [daySchedules, setDaySchedules] = useState(defaultDaySchedules);
  const [holidayRows, setHolidayRows] = useState([]);
  const [autoAssign, setAutoAssign] = useState(true);

  const [groups, setGroups] = useState([]);
  const [slaPolicies, setSlaPolicies] = useState([]);
  const [users, setUsers] = useState([]);

  const [dlgOpen, setDlgOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [gName, setGName] = useState('');
  const [gDesc, setGDesc] = useState('');
  const [gSlaId, setGSlaId] = useState('');
  const [gMembers, setGMembers] = useState([]);

  const timezoneOptions = useMemo(() => {
    const all = getIanaTimezones();
    if (timezone && !all.includes(timezone)) {
      return [...all, timezone].sort((a, b) => a.localeCompare(b));
    }
    return all;
  }, [timezone]);

  const load = async () => {
    try {
      setLoading(true);
      const [cfg, gr, sla, u] = await Promise.all([
        getHelpdeskConfig(),
        getAllSupportGroups(),
        SlaPolicyService.getAll(),
        getUsers().catch(() => [])
      ]);
      setUseBiz(!!cfg.useBusinessCalendar);
      setAutoAssign(cfg.autoAssignOnCreate !== false);
      const cal = cfg.calendar || {};
      setTimezone(cal.timezone || 'America/Sao_Paulo');
      setDaySchedules(normalizeDaySchedulesFromCalendar(cal));
      const hol = Array.isArray(cal.holidays) ? cal.holidays : [];
      setHolidayRows(
        hol.map((item, i) => {
          if (typeof item === 'string') {
            const d = item.trim().slice(0, 10);
            return { id: `h-load-${i}-${d}`, date: d, name: '' };
          }
          const d = String(item?.date || '').trim().slice(0, 10);
          return { id: `h-load-${i}-${d}`, date: d, name: typeof item?.name === 'string' ? item.name : '' };
        })
      );
      setGroups(gr);
      setSlaPolicies(sla);
      setUsers(Array.isArray(u) ? u : []);
    } catch (e) {
      console.error(e);
      enqueueSnackbar(getErrorMessage(e, 'Erro ao carregar configurações.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const holidaysForApi = () => {
    const byDate = new Map();
    for (const r of holidayRows) {
      const d = (r.date || '').trim();
      if (!HOLIDAY_DATE_RE.test(d)) continue;
      const name = (r.name || '').trim().slice(0, 200);
      const prev = byDate.get(d);
      if (!prev) byDate.set(d, { date: d, name });
      else byDate.set(d, { date: d, name: name || prev.name });
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const persistConfig = async (successMsg) => {
    const enabledRows = daySchedules.filter((d) => d.enabled);
    const workdays = enabledRows.map((d) => d.weekday).sort((a, b) => a - b);
    const first = enabledRows[0];
    const startM = first ? hhmmToMinutes(first.startTime) : DEFAULT_START_MINUTES;
    const endM = first ? hhmmToMinutes(first.endTime) : DEFAULT_END_MINUTES;
    const daySchedulesForApi = {};
    for (const row of daySchedules) {
      daySchedulesForApi[row.weekday] = {
        enabled: !!row.enabled,
        startMinutes: hhmmToMinutes(row.startTime),
        endMinutes: hhmmToMinutes(row.endTime)
      };
    }

    await updateHelpdeskConfig({
      useBusinessCalendar: useBiz,
      autoAssignOnCreate: autoAssign,
      calendar: {
        timezone,
        workdays,
        startMinutes: startM,
        endMinutes: endM,
        daySchedules: daySchedulesForApi,
        holidays: holidaysForApi()
      }
    });
    enqueueSnackbar(successMsg, { variant: 'success' });
  };

  const saveOperational = async () => {
    const enabledRows = daySchedules.filter((d) => d.enabled);
    if (!enabledRows.length) {
      enqueueSnackbar('Ative ao menos um dia de operação.', { variant: 'warning' });
      return;
    }
    const invalidDay = enabledRows.find((d) => hhmmToMinutes(d.endTime) <= hhmmToMinutes(d.startTime));
    if (invalidDay) {
      const dayLabel = WEEKDAYS.find((w) => w.v === invalidDay.weekday)?.l || `Dia ${invalidDay.weekday}`;
      enqueueSnackbar(`No dia ${dayLabel}, o horário final deve ser depois do inicial.`, { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      await persistConfig('Horário operacional salvo.');
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const saveHolidays = async () => {
    const invalid = holidayRows.filter((r) => r.date && !HOLIDAY_DATE_RE.test(r.date));
    if (invalid.length) {
      enqueueSnackbar('Corrija as datas inválidas (use o seletor de data).', { variant: 'warning' });
      return;
    }
    const incomplete = holidayRows.filter((r) => !r.date?.trim() && (r.name || '').trim());
    if (incomplete.length) {
      enqueueSnackbar('Informe a data em cada linha que tiver nome, ou remova a linha.', { variant: 'warning' });
      return;
    }
    try {
      setSaving(true);
      await persistConfig('Feriados salvos.');
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const addHolidayRow = () => {
    setHolidayRows((prev) => [...prev, newHolidayRow()]);
  };

  const updateHolidayField = (id, field, value) => {
    setHolidayRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const importBrazilFederalHolidays = () => {
    const y0 = new Date().getFullYear();
    const official = getBrazilFederalHolidaysForYears([y0, y0 + 1]);
    const existing = new Set(
      holidayRows.map((r) => r.date).filter((d) => HOLIDAY_DATE_RE.test(d))
    );
    const toAdd = official.filter((h) => !existing.has(h.date));
    if (!toAdd.length) {
      enqueueSnackbar(`Os feriados federais de ${y0} e ${y0 + 1} já constam na lista (ou não há novos).`, { variant: 'info' });
      return;
    }
    setHolidayRows((prev) => [
      ...prev,
      ...toAdd.map((h) => ({
        id: `h-br-${h.date}-${Math.random().toString(36).slice(2, 8)}`,
        date: h.date,
        name: h.name
      }))
    ]);
    enqueueSnackbar(`${toAdd.length} feriado(s) nacional(is) adicionado(s). Clique em Salvar feriados para gravar.`, { variant: 'success' });
  };

  const removeHolidayRow = (id) => {
    setHolidayRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateDayScheduleField = (weekday, field, value) => {
    setDaySchedules((prev) =>
      prev.map((row) => (row.weekday === weekday ? { ...row, [field]: value } : row))
    );
  };

  const openNewGroup = () => {
    setEditId(null);
    setGName('');
    setGDesc('');
    setGSlaId('');
    setGMembers([]);
    setDlgOpen(true);
  };

  const openEditGroup = (g) => {
    setEditId(g.id);
    setGName(g.name);
    setGDesc(g.description || '');
    setGSlaId(g.slaPolicyId || '');
    setGMembers((g.members || []).map((m) => m.userId || m.user?.id).filter(Boolean));
    setDlgOpen(true);
  };

  const saveGroup = async () => {
    try {
      setSaving(true);
      const payload = {
        name: gName,
        description: gDesc,
        slaPolicyId: gSlaId || null,
        memberIds: gMembers
      };
      if (editId) await updateSupportGroup(editId, payload);
      else await createSupportGroup(payload);
      setDlgOpen(false);
      await load();
      enqueueSnackbar('Grupo salvo.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao salvar grupo.'), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Desativar este grupo?')) return;
    try {
      await deactivateSupportGroup(id);
      await load();
      enqueueSnackbar('Grupo desativado.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e, 'Erro ao desativar.'), { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box py={6} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {embedded && (
        <Typography sx={{ color: textMuted, fontSize: '15px', mb: 3, lineHeight: 1.5 }}>
          Horário operacional, feriados e grupos de atribuição (N1/N2).
        </Typography>
      )}

      {/* Horário operacional */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Horário operacional</Typography>
      </Box>
      <Box sx={{ ...cardStyle, p: { xs: 2, sm: 3 }, mb: 3 }}>
        <StackedSwitches
          useBiz={useBiz}
          setUseBiz={setUseBiz}
          autoAssign={autoAssign}
          setAutoAssign={setAutoAssign}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Autocomplete
              fullWidth
              size="medium"
              options={timezoneOptions}
              value={timezone}
              onChange={(_e, newValue) => {
                if (newValue) setTimezone(newValue);
              }}
              isOptionEqualToValue={(a, b) => a === b}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="medium"
                  label="Fuso horário"
                  helperText="Digite para filtrar (ex.: Sao_Paulo, London, Europe). Lista IANA completa."
                  placeholder="Buscar fuso…"
                  sx={operationalInputRadiusSx}
                />
              )}
              ListboxProps={{ style: { maxHeight: 320 } }}
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ mb: 1, fontWeight: 600, color: textPrimary, fontSize: '13px' }}>
            Agenda por dia
          </Typography>
          <Typography sx={{ fontSize: '12px', color: textMuted, mb: 2 }}>
            Configure horários diferentes para cada dia da semana (fuso: {timezone}).
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...tableHeaderStyle, minWidth: 140 }}>Dia</th>
                  <th style={{ ...tableHeaderStyle, minWidth: 180 }}>Ativo</th>
                  <th style={{ ...tableHeaderStyle, minWidth: 220 }}>Início</th>
                  <th style={{ ...tableHeaderStyle, minWidth: 220 }}>Fim</th>
                </tr>
              </thead>
              <tbody>
                {daySchedules.map((row) => {
                  const dayLabel = WEEKDAYS.find((d) => d.v === row.weekday)?.l || `Dia ${row.weekday}`;
                  return (
                    <tr key={`schedule-${row.weekday}`}>
                      <td style={tableCellStyle}>
                        <Typography sx={{ color: textPrimary, fontWeight: 600 }}>{dayLabel}</Typography>
                      </td>
                      <td style={tableCellStyle}>
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              size="small"
                              checked={row.enabled}
                              onChange={(e) => updateDayScheduleField(row.weekday, 'enabled', e.target.checked)}
                            />
                          }
                          label={<Typography sx={{ fontSize: '13px', color: textSecondary }}>{row.enabled ? 'Aberto' : 'Fechado'}</Typography>}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <TextField
                          size="medium"
                          type="time"
                          value={row.startTime}
                          onChange={(e) => updateDayScheduleField(row.weekday, 'startTime', e.target.value)}
                          disabled={!row.enabled}
                          inputProps={{ step: 300, style: { textAlign: 'center' } }}
                          sx={{ ...scheduleTimeFieldSx, minWidth: 200, maxWidth: 240 }}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <TextField
                          size="medium"
                          type="time"
                          value={row.endTime}
                          onChange={(e) => updateDayScheduleField(row.weekday, 'endTime', e.target.value)}
                          disabled={!row.enabled}
                          inputProps={{ step: 300, style: { textAlign: 'center' } }}
                          sx={{ ...scheduleTimeFieldSx, minWidth: 200, maxWidth: 240 }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </Box>
        <Box sx={{ mt: 3 }}>
          <Button variant="contained" onClick={saveOperational} disabled={saving} sx={primaryBtnSx} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>}>
            {saving ? 'Salvando…' : 'Salvar horário operacional'}
          </Button>
        </Box>
      </Box>

      {/* Feriados — tabela como grupos */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Feriados</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={importBrazilFederalHolidays} sx={importOutlineBtnSx} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>public</span>}>
            Importar feriados nacionais (BR)
          </Button>
          <Button onClick={addHolidayRow} sx={primaryBtnSx} startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}>
            Adicionar feriado
          </Button>
        </Box>
      </Box>
      <Typography sx={{ fontSize: '14px', color: textSecondary, mb: 2, lineHeight: 1.6 }}>
        Datas sem expediente para o SLA. Use <strong>Importar feriados nacionais</strong> para carregar os federais do ano atual e do próximo (móveis pela Páscoa). Ajuste ou complemente com feriados locais.
      </Typography>
      <Box sx={{ ...cardStyle, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderStyle, minWidth: 200 }}>Data</th>
                <th style={tableHeaderStyle}>Nome do feriado</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right', width: 100 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {holidayRows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px' }}>
                    <Typography sx={{ color: textMuted, fontSize: '15px', mb: 1 }}>Nenhum feriado cadastrado.</Typography>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined" onClick={importBrazilFederalHolidays} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Importar nacionais (BR)
                      </Button>
                      <Button size="small" onClick={addHolidayRow} sx={{ ...primaryBtnSx, py: 0.75, px: 2 }}>
                        Adicionar linha
                      </Button>
                    </Box>
                  </td>
                </tr>
              ) : (
                holidayRows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ transition: 'background 0.2s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = rowHoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ ...tableCellStyle, verticalAlign: 'middle', minWidth: 200 }}>
                      <TextField
                        type="date"
                        size="medium"
                        value={row.date}
                        onChange={(e) => updateHolidayField(row.id, 'date', e.target.value)}
                        placeholder=""
                        sx={{ ...scheduleTimeFieldSx, minWidth: 180, maxWidth: 280 }}
                        inputProps={{ 'aria-label': 'Data do feriado', style: { textAlign: 'center' } }}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, verticalAlign: 'middle' }}>
                      <TextField
                        size="medium"
                        fullWidth
                        value={row.name}
                        onChange={(e) => updateHolidayField(row.id, 'name', e.target.value)}
                        placeholder="Ex.: Natal municipal"
                        inputProps={{
                          maxLength: 200,
                          'aria-label': 'Nome do feriado',
                          style: { textAlign: 'center' }
                        }}
                        sx={holidayNameFieldSx}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right', verticalAlign: 'middle' }}>
                      <IconButton size="small" onClick={() => removeHolidayRow(row.id)} title="Remover" sx={actionBtnStyle('delete')}>
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>
                          delete
                        </span>
                      </IconButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" onClick={saveHolidays} disabled={saving} sx={primaryBtnSx} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>}>
          {saving ? 'Salvando…' : 'Salvar feriados'}
        </Button>
      </Box>

      {/* Grupos de suporte */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>Grupos de suporte</Typography>
        <Button onClick={openNewGroup} sx={primaryBtnSx} startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}>
          Novo grupo
        </Button>
      </Box>
      <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Nome</th>
                <th style={tableHeaderStyle}>SLA padrão</th>
                <th style={tableHeaderStyle}>Membros</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '48px' }}>
                    <Typography sx={{ color: textMuted, fontSize: '15px' }}>Nenhum grupo cadastrado.</Typography>
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr
                    key={g.id}
                    style={{ transition: 'background 0.2s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = rowHoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={tableCellStyle}>
                      <strong style={{ color: textPrimary }}>{g.name}</strong>
                    </td>
                    <td style={tableCellStyle}>{g.slaPolicy?.name || '—'}</td>
                    <td style={tableCellStyle}>{(g.members || []).length}</td>
                    <td style={tableCellStyle}>
                      <Chip size="small" label={g.isActive ? 'Ativo' : 'Inativo'} color={g.isActive ? 'success' : 'default'} variant="outlined" />
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                      <IconButton size="small" onClick={() => openEditGroup(g)} title="Editar">
                        <span className="material-icons-round" style={{ fontSize: '18px', color: textSecondary }}>
                          edit
                        </span>
                      </IconButton>
                      {g.isActive && (
                        <IconButton size="small" onClick={() => handleDeactivate(g.id)} title="Desativar">
                          <span className="material-icons-round" style={{ fontSize: '18px', color: '#f59e0b' }}>
                            block
                          </span>
                        </IconButton>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{editId ? 'Editar grupo' : 'Novo grupo'}</DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label="Nome" value={gName} onChange={(e) => setGName(e.target.value)} sx={{ mb: 2, mt: 1 }} />
          <TextField
            fullWidth
            label="Descrição"
            value={gDesc}
            onChange={(e) => setGDesc(e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Política de SLA (opcional)</InputLabel>
            <Select value={gSlaId} label="Política de SLA (opcional)" onChange={(e) => setGSlaId(e.target.value)}>
              <MenuItem value="">Nenhuma</MenuItem>
              {slaPolicies.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Membros</InputLabel>
            <Select
              multiple
              value={gMembers}
              label="Membros"
              onChange={(e) => setGMembers(e.target.value)}
              renderValue={(selected) =>
                selected
                  .map((id) => users.find((u) => u.id === id)?.name || id)
                  .filter(Boolean)
                  .join(', ')
              }
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDlgOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={saveGroup} disabled={saving || !gName.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function StackedSwitches({ useBiz, setUseBiz, autoAssign, setAutoAssign, textPrimary, textMuted }) {
  return (
    <Box>
      <FormControlLabel
        control={<Switch checked={useBiz} onChange={(e) => setUseBiz(e.target.checked)} color="primary" />}
        label={
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>Contar SLA apenas em horário comercial</Typography>
            <Typography sx={{ fontSize: '12px', color: textMuted }}>Desligado = prazos em calendário 24/7</Typography>
          </Box>
        }
        sx={{ alignItems: 'flex-start', mb: 1.5, mr: 0 }}
      />
      <FormControlLabel
        control={<Switch checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} color="primary" />}
        label={
          <Box>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary }}>Atribuir automaticamente (round-robin)</Typography>
            <Typography sx={{ fontSize: '12px', color: textMuted }}>Ao abrir chamado com grupo de suporte</Typography>
          </Box>
        }
        sx={{ alignItems: 'flex-start', mr: 0 }}
      />
    </Box>
  );
}

const ServiceDeskSettings = () => <Navigate to="/config/organization?tab=servicedesk&sd=expediente" replace />;

export default ServiceDeskSettings;
