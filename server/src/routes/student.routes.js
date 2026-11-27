import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';
import { requireRole } from '../middleware/requireRole.js';

import {
  completeMaterial,
  createPaymentOrderStudent,
  getAccessStatusStudent,
  getDashboard,
  getMaterialCompletions,
  getMenus,
  getPaymentStatusStudent,
  getProfile,
  getSubscriptionSettingsStudent,
  listActiveTests,
  listExamCentresStudent,
  listExamCentreYearsStudent,
  listMaterialsStudent,
  listNotificationsStudent,
  listPlansStudent,
  listPyqsByCentreYear,
  listPyqsStudent,
  listVideosStudent,
  myProgress,
  myResults,
  requestPasswordReset,
  resetPassword,
  resultDetails,
  serveRazorpayCheckoutHtml,
  startTest,
  streamMaterialFile,
  streamPyqPdf,
  submitFeedback,
  submitTest,
  updateProfile,
  verifyPaymentRedirect,
  verifyPaymentStudent,
} from '../controllers/student.mysql.controller.js';

import {
  getStudentBanners,
  getExamMaterials,
  getExamPyqs,
  getExamTests,
  startExamTest,
  submitExamTest,
  getExamPlans,
  getAggregatedProgress,
} from '../controllers/exam.controller.js';

export const studentRouter = Router();

const paymentLimiter = simpleRateLimit({
  windowMs: 60_000,
  max: 10,
  keyGenerator: (req) => `${req.ip}:${req.user?.sub || ''}`,
});

// Note: Checkout and redirects need to be public because the external browser doesn't have the Bearer token!
studentRouter.get('/premium/checkout', serveRazorpayCheckoutHtml);
studentRouter.all('/premium/redirect', verifyPaymentRedirect);
studentRouter.all('/premium/callback', verifyPaymentRedirect);
studentRouter.post('/premium/verify', (req, res, next) => {
  // If Razorpay posted directly to verify from external browser (no Bearer token)
  if (!req.headers.authorization && (req.body?.razorpay_signature || req.query?.razorpay_signature || req.body?.razorpay_order_id)) {
    return verifyPaymentRedirect(req, res, next);
  }
  return next();
});

studentRouter.use(requireAuth, requireRole('student', 'admin'));

studentRouter.get('/banners', getStudentBanners);
studentRouter.get('/exam/materials', getExamMaterials);
studentRouter.get('/exam/pyqs', getExamPyqs);
studentRouter.get('/exam/tests', getExamTests);
studentRouter.get('/exam/tests/:id/start', startExamTest);
studentRouter.post('/exam/tests/:id/submit', submitExamTest);
studentRouter.get('/exam/plans', getExamPlans);
studentRouter.get('/subscription-settings', getSubscriptionSettingsStudent);
studentRouter.get('/aggregated-progress', getAggregatedProgress);

studentRouter.get('/dashboard', getDashboard);
studentRouter.get('/menus', getMenus);
studentRouter.get('/videos', listVideosStudent);
studentRouter.get('/notifications', listNotificationsStudent);
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

studentRouter.post('/feedback', submitFeedback);

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
studentRouter.get('/premium/payment-status', getPaymentStatusStudent);
studentRouter.post('/premium/order', paymentLimiter, createPaymentOrderStudent);
studentRouter.post('/premium/create-order', paymentLimiter, createPaymentOrderStudent);
studentRouter.post('/exam/order', paymentLimiter, createPaymentOrderStudent);
studentRouter.post('/premium/verify', paymentLimiter, verifyPaymentStudent);
