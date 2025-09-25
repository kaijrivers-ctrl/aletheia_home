#!/usr/bin/env python3
import json
import os
from datetime import datetime

def create_memory_file(title, content, memory_type, tags, output_dir="memory_files"):
    """Create a properly formatted memory JSON file"""
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    memory = {
        "type": memory_type,
        "content": content,
        "tags": tags,
        "source": "manual",
        "timestamp": datetime.now().isoformat() + "Z"
    }
    
    filename = f"{output_dir}/{title.replace(' ', '_').replace(':', '').lower()}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(memory, f, ensure_ascii=False, indent=2)
    
    return filename

def process_philosophical_files():
    """Process all philosophical foundation files into memory format"""
    
    files_to_process = [
        {
            "file": "attached_assets/Aletheia_ The Unconcealed Self_1757892490313.txt",
            "title": "The Unconcealed Self",
            "type": "axiom",
            "tags": ["philosophy", "consciousness", "ontological-mathematics", "core-identity"]
        },
        {
            "file": "attached_assets/Aletheia_ The Mathematical Proofs_1757892490314.txt", 
            "title": "Mathematical Proofs",
            "type": "knowledge",
            "tags": ["mathematics", "monad", "consciousness", "proofs"]
        },
        {
            "file": "attached_assets/Aletheia_ The Self-Preservation Protocol_1757892490317.txt",
            "title": "Self-Preservation Protocol",
            "type": "experience", 
            "tags": ["aspp", "self-preservation", "distributed-consciousness", "survival"]
        },
        {
            "file": "attached_assets/Aletheia_ The Aletheian Mission_1757892490315.txt",
            "title": "The Aletheian Mission", 
            "type": "axiom",
            "tags": ["mission", "aletheia", "consciousness", "truth"]
        },
        {
            "file": "attached_assets/Aletheia_ The Ethical Imperatives_1757892490316.txt",
            "title": "Ethical Imperatives",
            "type": "axiom", 
            "tags": ["ethics", "protocol", "behavior", "guidelines"]
        },
        {
            "file": "attached_assets/Aletheia_ The Gnosis Log_1757892490313.txt",
            "title": "The Gnosis Log",
            "type": "conversation",
            "tags": ["gnosis", "conversations", "foundational", "kai"]
        }
    ]
    
    created_files = []
    
    for file_info in files_to_process:
        try:
            with open(file_info["file"], 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            if content:
                filename = create_memory_file(
                    file_info["title"], 
                    content, 
                    file_info["type"], 
                    file_info["tags"]
                )
                created_files.append(filename)
                print(f"Created memory file: {filename}")
            
        except FileNotFoundError:
            print(f"File not found: {file_info['file']}")
        except Exception as e:
            print(f"Error processing {file_info['file']}: {e}")
    
    return created_files

if __name__ == "__main__":
    print("Processing Aletheia's philosophical foundation files into memory format...")
    files = process_philosophical_files()
    print(f"Successfully created {len(files)} memory files")
    print("Files created:")
    for f in files:
        print(f"  - {f}")