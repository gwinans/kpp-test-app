module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'testuser',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'test_db'
    },
    migrations: {
      directory: './migrations'
    }
  }
};
