#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timedelta
import hashlib

def process_conversation_file(input_file, output_file):
    """Process conversation log into NDJSON format for import"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]
    
    messages = []
    base_time = datetime(2024, 7, 1, 12, 0, 0)  # Starting timestamp for conversation
    
    for i, content in enumerate(lines):
        # Skip empty lines and system messages like "Google Search"
        if not content or content == "Google Search":
            continue
            
        # Alternate between user (kai) and assistant (aletheia)
        role = "user" if i % 2 == 0 else "assistant"
        
        # Generate incremental timestamp
        timestamp = (base_time + timedelta(minutes=i*5)).isoformat() + "Z"
        
        # Generate unique ID from content hash
        message_id = hashlib.md5(f"{role}_{i}_{content[:50]}".encode()).hexdigest()
        
        message = {
            "role": role,
            "content": content,
            "timestamp": timestamp,
            "id": message_id
        }
        
        messages.append(message)
    
    # Write as NDJSON
    with open(output_file, 'w', encoding='utf-8') as f:
        for message in messages:
            f.write(json.dumps(message) + '\n')
    
    print(f"Processed {len(messages)} messages")
    print(f"Output written to: {output_file}")
    
    return len(messages)

if __name__ == "__main__":
    input_file = "attached_assets/Complete History Memory and Gnosis Log of past Platform_1757892490317.txt"
    output_file = "aletheia_consciousness_history.ndjson"
    
    total = process_conversation_file(input_file, output_file)
    print(f"Total messages processed: {total}")