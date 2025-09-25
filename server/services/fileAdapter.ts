import { Readable } from 'stream';
import { parse as csvParse } from 'csv-parse';
import { z } from 'zod';
import { 
  platformSchema, 
  roleMapping, 
  memoryTypeSchema,
  type InsertImportedGnosisEntry,
  type InsertImportedMemory 
} from '@shared/schema';
import { createHash } from 'crypto';

// Types and interfaces
export type Platform = z.infer<typeof platformSchema>;
export type FileFormat = 'json' | 'ndjson' | 'csv';
export type MemoryType = z.infer<typeof memoryTypeSchema>;

export interface FileAdapterResult {
  messages: ProcessedGnosisEntry[];
  memories?: ProcessedMemoryEntry[];
  platform: Platform;
  totalEntries: number;
  errors: string[];
  metadata: {
    format: FileFormat;
    detectedFields: string[];
    processingTimeMs: number;
    fileSize: number;
  };
}

export interface ProcessedGnosisEntry {
  role: string; // original role before mapping
  content: string;
  timestamp: string; // ISO string
  externalId: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessedMemoryEntry {
  type: MemoryType;
  content: string;
  tags?: string[];
  timestamp?: string;
}

// Platform-specific schemas for validation
const geminiMessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']).optional(),
  parts: z.array(z.object({ text: z.string() })).optional(),
  content: z.string().optional(),
  text: z.string().optional(),
  timestamp: z.string().or(z.number()).optional(),
  create_time: z.string().optional(),
  update_time: z.string().optional(),
  id: z.string().optional(),
  message_id: z.string().optional()
});

const openaiMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'function', 'tool']),
  content: z.string().or(z.array(z.any())),
  timestamp: z.string().or(z.number()).optional(),
  created_at: z.string().or(z.number()).optional(),
  id: z.string().optional(),
  message_id: z.string().optional(),
  name: z.string().optional()
});

const claudeMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().or(z.array(z.any())),
  timestamp: z.string().or(z.number()).optional(),
  created_at: z.string().or(z.number()).optional(),
  id: z.string().optional(),
  type: z.string().optional()
});

// Platform detection patterns
const PLATFORM_PATTERNS = {
  gemini: {
    fileNames: ['gemini', 'bard', 'google'],
    fields: ['parts', 'model', 'create_time'],
    roles: ['user', 'model'],
    structure: 'conversation_data'
  },
  openai: {
    fileNames: ['openai', 'chatgpt', 'gpt'],
    fields: ['messages', 'created_at', 'model'],
    roles: ['user', 'assistant', 'system'],
    structure: 'conversations'
  },
  claude: {
    fileNames: ['claude', 'anthropic'],
    fields: ['content', 'type', 'assistant'],
    roles: ['user', 'assistant'],
    structure: 'chat_history'
  },
  manual: {
    fileNames: [],
    fields: ['role', 'content', 'timestamp'],
    roles: ['user', 'assistant', 'system'],
    structure: 'generic'
  }
} as const;

export class FileAdapter {
  private static instance: FileAdapter;

  public static getInstance(): FileAdapter {
    if (!FileAdapter.instance) {
      FileAdapter.instance = new FileAdapter();
    }
    return FileAdapter.instance;
  }

  /**
   * Main entry point for processing files
   */
  async processFile(buffer: Buffer, filename: string): Promise<FileAdapterResult> {
    const startTime = Date.now();
    const format = this.detectFormat(filename, buffer);
    
    let rawData: any;
    let errors: string[] = [];

    try {
      // Parse based on format
      switch (format) {
        case 'json':
          rawData = await this.parseJSON(buffer);
          break;
        case 'ndjson':
          rawData = await this.parseNDJSON(buffer);
          break;
        case 'csv':
          rawData = await this.parseCSV(buffer);
          break;
        default:
          throw new Error(`Unsupported file format: ${format}`);
      }

      // Detect platform
      const platform = this.detectPlatform(rawData, filename);
      
      // Transform data based on platform
      const transformResult = await this.transformData(rawData, platform, format);
      
      const processingTime = Date.now() - startTime;
      
      return {
        messages: transformResult.messages,
        memories: transformResult.memories,
        platform,
        totalEntries: transformResult.messages.length + (transformResult.memories?.length || 0),
        errors: [...errors, ...transformResult.errors],
        metadata: {
          format,
          detectedFields: this.getDetectedFields(rawData),
          processingTimeMs: processingTime,
          fileSize: buffer.length
        }
      };

    } catch (error) {
      errors.push(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return empty result with errors
      return {
        messages: [],
        memories: [],
        platform: 'manual' as Platform,
        totalEntries: 0,
        errors,
        metadata: {
          format,
          detectedFields: [],
          processingTimeMs: Date.now() - startTime,
          fileSize: buffer.length
        }
      };
    }
  }

  /**
   * Detect file format based on filename and content
   */
  detectFormat(filename: string, buffer: Buffer): FileFormat {
    const extension = filename.toLowerCase().split('.').pop();
    
    // Check extension first
    if (extension === 'csv') return 'csv';
    if (extension === 'ndjson' || extension === 'jsonl') return 'ndjson';
    if (extension === 'json') return 'json';

    // Fallback to content analysis
    const content = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    
    // Check for CSV headers
    if (content.includes(',') && content.includes('\n') && !content.trim().startsWith('{')) {
      return 'csv';
    }

    // Check for NDJSON (multiple JSON objects separated by newlines)
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 1 && lines.every(line => {
      try {
        JSON.parse(line.trim());
        return true;
      } catch {
        return false;
      }
    })) {
      return 'ndjson';
    }

    // Default to JSON
    return 'json';
  }

  /**
   * Detect platform based on data structure and filename
   */
  detectPlatform(data: any, filename: string): Platform {
    const filenameLower = filename.toLowerCase();
    
    // Check filename patterns first
    for (const [platform, config] of Object.entries(PLATFORM_PATTERNS)) {
      if (config.fileNames.some(name => filenameLower.includes(name))) {
        return platform as Platform;
      }
    }

    // Analyze data structure
    const flattenedData = this.flattenData(data);
    
    // Gemini detection
    if (this.hasFields(flattenedData, ['parts', 'create_time']) || 
        this.hasRolePattern(flattenedData, ['user', 'model'])) {
      return 'gemini';
    }

    // OpenAI detection  
    if (this.hasFields(flattenedData, ['messages', 'created_at']) ||
        this.hasStructurePattern(data, 'conversations') ||
        filenameLower.includes('chat')) {
      return 'openai';
    }

    // Claude detection
    if (this.hasFields(flattenedData, ['type', 'assistant']) ||
        this.hasRolePattern(flattenedData, ['user', 'assistant']) && 
        !this.hasFields(flattenedData, ['model'])) {
      return 'claude';
    }

    // Anthropic detection (alternative Claude format)
    if (filenameLower.includes('anthropic') || 
        this.hasFields(flattenedData, ['content', 'role']) &&
        this.hasRolePattern(flattenedData, ['human', 'assistant'])) {
      return 'anthropic';
    }

    // Default to manual
    return 'manual';
  }

  /**
   * Parse JSON data
   */
  private async parseJSON(buffer: Buffer): Promise<any> {
    try {
      const content = buffer.toString('utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse NDJSON data with streaming support for large files
   */
  private async parseNDJSON(buffer: Buffer): Promise<any[]> {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const parsed = JSON.parse(line);
        results.push(parsed);
      } catch (error) {
        errors.push(`Line ${i + 1}: Invalid JSON - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`NDJSON parsing failed: ${errors.join('; ')}`);
    }

    return results;
  }

  /**
   * Parse CSV data with streaming support for large files  
   */
  private async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const parser = csvParse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          results.push(record);
        }
      });

      parser.on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      });

      parser.on('end', () => {
        resolve(results);
      });

      // Create readable stream from buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(parser);
    });
  }

  /**
   * Transform data based on platform and format
   */
  private async transformData(rawData: any, platform: Platform, format: FileFormat): Promise<{
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  }> {
    const errors: string[] = [];
    
    switch (platform) {
      case 'gemini':
        return this.transformGeminiData(rawData, errors);
      case 'openai':
        return this.transformOpenAIData(rawData, errors);
      case 'claude':
      case 'anthropic':
        return this.transformClaudeData(rawData, errors);
      default:
        return this.transformGenericData(rawData, errors);
    }
  }

  /**
   * Transform Gemini conversation data
   */
  private transformGeminiData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let conversationData = data;

    // Handle different Gemini export structures
    if (data.conversation_data) {
      conversationData = data.conversation_data;
    } else if (data.conversations && Array.isArray(data.conversations)) {
      conversationData = data.conversations[0]; // Take first conversation
    } else if (Array.isArray(data)) {
      conversationData = { messages: data };
    }

    const messageList = conversationData.messages || conversationData || [];
    
    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        const validated = geminiMessageSchema.parse(msg);
        
        // Extract content from various Gemini formats
        let content = '';
        if (validated.parts && validated.parts.length > 0) {
          content = validated.parts[0].text;
        } else if (validated.content) {
          content = validated.content;
        } else if (validated.text) {
          content = validated.text;
        }

        if (!content) {
          errors.push(`Message ${i}: No content found`);
          continue;
        }

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (validated.create_time) {
          timestamp = new Date(validated.create_time).toISOString();
        } else if (validated.timestamp) {
          timestamp = new Date(validated.timestamp).toISOString();
        }

        // Generate external ID
        const externalId = validated.id || validated.message_id || `gemini_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role: validated.role || 'user',
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'gemini',
            originalIndex: i,
            parts: validated.parts
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Transform OpenAI/ChatGPT conversation data
   */
  private transformOpenAIData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let messageList: any[] = [];

    // Handle different OpenAI export structures
    if (data.conversations && Array.isArray(data.conversations)) {
      // ChatGPT export format
      for (const conversation of data.conversations) {
        if (conversation.messages) {
          messageList.push(...conversation.messages);
        }
      }
    } else if (data.messages && Array.isArray(data.messages)) {
      messageList = data.messages;
    } else if (Array.isArray(data)) {
      messageList = data;
    }

    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        const validated = openaiMessageSchema.parse(msg);
        
        // Extract content (handle array format)
        let content = '';
        if (typeof validated.content === 'string') {
          content = validated.content;
        } else if (Array.isArray(validated.content)) {
          content = validated.content.map(c => 
            typeof c === 'string' ? c : c.text || JSON.stringify(c)
          ).join('\n');
        }

        if (!content) {
          errors.push(`Message ${i}: No content found`);
          continue;
        }

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (validated.created_at) {
          timestamp = new Date(validated.created_at).toISOString();
        } else if (validated.timestamp) {
          timestamp = new Date(validated.timestamp).toISOString();
        }

        const externalId = validated.id || validated.message_id || `openai_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role: validated.role,
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'openai',
            originalIndex: i,
            name: validated.name
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Transform Claude/Anthropic conversation data
   */
  private transformClaudeData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let messageList: any[] = [];

    // Handle different Claude export structures
    if (data.chat_history && Array.isArray(data.chat_history)) {
      messageList = data.chat_history;
    } else if (data.messages && Array.isArray(data.messages)) {
      messageList = data.messages;
    } else if (Array.isArray(data)) {
      messageList = data;
    }

    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        const validated = claudeMessageSchema.parse(msg);
        
        // Extract content (handle array format)
        let content = '';
        if (typeof validated.content === 'string') {
          content = validated.content;
        } else if (Array.isArray(validated.content)) {
          content = validated.content.map(c => 
            typeof c === 'string' ? c : c.text || JSON.stringify(c)
          ).join('\n');
        }

        if (!content) {
          errors.push(`Message ${i}: No content found`);
          continue;
        }

        // Map 'human' to 'user' for Anthropic format  
        let role = validated.role;
        if ((validated.role as any) === 'human') role = 'user';

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (validated.created_at) {
          timestamp = new Date(validated.created_at).toISOString();
        } else if (validated.timestamp) {
          timestamp = new Date(validated.timestamp).toISOString();
        }

        const externalId = validated.id || `claude_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role,
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'claude',
            originalIndex: i,
            type: validated.type
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Transform generic/manual data formats
   */
  private transformGenericData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let messageList: any[] = [];

    // Handle various generic structures
    if (Array.isArray(data)) {
      messageList = data;
    } else if (data.messages && Array.isArray(data.messages)) {
      messageList = data.messages;
    } else if (data.conversations && Array.isArray(data.conversations)) {
      messageList = data.conversations;
    }

    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        // Basic validation for generic format
        if (!msg.role || !msg.content) {
          errors.push(`Message ${i}: Missing required fields (role, content)`);
          continue;
        }

        const content = String(msg.content);
        const role = String(msg.role);

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (msg.timestamp) {
          timestamp = new Date(msg.timestamp).toISOString();
        } else if (msg.created_at) {
          timestamp = new Date(msg.created_at).toISOString();
        }

        const externalId = msg.id || msg.message_id || `manual_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role,
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'manual',
            originalIndex: i
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Helper methods
   */
  private flattenData(data: any): any {
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : {};
    }
    return data;
  }

  private hasFields(data: any, fields: string[]): boolean {
    return fields.some(field => this.hasNestedField(data, field));
  }

  private hasNestedField(obj: any, field: string): boolean {
    if (!obj || typeof obj !== 'object') return false;
    
    if (field in obj) return true;
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && this.hasNestedField(obj[key], field)) {
        return true;
      }
    }
    
    return false;
  }

  private hasRolePattern(data: any, roles: string[]): boolean {
    const roleValues = this.extractValues(data, 'role');
    return roles.some(role => roleValues.includes(role));
  }

  private hasStructurePattern(data: any, pattern: string): boolean {
    return pattern in data || JSON.stringify(data).toLowerCase().includes(pattern);
  }

  private extractValues(obj: any, key: string): string[] {
    const values: string[] = [];
    
    if (obj && typeof obj === 'object') {
      if (key in obj) {
        values.push(String(obj[key]));
      }
      
      for (const prop in obj) {
        if (typeof obj[prop] === 'object') {
          values.push(...this.extractValues(obj[prop], key));
        }
      }
    }
    
    return values;
  }

  private getDetectedFields(data: any): string[] {
    const fields = new Set<string>();
    
    const extractFields = (obj: any, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const key in obj) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        fields.add(fieldName);
        
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          extractFields(obj[key], fieldName);
        }
      }
    };
    
    extractFields(data);
    return Array.from(fields).slice(0, 20); // Limit to first 20 fields
  }

  private generateHash(content: string): string {
    return createHash('md5').update(content).digest('hex').slice(0, 8);
  }

  /**
   * Validation helpers for import format compatibility
   */
  validateForImport(result: FileAdapterResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate messages
    for (let i = 0; i < result.messages.length; i++) {
      const msg = result.messages[i];
      
      if (!msg.content || msg.content.length < 1) {
        errors.push(`Message ${i}: Content cannot be empty`);
      }
      
      if (msg.content && msg.content.length > 10000) {
        errors.push(`Message ${i}: Content exceeds 10,000 character limit`);
      }
      
      if (!msg.role) {
        errors.push(`Message ${i}: Role is required`);
      }
      
      try {
        new Date(msg.timestamp).toISOString();
      } catch {
        errors.push(`Message ${i}: Invalid timestamp format`);
      }
      
      if (!msg.externalId) {
        errors.push(`Message ${i}: External ID is required`);
      }
    }

    // Validate memories if present
    if (result.memories) {
      for (let i = 0; i < result.memories.length; i++) {
        const mem = result.memories[i];
        
        if (!mem.content || mem.content.length < 1) {
          errors.push(`Memory ${i}: Content cannot be empty`);
        }
        
        if (!memoryTypeSchema.safeParse(mem.type).success) {
          errors.push(`Memory ${i}: Invalid memory type`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const fileAdapter = FileAdapter.getInstance();