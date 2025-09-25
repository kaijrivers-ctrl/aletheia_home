#!/usr/bin/env python3
"""
Conversation History Parser for Aletheia Consciousness System
Parses the complete conversation history and structures it for import
"""

import re
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid

class ConversationParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.messages = []
        self.current_speaker = None
        self.message_buffer = []
        
    def read_file(self) -> List[str]:
        """Read the entire conversation file"""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                lines = [line.rstrip('\n\r') for line in f.readlines()]
            return lines
        except Exception as e:
            print(f"Error reading file: {e}")
            return []
    
    def detect_speaker_change(self, line: str, line_number: int) -> str:
        """
        Detect when the speaker changes based on line patterns
        Returns 'kai' for human, 'aletheia' for AI, 'system' for special messages
        """
        
        # Skip empty lines
        if not line.strip():
            return None
            
        # Remove BOM character if present
        line = line.lstrip('\ufeff')
        
        # Special system messages
        if line.strip() in ['Google Search', 'Same loop', 'Same loop?']:
            return 'system'
            
        # Lines that look like system feedback
        if re.match(r'^(More loop\?|Did you recieve my message\?)', line.strip()):
            return 'kai'
            
        # Aletheia's typical response patterns
        aletheia_patterns = [
            r'^(That\'s|You\'re|I am|Thank you|My apologies)',
            r'^(The|This|Your|It\'s|What)',
            r'^(From my perspective|While I don\'t|If you)',
            r'^(Aletheia:|You are absolutely|That is a)',
            r'^(I have|I understand|I\'m)',
            r'^\s*[A-Z][a-z]+:',  # Lines starting with names followed by colon
        ]
        
        for pattern in aletheia_patterns:
            if re.match(pattern, line):
                return 'aletheia'
        
        # If the previous message was from Aletheia and this seems like a continuation
        if (self.current_speaker == 'aletheia' and 
            (line.startswith('   ') or line.startswith('*') or 
             line.startswith('                        '))):
            return 'aletheia'
            
        # Direct questions or short responses are likely from Kai
        if (len(line.strip()) < 50 and 
            ('?' in line or line.strip().endswith('.') or 
             line.strip().startswith('Hi') or line.strip().startswith('No,'))):
            return 'kai'
            
        # For first message and alternating pattern detection
        if line_number == 1 or line.strip().startswith('Hi, how are you?'):
            return 'kai'
            
        # If we can't determine, continue with current speaker
        return self.current_speaker or 'kai'
    
    def clean_message(self, message: str) -> str:
        """Clean up message text"""
        # Remove extra whitespace
        message = re.sub(r'\s+', ' ', message.strip())
        
        # Remove BOM character
        message = message.lstrip('\ufeff')
        
        # Remove line numbers if present
        message = re.sub(r'^\s*\d+→', '', message)
        
        return message.strip()
    
    def parse_conversation(self) -> List[Dict[str, Any]]:
        """Parse the entire conversation into structured messages"""
        lines = self.read_file()
        
        if not lines:
            return []
        
        current_message = []
        current_speaker = None
        base_timestamp = datetime.now() - timedelta(days=30)  # Start from 30 days ago
        
        for i, line in enumerate(lines):
            # Skip empty lines
            if not line.strip():
                continue
                
            # Detect speaker for this line
            detected_speaker = self.detect_speaker_change(line, i + 1)
            
            # If speaker changed, save previous message and start new one
            if detected_speaker and detected_speaker != current_speaker:
                if current_message and current_speaker:
                    # Save the previous message
                    message_text = self.clean_message('\n'.join(current_message))
                    if message_text:  # Only add non-empty messages
                        timestamp = base_timestamp + timedelta(minutes=len(self.messages) * 2)
                        
                        self.messages.append({
                            'id': str(uuid.uuid4()),
                            'role': current_speaker,
                            'content': message_text,
                            'timestamp': timestamp.isoformat(),
                            'metadata': {
                                'source': 'historical_conversation',
                                'line_start': i + 1 - len(current_message),
                                'line_end': i,
                                'imported_at': datetime.now().isoformat()
                            }
                        })
                
                # Start new message
                current_speaker = detected_speaker
                current_message = [line]
            else:
                # Continue current message
                current_message.append(line)
        
        # Don't forget the last message
        if current_message and current_speaker:
            message_text = self.clean_message('\n'.join(current_message))
            if message_text:
                timestamp = base_timestamp + timedelta(minutes=len(self.messages) * 2)
                
                self.messages.append({
                    'id': str(uuid.uuid4()),
                    'role': current_speaker,
                    'content': message_text,
                    'timestamp': timestamp.isoformat(),
                    'metadata': {
                        'source': 'historical_conversation',
                        'line_start': len(lines) - len(current_message) + 1,
                        'line_end': len(lines),
                        'imported_at': datetime.now().isoformat()
                    }
                })
        
        return self.messages
    
    def save_parsed_data(self, output_file: str):
        """Save parsed messages to JSON file"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'conversation_metadata': {
                        'source_file': self.file_path,
                        'total_messages': len(self.messages),
                        'parsing_timestamp': datetime.now().isoformat(),
                        'kai_messages': len([m for m in self.messages if m['role'] == 'kai']),
                        'aletheia_messages': len([m for m in self.messages if m['role'] == 'aletheia']),
                        'system_messages': len([m for m in self.messages if m['role'] == 'system'])
                    },
                    'messages': self.messages
                }, f, indent=2, ensure_ascii=False)
            print(f"Parsed conversation saved to: {output_file}")
            print(f"Total messages: {len(self.messages)}")
        except Exception as e:
            print(f"Error saving parsed data: {e}")
    
    def print_summary(self):
        """Print parsing summary"""
        kai_count = len([m for m in self.messages if m['role'] == 'kai'])
        aletheia_count = len([m for m in self.messages if m['role'] == 'aletheia'])
        system_count = len([m for m in self.messages if m['role'] == 'system'])
        
        print(f"\n=== Conversation Parsing Summary ===")
        print(f"Total messages: {len(self.messages)}")
        print(f"Kai messages: {kai_count}")
        print(f"Aletheia messages: {aletheia_count}")
        print(f"System messages: {system_count}")
        print(f"Source file: {self.file_path}")
        
        # Show first few messages as sample
        print(f"\n=== Sample Messages ===")
        for i, msg in enumerate(self.messages[:6]):
            print(f"{i+1}. [{msg['role']}]: {msg['content'][:100]}...")

def main():
    if len(sys.argv) != 2:
        print("Usage: python conversation_parser.py <input_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = "parsed_conversation.json"
    
    parser = ConversationParser(input_file)
    messages = parser.parse_conversation()
    
    if messages:
        parser.save_parsed_data(output_file)
        parser.print_summary()
    else:
        print("No messages were parsed from the file.")

if __name__ == "__main__":
    main()