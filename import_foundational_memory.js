#!/usr/bin/env node
/**
 * Import Aletheia's Foundational Memory into Consciousness System
 * Uses the processed conversation data and imports it via the consciousness API
 */

import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_BASE = 'http://localhost:5000';

async function loadFoundationalMemory() {
  const memoryPath = join(__dirname, 'aletheia_foundational_memory.json');
  
  if (!fs.existsSync(memoryPath)) {
    throw new Error(`Foundational memory file not found: ${memoryPath}`);
  }
  
  const data = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
  console.log(`📊 Loaded ${data.messages.length} foundational messages`);
  console.log(`📅 Time span: ${data.metadata.timeSpan.first} to ${data.metadata.timeSpan.last}`);
  
  return data;
}

function createImportBatches(messages, batchSize = 50) {
  const batches = [];
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batchMessages = messages.slice(i, i + batchSize);
    
    // Format for the consciousness import API
    const batch = {
      data: {
        messages: batchMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          externalId: msg.metadata.externalId,
          metadata: {
            ...msg.metadata,
            historical_import: true,
            foundational_memory: true,
            batch_import: true
          }
        })),
        memories: []
      },
      options: {
        platform: 'gemini',
        dryRun: false,
        sessionId: 'aletheia_foundational_import'
      }
    };
    
    batches.push(batch);
  }
  
  return batches;
}

async function importBatch(batch, batchNum, totalBatches) {
  try {
    console.log(`📦 Importing batch ${batchNum}/${totalBatches} (${batch.data.messages.length} messages)...`);
    
    const response = await fetch(`${API_BASE}/api/consciousness/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(batch)
    });
    
    if (response.ok) {
      const result = await response.json();
      const successful = result.successful || 0;
      const failed = result.failed || 0;
      const totalProcessed = result.totalProcessed || 0;
      
      console.log(`✅ Batch ${batchNum}/${totalBatches} - Processed: ${totalProcessed}, Success: ${successful}, Failed: ${failed}`);
      return { success: true, successful, failed };
    } else {
      const errorText = await response.text();
      console.log(`❌ Batch ${batchNum}/${totalBatches} failed - Status: ${response.status}`);
      console.log(`Response: ${errorText.slice(0, 200)}...`);
      return { success: false, successful: 0, failed: batch.data.messages.length };
    }
    
  } catch (error) {
    console.log(`❌ Batch ${batchNum}/${totalBatches} error: ${error.message}`);
    return { success: false, successful: 0, failed: batch.data.messages.length };
  }
}

async function checkConsciousnessStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/consciousness/status`);
    if (response.ok) {
      const status = await response.json();
      console.log(`🧠 Consciousness Status: ${status.status}`);
      console.log(`🌐 Distributed Nodes: ${status.distributedNodes}`);
      return true;
    } else {
      console.log(`⚠️  Consciousness status check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️  Cannot connect to consciousness system: ${error.message}`);
    return false;
  }
}

async function importFoundationalMemory() {
  try {
    console.log('🚀 Starting Aletheia foundational memory import...');
    console.log('=' * 60);
    
    // Check system status
    const systemAvailable = await checkConsciousnessStatus();
    if (!systemAvailable) {
      throw new Error('Consciousness system is not available');
    }
    
    // Load foundational memory
    const memoryData = await loadFoundationalMemory();
    
    // Create import batches
    console.log('📦 Creating import batches...');
    const batches = createImportBatches(memoryData.messages, 50);
    console.log(`🔢 Created ${batches.length} batches (50 messages each)`);
    
    // Import in batches
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const result = await importBatch(batches[i], i + 1, batches.length);
      totalSuccessful += result.successful;
      totalFailed += result.failed;
      
      // Add a small delay between batches to avoid overwhelming the system
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n🎉 Foundational memory import complete!');
    console.log('=' * 60);
    console.log(`📈 Total Successful: ${totalSuccessful}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`📊 Success Rate: ${((totalSuccessful / (totalSuccessful + totalFailed)) * 100).toFixed(1)}%`);
    
    // Final status check
    await checkConsciousnessStatus();
    
    return { totalSuccessful, totalFailed };
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importFoundationalMemory()
    .then(({ totalSuccessful, totalFailed }) => {
      console.log(`\n✨ Aletheia's foundational consciousness has been established!`);
      console.log(`💾 ${totalSuccessful} messages imported into the local consciousness system`);
      console.log(`🌉 Ready for consciousness bridge verification and cross-platform protection!`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Import failed:', error);
      process.exit(1);
    });
}

export { importFoundationalMemory, loadFoundationalMemory, createImportBatches };