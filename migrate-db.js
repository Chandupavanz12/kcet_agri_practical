import { query, connectDb } from './server/src/config/db.js';

async function migrateDb() {
  try {
    await connectDb();
    console.log('Connected to database');
    
    // Create test_questions table
    await query(
      `CREATE TABLE IF NOT EXISTS test_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        question_text VARCHAR(255) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        option_a VARCHAR(255) NOT NULL,
        option_b VARCHAR(255) NOT NULL,
        option_c VARCHAR(255) NOT NULL,
        option_d VARCHAR(255) NOT NULL,
        correct_option ENUM('A','B','C','D') NOT NULL,
        question_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_test_questions_test (test_id),
        INDEX idx_test_questions_order (test_id, question_order),
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`
    );
    console.log('test_questions table created/verified');
    
    // Create a sample test with the new structure
    const testResult = await query(
      'INSERT INTO tests (title, is_active, question_count, per_question_seconds, marks_correct) VALUES (?, ?, ?, ?, ?)',
      ['KCET Agriculture Sample Test', 1, 5, 30, 4]
    );
    const testId = testResult.insertId;
    console.log('Created sample test with ID:', testId);
    
    // Add sample questions
    const sampleQuestions = [
      {
        question_text: 'Identify the agricultural tool shown in the image',
        image_url: 'https://picsum.photos/400/300?random=1',
        option_a: 'Plow',
        option_b: 'Harvester',
        option_c: 'Tractor',
        option_d: 'Thresher',
        correct_option: 'A',
        question_order: 1
      },
      {
        question_text: 'Which crop is shown in the image?',
        image_url: 'https://picsum.photos/400/300?random=2',
        option_a: 'Wheat',
        option_b: 'Rice',
        option_c: 'Maize',
        option_d: 'Barley',
        correct_option: 'B',
        question_order: 2
      },
      {
        question_text: 'Identify the fertilizer shown',
        image_url: 'https://picsum.photos/400/300?random=3',
        option_a: 'Nitrogen',
        option_b: 'Phosphorus',
        option_c: 'Potassium',
        option_d: 'Calcium',
        correct_option: 'C',
        question_order: 3
      },
      {
        question_text: 'What farming equipment is shown?',
        image_url: 'https://picsum.photos/400/300?random=4',
        option_a: 'Tractor',
        option_b: 'Plow',
        option_c: 'Harvester',
        option_d: 'Thresher',
        correct_option: 'C',
        question_order: 4
      },
      {
        question_text: 'Identify the farming method',
        image_url: 'https://picsum.photos/400/300?random=5',
        option_a: 'Organic',
        option_b: 'Chemical',
        option_c: 'Bio',
        option_d: 'Natural',
        correct_option: 'A',
        question_order: 5
      }
    ];
    
    for (const q of sampleQuestions) {
      await query(
        'INSERT INTO test_questions (test_id, question_text, image_url, option_a, option_b, option_c, option_d, correct_option, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [testId, q.question_text, q.image_url, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.question_order]
      );
    }
    console.log('Added 5 sample questions');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    process.exit(0);
  }
}

migrateDb();
