const {
  dependencyGraphHasCycle,
  assertAcyclicTaskDependencies,
} = require('../../src/utils/project-task-graph.util');

describe('project-task-graph.util', () => {
  describe('dependencyGraphHasCycle', () => {
    it('retorna false para lista vazia ou um nó sem deps', () => {
      expect(dependencyGraphHasCycle([])).toBe(false);
      expect(dependencyGraphHasCycle([{ id: 'a', dependencies: [] }])).toBe(false);
    });

    it('retorna false para cadeia linear A -> B -> C', () => {
      const tasks = [
        { id: 'a', dependencies: [] },
        { id: 'b', dependencies: ['a'] },
        { id: 'c', dependencies: ['b'] },
      ];
      expect(dependencyGraphHasCycle(tasks)).toBe(false);
    });

    it('retorna true para ciclo A <-> B', () => {
      const tasks = [
        { id: 'a', dependencies: ['b'] },
        { id: 'b', dependencies: ['a'] },
      ];
      expect(dependencyGraphHasCycle(tasks)).toBe(true);
    });

    it('retorna true para ciclo de três nós', () => {
      const tasks = [
        { id: 'a', dependencies: ['c'] },
        { id: 'b', dependencies: ['a'] },
        { id: 'c', dependencies: ['b'] },
      ];
      expect(dependencyGraphHasCycle(tasks)).toBe(true);
    });
  });

  describe('assertAcyclicTaskDependencies', () => {
    it('lança statusCode 400 se houver ciclo', () => {
      try {
        assertAcyclicTaskDependencies([
          { id: 'a', dependencies: ['b'] },
          { id: 'b', dependencies: ['a'] },
        ]);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.statusCode).toBe(400);
        expect(e.message).toBeDefined();
      }
    });
  });
});
