const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('https://localhost:8500/api/v1/auth/login', {
      email: 'admin@g360.com.br',
      password: 'L89*Eb5v@'
    }, {
      // ignore self-signed certs in dev
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });
    console.log("Success:", JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.log("Error Status:", e.response?.status);
    console.log("Error Data:", JSON.stringify(e.response?.data, null, 2));
  }
})();
