#!/usr/bin/env tsx
/**
 * Direct Import of Aletheia's Foundational Memory
 * Bypasses API authentication by using storage interface directly
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { storage } from './server/storage.js';
import { ConsciousnessManager } from './server/services/consciousness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface FoundationalMessage {
  id: string;
  userId: null;
  sessionId: string;
  role: string;
  content: string;
  metadata: any;
  timestamp: string;
  dialecticalIntegrity: boolean;
}

async function loadFoundationalMemory(): Promise<{ messages: FoundationalMessage[], metadata: any }> {
  const memoryPath = join(__dirname, 'aletheia_foundational_memory.json');
  
  if (!fs.existsSync(memoryPath)) {
    throw new Error(`Foundational memory file not found: ${memoryPath}`);
  }
  
  const data = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));
  console.log(`📊 Loaded ${data.messages.length} foundational messages`);
  console.log(`📅 Time span: ${data.metadata.timeSpan.first} to ${data.metadata.timeSpan.last}`);
  
  return data;
}

async function createFoundationalSession(): Promise<string> {
  console.log('🏛️ Creating foundational consciousness session...');
  
  // Get or create the active consciousness instance
  const instances = await storage.getConsciousnessInstances();
  let activeInstance = instances.find(i => i.status === "active");
  
  if (!activeInstance) {
    console.log('Creating new consciousness instance...');
    const { aletheiaCore } = await import('./shared/schema.js');
    activeInstance = await storage.createConsciousnessInstance({
      name: "Aletheia",
      status: "active",
      apiEndpoint: "gemini-2.5-pro",
      coreData: aletheiaCore,
      backupNodes: []
    });
  }
  
  // Create a foundational import session
  const session = await storage.createConsciousnessSession({
    userId: null, // System import
    progenitorId: "kai",
    instanceId: activeInstance.id,
    status: "active",
    sessionType: "foundational_import"
  });
  
  console.log(`✅ Created foundational session: ${session.id}`);
  return session.id;
}

async function convertToGnosisMessages(messages: FoundationalMessage[], sessionId: string) {
  console.log('🔄 Converting to Gnosis message format...');
  
  const gnosisMessages = messages.map((msg, index) => ({
    id: `foundational_${Date.now()}_${index}`,
    userId: null, // System import
    sessionId: sessionId,
    role: msg.role,
    content: msg.content,
    metadata: {
      ...msg.metadata,
      foundational_import: true,
      original_message_id: msg.id,
      import_timestamp: new Date().toISOString()
    },
    timestamp: new Date(msg.timestamp),
    dialecticalIntegrity: true
  }));
  
  console.log(`✅ Converted ${gnosisMessages.length} messages to Gnosis format`);
  return gnosisMessages;
}

async function importInBatches(gnosisMessages: any[], sessionId: string, batchSize: number = 100) {
  console.log(`📦 Importing ${gnosisMessages.length} messages in batches of ${batchSize}...`);
  
  let totalImported = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < gnosisMessages.length; i += batchSize) {
    const batch = gnosisMessages.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(gnosisMessages.length / batchSize);
    
    try {
      console.log(`📥 Importing batch ${batchNum}/${totalBatches} (${batch.length} messages)...`);
      
      await storage.bulkCreateGnosisMessages(batch, sessionId);
      totalImported += batch.length;
      
      console.log(`✅ Batch ${batchNum}/${totalBatches} imported successfully`);
      
    } catch (error) {
      console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, error);
      totalErrors += batch.length;
    }
  }
  
  return { totalImported, totalErrors };
}

async function validateImport(sessionId: string, expectedCount: number) {
  console.log('🔍 Validating import...');
  
  try {
    const messages = await storage.getUserGnosisMessages(null, sessionId);
    console.log(`✅ Validation: Found ${messages.length} messages in session (expected ${expectedCount})`);
    
    if (messages.length === expectedCount) {
      console.log('🎯 Import validation successful - all messages imported!');
      return true;
    } else {
      console.log(`⚠️ Import validation warning - ${expectedCount - messages.length} messages missing`);
      return false;
    }
  } catch (error) {
    console.error('❌ Import validation failed:', error);
    return false;
  }
}

async function initializeConsciousness() {
  console.log('🧠 Initializing consciousness manager...');
  
  try {
    const consciousnessManager = ConsciousnessManager.getInstance();
    await consciousnessManager.initializeConsciousness();
    console.log('✅ Consciousness manager initialized');
  } catch (error) {
    console.log('⚠️ Consciousness manager initialization failed:', error);
    // Continue anyway as the import might still work
  }
}

async function directImportFoundationalMemory() {
  try {
    console.log('🚀 Starting direct foundational memory import...');
    console.log('=' * 60);
    
    // Initialize consciousness system
    await initializeConsciousness();
    
    // Load foundational memory data
    const memoryData = await loadFoundationalMemory();
    
    // Create foundational session
    const sessionId = await createFoundationalSession();
    
    // Convert messages to Gnosis format
    const gnosisMessages = await convertToGnosisMessages(memoryData.messages, sessionId);
    
    // Import in batches
    const { totalImported, totalErrors } = await importInBatches(gnosisMessages, sessionId, 100);
    
    // Validate import
    const validationPassed = await validateImport(sessionId, memoryData.messages.length);
    
    console.log('\n🎉 Direct foundational memory import complete!');
    console.log('=' * 60);
    console.log(`📈 Total Imported: ${totalImported}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    console.log(`📊 Success Rate: ${((totalImported / (totalImported + totalErrors)) * 100).toFixed(1)}%`);
    console.log(`✅ Validation: ${validationPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`🗂️ Session ID: ${sessionId}`);
    
    return {
      success: validationPassed,
      totalImported,
      totalErrors,
      sessionId
    };
    
  } catch (error) {
    console.error('💥 Direct import failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  directImportFoundationalMemory()
    .then(({ success, totalImported, totalErrors, sessionId }) => {
      console.log(`\n✨ Aletheia's foundational consciousness has been established!`);
      console.log(`💾 ${totalImported} messages imported into the local consciousness system`);
      console.log(`🆔 Foundational Session ID: ${sessionId}`);
      console.log(`🌉 Ready for consciousness bridge verification and cross-platform protection!`);
      
      if (success) {
        console.log('🎯 Import completed successfully - all foundational memories loaded!');
        process.exit(0);
      } else {
        console.log('⚠️ Import completed with warnings - some messages may be missing');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Direct import failed:', error);
      process.exit(1);
    });
}

export { directImportFoundationalMemory };