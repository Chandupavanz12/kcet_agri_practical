import { query, connectDb } from './server/src/config/db.js';

async function migrateVideos() {
  try {
    await connectDb();
    console.log('Connected to database');
    
    // Check if the old column exists and migrate data
    try {
      // Add new columns if they don't exist
      await query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url VARCHAR(500) NOT NULL DEFAULT '' AFTER title`);
      await query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500) AFTER video_url`);
      
      // Get existing videos with youtube_id
      const existingVideos = await query('SELECT id, title, youtube_id FROM videos');
      console.log(`Found ${existingVideos.length} existing videos`);
      
      // Convert youtube_id to video_url
      for (const video of existingVideos) {
        const videoUrl = `https://www.youtube.com/watch?v=${video.youtube_id}`;
        const thumbnailUrl = `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`;
        
        await query(
          'UPDATE videos SET video_url = ?, thumbnail_url = ? WHERE id = ?',
          [videoUrl, thumbnailUrl, video.id]
        );
        
        console.log(`Updated video ${video.id}: ${video.title}`);
      }
      
      // Drop the old column (optional - keep for now for safety)
      // await query(`ALTER TABLE videos DROP COLUMN youtube_id`);
      
      console.log('Migration completed successfully!');
      
    } catch (error) {
      console.error('Migration error:', error);
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    process.exit(0);
  }
}

migrateVideos();
