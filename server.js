const path = require('path');
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`ProposalForge PRO running at http://${HOST}:${PORT}`);
  console.log(`Login: /login | Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
});
