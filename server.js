
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`ProposalForge PRO rodando na porta ${PORT}`);
});
