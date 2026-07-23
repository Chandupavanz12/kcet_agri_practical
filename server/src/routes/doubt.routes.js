import { Router } from 'express';
import {
    clearAdminHistoryForStudent,
    clearStudentHistory,
    getAdminMessagesForStudent,
    getStudentMessages,
    getStudentsList,
    initializeDoubtDb,
    sendAdminReply,
    sendDoubtMessage
} from '../controllers/doubt.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

export const doubtRouter = Router();

// Middleware to initialize connection before handling any requests
doubtRouter.use(initializeDoubtDb);

// Student Endpoints (Must be student)
doubtRouter.get('/student', requireAuth, requireRole('student', 'admin'), getStudentMessages);
doubtRouter.post('/student', requireAuth, requireRole('student', 'admin'), sendDoubtMessage);
doubtRouter.post('/student/clear', requireAuth, requireRole('student', 'admin'), clearStudentHistory);

// Admin Endpoints (Must be admin)
doubtRouter.get('/admin/students', requireAuth, requireRole('admin'), getStudentsList);
doubtRouter.get('/admin/:studentId', requireAuth, requireRole('admin'), getAdminMessagesForStudent);
doubtRouter.post('/admin/:studentId/reply', requireAuth, requireRole('admin'), sendAdminReply);
doubtRouter.post('/admin/:studentId/clear', requireAuth, requireRole('admin'), clearAdminHistoryForStudent);
