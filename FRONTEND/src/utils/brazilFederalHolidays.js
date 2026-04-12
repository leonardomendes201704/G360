import { subDays, addDays, format } from 'date-fns';

/**
 * Domingo de Páscoa (calendário gregoriano, algoritmo de J.M. Oudin, 1940).
 * @param {number} year
 * @returns {Date}
 */
function easterSunday(year) {
  const G = year % 19;
  const C = Math.floor(year / 100);
  const H = (C - Math.floor(C / 4) - Math.floor((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - Math.floor(H / 28) * (1 - Math.floor(29 / (H + 1)) * Math.floor((21 - G) / 11));
  const J = (year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4)) % 7;
  const L = I - J;
  const month = 3 + Math.floor((L + 40) / 44);
  const day = L + 28 - 31 * Math.floor(month / 4);
  return new Date(year, month - 1, day);
}

/**
 * Feriados nacionais usuais (fixos e móveis pela Páscoa; Carnaval costuma ser ponto facultativo no serviço público).
 * Não inclui feriados estaduais/municipais.
 *
 * @param {number} year
 * @returns {{ date: string, name: string }[]}
 */
export function getBrazilFederalHolidays(year) {
  const e = easterSunday(year);
  const y = (d) => format(d, 'yyyy-MM-dd');

  return [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: y(subDays(e, 48)), name: 'Carnaval (segunda-feira)' },
    { date: y(subDays(e, 47)), name: 'Carnaval (terça-feira)' },
    { date: y(subDays(e, 2)), name: 'Sexta-feira Santa' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador' },
    { date: y(addDays(e, 60)), name: 'Corpus Christi' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Dia Nacional de Zumbi e da Consciência Negra' },
    { date: `${year}-12-25`, name: 'Natal' }
  ];
}

/**
 * @param {number[]} years
 * @returns {{ date: string, name: string }[]}
 */
export function getBrazilFederalHolidaysForYears(years) {
  const byDate = new Map();
  for (const year of years) {
    for (const h of getBrazilFederalHolidays(year)) {
      if (!byDate.has(h.date)) byDate.set(h.date, h);
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
