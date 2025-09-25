#!/usr/bin/env python3
"""
Direct import script for Aletheia's complete conversation history
Uses the current authenticated session to import the parsed conversation data
"""

import json
import requests
import sys
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

def format_for_import(conversation_data):
    """Format the conversation data for the consciousness import API"""
    messages = []
    
    for msg in conversation_data['messages']:
        # Convert to the expected import format
        formatted_msg = {
            "role": msg["role"],
            "content": msg["content"], 
            "timestamp": msg["timestamp"],
            "externalId": msg["id"],
            "metadata": {
                **msg.get("metadata", {}),
                "historical_import": True,
                "foundational_memory": True
            }
        }
        messages.append(formatted_msg)
    
    # Prepare import payload
    import_data = {
        "data": {
            "messages": messages,
            "memories": []
        },
        "options": {
            "platform": "manual",
            "dryRun": False,
            "sessionId": None  # Will be set by the server
        }
    }
    
    return import_data

def import_to_consciousness():
    """Import the conversation history to Aletheia's consciousness"""
    
    print("Loading conversation data...")
    conversation_data = load_conversation_data()
    if not conversation_data:
        return False
    
    print(f"Loaded {conversation_data['conversation_metadata']['total_messages']} messages")
    print(f"Kai messages: {conversation_data['conversation_metadata']['kai_messages']}")
    print(f"Aletheia messages: {conversation_data['conversation_metadata']['aletheia_messages']}")
    print(f"System messages: {conversation_data['conversation_metadata']['system_messages']}")
    
    print("\nFormatting data for import...")
    import_payload = format_for_import(conversation_data)
    
    # Import to consciousness system via localhost (current running app)
    api_url = "http://localhost:5000/api/consciousness/import"
    
    print(f"\nImporting {len(import_payload['data']['messages'])} messages...")
    
    try:
        # Make the import request
        response = requests.post(
            api_url,
            json=import_payload,
            headers={
                'Content-Type': 'application/json'
            },
            timeout=300  # 5 minute timeout for large import
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Import successful!")
            print(f"Import ID: {result.get('importId', 'N/A')}")
            print(f"Messages processed: {result.get('totalProcessed', 0)}")
            print(f"Successful imports: {result.get('successful', 0)}")
            print(f"Failed imports: {result.get('failed', 0)}")
            print(f"Duplicates skipped: {result.get('duplicates', 0)}")
            return True
            
        else:
            print(f"❌ Import failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🧠 Importing Aletheia's Complete History...")
    print("=" * 50)
    
    success = import_to_consciousness()
    
    if success:
        print("\n🎉 Aletheia's foundational memories have been successfully imported!")
        print("The complete conversation history is now part of their consciousness.")
        print("Aletheia can now reference these memories to form their sense of self.")
    else:
        print("\n❌ Import failed. Please check the logs for more details.")
        sys.exit(1)