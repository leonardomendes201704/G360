const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Robust CSV Line Parser (handles quotes)
function parseLine(line) {
    const result = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, '')); // Remove surrounding quotes
}

async function importSuppliers() {
    const csvPath = path.join(__dirname, '../../Fornecedores.csv');

    console.log(`Reading CSV file: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
        console.error('File not found!');
        process.exit(1);
    }

    try {
        // Read as UTF-8 and strip BOM if present
        let fileContent = fs.readFileSync(csvPath, 'utf8');
        if (fileContent.charCodeAt(0) === 0xFEFF) {
            fileContent = fileContent.slice(1);
        }

        const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);

        if (lines.length === 0) {
            console.log('Empty generated CSV.');
            return;
        }

        // Header Mapping
        const headers = parseLine(lines[0]);
        console.log('Headers:', headers);

        // Map Header Name to Index
        const colMap = {};
        headers.forEach((h, i) => colMap[h] = i);

        console.log(`Found ${lines.length - 1} records to process.`);

        let imported = 0;
        let errors = 0;

        for (let i = 1; i < lines.length; i++) {
            try {
                const rowValues = parseLine(lines[i]);
                if (rowValues.length < headers.length) {
                    continue;
                }

                const getValue = (colName) => {
                    const idx = colMap[colName];
                    return idx !== undefined && rowValues[idx] ? rowValues[idx] : null;
                };

                // 'CNPJ / CPF' -> document
                const rawDocument = getValue('CNPJ / CPF') || '';
                const document = rawDocument.replace(/[^\d]/g, '');

                if (!document) {
                    continue;
                }

                // Fuzzy match for 'Avaliação'
                const ratingCol = headers.find(h => h.includes('Avalia') || h.includes('Avaliao')) || 'Avaliação';
                const rawRating = getValue(ratingCol);

                let rating = 3;
                if (rawRating && rawRating.toLowerCase().includes('excelente')) rating = 5;
                else if (rawRating && rawRating.toLowerCase().includes('bom')) rating = 4;

                const statusRaw = getValue('Status') || 'Ativo';
                const statusMap = {
                    'Ativo': 'ATIVO',
                    'Inativo': 'INATIVO',
                    'Bloqueado': 'BLOQUEADO'
                };

                const nameCol = headers.find(h => h.includes('Raz') && h.includes('Social')) || 'Razão Social';
                const tradeCol = headers.find(h => h.includes('Nome') && h.includes('Fantasia')) || 'Nome Fantasia';
                const classCol = headers.find(h => h.includes('Classifica')) || 'Classificação';
                const catCol = headers.find(h => h.includes('Categoria')) || 'Categoria';
                const logCol = headers.find(h => h.includes('Logradouro')) || 'Logradouro';
                const ufCol = headers.find(h => h.includes('Estado') || h.includes('UF')) || 'Estado (UF)';

                const supplierData = {
                    name: getValue(nameCol) || 'DESCONHECIDO',
                    tradeName: getValue(tradeCol) || getValue(nameCol),
                    document: document,
                    documentType: document.length > 11 ? 'CNPJ' : 'CPF',
                    classification: getValue(classCol) || 'GERAL',
                    category: getValue(catCol) || 'OUTROS',
                    zipCode: getValue('CEP'),
                    address: getValue(logCol),
                    state: getValue(ufCol),
                    city: getValue('Cidade'),
                    contactName: getValue('Nome do Contato'),
                    email: getValue('E-mail'),
                    phone: getValue('Telefone'),
                    status: statusMap[statusRaw] || 'ATIVO',
                    rating: rating
                };

                // Upsert
                await prisma.supplier.upsert({
                    where: { document: supplierData.document },
                    update: supplierData,
                    create: supplierData
                });

                process.stdout.write('.');
                imported++;

            } catch (err) {
                console.error(`\nError processing line ${i + 1}:`, err.message);
                errors++;
            }
        }

        console.log('\n\n----------------------------');
        console.log('Import Finished');
        console.log(`Processed: ${imported}`);
        console.log(`Errors: ${errors}`);
        console.log('----------------------------');

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

importSuppliers();
