import mongoose from 'mongoose';

const { Schema } = mongoose;

const CounsellingNotificationSchema = new Schema(
    {
        title: { type: String, required: true },
        summary: { type: String },
        description: { type: String },
        category: { type: String, index: true },
        pdfUrl: { type: String },
        sourceUrl: { type: String, index: true },
        notificationType: { type: String },
        uploadDate: { type: Date },
        documentHash: { type: String, unique: true, index: true, required: true },
        isRead: { type: Boolean, default: false },
        created_at: { type: Date, default: () => new Date() },
    },
    { collection: 'counselling_notifications' }
);
export const CounsellingNotification = mongoose.models.CounsellingNotification || mongoose.model('CounsellingNotification', CounsellingNotificationSchema);

const ExpoPushTokenSchema = new Schema(
    {
        userId: { type: String, index: true },
        expoPushToken: { type: String, required: true, unique: true, index: true },
        deviceType: { type: String },
        created_at: { type: Date, default: () => new Date() },
    },
    { collection: 'expo_push_tokens' }
);
export const ExpoPushToken = mongoose.models.ExpoPushToken || mongoose.model('ExpoPushToken', ExpoPushTokenSchema);

const DeadlineSchema = new Schema(
    {
        title: { type: String, required: true },
        date: { type: Date, required: true, index: true },
        reminder24: { type: Boolean, default: false },
        reminder12: { type: Boolean, default: false },
        reminder6: { type: Boolean, default: false },
        reminder1: { type: Boolean, default: false },
        created_at: { type: Date, default: () => new Date() },
    },
    { collection: 'counselling_deadlines' }
);
export const Deadline = mongoose.models.Deadline || mongoose.model('Deadline', DeadlineSchema);

const ScraperLogSchema = new Schema(
    {
        pagesScanned: { type: Number, default: 0 },
        pdfsScanned: { type: Number, default: 0 },
        notificationsCreated: { type: Number, default: 0 },
        errors: { type: Array, default: [] },
        lastRun: { type: Date, default: () => new Date() },
    },
    { collection: 'scraper_logs' }
);
export const ScraperLog = mongoose.models.ScraperLog || mongoose.model('ScraperLog', ScraperLogSchema);
