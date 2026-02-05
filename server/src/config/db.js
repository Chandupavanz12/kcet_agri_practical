import mongoose from 'mongoose';

let connectingPromise;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI not set');
  }

  const maxAttempts = Number(process.env.MONGO_CONNECT_ATTEMPTS || 10);
  const baseDelayMs = Number(process.env.MONGO_CONNECT_DELAY_MS || 1000);

  connectingPromise = (async () => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
        });

        mongoose.connection.on('error', (err) => {
          // eslint-disable-next-line no-console
          console.error('[mongo] connection error', err);
        });

        mongoose.connection.on('disconnected', () => {
          // eslint-disable-next-line no-console
          console.error('[mongo] disconnected');
        });

        return;
      } catch (err) {
        lastErr = err;
        const delay = baseDelayMs * attempt;
        // eslint-disable-next-line no-console
        console.error(`[mongo] connect attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`, err?.message || err);
        await sleep(delay);
      }
    }

    throw lastErr || new Error('Failed to connect to MongoDB');
  })();

  try {
    await connectingPromise;
  } finally {
    connectingPromise = null;
  }
}

export async function disconnectDb() {
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
}
