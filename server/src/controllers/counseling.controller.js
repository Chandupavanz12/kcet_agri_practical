import { CounsellingNotification, Deadline, ExpoPushToken } from '../models/counseling.js';

export async function getNotifications(req, res, next) {
    try {
        const { category, type } = req.query;
        let filter = {};
        if (category) filter.category = category;
        if (type) filter.notificationType = type;

        const notifications = await CounsellingNotification.find(filter)
            .sort({ created_at: -1 })
            .limit(50)
            .lean();

        return res.json({ notifications });
    } catch (err) {
        return next(err);
    }
}

export async function readNotification(req, res, next) {
    try {
        const { id } = req.params;
        await CounsellingNotification.findByIdAndUpdate(id, { isRead: true });
        return res.json({ success: true });
    } catch (err) {
        return next(err);
    }
}

export async function getDeadlines(req, res, next) {
    try {
        const deadlines = await Deadline.find({ date: { $gte: new Date() } })
            .sort({ date: 1 })
            .lean();
        return res.json({ deadlines });
    } catch (err) {
        return next(err);
    }
}

export async function savePushToken(req, res, next) {
    try {
        const { token, deviceType } = req.body;
        const userId = req.user.id;
        if (!token) return res.status(400).json({ message: 'Token is required' });

        await ExpoPushToken.findOneAndUpdate(
            { expoPushToken: token },
            { userId, deviceType, created_at: new Date() },
            { upsert: true, new: true }
        );

        return res.json({ success: true });
    } catch (err) {
        return next(err);
    }
}
