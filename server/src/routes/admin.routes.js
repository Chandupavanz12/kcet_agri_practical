import { Router } from 'express';

import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import {
  uploadImage,
  uploadMaterial,
  uploadMaterialPrivate,
  uploadPyqPdf,
  uploadPyqPdfPublic as uploadPyqPdfPublicMulter,
} from '../middleware/upload.js';

import {
  addTestQuestion,
  createExamCentre,
  createExamCentreYear,
  createMaterial,
  createMenu,
  createNotification,
  createPlan,
  createPyq,
  createSpecimen,
  createStudent,
  createTest,
  createTestWithQuestions,
  createVideo,
  deleteExamCentre,
  deleteExamCentreYear,
  deleteFeedback,
  deleteMaterial,
  deleteMenu,
  deleteNotification,
  deletePayments,
  deletePlan,
  deletePyq,
  deleteSpecimen,
  deleteStudent,
  deleteTest,
  deleteTestQuestion,
  deleteVideo,
  exportResultsCsv,
  getAnalytics,
  getDashboard,
  getFeedbacks,
  getMenus,
  getSettings,
  getTestQuestions,
  listExamCentres,
  listExamCentreYears,
  listMaterials,
  listNotifications,
  listPayments,
  listPlans,
  listPyqs,
  listResults,
  listSpecimens,
  listStudents,
  listTests,
  listVideos,
  manageStudentSubscription,
  reorderMenus,
  replyFeedback,
  updateExamCentre,
  updateExamCentreYear,
  updateMaterial,
  updateMenu,
  updateNotification,
  updatePlan,
  updatePyq,
  updateSettings,
  updateSpecimen,
  updateStudent,
  updateTest,
  updateTestQuestion,
  updateVideo,
  uploadMaterialPdf,
  uploadMaterialPdfPrivate,
  uploadPyqPdfPrivate,
  uploadPyqPdfPublic,
  uploadSpecimenImage
} from '../controllers/admin.mysql.controller.js';

import {
  getAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  createAdminExamMaterial,
  getAdminExamMaterials,
  deleteAdminExamMaterial,
  createAdminExamPyq,
  getAdminExamPyqs,
  deleteAdminExamPyq,
  createAdminExamTest,
  getAdminExamTests,
  deleteAdminExamTest,
  createAdminExamPlan,
  updateAdminExamPlan,
  getAdminExamPlans,
  deleteAdminExamPlan,
  getBulkPlanCatalog,
  listBulkPlans,
  createBulkPlan,
  updateBulkPlan,
  deleteBulkPlan,
} from '../controllers/exam.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/dashboard', getDashboard);

adminRouter.get('/banners', getAdminBanners);
adminRouter.post('/banners', createAdminBanner);
adminRouter.put('/banners/:id', updateAdminBanner);
adminRouter.delete('/banners/:id', deleteAdminBanner);

// Exam Content Management (PUC, KCET, NEET)
adminRouter.get('/exam/materials', getAdminExamMaterials);
adminRouter.post('/exam/materials', createAdminExamMaterial);
adminRouter.delete('/exam/materials/:id', deleteAdminExamMaterial);

adminRouter.get('/exam/pyqs', getAdminExamPyqs);
adminRouter.post('/exam/pyqs', createAdminExamPyq);
adminRouter.delete('/exam/pyqs/:id', deleteAdminExamPyq);

adminRouter.get('/exam/tests', getAdminExamTests);
adminRouter.post('/exam/tests', createAdminExamTest);
adminRouter.delete('/exam/tests/:id', deleteAdminExamTest);

adminRouter.get('/exam/plans', getAdminExamPlans);
adminRouter.post('/exam/plans', createAdminExamPlan);
adminRouter.put('/exam/plans/:id', updateAdminExamPlan);
adminRouter.delete('/exam/plans/:id', deleteAdminExamPlan);

adminRouter.get('/bulk-plans/catalog', getBulkPlanCatalog);
adminRouter.get('/bulk-plans', listBulkPlans);
adminRouter.post('/bulk-plans', createBulkPlan);
adminRouter.put('/bulk-plans/:id', updateBulkPlan);
adminRouter.delete('/bulk-plans/:id', deleteBulkPlan);

adminRouter.get('/menu', getMenus);
adminRouter.post('/menu', createMenu);
adminRouter.put('/menu/:id', updateMenu);
adminRouter.delete('/menu/:id', deleteMenu);
adminRouter.put('/menu/reorder', reorderMenus);

adminRouter.get('/students', listStudents);
adminRouter.post('/students', createStudent);
adminRouter.put('/students/:id', updateStudent);
adminRouter.post('/students/:id/subscribe', manageStudentSubscription);
adminRouter.delete('/students/:id', deleteStudent);

adminRouter.post('/upload/specimen-image', uploadImage.single('file'), uploadSpecimenImage);
adminRouter.post('/upload/material-pdf', uploadMaterial.single('file'), uploadMaterialPdf);
adminRouter.post('/upload/material-private', uploadMaterialPrivate.single('file'), uploadMaterialPdfPrivate);
adminRouter.post('/upload/pyq-pdf', uploadPyqPdf.single('file'), uploadPyqPdfPrivate);
adminRouter.post('/upload/pyq-public', uploadPyqPdfPublicMulter.single('file'), uploadPyqPdfPublic);

adminRouter.get('/exam-centres', listExamCentres);
adminRouter.post('/exam-centres', createExamCentre);
adminRouter.put('/exam-centres/:id', updateExamCentre);
adminRouter.delete('/exam-centres/:id', deleteExamCentre);
adminRouter.post('/exam-centres/:centreId/years', createExamCentreYear);
adminRouter.get('/exam-centres/:centreId/years', listExamCentreYears);
adminRouter.put('/exam-centre-years/:id', updateExamCentreYear);
adminRouter.delete('/exam-centre-years/:id', deleteExamCentreYear);

adminRouter.post('/videos', createVideo);
adminRouter.get('/videos', listVideos);
adminRouter.put('/videos/:id', updateVideo);
adminRouter.delete('/videos/:id', deleteVideo);

adminRouter.post('/materials', createMaterial);
adminRouter.get('/materials', listMaterials);
adminRouter.put('/materials/:id', updateMaterial);
adminRouter.delete('/materials/:id', deleteMaterial);

adminRouter.get('/plans', listPlans);
adminRouter.post('/plans', createPlan);
adminRouter.put('/plans/:id', updatePlan);
adminRouter.delete('/plans/:id', deletePlan);

adminRouter.get('/payments', listPayments);
adminRouter.delete('/payments', deletePayments);

adminRouter.post('/notifications', createNotification);
adminRouter.get('/notifications', listNotifications);
adminRouter.put('/notifications/:id', updateNotification);
adminRouter.delete('/notifications/:id', deleteNotification);

adminRouter.post('/specimens', createSpecimen);
adminRouter.get('/specimens', listSpecimens);
adminRouter.put('/specimens/:id', updateSpecimen);
adminRouter.delete('/specimens/:id', deleteSpecimen);

adminRouter.post('/tests', createTest);
adminRouter.post('/tests/builder', createTestWithQuestions);
adminRouter.get('/tests', listTests);
adminRouter.put('/tests/:id', updateTest);
adminRouter.delete('/tests/:id', deleteTest);
adminRouter.get('/tests/:id/questions', getTestQuestions);
adminRouter.post('/tests/:id/questions', addTestQuestion);
adminRouter.put('/tests/:id/questions/:questionId', updateTestQuestion);
adminRouter.delete('/tests/:id/questions/:questionId', deleteTestQuestion);

adminRouter.get('/settings', getSettings);
adminRouter.put('/settings', updateSettings);

adminRouter.get('/results', listResults);
adminRouter.get('/results/export.csv', exportResultsCsv);

adminRouter.post('/pyqs', createPyq);
adminRouter.get('/pyqs', listPyqs);
adminRouter.put('/pyqs/:id', updatePyq);
adminRouter.delete('/pyqs/:id', deletePyq);

adminRouter.get('/analytics', getAnalytics);

adminRouter.get('/feedback', getFeedbacks);
adminRouter.post('/feedback/reply/:id', replyFeedback);
adminRouter.delete('/feedback/:id', deleteFeedback);
