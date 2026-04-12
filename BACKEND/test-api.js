const axios = require('axios');
const https = require('https');

async function testApi() {
  const agent = new https.Agent({ rejectUnauthorized: false });
  try {
    console.log("1. Fazendo Login...");
    const loginRes = await axios.post('https://localhost:8500/api/v1/auth/login', {
      email: 'lucas.admin@liotecnica.com.br',
      password: 'Lio@2026'
    }, { httpsAgent: agent });
    
    const token = loginRes.data.token;
    console.log("Token acquired:", token.substring(0, 10) + "...");

    console.log("2. Testando Rota de Criar Categoria...");
    const catRes = await axios.post('https://localhost:8500/api/v1/service-catalog/categories', {
      name: 'Cat Teste API ' + Date.now()
    }, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: agent
    });
    
    console.log("SUCCESS:", catRes.data);
  } catch (err) {
    if (err.response) {
      console.error("ERRO HTTP STATUS:", err.response.status);
      console.error("DATA:", err.response.data);
    } else {
      console.error("Network Error:", err.message);
    }
  }
}
testApi();
