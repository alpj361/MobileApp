#!/usr/bin/env node

/**
 * Test script for X/Twitter extractor
 * Tests the simplified ExtractorW-based implementation
 */

const { processImprovedLink } = require('./src/api/improved-link-processor.ts');
const { fetchXComments } = require('./src/services/xCommentService.ts');

async function testXExtractor() {
  console.log('🧪 Testing X/Twitter Extractor - Simplified Implementation\n');
  
  // Test URLs - replace with actual X URLs for testing
  const testUrls = [
    'https://x.com/elonmusk/status/1234567890123456789', // Replace with actual tweet URL
    'https://twitter.com/user/status/1234567890123456789', // Replace with actual tweet URL
  ];
  
  for (const url of testUrls) {
    console.log(`\n📱 Testing URL: ${url}`);
    console.log('─'.repeat(80));
    
    try {
      // Test 1: Main link processing
      console.log('1️⃣ Testing processImprovedLink...');
      const startTime = Date.now();
      const result = await processImprovedLink(url);
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Processing time: ${processingTime}ms`);
      console.log(`📝 Title: ${result.title || 'No title'}`);
      console.log(`📄 Description: ${result.description ? result.description.substring(0, 100) + '...' : 'No description'}`);
      console.log(`👤 Author: ${result.author || 'No author'}`);
      console.log(`🖼️  Image: ${result.image || 'No image'}`);
      console.log(`📊 Platform: ${result.platform}`);
      console.log(`⭐ Quality: ${result.quality} (score: ${result.contentScore})`);
      
      // Test 2: Engagement metrics
      if (result.engagement) {
        console.log('\n2️⃣ Engagement Metrics:');
        console.log(`   ❤️  Likes: ${result.engagement.likes || 0}`);
        console.log(`   💬 Comments: ${result.engagement.comments || 0}`);
        console.log(`   🔄 Shares/Retweets: ${result.engagement.shares || 0}`);
        console.log(`   👀 Views: ${result.engagement.views || 0}`);
      } else {
        console.log('\n❌ No engagement metrics found');
      }
      
      // Test 3: Comments (if available)
      if (result.engagement?.comments > 0) {
        console.log('\n3️⃣ Testing comments extraction...');
        try {
          const commentsResult = await fetchXComments(url, { limit: 10 });
          console.log(`✅ Comments extracted: ${commentsResult.extractedCount}/${commentsResult.totalCount}`);
          
          if (commentsResult.comments.length > 0) {
            console.log('📝 Sample comments:');
            commentsResult.comments.slice(0, 3).forEach((comment, idx) => {
              console.log(`   ${idx + 1}. @${comment.author}: ${comment.text.substring(0, 50)}...`);
            });
          }
        } catch (commentError) {
          console.log(`❌ Comments extraction failed: ${commentError.message}`);
        }
      } else {
        console.log('\n⏭️  Skipping comments test (no comments or not available)');
      }
      
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }
  }
  
  console.log('\n🎉 X Extractor testing completed!');
  console.log('\nExpected results:');
  console.log('✅ Engagement metrics (likes, comments, shares, views)');
  console.log('✅ Generated title from AI or fallback');
  console.log('✅ Tweet text as description');
  console.log('✅ Author information');
  console.log('✅ Thumbnail/image if available');
  console.log('✅ Comments extraction via Nitter');
}

// Run the test
if (require.main === module) {
  testXExtractor().catch(console.error);
}

module.exports = { testXExtractor };
