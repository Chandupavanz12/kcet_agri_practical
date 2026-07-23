import { connectDoubtDb, getDoubtMessageModel } from '../config/doubtDb.js';
import { sendPushNotificationToUser } from '../services/counseling/notifier.js';

// Init DB
export async function initializeDoubtDb(req, res, next) {
    try {
        await connectDoubtDb();
        next();
    } catch (err) {
        next(err);
    }
}

// Student routes
export async function getStudentMessages(req, res, next) {
    try {
        const studentId = req.user.sub || req.user.id;
        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        const messages = await DoubtMessage.find({
            student_id: studentId,
            is_deleted_by_student: false
        }).sort({ created_at: 1 });

        res.json(messages);
    } catch (err) {
        next(err);
    }
}

export async function sendDoubtMessage(req, res, next) {
    try {
        const studentId = req.user.sub || req.user.id;
        const studentName = req.user.name || req.user.full_name || 'Student'; // Depending on user model
        const { message } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        const newMessage = await DoubtMessage.create({
            student_id: studentId,
            student_name: studentName,
            sender_type: 'student',
            message: message.trim()
        });

        res.json(newMessage);
    } catch (err) {
        next(err);
    }
}

export async function clearStudentHistory(req, res, next) {
    try {
        const studentId = req.user.sub || req.user.id;
        const { messageIds } = req.body; // if empty, just ignore? no we need it maybe array
        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        if (Array.isArray(messageIds) && messageIds.length > 0) {
            await DoubtMessage.updateMany(
                { _id: { $in: messageIds }, student_id: studentId },
                { $set: { is_deleted_by_student: true } }
            );
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

// Admin routes
export async function getStudentsList(req, res, next) {
    try {
        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        // Aggregate to get unique students who sent messages and their latest message
        const studentsList = await DoubtMessage.aggregate([
            {
                $match: { is_deleted_by_admin: false }
            },
            {
                $sort: { created_at: -1 }
            },
            {
                $group: {
                    _id: "$student_id",
                    studentId: { $first: "$student_id" },
                    studentName: { $first: "$student_name" },
                    lastMessageDate: { $first: "$created_at" },
                    unreadCount: {
                        $sum: {
                            $cond: [{ $and: [{ $eq: ["$sender_type", "student"] }, { $eq: ["$read", false] }] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { lastMessageDate: -1 }
            }
        ]);

        res.json(studentsList);
    } catch (err) {
        next(err);
    }
}

export async function getAdminMessagesForStudent(req, res, next) {
    try {
        const studentId = Number(req.params.studentId);
        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        // Mark as read
        await DoubtMessage.updateMany(
            { student_id: studentId, sender_type: 'student', read: false },
            { $set: { read: true } }
        );

        const messages = await DoubtMessage.find({
            student_id: studentId,
            is_deleted_by_admin: false
        }).sort({ created_at: 1 });

        res.json(messages);
    } catch (err) {
        next(err);
    }
}

export async function sendAdminReply(req, res, next) {
    try {
        const studentId = Number(req.params.studentId);
        let { message, studentName } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        if (!studentName) {
            studentName = 'Student';
        }

        const newMessage = await DoubtMessage.create({
            student_id: studentId,
            student_name: studentName,
            sender_type: 'admin',
            message: message.trim(),
            read: false
        });

        // send push notification even if app is closed
        await sendPushNotificationToUser(
            studentId,
            'Doubt Clarification Update',
            'Admin has replied to your doubt.',
            { route: '/student/doubts' }
        );

        res.json(newMessage);
    } catch (err) {
        next(err);
    }
}

export async function clearAdminHistoryForStudent(req, res, next) {
    try {
        const studentId = Number(req.params.studentId);
        const { messageIds } = req.body;

        const DoubtMessage = getDoubtMessageModel();
        if (!DoubtMessage) return res.status(503).json({ message: 'Doubt Service Unavailable' });

        if (Array.isArray(messageIds) && messageIds.length > 0) {
            await DoubtMessage.updateMany(
                { _id: { $in: messageIds }, student_id: studentId },
                { $set: { is_deleted_by_admin: true } }
            );
        }

        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}
