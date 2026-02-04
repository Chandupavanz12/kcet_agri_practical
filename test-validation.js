import { apiFetch } from './client/src/lib/api.js';

// Test the validation with sample data
const testData = {
  title: 'Test Validation',
  isActive: true,
  perQuestionSeconds: 30,
  marksCorrect: 4,
  questionCount: 2,
  questions: [
    {
      questionText: 'Sample question 1',
      imageUrl: 'https://picsum.photos/400/300?random=1',
      optionA: 'Option A',
      optionB: 'Option B', 
      optionC: 'Option C',
      optionD: 'Option D',
      correctOption: 'A',
      questionOrder: 1
    },
    {
      questionText: 'Sample question 2',
      imageUrl: 'https://picsum.photos/400/300?random=2',
      optionA: 'Option A',
      optionB: 'Option B',
      optionC: 'Option C', 
      optionD: 'Option D',
      correctOption: 'B',
      questionOrder: 2
    }
  ]
};

console.log('Test data:', JSON.stringify(testData, null, 2));

// This would be sent to the backend
console.log('Would send this to /api/admin/tests/builder');
