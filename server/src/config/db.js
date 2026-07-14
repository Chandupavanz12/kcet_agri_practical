import mongoose from 'mongoose';

export let filesConnection = null;
let connectingPromise;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDb() {
  mongoose.set('bufferCommands', false);
  mongoose.set('bufferTimeoutMS', 5000);

  if (mongoose.connection.readyState === 1) return;
  if (connectingPromise) return connectingPromise;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI not set');
  }

  const maxAttempts = Number(process.env.MONGO_CONNECT_ATTEMPTS || 5);
  const baseDelayMs = Number(process.env.MONGO_CONNECT_DELAY_MS || 500);

  connectingPromise = (async () => {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          // Keep at least 1 connection open so the first real request
          // doesn't have to establish a brand-new TCP + TLS handshake.
          minPoolSize: 1,
          maxPoolSize: 10,
          // Ping the server every 10 s so Atlas doesn't close idle connections.
          heartbeatFrequencyMS: 10000,
          // Close pool connections that have been idle > 60 s – prevents
          // stale sockets from silently dropping on free-tier hosts.
          maxIdleTimeMS: 60000,
        });

        mongoose.connection.on('error', (err) => {
          // eslint-disable-next-line no-console
          console.error('[mongo] connection error', err);
        });

        mongoose.connection.on('disconnected', () => {
          // eslint-disable-next-line no-console
          console.error('[mongo] disconnected – will reconnect on next request');
        });

        // eslint-disable-next-line no-console
        console.log('[mongo] main db connected successfully');

        if (process.env.MONGO_URI_FILES) {
          filesConnection = mongoose.createConnection(process.env.MONGO_URI_FILES, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            minPoolSize: 1,
            maxPoolSize: 10,
            heartbeatFrequencyMS: 10000,
            maxIdleTimeMS: 60000,
          });
          
          filesConnection.on('error', (err) => console.error('[mongo-files] error', err));
          filesConnection.on('disconnected', () => console.error('[mongo-files] disconnected'));
          
          await filesConnection.asPromise();
          console.log('[mongo-files] files db connected successfully');
        } else {
          filesConnection = mongoose.connection;
          console.log('[mongo-files] MONGO_URI_FILES not set, using main db for files');
        }

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

export function getFilesDb() {
  if (filesConnection && filesConnection.readyState === 1) return filesConnection.db;
  return mongoose.connection.db;
}

export function getFilesConnection() {
  if (filesConnection && filesConnection.readyState === 1) return filesConnection;
  return mongoose.connection;
}

export async function disconnectDb() {
  try {
    if (filesConnection && filesConnection !== mongoose.connection) {
      await filesConnection.close();
    }
    await mongoose.disconnect();
  } catch {
    // ignore
  }
}
