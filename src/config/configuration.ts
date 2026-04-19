export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: Number(process.env.JWT_ACCESS_EXPIRES_IN ?? 900),
    refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN ?? 604800),
  },
});
