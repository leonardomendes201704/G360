/**
 * Helper to mock auth middleware for supertest
 * Usage in test:
 * const { mockAuth } = require('../helpers/test-auth');
 * mockAuth(userObject);
 */

// Since we are mocking the module in Jest, we can't easily change the implementation 
// per test unless we use a mutable mock.
// 
// Example Pattern:
// 
// let mockUser = null;
// const authMiddleware = (req, res, next) => {
//   req.user = mockUser || { id: 'default', role: 'ADMIN' };
//   next();
// };
// 
// const setAuthUser = (user) => { mockUser = user; };
// 
// module.exports = { authMiddleware, setAuthUser };

// However, validation happens at the module level when `routes` imports it.
// So we need to put this logic inside the `src/middlewares/auth.middleware.js` mock.

// For this helper file, we can provide the mock implementation to be used in jest.mock
const mockAuthMiddleware = (user = { id: 'test-user', role: 'ADMIN', permissions: [] }) => {
    return (req, res, next) => {
        req.user = user;
        next();
    };
};

module.exports = {
    mockAuthMiddleware
};
