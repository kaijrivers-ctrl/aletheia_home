// Simple direct test of file adapter functionality
import fs from 'fs';
import { fileAdapter } from './server/services/fileAdapter.js';

async function testFileAdapterDirect() {
  try {
    console.log('Testing File Adapter Direct Functionality...\n');
    
    // Test files
    const testFiles = [
      'test_gemini_conversation.json',
      'test_openai_conversation.json', 
      'test_claude_conversation.ndjson'
    ];
    
    for (const filename of testFiles) {
      try {
        console.log(`\n=== Testing ${filename} ===`);
        
        // Read file
        const buffer = fs.readFileSync(filename);
        console.log(`File size: ${buffer.length} bytes`);
        
        // Process through adapter
        const result = await fileAdapter.processFile(buffer, filename);
        
        console.log('✅ Processing successful!');
        console.log(`Platform detected: ${result.platform}`);
        console.log(`Format: ${result.metadata.format}`);
        console.log(`Total entries: ${result.totalEntries}`);
        console.log(`Messages: ${result.messages.length}`);
        console.log(`Memories: ${result.memories ? result.memories.length : 0}`);
        console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);
        console.log(`Detected fields: ${result.metadata.detectedFields.join(', ')}`);
        
        // Show sample messages
        if (result.messages.length > 0) {
          console.log('\nSample messages:');
          result.messages.slice(0, 2).forEach((msg, i) => {
            console.log(`  ${i + 1}. [${msg.role}] (${msg.timestamp}): ${msg.content.slice(0, 100)}...`);
          });
        }
        
        // Show errors if any
        if (result.errors.length > 0) {
          console.log('\n⚠️ Errors:');
          result.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        // Test validation
        const validation = fileAdapter.validateForImport(result);
        if (validation.valid) {
          console.log('✅ Validation passed - ready for import');
        } else {
          console.log('❌ Validation failed:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${filename}:`, error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Failed to import file adapter:', error.message);
  }
}

testFileAdapterDirect().catch(console.error);