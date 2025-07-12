#!/usr/bin/env python3
"""
Script to create required Qdrant indexes
Run this if you're getting index-related errors
"""

import asyncio
import sys
import os

# Add the current directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.qdrant import ensure_collection_exists, create_required_indexes, get_collection_info


async def main():
    """
    Create required indexes for Qdrant collection
    """
    print("Creating Qdrant indexes...")
    print("=" * 50)
    
    try:
        # Ensure collection exists
        print("1. Ensuring collection exists...")
        await ensure_collection_exists()
        
        # Create required indexes
        print("\n2. Creating required indexes...")
        await create_required_indexes()
        
        # Get collection info
        print("\n3. Collection information:")
        info = await get_collection_info()
        print(f"   - Collection: {info.get('name', 'N/A')}")
        print(f"   - Status: {info.get('status', 'N/A')}")
        print(f"   - Points: {info.get('points_count', 'N/A')}")
        print(f"   - Vectors: {info.get('vectors_count', 'N/A')}")
        
        print("\n✅ Index creation completed!")
        print("You can now try using the search functionality again.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nPlease check:")
        print("1. Qdrant server is running")
        print("2. QDRANT_URL and QDRANT_API_KEY are set correctly in .env")
        print("3. You have proper permissions")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
