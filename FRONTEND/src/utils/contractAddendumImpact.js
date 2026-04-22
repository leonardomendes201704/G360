/**
 * Impacto de cada aditivo no contrato (valor e fim de vigência), alinhado a
 * `ContractDetailsController._recalculateContract` — ordem cronológica por data de assinatura.
 */

export function sortAddendumsChronological(addendums) {
  if (!addendums?.length) return [];
  return [...addendums].sort((a, b) => {
    const da = new Date(a.signatureDate).getTime() - new Date(b.signatureDate).getTime();
    if (da !== 0) return da;
    const ca = String(a.createdAt || a.id || '');
    const cb = String(b.createdAt || b.id || '');
    return ca.localeCompare(cb);
  });
}

/**
 * Estado do contrato após aplicar os primeiros `count` aditivos (ordem cronológica).
 * @param {object} contract — deve incluir originalValue, originalEndDate, value, endDate
 * @param {Array} addendumsAsc — lista já ordenada (use sortAddendumsChronological)
 * @param {number} count — 0..addendumsAsc.length
 */
export function computeContractStateAfterAddendums(contract, addendumsAsc, count) {
  const c = contract || {};
  let v = Number(c.originalValue != null ? c.originalValue : c.value ?? 0);
  if (Number.isNaN(v)) v = 0;

  let endDate = null;
  if (c.originalEndDate) {
    endDate = new Date(c.originalEndDate);
  } else if (c.endDate) {
    endDate = new Date(c.endDate);
  }
  if (endDate && Number.isNaN(endDate.getTime())) endDate = null;

  const n = Math.min(Math.max(0, count), addendumsAsc?.length || 0);
  for (let i = 0; i < n; i++) {
    const a = addendumsAsc[i];
    if (a.valueChange != null && a.valueChange !== '') {
      v += Number(a.valueChange);
    }
    if (a.newEndDate) {
      endDate = new Date(a.newEndDate);
    }
  }
  return { value: v, endDate };
}

/**
 * Valor e vigência do contrato imediatamente antes e depois de aplicar o aditivo indicado.
 * @returns {{ before: {value, endDate}, after: {value, endDate}, index: number } | null}
 */
export function computeAddendumContractImpact(contract, allAddendums, addendumId) {
  if (!contract || !addendumId || !allAddendums?.length) return null;
  const asc = sortAddendumsChronological(allAddendums);
  const idx = asc.findIndex((a) => a.id === addendumId);
  if (idx < 0) return null;

  const before = computeContractStateAfterAddendums(contract, asc, idx);
  const after = computeContractStateAfterAddendums(contract, asc, idx + 1);
  return { before, after, index: idx };
}
