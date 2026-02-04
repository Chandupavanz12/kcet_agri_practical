import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';

import {
  getDashboard,
  getMenus,
  listActiveTests,
  startTest,
  submitTest,
  myResults,
  myProgress,
  resultDetails,
  completeMaterial,
  getMaterialCompletions,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPassword,
  listPyqsStudent,
  listExamCentresStudent,
  listExamCentreYearsStudent,
  listPyqsByCentreYear,
  streamPyqPdf,
  streamMaterialFile,
  listPlansStudent,
  getAccessStatusStudent,
  createPaymentOrderStudent,
  verifyPaymentStudent,
  listMaterialsStudent,
} from '../controllers/student.mysql.controller.js';

export const studentRouter = Router();

const paymentLimiter = simpleRateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${req.user?.sub || ''}`,
});

studentRouter.use(requireAuth, requireRole('student', 'admin'));

studentRouter.get('/dashboard', getDashboard);
studentRouter.get('/menus', getMenus);
studentRouter.get('/tests', listActiveTests);
studentRouter.get('/tests/:testId/start', startTest);
studentRouter.post('/tests/:testId/submit', submitTest);

studentRouter.get('/results', myResults);
studentRouter.get('/results/:id', resultDetails);
studentRouter.get('/progress', myProgress);

studentRouter.post('/materials/complete', completeMaterial);
studentRouter.get('/materials/completed', getMaterialCompletions);
studentRouter.get('/materials', listMaterialsStudent);

studentRouter.get('/profile', getProfile);
studentRouter.put('/profile', updateProfile);

studentRouter.post('/password-reset/request', requestPasswordReset);
studentRouter.post('/password-reset/reset', resetPassword);

studentRouter.get('/pyqs', listPyqsStudent);

studentRouter.get('/exam-centres', listExamCentresStudent);
studentRouter.get('/exam-centres/:centreId/years', listExamCentreYearsStudent);
studentRouter.get('/pyqs/by-centre-year', listPyqsByCentreYear);
studentRouter.get('/pyqs/:id/pdf', streamPyqPdf);

studentRouter.get('/materials/:id/file', streamMaterialFile);

studentRouter.get('/premium/plans', listPlansStudent);
studentRouter.get('/premium/status', getAccessStatusStudent);
studentRouter.post('/premium/order', paymentLimiter, createPaymentOrderStudent);
studentRouter.post('/premium/verify', paymentLimiter, verifyPaymentStudent);
