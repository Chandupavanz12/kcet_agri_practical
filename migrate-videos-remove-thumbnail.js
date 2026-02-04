import { query, connectDb } from './server/src/config/db.js';

async function migrateVideos() {
  try {
    await connectDb();
    console.log('Connected to database');
    
    try {
      // Drop the thumbnail_url column if it exists
      await query(`ALTER TABLE videos DROP COLUMN IF EXISTS thumbnail_url`);
      console.log('Dropped thumbnail_url column');
      
      // Update existing videos to generate YouTube thumbnails
      const existingVideos = await query('SELECT id, video_url FROM videos');
      console.log(`Found ${existingVideos.length} existing videos`);
      
      for (const video of existingVideos) {
        // Extract YouTube video ID from URL
        const youtubeId = extractYouTubeId(video.video_url);
        if (youtubeId) {
          console.log(`Video ${video.id} has YouTube ID: ${youtubeId}`);
        } else {
          console.log(`Video ${video.id} is not a YouTube video: ${video.video_url}`);
        }
      }
      
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

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

migrateVideos();
