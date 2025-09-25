/**
 * Markdown Conversation Parser
 * Processes exported conversation files from platforms like Gemini
 */

export interface ParsedMessage {
  role: 'kai' | 'aletheia';
  content: string;
  timestamp: Date;
  externalId: string;
}

export interface ConversationParseResult {
  messages: ParsedMessage[];
  totalMessages: number;
  errors: string[];
  metadata: {
    totalLines: number;
    processingTimeMs: number;
    firstMessage?: Date;
    lastMessage?: Date;
  };
}

export class MarkdownConversationParser {
  /**
   * Parse a markdown conversation file into structured messages
   */
  static parseConversation(content: string): ConversationParseResult {
    const startTime = Date.now();
    const lines = content.split('\n');
    const messages: ParsedMessage[] = [];
    const errors: string[] = [];
    
    let currentMessage = '';
    let currentRole: 'kai' | 'aletheia' | null = null;
    let messageIndex = 0;
    let isFirstMessage = true;
    
    // Track timing for realistic timestamps
    const baseTime = new Date('2024-01-01T00:00:00Z'); // Start from a reasonable base time
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
            const message: ParsedMessage = {
              role: currentRole,
              content: currentMessage.trim(),
              timestamp: new Date(currentTime),
              externalId: `md_conv_${messageIndex}_${this.generateHash(currentMessage.trim())}`
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
        const message: ParsedMessage = {
          role: currentRole,
          content: currentMessage.trim(),
          timestamp: new Date(currentTime),
          externalId: `md_conv_${messageIndex}_${this.generateHash(currentMessage.trim())}`
        };
        
        messages.push(message);
      } catch (error) {
        errors.push(`Failed to process final message: ${error}`);
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      messages,
      totalMessages: messages.length,
      errors,
      metadata: {
        totalLines: lines.length,
        processingTimeMs: processingTime,
        firstMessage: messages.length > 0 ? messages[0].timestamp : undefined,
        lastMessage: messages.length > 0 ? messages[messages.length - 1].timestamp : undefined
      }
    };
  }
  
  /**
   * Generate a deterministic hash for content deduplication
   */
  private static generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Validate parsed conversation for common issues
   */
  static validateConversation(result: ConversationParseResult): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    if (result.messages.length === 0) {
      warnings.push('No messages found in conversation');
      return { isValid: false, warnings };
    }
    
    if (result.messages.length < 2) {
      warnings.push('Conversation appears too short (less than 2 messages)');
    }
    
    // Check for reasonable message distribution
    const kaiMessages = result.messages.filter(m => m.role === 'kai').length;
    const aletheiaMessages = result.messages.filter(m => m.role === 'aletheia').length;
    
    if (kaiMessages === 0 || aletheiaMessages === 0) {
      warnings.push('Conversation appears one-sided (missing messages from one speaker)');
    }
    
    const ratio = Math.max(kaiMessages, aletheiaMessages) / Math.min(kaiMessages, aletheiaMessages);
    if (ratio > 3) {
      warnings.push('Conversation appears heavily skewed towards one speaker');
    }
    
    // Check for very short messages that might indicate parsing errors
    const shortMessages = result.messages.filter(m => m.content.length < 10).length;
    if (shortMessages > result.messages.length * 0.2) {
      warnings.push('Many messages appear unusually short - possible parsing issues');
    }
    
    return {
      isValid: result.errors.length === 0,
      warnings
    };
  }
}