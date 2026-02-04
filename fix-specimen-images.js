import { query, connectDb } from './server/src/config/db.js';

async function fixSpecimenImages() {
  try {
    await connectDb();
    
    // Get all specimens with their current image URLs
    const specimens = await query('SELECT id, image_url FROM specimens');
    console.log('Found specimens:', specimens.length);
    
    // Update specimens to use actual uploaded files
    const actualFiles = [
      '/uploads/images/Screenshot_2026-01-31_235621_1769946948326_499786991.png',
      '/uploads/images/Screenshot_2026-01-31_235621_1769947831013_198058185.png',
      '/uploads/images/Screenshot_2026-01-31_235621_1769947895840_785437872.png',
      '/uploads/images/test_error_1769944150427_889730413.png',
      '/uploads/images/test_error_1769945463618_73158107.png',
      '/uploads/images/test_error_1769945807741_45115983.png'
    ];
    
    let updated = 0;
    for (let i = 0; i < specimens.length && i < actualFiles.length; i++) {
      const specimen = specimens[i];
      const newImageUrl = actualFiles[i];
      
      await query('UPDATE specimens SET image_url = ? WHERE id = ?', [newImageUrl, specimen.id]);
      console.log(`Updated specimen ${specimen.id}: ${specimen.image_url} -> ${newImageUrl}`);
      updated++;
    }
    
    // Update remaining specimens with remote placeholder images
    const remoteImages = [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=3',
      'https://picsum.photos/400/300?random=4',
      'https://picsum.photos/400/300?random=5'
    ];
    
    for (let i = updated; i < specimens.length; i++) {
      const specimen = specimens[i];
      const newImageUrl = remoteImages[i - updated] || remoteImages[0];
      
      await query('UPDATE specimens SET image_url = ? WHERE id = ?', [newImageUrl, specimen.id]);
      console.log(`Updated specimen ${specimen.id}: ${specimen.image_url} -> ${newImageUrl}`);
      updated++;
    }
    
    console.log(`Total updated: ${updated}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixSpecimenImages();
