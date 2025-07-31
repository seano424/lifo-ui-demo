#!/usr/bin/env node

/**
 * CSV Upload Performance Test Script
 * 
 * This script creates test CSV files of various sizes to benchmark
 * the performance improvements of the optimized CSV upload system.
 */

const fs = require('fs');
const path = require('path');

// Test data templates
const SAMPLE_PRODUCTS = [
  { name: 'Organic Bananas', brand: 'FreshCorp', category: 'fresh_produce', cost: 2.50, selling: 3.99 },
  { name: 'Whole Milk', brand: 'DairyBest', category: 'dairy', cost: 3.20, selling: 4.49 },
  { name: 'Sourdough Bread', brand: 'BakeFresh', category: 'bakery_fresh', cost: 2.80, selling: 4.99 },
  { name: 'Ground Beef', brand: 'MeatCo', category: 'fresh_meat_fish', cost: 8.99, selling: 12.99 },
  { name: 'Frozen Pizza', brand: 'QuickMeal', category: 'frozen', cost: 4.50, selling: 7.99 },
  { name: 'Orange Juice', brand: 'CitrusFresh', category: 'beverages', cost: 3.99, selling: 5.99 },
  { name: 'Potato Chips', brand: 'CrunchTime', category: 'snacks', cost: 2.25, selling: 3.99 },
  { name: 'Canned Tomatoes', brand: 'Pantry Plus', category: 'dry_goods', cost: 1.99, selling: 2.99 },
  { name: 'Greek Yogurt', brand: 'HealthyChoice', category: 'dairy', cost: 4.50, selling: 6.99 },
  { name: 'Baby Spinach', brand: 'GreenLeaf', category: 'fresh_produce', cost: 3.25, selling: 4.99 }
];

/**
 * Generate a random expiry date between 7 days and 6 months from now
 */
function generateExpiryDate() {
  const now = new Date();
  const minDays = 7;
  const maxDays = 180;
  const randomDays = Math.floor(Math.random() * (maxDays - minDays)) + minDays;
  
  const expiryDate = new Date(now.getTime() + (randomDays * 24 * 60 * 60 * 1000));
  return expiryDate.toISOString().split('T')[0];
}

/**
 * Generate a CSV row for testing
 */
function generateCSVRow(index) {
  const product = SAMPLE_PRODUCTS[index % SAMPLE_PRODUCTS.length];
  const variation = Math.floor(index / SAMPLE_PRODUCTS.length) + 1;
  const sku = `${product.brand.slice(0, 3).toUpperCase()}-${product.name.slice(0, 3).toUpperCase()}-${variation.toString().padStart(3, '0')}`;
  
  return [
    sku,
    `${product.name} ${variation > 1 ? `(Var ${variation})` : ''}`,
    product.category,
    Math.floor(Math.random() * 50) + 10, // Quantity: 10-59
    generateExpiryDate(),
    product.brand,
    product.cost.toFixed(2),
    product.selling.toFixed(2),
    'MAIN',
    'units'
  ].join(',');
}

/**
 * Create a test CSV file with specified number of rows
 */
function createTestCSV(filename, rowCount) {
  const headers = [
    'SKU',
    'Product_Name',
    'Category',
    'Quantity',
    'Expiry_Date',
    'Brand',
    'Cost_Price',
    'Selling_Price',
    'Location',
    'Unit_Type'
  ];

  const csvContent = [
    headers.join(','),
    ...Array.from({ length: rowCount }, (_, i) => generateCSVRow(i))
  ].join('\n');

  const testDir = path.join(__dirname, '..', 'test-data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, csvContent);
  
  console.log(`✅ Created ${filename} with ${rowCount} rows (${Math.round(csvContent.length / 1024)}KB)`);
  return filePath;
}

/**
 * Create performance benchmark files
 */
function createBenchmarkFiles() {
  console.log('🚀 Creating CSV Performance Test Files...\n');

  const testSizes = [
    { name: 'small-10-items.csv', rows: 10 },
    { name: 'medium-50-items.csv', rows: 50 },
    { name: 'large-100-items.csv', rows: 100 },
    { name: 'xl-200-items.csv', rows: 200 },
    { name: 'xxl-500-items.csv', rows: 500 },
    { name: 'stress-1000-items.csv', rows: 1000 }
  ];

  const createdFiles = [];

  testSizes.forEach(({ name, rows }) => {
    const filePath = createTestCSV(name, rows);
    createdFiles.push({ name, rows, path: filePath });
  });

  console.log('\n📊 Performance Test Files Created:');
  console.log('┌─────────────────────────┬───────┬──────────────────────────────┐');
  console.log('│ File                    │ Rows  │ Expected Performance Target  │');
  console.log('├─────────────────────────┼───────┼──────────────────────────────┤');
  console.log('│ small-10-items.csv      │   10  │ < 2 seconds (OLD: 30+ sec)   │');
  console.log('│ medium-50-items.csv     │   50  │ < 5 seconds (OLD: 15+ sec)   │');
  console.log('│ large-100-items.csv     │  100  │ < 10 seconds (NEW TARGET)    │');
  console.log('│ xl-200-items.csv        │  200  │ < 15 seconds                 │');
  console.log('│ xxl-500-items.csv       │  500  │ < 30 seconds                 │');
  console.log('│ stress-1000-items.csv   │ 1000  │ < 60 seconds                 │');
  console.log('└─────────────────────────┴───────┴──────────────────────────────┘');

  console.log('\n🔧 Testing Instructions:');
  console.log('1. Use these files with your optimized CSV upload system');
  console.log('2. Test with /api/inventory/upload-optimized endpoint');
  console.log('3. Compare performance with old /api/inventory/upload endpoint');
  console.log('4. Monitor the performance metrics in browser console');

  console.log('\n⚡ Expected Improvements:');  
  console.log('• 70-90% faster processing times');
  console.log('• Single-digit second processing for 100+ items');
  console.log('• Real-time performance feedback');
  console.log('• No Python subprocess overhead');
  console.log('• Bulk database operations (5 queries vs 600+)');

  return createdFiles;
}

// Run the script
if (require.main === module) {
  createBenchmarkFiles();
}

module.exports = { createBenchmarkFiles, generateCSVRow };