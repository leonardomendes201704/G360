const TenantManager = require('../src/config/tenant-manager');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

(async () => {
    try {
        console.log('--- Listing Tenants ---');
        // We need to bypass TenantManager if it uses internal connection logic that relies on app structure?
        // TenantManager.getAllActiveTenants() uses getCatalogClient().
        // We can just use it.

        // Ensure DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL not set');
            process.exit(1);
        }

        const tenants = await TenantManager.getAllActiveTenants();
        console.log('Active Tenants:', tenants);

        await TenantManager.disconnectAll();
    } catch (e) {
        console.error(e);
        process.exit(1);

    }
})();
