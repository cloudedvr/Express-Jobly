const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://localhost/jobly"
});

client.connect();

module.exports = client;
