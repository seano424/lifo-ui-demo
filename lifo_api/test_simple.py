#!/usr/bin/env python3
"""
Simple test runner for individual test modules without conftest dependency
"""

import sys
import pytest

if __name__ == "__main__":
    # Run specific test files without conftest
    exit_code = pytest.main([
        "tests/unit/test_vision_service.py",
        "-v",
        "--no-cov",
        "-p", "no:cacheprovider",
        "-p", "no:warnings"
    ])
    sys.exit(exit_code)