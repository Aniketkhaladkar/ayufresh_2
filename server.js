// Works in BOTH local dev (node server.js) AND Vercel serverless (as entry)
require('dotenv').config();
const app = require('./app.js');

// Only start listening when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Ayufresh running at http://localhost:${PORT}`);
  });
}

module.exports = app;
