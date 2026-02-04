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
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  reorderMenus,
  createVideo,
  listVideos,
  updateVideo,
  deleteVideo,
  createMaterial,
  listMaterials,
  updateMaterial,
  deleteMaterial,
  listPlans,
  updatePlan,
  deletePlan,
  listPayments,
  createNotification,
  listNotifications,
  updateNotification,
  deleteNotification,
  createSpecimen,
  listSpecimens,
  updateSpecimen,
  deleteSpecimen,
  createTest,
  createTestWithQuestions,
  listTests,
  updateTest,
  deleteTest,
  getSettings,
  updateSettings,
  listResults,
  exportResultsCsv,
  uploadSpecimenImage,
  uploadMaterialPdf,
  uploadMaterialPdfPrivate,
  uploadPyqPdfPrivate,
  uploadPyqPdfPublic,
  createExamCentre,
  listExamCentres,
  updateExamCentre,
  deleteExamCentre,
  createExamCentreYear,
  listExamCentreYears,
  updateExamCentreYear,
  deleteExamCentreYear,
  createPyq,
  listPyqs,
  updatePyq,
  deletePyq,
  getAnalytics,
  getDashboard,
} from '../controllers/admin.mysql.controller.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/dashboard', getDashboard);

adminRouter.get('/menu', getMenus);
adminRouter.post('/menu', createMenu);
adminRouter.put('/menu/:id', updateMenu);
adminRouter.delete('/menu/:id', deleteMenu);
adminRouter.put('/menu/reorder', reorderMenus);

adminRouter.get('/students', listStudents);
adminRouter.post('/students', createStudent);
adminRouter.put('/students/:id', updateStudent);
adminRouter.delete('/students/:id', deleteStudent);

adminRouter.post('/upload/specimen-image', uploadImage.single('file'), uploadSpecimenImage);
adminRouter.post('/upload/material-pdf', uploadMaterial.single('file'), uploadMaterialPdf);
adminRouter.post('/upload/material-private', uploadMaterialPrivate.single('file'), uploadMaterialPdfPrivate);
adminRouter.post('/upload/pyq-pdf', uploadPyqPdf.single('file'), uploadPyqPdfPrivate);
adminRouter.post('/upload/pyq-public', uploadPyqPdfPublicMulter.single('file'), uploadPyqPdfPublic);

adminRouter.post('/exam-centres', createExamCentre);
adminRouter.get('/exam-centres', listExamCentres);
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
adminRouter.put('/plans/:id', updatePlan);
adminRouter.delete('/plans/:id', deletePlan);

adminRouter.get('/payments', listPayments);

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

adminRouter.get('/settings', getSettings);
adminRouter.put('/settings', updateSettings);

adminRouter.get('/results', listResults);
adminRouter.get('/results/export.csv', exportResultsCsv);

adminRouter.post('/pyqs', createPyq);
adminRouter.get('/pyqs', listPyqs);
adminRouter.put('/pyqs/:id', updatePyq);
adminRouter.delete('/pyqs/:id', deletePyq);

adminRouter.get('/analytics', getAnalytics);
