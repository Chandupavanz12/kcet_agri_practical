import mongoose from 'mongoose';

let doubtConnection = null;
let connectingPromise = null;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDoubtDb() {
    const uri = process.env.MONGO_URI_DOUBT || 'mongodb+srv://chandupavan68_dbuser:k7K2gto0IccZU2DJ@cluster0.4yibaa7.mongodb.net/?appName=Cluster0';

    if (doubtConnection && doubtConnection.readyState === 1) return;
    if (connectingPromise) return connectingPromise;

    const maxAttempts = 5;
    const baseDelayMs = 500;

    connectingPromise = (async () => {
        let lastErr;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                doubtConnection = mongoose.createConnection(uri, {
                    dbName: 'doubt_clarification',
                    serverSelectionTimeoutMS: 15000,
                    connectTimeoutMS: 15000,
                    socketTimeoutMS: 45000,
                    minPoolSize: 1,
                    maxPoolSize: 10,
                    heartbeatFrequencyMS: 10000,
                    maxIdleTimeMS: 60000,
                });

                doubtConnection.on('error', (err) =>
                    console.error('[mongo-doubt] connection error', err)
                );
                doubtConnection.on('disconnected', () =>
                    console.error('[mongo-doubt] disconnected')
                );

                await doubtConnection.asPromise();
                console.log('[mongo-doubt] doubt db connected successfully');
                return;
            } catch (err) {
                lastErr = err;
                const delay = baseDelayMs * attempt;
                console.error(
                    `[mongo-doubt] connect attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`,
                    err?.message || err
                );
                if (doubtConnection) {
                    try { await doubtConnection.close(); } catch (_) { }
                    doubtConnection = null;
                }
                await sleep(delay);
            }
        }
        throw lastErr || new Error('Failed to connect to doubt MongoDB');
    })();

    try {
        await connectingPromise;
    } finally {
        connectingPromise = null;
    }
}

export function getDoubtConnection() {
    if (doubtConnection && doubtConnection.readyState === 1) {
        return doubtConnection;
    }
    return null;
}

import { Schema } from 'mongoose';

const DoubtMessageSchema = new Schema(
    {
        student_id: { type: Number, required: true, index: true },
        student_name: { type: String, required: true },
        sender_type: { type: String, enum: ['student', 'admin'], required: true },
        message: { type: String, required: true },
        is_deleted_by_student: { type: Boolean, default: false },
        is_deleted_by_admin: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        created_at: { type: Date, default: () => new Date(), index: true },
    },
    { collection: 'doubt_messages' }
);

DoubtMessageSchema.index({ student_id: 1, created_at: 1 });

export function getDoubtMessageModel() {
    const conn = getDoubtConnection();
    if (conn) {
        return conn.models.DoubtMessage || conn.model('DoubtMessage', DoubtMessageSchema);
    }
    return null;
}

export async function disconnectDoubtDb() {
    try {
        if (doubtConnection) {
            await doubtConnection.close();
            doubtConnection = null;
        }
    } catch (_) { }
}
