import { Router } from 'express';
import {
  studentLogin,
  studentRegister,
  adminLogin,
  me,
  requestPasswordResetByEmail,
  resetPasswordByEmail,
  requestLoginOtpByEmail,
  verifyLoginOtpByEmail,
} from '../controllers/auth.mysql.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/student/register', studentRegister);
authRouter.post('/student/login', studentLogin);
authRouter.post('/student/password-reset/request', requestPasswordResetByEmail);
authRouter.post('/student/password-reset/reset', resetPasswordByEmail);
authRouter.post('/student/otp-login/request', requestLoginOtpByEmail);
authRouter.post('/student/otp-login/verify', verifyLoginOtpByEmail);
authRouter.post('/admin/login', adminLogin);
authRouter.get('/me', requireAuth, me);
