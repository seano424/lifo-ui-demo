# Manual Tests

This directory contains manual test scripts and reports for the LIFO AI Engine.

## Files

- `auth_test.py` - Authentication testing script
- `comprehensive_api_test.py` - Comprehensive API testing suite
- `simple_api_test.py` - Simple API smoke tests
- `test_api_comprehensive.py` - Additional comprehensive API tests
- `*.json` - Test reports and results

## Usage

These tests are designed to be run manually during development and debugging. They are not part of the automated test suite.

```bash
# Run from the root directory
python tests/manual/auth_test.py
python tests/manual/comprehensive_api_test.py
```

## Note

These tests may require specific environment setup and running API services. Refer to the main documentation for setup instructions.
