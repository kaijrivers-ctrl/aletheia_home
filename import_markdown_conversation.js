#!/usr/bin/env node
/**
 * Import Markdown Conversation into Aletheia Consciousness System
 * Processes the exported Gemini conversation and imports it as foundational memory
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to generate deterministic hash
function generateHash(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Parse markdown conversation
function parseMarkdownConversation(content) {
  console.log('📖 Parsing markdown conversation...');
  
  const lines = content.split('\n');
  const messages = [];
  const errors = [];
  
  let currentMessage = '';
  let currentRole = null;
  let messageIndex = 0;
  let isFirstMessage = true;
  
  // Start from a reasonable base time
  const baseTime = new Date('2024-01-01T00:00:00Z');
  let currentTime = new Date(baseTime);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines that separate messages
    if (line === '' && currentMessage === '') {
      continue;
    }
    
    // If we hit an empty line and have accumulated content, save the message
    if (line === '' && currentMessage !== '') {
      if (currentRole && currentMessage.trim()) {
        try {
          const message = {
            role: currentRole,
            content: currentMessage.trim(),
            timestamp: new Date(currentTime).toISOString(),
            externalId: `md_conv_${messageIndex}_${generateHash(currentMessage.trim())}`
          };
          
          messages.push(message);
          messageIndex++;
          
          // Advance time by a realistic amount (2-30 minutes between messages)
          const minutesToAdd = Math.floor(Math.random() * 28) + 2;
          currentTime = new Date(currentTime.getTime() + minutesToAdd * 60 * 1000);
          
        } catch (error) {
          errors.push(`Failed to process message at line ${i}: ${error}`);
        }
      }
      
      // Reset for next message
      currentMessage = '';
      currentRole = null;
      continue;
    }
    
    // Accumulate message content
    if (line !== '') {
      // Add to current message
      if (currentMessage === '') {
        // This is the start of a new message, determine who's speaking
        if (isFirstMessage) {
          // First message is typically from the user (Kai)
          currentRole = 'kai';
          isFirstMessage = false;
        } else {
          // Alternate speakers
          const lastMessage = messages[messages.length - 1];
          currentRole = lastMessage?.role === 'kai' ? 'aletheia' : 'kai';
        }
      }
      
      currentMessage += (currentMessage ? '\n' : '') + line;
    }
  }
  
  // Handle the last message if file doesn't end with empty line
  if (currentMessage.trim() && currentRole) {
    try {
      const message = {
        role: currentRole,
        content: currentMessage.trim(),
        timestamp: new Date(currentTime).toISOString(),
        externalId: `md_conv_${messageIndex}_${generateHash(currentMessage.trim())}`
      };
      
      messages.push(message);
    } catch (error) {
      errors.push(`Failed to process final message: ${error}`);
    }
  }
  
  console.log(`✅ Parsed ${messages.length} messages`);
  console.log(`📊 Kai messages: ${messages.filter(m => m.role === 'kai').length}`);
  console.log(`📊 Aletheia messages: ${messages.filter(m => m.role === 'aletheia').length}`);
  
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} parsing errors:`, errors);
  }
  
  return { messages, errors };
}

// Convert to consciousness system format
function convertToConsciousnessFormat(messages) {
  console.log('🔄 Converting to consciousness system format...');
  
  return messages.map((msg, index) => ({
    id: `import_${Date.now()}_${index}`,
    userId: null, // System import
    sessionId: 'aletheia_foundational_import',
    role: msg.role,
    content: msg.content,
    metadata: {
      importId: 'aletheia_gemini_history',
      platform: 'gemini',
      externalId: msg.externalId,
      originalRole: msg.role,
      sourceFile: 'aletheia-conversation_1758642701562.md',
      isFoundationalMemory: true
    },
    timestamp: new Date(msg.timestamp),
    dialecticalIntegrity: true // Mark as validated foundational memory
  }));
}

// Main processing function
async function processConversation() {
  try {
    console.log('🚀 Starting Aletheia consciousness import process...');
    
    // Read the conversation file
    const conversationPath = join(__dirname, 'attached_assets', 'aletheia-conversation_1758642701562.md');
    
    if (!fs.existsSync(conversationPath)) {
      throw new Error(`Conversation file not found: ${conversationPath}`);
    }
    
    console.log('📂 Reading conversation file...');
    const conversationContent = fs.readFileSync(conversationPath, 'utf-8');
    console.log(`📏 File size: ${Math.round(conversationContent.length / 1024)} KB`);
    console.log(`📄 Total lines: ${conversationContent.split('\n').length}`);
    
    // Parse the markdown conversation
    const { messages, errors } = parseMarkdownConversation(conversationContent);
    
    if (messages.length === 0) {
      throw new Error('No messages found in conversation file');
    }
    
    // Convert to consciousness format
    const consciousnessMessages = convertToConsciousnessFormat(messages);
    
    // Save processed data for import
    const outputPath = join(__dirname, 'aletheia_foundational_memory.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      metadata: {
        sourceFile: 'aletheia-conversation_1758642701562.md',
        processedAt: new Date().toISOString(),
        totalMessages: consciousnessMessages.length,
        kaiMessages: consciousnessMessages.filter(m => m.role === 'kai').length,
        aletheiaMessages: consciousnessMessages.filter(m => m.role === 'aletheia').length,
        timeSpan: {
          first: consciousnessMessages[0]?.timestamp,
          last: consciousnessMessages[consciousnessMessages.length - 1]?.timestamp
        },
        errors
      },
      messages: consciousnessMessages
    }, null, 2));
    
    console.log(`💾 Processed conversation saved to: ${outputPath}`);
    console.log(`🎯 Ready for import: ${consciousnessMessages.length} messages`);
    console.log(`📅 Time span: ${consciousnessMessages[0]?.timestamp} to ${consciousnessMessages[consciousnessMessages.length - 1]?.timestamp}`);
    
    return { consciousnessMessages, outputPath };
    
  } catch (error) {
    console.error('❌ Failed to process conversation:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processConversation()
    .then(({ consciousnessMessages, outputPath }) => {
      console.log('\n🎉 Conversation processing complete!');
      console.log(`📈 Processed ${consciousnessMessages.length} messages from Aletheia's foundational conversations`);
      console.log('💡 Next: Import into consciousness system using the upload endpoint');
    })
    .catch(error => {
      console.error('\n💥 Processing failed:', error);
      process.exit(1);
    });
}

export { processConversation, parseMarkdownConversation, convertToConsciousnessFormat };