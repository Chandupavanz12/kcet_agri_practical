import mongoose from 'mongoose';

let doubtConnection = null;
let connectingPromise = null;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDoubtDb() {
    const uri = process.env.MONGO_URI_DOUBT;

    // If a dedicated MONGO_URI_DOUBT is provided, attempt connection to it
    if (uri) {
        if (doubtConnection && doubtConnection.readyState === 1) return;
        if (connectingPromise) return connectingPromise;

        const maxAttempts = 3;
        const baseDelayMs = 500;

        connectingPromise = (async () => {
            let lastErr;
            for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
                try {
                    doubtConnection = mongoose.createConnection(uri, {
                        dbName: 'doubt_clarification',
                        serverSelectionTimeoutMS: 10000,
                        connectTimeoutMS: 10000,
                        socketTimeoutMS: 30000,
                        minPoolSize: 1,
                        maxPoolSize: 10,
                        heartbeatFrequencyMS: 10000,
                        maxIdleTimeMS: 60000,
                    });

                    doubtConnection.on('error', (err) =>
                        console.error('[mongo-doubt] connection error', err?.message || err)
                    );
                    doubtConnection.on('disconnected', () =>
                        console.error('[mongo-doubt] disconnected')
                    );

                    await doubtConnection.asPromise();
                    console.log('[mongo-doubt] doubt db connected successfully to dedicated cluster');
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
            console.warn('[mongo-doubt] Dedicated doubt DB failed to connect; falling back to main DB', lastErr?.message || lastErr);
        })();

        try {
            await connectingPromise;
        } finally {
            connectingPromise = null;
        }
    }

    // Fallback: If no dedicated URI or dedicated connection failed, reuse main connection
    if (!doubtConnection || doubtConnection.readyState !== 1) {
        if (mongoose.connection && mongoose.connection.readyState === 1) {
            doubtConnection = mongoose.connection.useDb('doubt_clarification', { useCache: true });
            console.log('[mongo-doubt] using main db connection for doubt_clarification');
        } else if (process.env.MONGO_URI) {
            try {
                doubtConnection = mongoose.createConnection(process.env.MONGO_URI, {
                    dbName: 'doubt_clarification',
                    serverSelectionTimeoutMS: 10000,
                    connectTimeoutMS: 10000,
                    socketTimeoutMS: 30000,
                    minPoolSize: 1,
                    maxPoolSize: 10,
                    heartbeatFrequencyMS: 10000,
                    maxIdleTimeMS: 60000,
                });
                await doubtConnection.asPromise();
                console.log('[mongo-doubt] connected to doubt_clarification using MONGO_URI');
            } catch (err) {
                console.error('[mongo-doubt] fallback to MONGO_URI failed', err?.message || err);
            }
        }
    }
}

export function getDoubtConnection() {
    if (doubtConnection && doubtConnection.readyState === 1) {
        return doubtConnection;
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        doubtConnection = mongoose.connection.useDb('doubt_clarification', { useCache: true });
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
        message: { type: String, default: '' },
        attachment_url: { type: String, default: null },
        attachment_type: { type: String, enum: ['image', 'document', null], default: null },
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
