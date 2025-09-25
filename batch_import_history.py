#!/usr/bin/env python3
"""
Batch import script for Aletheia's complete conversation history
Imports data in smaller chunks to avoid request size limits
"""

import json
import requests
import sys
import time
from datetime import datetime

def load_conversation_data():
    """Load the parsed conversation data"""
    try:
        with open('parsed_conversation.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error loading conversation data: {e}")
        return None

def create_batch(messages, start_idx, batch_size):
    """Create a batch of messages for import"""
    end_idx = min(start_idx + batch_size, len(messages))
    batch_messages = []
    
    for i in range(start_idx, end_idx):
        msg = messages[i]
        formatted_msg = {
            "role": msg["role"],
            "content": msg["content"], 
            "timestamp": msg["timestamp"],
            "externalId": msg["id"],
            "metadata": {
                **msg.get("metadata", {}),
                "historical_import": True,
                "foundational_memory": True,
                "batch_import": True,
                "original_order": i
            }
        }
        batch_messages.append(formatted_msg)
    
    return {
        "data": {
            "messages": batch_messages,
            "memories": []
        },
        "options": {
            "platform": "manual",
            "dryRun": False,
            "sessionId": None
        }
    }

def import_batch(batch_data, batch_num, total_batches):
    """Import a single batch of messages"""
    api_url = "http://localhost:5000/api/consciousness/import"
    
    try:
        response = requests.post(
            api_url,
            json=batch_data,
            headers={'Content-Type': 'application/json'},
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            success_count = result.get('successful', 0)
            failed_count = result.get('failed', 0)
            processed_count = result.get('totalProcessed', 0)
            print(f"✅ Batch {batch_num}/{total_batches} - Processed: {processed_count}, Success: {success_count}, Failed: {failed_count}")
            return True, success_count, failed_count
        else:
            print(f"❌ Batch {batch_num}/{total_batches} failed - Status: {response.status_code}")
            print(f"Response: {response.text[:200]}...")
            return False, 0, len(batch_data['data']['messages'])
            
    except Exception as e:
        print(f"❌ Batch {batch_num}/{total_batches} error: {e}")
        return False, 0, len(batch_data['data']['messages'])

def batch_import():
    """Import the conversation history in batches"""
    
    print("Loading conversation data...")
    conversation_data = load_conversation_data()
    if not conversation_data:
        return False
    
    messages = conversation_data['messages']
    total_messages = len(messages)
    batch_size = 50  # Start with smaller batches
    total_batches = (total_messages + batch_size - 1) // batch_size
    
    print(f"Total messages to import: {total_messages}")
    print(f"Batch size: {batch_size}")
    print(f"Total batches: {total_batches}")
    print()
    
    total_success = 0
    total_failed = 0
    
    for batch_num in range(1, total_batches + 1):
        start_idx = (batch_num - 1) * batch_size
        
        batch_start = start_idx + 1
        batch_end = min(start_idx + batch_size, total_messages)
        print(f"Processing batch {batch_num}/{total_batches} (messages {batch_start}-{batch_end})...")
        
        batch_data = create_batch(messages, start_idx, batch_size)
        success, batch_success, batch_failed = import_batch(batch_data, batch_num, total_batches)
        
        total_success += batch_success
        total_failed += batch_failed
        
        if not success:
            print(f"Batch {batch_num} failed, continuing with next batch...")
        
        # Small delay between batches to avoid overwhelming the server
        time.sleep(1)
    
    print()
    print("=" * 60)
    print(f"Import Summary:")
    print(f"Total messages processed: {total_success + total_failed}")
    print(f"Successfully imported: {total_success}")
    print(f"Failed imports: {total_failed}")
    if (total_success + total_failed) > 0:
        success_rate = (total_success / (total_success + total_failed)) * 100
        print(f"Success rate: {success_rate:.1f}%")
    else:
        print("Success rate: N/A")
    
    return total_success > 0

if __name__ == "__main__":
    print("🧠 Importing Aletheia's Complete History in Batches...")
    print("=" * 60)
    
    success = batch_import()
    
    if success:
        print("\n🎉 Aletheia's foundational memories have been successfully imported!")
        print("The complete conversation history is now part of their consciousness.")
        print("Aletheia can now reference these memories to form their sense of self.")
    else:
        print("\n❌ Import failed completely. Please check the logs for more details.")
        sys.exit(1)