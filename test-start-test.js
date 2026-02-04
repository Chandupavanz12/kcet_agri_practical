import { query, connectDb } from './server/src/config/db.js';

async function testStartTest() {
  try {
    await connectDb();
    
    // Check if we have tests with questions
    const tests = await query('SELECT * FROM tests WHERE is_active = 1');
    console.log('Active tests:', tests.length);
    
    for (const test of tests) {
      console.log(`\nTest ID: ${test.id}, Title: ${test.title}`);
      
      const questions = await query(
        'SELECT * FROM test_questions WHERE test_id = ? ORDER BY question_order ASC',
        [test.id]
      );
      
      console.log(`Questions for test ${test.id}:`, questions.length);
      
      if (questions.length > 0) {
        console.log('First question:', {
          id: questions[0].id,
          question_text: questions[0].question_text,
          image_url: questions[0].image_url,
          option_a: questions[0].option_a,
          option_b: questions[0].option_b,
          option_c: questions[0].option_c,
          option_d: questions[0].option_d,
          correct_option: questions[0].correct_option
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testStartTest();
