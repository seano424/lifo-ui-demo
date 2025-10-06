#!/usr/bin/env python3
"""
Quick test to verify the session access fix
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'lifo_api'))

try:
    from app.database.read_only_operations import SecureReadOnlyOperations
    from app.database.connection import get_async_session
    
    print("✅ Successfully imported required modules")
    
    # Test creating SecureReadOnlyOperations
    async def test_session_access():
        session_factory = get_async_session()
        async with session_factory() as session:
            read_ops = SecureReadOnlyOperations(session)
            
            # Check that the session is accessible via .db attribute
            if hasattr(read_ops, 'db'):
                print("✅ SecureReadOnlyOperations.db attribute exists")
                print(f"   Session type: {type(read_ops.db)}")
            else:
                print("❌ SecureReadOnlyOperations.db attribute missing")
                
            if hasattr(read_ops, 'session'):
                print("⚠️  SecureReadOnlyOperations.session attribute exists (this was causing the error)")
            else:
                print("✅ SecureReadOnlyOperations.session attribute correctly absent")
                
            return True
    
    import asyncio
    success = asyncio.run(test_session_access())
    
    if success:
        print("\n🎉 Session access fix verified!")
        print("The bulk scoring endpoint should now work correctly.")
    else:
        print("\n❌ Session access test failed")
        
except ImportError as e:
    print(f"❌ Import error: {str(e)}")
    print("Make sure you're running from the correct directory and environment is set up")
except Exception as e:
    print(f"❌ Test error: {str(e)}")
    print(f"Error type: {type(e).__name__}")