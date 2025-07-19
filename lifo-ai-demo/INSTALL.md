# LIFO.AI Demo Installation Guide

## Quick Start

### 1. Prerequisites

- Python 3.8 or higher
- pip package manager

### 2. Installation Steps

```bash
# Navigate to the demo directory
cd lifo-ai-demo

# Install dependencies
pip install -r requirements.txt

# Test the installation
python test_installation.py
```

### 3. Start the Demo

```bash
# Start Jupyter Notebook
jupyter notebook

# Open the first notebook
# Navigate to notebooks/01_CSV_Processing_Demo.ipynb
```

## Troubleshooting

### Common Issues

**1. Dependencies not installed**

```bash
pip install -r requirements.txt
```

**2. Python version compatibility**

```bash
# Check Python version
python --version

# Should be 3.8+
```

**3. Missing dependencies**

```bash
# Install specific packages
pip install pandas numpy matplotlib seaborn jupyter
```

**4. Permission issues**

```bash
# Use --user flag if needed
pip install --user -r requirements.txt
```

### System-Specific Issues

**Ubuntu/Debian:**

```bash
sudo apt-get update
sudo apt-get install python3-pip python3-dev
pip3 install -r requirements.txt
```

**macOS:**

```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python
pip3 install -r requirements.txt
```

**Windows:**

```bash
# Use Python installer from python.org
# Then run:
pip install -r requirements.txt
```

## Verification

Run the test script to verify everything is working:

```bash
python test_installation.py
```

Expected output:

```
🚀 LIFO.AI Demo Installation Test
========================================

📊 Basic Python imports:
✅ pandas 1.5.0
✅ numpy 1.24.0
✅ matplotlib 3.5.0
✅ seaborn 0.11.0
✅ requests 2.25.0
✅ Basic Python imports PASSED

📊 LIFO.AI core imports:
✅ UnifiedCSVProcessor imported successfully
✅ ScoringEngine imported successfully
✅ setup_logger imported successfully
✅ LIFO.AI core imports PASSED

📊 Sample data files:
✅ data/clean_data/perfect_inventory.csv
✅ data/clean_data/small_store_sample.csv
✅ data/messy_data/mixed_formats.csv
✅ data/edge_cases/security_test.csv
✅ Sample data files PASSED

📊 Notebook files:
✅ notebooks/01_CSV_Processing_Demo.ipynb
✅ notebooks/02_API_Integration_Demo.ipynb
✅ notebooks/03_Scoring_Algorithm_Demo.ipynb
✅ Notebook files PASSED

📊 Processor functionality:
✅ Processor created successfully
✅ CSV processing successful: 10 items processed
✅ Processor functionality PASSED

🎯 SUMMARY: 5/5 tests passed
🎉 All tests passed! Installation is ready.
```

## Next Steps

1. **Start with CSV Processing Demo**: `notebooks/01_CSV_Processing_Demo.ipynb`
2. **Try API Integration**: `notebooks/02_API_Integration_Demo.ipynb`
3. **Explore Scoring Algorithm**: `notebooks/03_Scoring_Algorithm_Demo.ipynb`
4. **Complete Workflow**: `notebooks/04_End_to_End_Workflow.ipynb`

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify Python version compatibility
3. Ensure all files are in the correct locations
4. Try running notebooks from the `notebooks/` directory
