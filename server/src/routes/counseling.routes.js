import { Router } from 'express';
import { getDeadlines, getNotifications, readNotification, savePushToken } from '../controllers/counseling.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const counselingRouter = Router();

counselingRouter.get('/notifications', requireAuth, getNotifications);
counselingRouter.post('/notifications/:id/read', requireAuth, readNotification);
counselingRouter.get('/deadlines', requireAuth, getDeadlines);
counselingRouter.post('/push-token', requireAuth, savePushToken);
