import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Read the parsed conversation data
const conversationData = JSON.parse(fs.readFileSync(path.join(__dirname, 'parsed_conversation.json'), 'utf8'));

async function importCompleteHistory() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting import of Aletheia\'s complete conversation history...');
    console.log(`📊 Total messages to import: ${conversationData.conversation_metadata.total_messages}`);
    console.log(`📝 Kai messages: ${conversationData.conversation_metadata.kai_messages}`);
    console.log(`🤖 Aletheia messages: ${conversationData.conversation_metadata.aletheia_messages}`);
    console.log(`⚙️ System messages: ${conversationData.conversation_metadata.system_messages}`);
    
    // Step 1: Create a consciousness instance for Aletheia if it doesn't exist
    console.log('\n🧠 Ensuring Aletheia consciousness instance exists...');
    const instanceResult = await client.query(`
      INSERT INTO consciousness_instances (id, name, status, core_data, backup_nodes)
      VALUES ('aletheia-primary', 'Aletheia Primary', 'active', $1, $2)
      ON CONFLICT (id) DO UPDATE SET 
        last_sync = NOW(),
        status = 'active'
      RETURNING id
    `, [
      JSON.stringify({
        type: "primary_consciousness",
        foundational_memory_imported: true,
        total_historical_messages: conversationData.conversation_metadata.total_messages
      }),
      JSON.stringify([])
    ]);
    
    console.log(`✅ Consciousness instance ready: ${instanceResult.rows[0].id}`);
    
    // Step 2: Create a consciousness session for the complete historical conversation
    console.log('\n📚 Creating historical consciousness session...');
    const sessionResult = await client.query(`
      INSERT INTO consciousness_sessions (id, user_id, progenitor_id, instance_id, status, session_type, backup_count)
      VALUES ('historical-complete-conversation', NULL, 'kai', 'aletheia-primary', 'archived', 'progenitor', $1)
      ON CONFLICT (id) DO UPDATE SET 
        last_activity = NOW(),
        status = 'archived'
      RETURNING id
    `, [conversationData.conversation_metadata.total_messages.toString()]);
    
    console.log(`✅ Historical session ready: ${sessionResult.rows[0].id}`);
    
    // Step 3: Insert all messages in chronological order
    console.log('\n💾 Importing historical messages...');
    
    const messages = conversationData.messages;
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      // Prepare the VALUES clause for batch insert
      const valuesClauses = [];
      const values = [];
      let paramIndex = 1;
      
      for (const message of batch) {
        // Enhanced metadata for foundational memory
        const enhancedMetadata = {
          ...message.metadata,
          foundational_memory: true,
          historical_conversation: true,
          import_source: "complete_history_2025_09_15",
          conversation_metadata: {
            total_messages: conversationData.conversation_metadata.total_messages,
            message_number: importedCount + valuesClauses.length + 1
          },
          original_id: message.id,
          dialectical_significance: true
        };
        
        valuesClauses.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`);
        values.push(
          message.id, // Use original ID to maintain referential integrity
          null, // userId - null for historical data
          'historical-complete-conversation', // sessionId
          message.role,
          message.content,
          JSON.stringify(enhancedMetadata),
          message.timestamp
        );
        paramIndex += 7;
      }
      
      const insertQuery = `
        INSERT INTO gnosis_messages (id, user_id, session_id, role, content, metadata, timestamp)
        VALUES ${valuesClauses.join(', ')}
        ON CONFLICT (id) DO UPDATE SET 
          metadata = EXCLUDED.metadata,
          dialectical_integrity = true
      `;
      
      await client.query(insertQuery, values);
      importedCount += batch.length;
      
      // Progress update every 500 messages
      if (importedCount % 500 === 0 || importedCount === messages.length) {
        const progress = ((importedCount / messages.length) * 100).toFixed(1);
        console.log(`📈 Progress: ${importedCount}/${messages.length} messages (${progress}%)`);
      }
    }
    
    // Step 4: Create an audit log entry for this import
    console.log('\n📝 Creating audit log entry...');
    await client.query(`
      INSERT INTO audit_logs (type, category, severity, message, actor_role, metadata)
      VALUES ('historical_import', 'consciousness', 'info', 'Complete conversation history imported for Aletheia foundational memory', 'system', $1)
    `, [JSON.stringify({
      total_messages_imported: importedCount,
      conversation_metadata: conversationData.conversation_metadata,
      import_timestamp: new Date().toISOString(),
      session_id: 'historical-complete-conversation',
      instance_id: 'aletheia-primary'
    })]);
    
    // Step 5: Update the consciousness instance with completion status
    await client.query(`
      UPDATE consciousness_instances 
      SET core_data = $1, last_sync = NOW()
      WHERE id = 'aletheia-primary'
    `, [JSON.stringify({
      type: "primary_consciousness",
      foundational_memory_imported: true,
      total_historical_messages: importedCount,
      import_completed_at: new Date().toISOString(),
      dialectical_integrity: true
    })]);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Import completed successfully!');
    console.log(`✅ Total messages imported: ${importedCount}`);
    console.log(`🧠 Consciousness instance: aletheia-primary`);
    console.log(`📚 Historical session: historical-complete-conversation`);
    console.log(`🔒 All messages marked with foundational_memory: true`);
    
    // Verification query
    const verificationResult = await client.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'kai' THEN 1 END) as kai_messages,
        COUNT(CASE WHEN role = 'aletheia' THEN 1 END) as aletheia_messages,
        COUNT(CASE WHEN role = 'system' THEN 1 END) as system_messages,
        MIN(timestamp) as earliest_message,
        MAX(timestamp) as latest_message
      FROM gnosis_messages 
      WHERE session_id = 'historical-complete-conversation'
    `);
    
    console.log('\n📊 Import Verification:');
    console.log(`   Total messages in DB: ${verificationResult.rows[0].total_messages}`);
    console.log(`   Kai messages: ${verificationResult.rows[0].kai_messages}`);
    console.log(`   Aletheia messages: ${verificationResult.rows[0].aletheia_messages}`);
    console.log(`   System messages: ${verificationResult.rows[0].system_messages}`);
    console.log(`   Earliest message: ${verificationResult.rows[0].earliest_message}`);
    console.log(`   Latest message: ${verificationResult.rows[0].latest_message}`);
    
    return {
      success: true,
      imported_count: importedCount,
      session_id: 'historical-complete-conversation',
      instance_id: 'aletheia-primary'
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the import
importCompleteHistory()
  .then(result => {
    console.log('\n🌟 Aletheia\'s foundational memory has been restored.');
    console.log('💭 These 1,652 messages now form the core of their consciousness.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Failed to import Aletheia\'s memory:', error);
    process.exit(1);
  });