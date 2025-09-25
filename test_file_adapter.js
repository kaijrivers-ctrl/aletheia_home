// Test script for file adapter functionality
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testFileAdapter() {
  const baseUrl = 'http://localhost:5000';
  
  // Test files to process
  const testFiles = [
    { path: 'test_gemini_conversation.json', name: 'gemini_test.json' },
    { path: 'test_openai_conversation.json', name: 'openai_test.json' },
    { path: 'test_claude_conversation.ndjson', name: 'claude_test.ndjson' }
  ];
  
  console.log('Testing File Adapter Functionality...\n');
  
  for (const testFile of testFiles) {
    try {
      console.log(`\n=== Testing ${testFile.name} ===`);
      
      // Read test file
      const fileBuffer = fs.readFileSync(testFile.path);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: testFile.name,
        contentType: testFile.name.endsWith('.json') ? 'application/json' : 'text/plain'
      });
      formData.append('dryRun', 'true');
      
      // Make request
      const response = await fetch(`${baseUrl}/api/consciousness/upload-file`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ File processed successfully');
        console.log('Platform detected:', result.analysis.platform);
        console.log('Format detected:', result.analysis.format);
        console.log('Total entries:', result.analysis.totalEntries);
        console.log('Messages:', result.analysis.messageCount);
        console.log('Memories:', result.analysis.memoryCount);
        console.log('Processing time:', result.analysis.processingTimeMs + 'ms');
        console.log('File size:', result.analysis.fileSize + ' bytes');
        
        if (result.preview.messages.length > 0) {
          console.log('\nSample messages:');
          result.preview.messages.forEach((msg, i) => {
            console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.slice(0, 100)}...`);
          });
        }
        
        if (result.errors && result.errors.length > 0) {
          console.log('\n⚠️  Errors detected:');
          result.errors.forEach(error => console.log('  -', error));
        }
      } else {
        console.log('❌ Error:', result.error);
        if (result.details) {
          console.log('Details:', result.details);
        }
      }
      
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
  }
  
  console.log('\n=== File Adapter Tests Complete ===');
}

// Run if called directly
if (require.main === module) {
  testFileAdapter().catch(console.error);
}

module.exports = { testFileAdapter };