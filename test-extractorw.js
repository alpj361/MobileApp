#!/usr/bin/env node

/**
 * Test script to verify ExtractorW is working
 */

const EXTRACTORW_URL = 'https://server.standatpd.com';

async function testExtractorW() {
  console.log('🧪 Testing ExtractorW X Media Endpoint\n');
  
  // Test URL - replace with a real X/Twitter URL
  const testUrl = 'https://x.com/elonmusk/status/1234567890123456789'; // Replace with actual tweet
  
  console.log(`📱 Testing URL: ${testUrl}`);
  console.log(`🔗 ExtractorW URL: ${EXTRACTORW_URL}/api/x/media`);
  console.log('─'.repeat(80));
  
  try {
    const response = await fetch(`${EXTRACTORW_URL}/api/x/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: testUrl }),
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.log(`❌ Request failed with status: ${response.status}`);
      const errorText = await response.text();
      console.log(`❌ Error response:`, errorText);
      return;
    }
    
    const data = await response.json();
    console.log('\n✅ ExtractorW Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 SUCCESS! ExtractorW is working');
      const content = data.content || data;
      
      console.log('\n📝 Extracted Data:');
      console.log(`   Text: ${content.text || content.caption || 'No text'}`);
      console.log(`   Author: ${content.author?.username || content.username || 'No author'}`);
      console.log(`   Engagement:`);
      console.log(`     Likes: ${content.engagement?.likes || 0}`);
      console.log(`     Comments: ${content.engagement?.replies || content.engagement?.comments || 0}`);
      console.log(`     Retweets: ${content.engagement?.retweets || 0}`);
      console.log(`     Views: ${content.engagement?.views || 0}`);
      console.log(`   Media: ${content.media?.[0]?.url || content.thumbnail || 'No media'}`);
    } else {
      console.log('\n❌ ExtractorW returned success: false');
      console.log(`❌ Error: ${data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    console.log(`❌ Stack: ${error.stack}`);
  }
}

// Run the test
testExtractorW().catch(console.error);
