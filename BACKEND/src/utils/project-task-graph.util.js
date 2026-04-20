/**
 * Grafo de dependências: se a tarefa T tem `dependencies: [A, B]`, então T depende de A e de B
 * (A e B devem concluir antes) — arestas dirigidas A -> T e B -> T.
 *
 * @param {Array<{ id: string, dependencies: string[] }>} tasks
 * @returns {boolean} true se existir ciclo
 */
function dependencyGraphHasCycle(tasks) {
  if (!tasks?.length) return false;

  const ids = new Set(tasks.map((t) => t.id));
  const adj = new Map();
  for (const id of ids) {
    adj.set(id, []);
  }
  for (const t of tasks) {
    for (const d of t.dependencies || []) {
      if (!ids.has(d)) continue;
      adj.get(d).push(t.id);
    }
  }

  const visited = new Set();
  const recStack = new Set();

  function dfs(u) {
    visited.add(u);
    recStack.add(u);
    for (const v of adj.get(u) || []) {
      if (!visited.has(v)) {
        if (dfs(v)) return true;
      } else if (recStack.has(v)) {
        return true;
      }
    }
    recStack.delete(u);
    return false;
  }

  for (const id of ids) {
    if (!visited.has(id) && dfs(id)) {
      return true;
    }
  }
  return false;
}

/** @throws {{ statusCode: number, message: string }} */
function assertAcyclicTaskDependencies(tasks) {
  if (dependencyGraphHasCycle(tasks)) {
    throw {
      statusCode: 400,
      message: 'As dependências das tarefas formam um ciclo. Ajuste as dependências para um grafo acíclico.',
    };
  }
}

module.exports = {
  dependencyGraphHasCycle,
  assertAcyclicTaskDependencies,
};
