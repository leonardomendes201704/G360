const mockPrisma = {
    budget: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
    },
    expense: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
    },
    // Add other models as needed
    project: { findFirst: jest.fn(), findUnique: jest.fn() },
    contract: { findFirst: jest.fn(), findUnique: jest.fn() },
    supplier: { findFirst: jest.fn(), findUnique: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
};

module.exports = mockPrisma;
