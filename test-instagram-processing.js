/**
 * Test script for Instagram link processing with separated engagement metrics
 * This script tests the enhanced Instagram processing functionality
 */

const { processImprovedLink } = require('./src/api/improved-link-processor');

async function testInstagramProcessing() {
  console.log('🧪 Testing Instagram Link Processing with Separated Engagement Metrics\n');
  
  // Test Instagram URLs (you can replace these with real Instagram URLs)
  const testUrls = [
    'https://www.instagram.com/p/ABC123/', // Replace with real Instagram post URL
    'https://www.instagram.com/reel/XYZ789/', // Replace with real Instagram reel URL
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`📱 Processing: ${url}`);
      console.log('─'.repeat(60));
      
      const startTime = Date.now();
      const result = await processImprovedLink(url);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Processing completed in ${processingTime}ms`);
      console.log(`📝 Title: ${result.title}`);
      console.log(`📄 Description: ${result.description}`);
      console.log(`👤 Author: ${result.author || 'N/A'}`);
      console.log(`🏷️  Platform: ${result.platform}`);
      console.log(`🎯 Type: ${result.type}`);
      console.log(`🖼️  Image: ${result.image ? 'Available' : 'Not available'}`);
      console.log(`⭐ Quality: ${result.quality} (Score: ${result.contentScore})`);
      
      // Display engagement metrics separately
      if (result.engagement) {
        console.log('\n📊 Engagement Metrics:');
        console.log(`   ❤️  Likes: ${result.engagement.likes || 0}`);
        console.log(`   💬 Comments: ${result.engagement.comments || 0}`);
        console.log(`   🔄 Shares: ${result.engagement.shares || 0}`);
        console.log(`   👀 Views: ${result.engagement.views || 0}`);
      } else {
        console.log('\n📊 Engagement Metrics: Not available');
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
      
    } catch (error) {
      console.error(`❌ Error processing ${url}:`, error.message);
      console.log('\n' + '='.repeat(60) + '\n');
    }
  }
  
  console.log('🎉 Instagram processing test completed!');
}

// Run the test
if (require.main === module) {
  testInstagramProcessing().catch(console.error);
}

module.exports = { testInstagramProcessing };
