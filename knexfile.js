module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'test',
      database: process.env.DB_NAME || 'ptosc'
    },
    migrations: {
      directory: './migrations'
    }
  }
};
