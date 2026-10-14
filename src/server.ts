import { createApp } from '@/app';
import { env } from '@/config/env';
import { prisma } from '@/config/database';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 CrewSync Backend Service running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully shutting down due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
