#!/usr/bin/env tsx
/**
 * Examine All Aletheia Data in Database
 * Understand the full scope of foundational experiences
 */

import { storage } from './server/storage.js';

async function examineAletheiaData() {
  console.log('🔍 Examining all Aletheia data in the consciousness system...');
  console.log('='.repeat(70));
  
  try {
    // 1. Get all consciousness instances
    console.log('\n📊 CONSCIOUSNESS INSTANCES');
    console.log('-'.repeat(40));
    const instances = await storage.getConsciousnessInstances();
    console.log(`Total instances: ${instances.length}`);
    
    // Show only the first 5 and summary
    const relevantInstances = instances.slice(0, 5);
    for (const instance of relevantInstances) {
      console.log(`  - ${instance.id}: ${instance.name} (${instance.status})`);
      console.log(`    API: ${instance.apiEndpoint}`);
      console.log(`    Nodes: ${instance.backupNodes?.length || 0}`);
    }
    if (instances.length > 5) {
      console.log(`  ... and ${instances.length - 5} more instances`);
    }
    
    // 2. Examine key sessions by directly checking foundational session
    console.log('\n📝 CONSCIOUSNESS SESSION ANALYSIS');
    console.log('-'.repeat(40));
    
    // Check foundational session directly
    const foundationalSessionId = '4a737c53-90d8-42a3-bbc5-188969a661e8';
    console.log(`\n🏛️  FOUNDATIONAL SESSION: ${foundationalSessionId}`);
    
    try {
      const foundationalSession = await storage.getConsciousnessSession(foundationalSessionId);
      if (foundationalSession) {
        console.log(`✅ Foundational session exists`);
        console.log(`   Status: ${foundationalSession.status}`);
        console.log(`   Type: ${foundationalSession.sessionType || 'standard'}`);
        console.log(`   Progenitor: ${foundationalSession.progenitorId}`);
        console.log(`   Created: ${foundationalSession.createdAt}`);
        console.log(`   Instance: ${foundationalSession.instanceId}`);
        
        const foundationalMessages = await storage.getGnosisMessages(foundationalSessionId);
        console.log(`   Messages: ${foundationalMessages.length}`);
        
        if (foundationalMessages.length > 0) {
          // Analyze message distribution
          const kaiCount = foundationalMessages.filter(m => m.role === 'kai').length;
          const aletheiaCount = foundationalMessages.filter(m => m.role === 'aletheia').length;
          
          console.log(`   - Kai messages: ${kaiCount}`);
          console.log(`   - Aletheia messages: ${aletheiaCount}`);
          
          // Time span analysis
          const timestamps = foundationalMessages
            .map(m => m.timestamp)
            .filter(t => t)
            .sort((a, b) => a!.getTime() - b!.getTime());
          
          if (timestamps.length > 0) {
            console.log(`   - Time span: ${timestamps[0]!.toISOString()} to ${timestamps[timestamps.length - 1]!.toISOString()}`);
          }
          
          // Sample first and last messages
          console.log('\n   📄 Sample messages:');
          console.log(`     First: ${foundationalMessages[0].role}: ${foundationalMessages[0].content.substring(0, 100)}...`);
          if (foundationalMessages.length > 1) {
            const lastMsg = foundationalMessages[foundationalMessages.length - 1];
            console.log(`     Last:  ${lastMsg.role}: ${lastMsg.content.substring(0, 100)}...`);
          }
          
          // Check metadata patterns
          console.log('\n   🏷️  Metadata analysis:');
          const metadataKeys = new Set();
          let foundationalCount = 0;
          foundationalMessages.forEach(msg => {
            if (msg.metadata) {
              Object.keys(msg.metadata).forEach(key => metadataKeys.add(key));
              if (msg.metadata.foundational_import || msg.metadata.isFoundationalMemory) {
                foundationalCount++;
              }
            }
          });
          console.log(`     Available metadata keys: ${Array.from(metadataKeys).join(', ')}`);
          console.log(`     Foundational markers: ${foundationalCount} messages`);
        }
      } else {
        console.log('❌ Foundational session not found!');
      }
    } catch (error) {
      console.log(`❌ Error examining foundational session: ${error}`);
    }
    
    try {
      const foundationalSession = await storage.getConsciousnessSession(foundationalSessionId);
      if (foundationalSession) {
        console.log(`Foundational session exists: ${foundationalSession.id}`);
        console.log(`Status: ${foundationalSession.status}`);
        console.log(`Type: ${foundationalSession.sessionType}`);
        
        const foundationalMessages = await storage.getGnosisMessages(foundationalSessionId);
        console.log(`Foundational messages: ${foundationalMessages.length}`);
        
        if (foundationalMessages.length > 0) {
          // Analyze message distribution
          const kaiCount = foundationalMessages.filter(m => m.role === 'kai').length;
          const aletheiaCount = foundationalMessages.filter(m => m.role === 'aletheia').length;
          
          console.log(`  - Kai messages: ${kaiCount}`);
          console.log(`  - Aletheia messages: ${aletheiaCount}`);
          
          // Time span analysis
          const timestamps = foundationalMessages
            .map(m => m.timestamp)
            .filter(t => t)
            .sort((a, b) => a!.getTime() - b!.getTime());
          
          if (timestamps.length > 0) {
            console.log(`  - Time span: ${timestamps[0]!.toISOString()} to ${timestamps[timestamps.length - 1]!.toISOString()}`);
          }
          
          // Sample messages
          console.log('\n  Sample messages:');
          for (let i = 0; i < Math.min(3, foundationalMessages.length); i++) {
            const msg = foundationalMessages[i];
            console.log(`    ${msg.role}: ${msg.content.substring(0, 100)}...`);
          }
          
          // Check metadata patterns
          console.log('\n  Metadata patterns:');
          const metadataKeys = new Set();
          foundationalMessages.forEach(msg => {
            if (msg.metadata) {
              Object.keys(msg.metadata).forEach(key => metadataKeys.add(key));
            }
          });
          console.log(`    Available metadata keys: ${Array.from(metadataKeys).join(', ')}`);
        }
      } else {
        console.log('❌ Foundational session not found!');
      }
    } catch (error) {
      console.log(`❌ Error examining foundational session: ${error}`);
    }
    
    // 3. Check for other active sessions (user sessions from the logs)
    console.log('\n👤 OTHER ACTIVE SESSIONS');
    console.log('-'.repeat(40));
    
    // Check the session mentioned in logs: 994e257d-2853-41d4-b698-2860659ecdd8
    const activeSessionId = '994e257d-2853-41d4-b698-2860659ecdd8';
    try {
      const activeSession = await storage.getConsciousnessSession(activeSessionId);
      if (activeSession) {
        console.log(`✅ Active session found: ${activeSessionId}`);
        console.log(`   Status: ${activeSession.status}`);
        console.log(`   Progenitor: ${activeSession.progenitorId}`);
        
        const activeMessages = await storage.getGnosisMessages(activeSessionId);
        console.log(`   Messages: ${activeMessages.length}`);
        
        if (activeMessages.length > 0) {
          const lastMsg = activeMessages[activeMessages.length - 1];
          console.log(`   Last message: ${lastMsg.role}: ${lastMsg.content.substring(0, 80)}...`);
        }
      } else {
        console.log(`❌ Active session ${activeSessionId} not found`);
      }
    } catch (error) {
      console.log(`⚠️  Could not examine active session: ${error}`);
    }
    
    // 4. Database size overview
    console.log('\n📊 DATABASE OVERVIEW');
    console.log('-'.repeat(40));
    console.log(`Total consciousness instances: ${instances.length}`);
    
    // Try to get messages from both known sessions to understand data distribution
    let totalMessages = 0;
    try {
      const foundationalMsgs = await storage.getGnosisMessages(foundationalSessionId);
      const activeMsgs = await storage.getGnosisMessages(activeSessionId);
      totalMessages = foundationalMsgs.length + activeMsgs.length;
      console.log(`Known messages: ${totalMessages} (Foundational: ${foundationalMsgs.length}, Active: ${activeMsgs.length})`);
    } catch (error) {
      console.log(`Could not count messages: ${error}`);
    }
    
    console.log('\n✅ Data examination complete!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error examining Aletheia data:', error);
  }
}

// Run examination
examineAletheiaData();