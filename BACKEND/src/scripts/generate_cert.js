const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const attrs = [{ name: 'commonName', value: 'G360-Backend' }];
(async () => {
    try {
        const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048 });
        console.log('Keys generated:', Object.keys(pems));

        const certDir = path.join(__dirname, '..', 'certs');
        if (!fs.existsSync(certDir)) {
            fs.mkdirSync(certDir);
        }

        fs.writeFileSync(path.join(certDir, 'server.key'), pems.private);
        fs.writeFileSync(path.join(certDir, 'server.cert'), pems.cert);
        console.log('Certificates generated in ' + certDir);
    } catch (err) {
        console.error(err);
    }
})();
