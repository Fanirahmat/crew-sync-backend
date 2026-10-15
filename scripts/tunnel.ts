import ngrok from '@ngrok/ngrok';
import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '5001', 10);
const authtoken = process.env.NGROK_AUTHTOKEN;
const domain = process.env.NGROK_DOMAIN;

async function startTunnel() {
  console.log('🚀 Initializing ngrok tunnel for CrewSync Backend...\n');

  if (!authtoken) {
    console.warn('⚠️  [WARNING] NGROK_AUTHTOKEN is not set in your .env file!');
    console.warn('👉 Get your free authtoken at: https://dashboard.ngrok.com/get-started/your-authtoken');
    console.warn('👉 Then add it to .env: NGROK_AUTHTOKEN="your_token_here"\n');
  }

  try {
    const forwardOptions: Parameters<typeof ngrok.forward>[0] = {
      addr: port,
      authtoken: authtoken || undefined,
      domain: domain || undefined,
    };

    const listener = await ngrok.forward(forwardOptions);
    const publicUrl = listener.url();

    console.log('================================================================');
    console.log('🎉 ngrok Tunnel Established Successfully!');
    console.log('================================================================');
    console.log(`🌐 Public API URL    : ${publicUrl}`);
    console.log(`📖 Swagger UI Docs   : ${publicUrl}/api/docs`);
    console.log(`🔍 Health Check      : ${publicUrl}/api/v1/health`);
    console.log(`💻 Local Target      : http://localhost:${port}`);
    console.log('================================================================');
    console.log('\nTekan Ctrl+C untuk menghentikan tunnel.\n');

    // Keep event loop active indefinitely until SIGINT / SIGTERM
    const keepAlive = setInterval(() => {}, 1000 * 60 * 60);

    const cleanup = async () => {
      console.log('\n🛑 Closing ngrok tunnel...');
      clearInterval(keepAlive);
      try {
        await listener.close();
      } catch {
        // ignore error on close
      }
      console.log('✅ ngrok tunnel closed.');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (error: any) {
    console.error('❌ Failed to start ngrok tunnel:', error?.message || error);
    if (!authtoken) {
      console.error('\n💡 Solusi: Silakan daftarkan akun gratis di https://ngrok.com lalu tambahkan NGROK_AUTHTOKEN di file .env.');
    }
    process.exit(1);
  }
}

startTunnel();
