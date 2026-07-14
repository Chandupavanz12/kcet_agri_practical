import { Router } from 'express';
import {
  adminLogin,
  adminRegister,
  me,
  oauthStudent,
  requestLoginOtpByEmail,
  requestPasswordResetByEmail,
  requestRegisterOtp,
  resetPasswordByEmail,
  studentLogin,
  studentRegister,
  verifyAdminLoginOtp,
  verifyLoginOtpByEmail,
} from '../controllers/auth.mysql.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/student/register-otp/request', requestRegisterOtp);
authRouter.post('/student/register', studentRegister);
authRouter.post('/student/login', studentLogin);
authRouter.post('/student/oauth', oauthStudent);
authRouter.post('/student/password-reset/request', requestPasswordResetByEmail);
authRouter.post('/student/password-reset/reset', resetPasswordByEmail);
authRouter.post('/student/otp-login/request', requestLoginOtpByEmail);
authRouter.post('/student/otp-login/verify', verifyLoginOtpByEmail);

authRouter.post('/admin/register', adminRegister);
authRouter.post('/admin/login', adminLogin);
authRouter.post('/admin/login-verify', verifyAdminLoginOtp);
authRouter.get('/me', requireAuth, me);
