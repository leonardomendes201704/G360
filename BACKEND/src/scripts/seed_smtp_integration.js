const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('📧 Seeding SMTP Integration...');

    const smtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        user: 'user@example.com',
        pass: 'password',
        secure: false,
        fromName: 'G360 Notification',
        fromEmail: 'noreply@g360.com.br',
        events: {
            PROJECT_CREATED: true,
            PROJECT_TASK_ASSIGNED: true,
            PROJECT_DELAYED: true,
            PROJECT_RISK_CREATED: true,
            PROJECT_FOLLOWUP_CREATED: true,
            CONTRACT_CREATED: true,
            CONTRACT_EXPIRING: true,
            CHANGE_REQUEST_CREATED: true,
            CHANGE_REQUEST_APPROVAL_NEEDED: true,
            CHANGE_REQUEST_STATUS_UPDATED: true,
            TASK_ASSIGNED: true,
            TASK_DUE_SOON: true,
            ASSET_MAINTENANCE_DUE: true,
            LICENSE_EXPIRING: true,
            EXPENSE_CREATED: true,
            EXPENSE_APPROVED: true,
            BUDGET_EXCEEDED: true,
            SYSTEM_ALERT: true
        },
        groups: {}
    };

    await prisma.integration.upsert({
        where: { type: 'SMTP' },
        update: {}, // Don't overwrite if exists
        create: {
            type: 'SMTP',
            name: 'E-mail (SMTP)',
            isEnabled: false,
            config: smtpConfig
        }
    });

    console.log('✅ SMTP Integration ensured.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
