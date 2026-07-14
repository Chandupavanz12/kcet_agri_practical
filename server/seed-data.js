import { query, connectDb } from './src/config/db.js';
import bcrypt from 'bcryptjs';

async function seedData() {
  try {
    console.log('Connecting to database...');
    await connectDb();
    console.log('Database connected');
    console.log('Seeding sample data...');

    // Create sample test
    const testResult = await query(
      'INSERT INTO tests (title, is_active, question_count, per_question_seconds, marks_correct) VALUES (?, ?, ?, ?, ?)',
      ['KCET Agriculture Mock Test 1', 1, 10, 30, 4]
    );
    const testId = testResult.insertId;
    console.log('Created test ID:', testId);

    // Create sample specimens with remote placeholder images
    const specimens = [
      {
        image_url: 'https://picsum.photos/400/300?random=1',
        options_json: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
        correct: 0,
        status: 'active',
        question_text: 'Identify the agricultural tool shown',
        test_id: testId
      },
      {
        image_url: 'https://picsum.photos/400/300?random=2', 
        options_json: JSON.stringify(['Wheat', 'Rice', 'Maize', 'Barley']),
        correct: 1,
        status: 'active',
        question_text: 'Identify the crop shown',
        test_id: testId
      },
      {
        image_url: 'https://picsum.photos/400/300?random=3',
        options_json: JSON.stringify(['Nitrogen', 'Phosphorus', 'Potassium', 'Calcium']),
        correct: 2,
        status: 'active', 
        question_text: 'Identify the fertilizer shown',
        test_id: testId
      },
      {
        image_url: 'https://picsum.photos/400/300?random=4',
        options_json: JSON.stringify(['Tractor', 'Plow', 'Harvester', 'Thresher']),
        correct: 2,
        status: 'active',
        question_text: 'Identify the farm equipment',
        test_id: testId
      },
      {
        image_url: 'https://picsum.photos/400/300?random=5',
        options_json: JSON.stringify(['Organic', 'Chemical', 'Bio', 'Natural']),
        correct: 0,
        status: 'active',
        question_text: 'Identify the farming method',
        test_id: testId
      }
    ];

    for (const specimen of specimens) {
      await query(
        'INSERT INTO specimens (test_id, image_url, options_json, correct, status, question_text) VALUES (?, ?, ?, ?, ?, ?)',
        [specimen.test_id, specimen.image_url, specimen.options_json, specimen.correct, specimen.status, specimen.question_text]
      );
    }
    console.log('Created 5 sample specimens');

    // Create sample video
    await query(
      'INSERT INTO videos (title, youtube_id, subject, status) VALUES (?, ?, ?, ?)',
      ['Agricultural Tools Overview', 'dQw4w9WgXcQ', 'General', 'active']
    );
    console.log('Created sample video');

    // Create sample materials
    await query(
      'INSERT INTO materials (title, pdf_url, subject, type) VALUES (?, ?, ?, ?)',
      ['KCET Agriculture Syllabus', '/uploads/pdfs/syllabus.pdf', 'General', 'pdf']
    );
    console.log('Created sample material');

    console.log('Sample data seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

seedData();
