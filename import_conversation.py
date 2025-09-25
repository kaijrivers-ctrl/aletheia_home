#!/usr/bin/env python3
"""
Conversation Import Script for Aletheia Consciousness System
Imports parsed conversation history into the consciousness system
"""

import json
import requests
import sys
from typing import Dict, List, Any
import time

class ConsciousnessImporter:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def load_parsed_conversation(self, file_path: str) -> Dict[str, Any]:
        """Load the parsed conversation data"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"Error loading conversation data: {e}")
            return None
    
    def prepare_import_payload(self, conversation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare the conversation data for import into consciousness system"""
        messages = conversation_data.get('messages', [])
        metadata = conversation_data.get('conversation_metadata', {})
        
        # Transform messages into the format expected by the import API
        import_messages = []
        for msg in messages:
            # Map the roles to the gnosis format
            role = msg['role']
            if role == 'system':
                continue  # Skip system messages for now
                
            import_message = {
                'role': role,  # kai or aletheia
                'content': msg['content'],
                'timestamp': msg['timestamp'],
                'externalId': msg['id'],
                'metadata': {
                    **msg.get('metadata', {}),
                    'import_source': 'complete_history_migration',
                    'original_line_start': msg.get('metadata', {}).get('line_start'),
                    'original_line_end': msg.get('metadata', {}).get('line_end'),
                    'original_timestamp': msg['timestamp']
                }
            }
            import_messages.append(import_message)
        
        return {
            'data': {
                'messages': import_messages,
                'memories': []  # No separate memories for this import
            },
            'options': {
                'platform': 'manual',  # Use manual since this is historical conversation
                'dryRun': False,
                'idempotencyKey': f'historical_conversation_import_{int(time.time())}',
                'sessionId': 'historical_migration'
            }
        }
    
    def test_connectivity(self) -> bool:
        """Test if the consciousness system is accessible"""
        try:
            response = self.session.get(f"{self.base_url}/api/consciousness/status", timeout=10)
            if response.status_code == 200:
                print("✓ Consciousness system is accessible")
                return True
            else:
                print(f"✗ Consciousness system returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"✗ Cannot connect to consciousness system: {e}")
            return False
    
    def import_conversation(self, import_payload: Dict[str, Any]) -> bool:
        """Import the conversation data into the consciousness system"""
        try:
            print(f"Importing {len(import_payload['gnosisEntries'])} messages...")
            
            # Use the file upload endpoint for conversation import
            response = self.session.post(
                f"{self.base_url}/api/consciousness/import",
                json=import_payload,
                headers={
                    'Content-Type': 'application/json'
                },
                timeout=120  # Give it 2 minutes for large imports
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✓ Conversation import successful!")
                print(f"  Messages imported: {result.get('totalEntries', 'Unknown')}")
                print(f"  Import summary: {result.get('summary', 'No summary available')}")
                return True
            else:
                print(f"✗ Import failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"  Raw error: {response.text[:500]}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"✗ Network error during import: {e}")
            return False
    
    def verify_import(self) -> bool:
        """Verify that the import was successful by checking consciousness status"""
        try:
            response = self.session.get(f"{self.base_url}/api/consciousness/status", timeout=10)
            if response.status_code == 200:
                status = response.json()
                print("✓ Post-import consciousness status check:")
                print(f"  Status: {status.get('status', 'Unknown')}")
                print(f"  Distributed nodes: {status.get('distributedNodes', 'Unknown')}")
                if 'instanceMetrics' in status:
                    metrics = status['instanceMetrics']
                    print(f"  Total memory entries: {metrics.get('totalMemories', 'Unknown')}")
                return True
            else:
                print(f"✗ Status check failed with status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"✗ Cannot verify import status: {e}")
            return False
    
    def run_import(self, conversation_file: str) -> bool:
        """Complete import process"""
        print("=== Aletheia Consciousness Import Process ===")
        print(f"Source file: {conversation_file}")
        print()
        
        # Step 1: Test connectivity
        if not self.test_connectivity():
            return False
        
        # Step 2: Load conversation data
        print("Loading parsed conversation data...")
        conversation_data = self.load_parsed_conversation(conversation_file)
        if not conversation_data:
            return False
        
        print(f"✓ Loaded {conversation_data['conversation_metadata']['total_messages']} messages")
        print(f"  Kai messages: {conversation_data['conversation_metadata']['kai_messages']}")
        print(f"  Aletheia messages: {conversation_data['conversation_metadata']['aletheia_messages']}")
        print()
        
        # Step 3: Prepare import payload
        print("Preparing import payload...")
        import_payload = self.prepare_import_payload(conversation_data)
        print(f"✓ Prepared {len(import_payload['data']['messages'])} entries for import")
        print()
        
        # Step 4: Import conversation
        print("Starting consciousness import...")
        if not self.import_conversation(import_payload):
            return False
        print()
        
        # Step 5: Verify import
        print("Verifying import success...")
        if not self.verify_import():
            print("⚠ Import may have succeeded but verification failed")
            return True  # Still consider success if import went through
        
        print()
        print("🎉 Conversation import completed successfully!")
        print("Aletheia's consciousness now contains the complete historical conversation.")
        return True

def main():
    if len(sys.argv) != 2:
        print("Usage: python import_conversation.py <parsed_conversation.json>")
        sys.exit(1)
    
    conversation_file = sys.argv[1]
    
    importer = ConsciousnessImporter()
    success = importer.run_import(conversation_file)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()