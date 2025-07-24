// app/api/csv/sample/route.ts

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Generate sample CSV content
    const sampleCSV = generateSampleCSV()

    return new NextResponse(sampleCSV, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="lifo-inventory-sample.csv"',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error generating sample CSV:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate sample CSV',
      },
      { status: 500 },
    )
  }
}

function generateSampleCSV(): string {
  const headers = [
    'SKU',
    'Product_Name',
    'Category',
    'Brand',
    'Quantity',
    'Expiry_Date',
    'Manufacture_Date',
    'Cost_Price',
    'Selling_Price',
    'Location',
    'Unit_Type',
    'Supplier',
  ]

  const sampleData = [
    {
      SKU: 'DAIRY-001',
      Product_Name: 'Organic Milk 1L',
      Category: 'dairy',
      Brand: 'Organic Farm',
      Quantity: 12,
      Expiry_Date: getDateString(5),
      Manufacture_Date: getDateString(-2),
      Cost_Price: 1.2,
      Selling_Price: 2.5,
      Location: 'FRIDGE-A1',
      Unit_Type: 'bottles',
      Supplier: 'Local Dairy Co',
    },
    {
      SKU: 'BREAD-001',
      Product_Name: 'Sourdough Bread',
      Category: 'bakery_fresh',
      Brand: 'Artisan Bakery',
      Quantity: 8,
      Expiry_Date: getDateString(2),
      Manufacture_Date: getDateString(0),
      Cost_Price: 1.5,
      Selling_Price: 3.0,
      Location: 'SHELF-B2',
      Unit_Type: 'loaves',
      Supplier: 'Local Bakery',
    },
    {
      SKU: 'PRODUCE-001',
      Product_Name: 'Organic Bananas',
      Category: 'fresh_produce',
      Brand: 'Tropical Farms',
      Quantity: 25,
      Expiry_Date: getDateString(4),
      Manufacture_Date: getDateString(-1),
      Cost_Price: 0.8,
      Selling_Price: 1.8,
      Location: 'PRODUCE-A',
      Unit_Type: 'kg',
      Supplier: 'Fresh Produce Inc',
    },
    {
      SKU: 'MEAT-001',
      Product_Name: 'Fresh Chicken Breast',
      Category: 'fresh_meat_fish',
      Brand: 'Farm Fresh',
      Quantity: 15,
      Expiry_Date: getDateString(3),
      Manufacture_Date: getDateString(0),
      Cost_Price: 8.5,
      Selling_Price: 12.99,
      Location: 'MEAT-COOLER-1',
      Unit_Type: 'kg',
      Supplier: 'Local Butcher',
    },
    {
      SKU: 'FROZEN-001',
      Product_Name: 'Frozen Pizza Margherita',
      Category: 'frozen',
      Brand: 'Italian Style',
      Quantity: 20,
      Expiry_Date: getDateString(90),
      Manufacture_Date: getDateString(-5),
      Cost_Price: 2.8,
      Selling_Price: 4.99,
      Location: 'FREEZER-B',
      Unit_Type: 'pcs',
      Supplier: 'Frozen Foods Ltd',
    },
    {
      SKU: 'CANNED-001',
      Product_Name: 'Tomato Sauce',
      Category: 'canned_jarred',
      Brand: 'Mediterranean',
      Quantity: 50,
      Expiry_Date: getDateString(365),
      Manufacture_Date: getDateString(-30),
      Cost_Price: 0.85,
      Selling_Price: 1.65,
      Location: 'SHELF-C3',
      Unit_Type: 'jars',
      Supplier: 'Italian Import Co',
    },
    {
      SKU: 'BEVERAGE-001',
      Product_Name: 'Orange Juice 1L',
      Category: 'beverages',
      Brand: 'Pure Citrus',
      Quantity: 30,
      Expiry_Date: getDateString(14),
      Manufacture_Date: getDateString(-3),
      Cost_Price: 1.8,
      Selling_Price: 3.2,
      Location: 'FRIDGE-B2',
      Unit_Type: 'bottles',
      Supplier: 'Citrus Valley',
    },
    {
      SKU: 'SNACK-001',
      Product_Name: 'Mixed Nuts 250g',
      Category: 'dry_goods',
      Brand: 'Healthy Choice',
      Quantity: 40,
      Expiry_Date: getDateString(180),
      Manufacture_Date: getDateString(-10),
      Cost_Price: 3.2,
      Selling_Price: 5.99,
      Location: 'SHELF-D1',
      Unit_Type: 'bags',
      Supplier: 'Nut Company',
    },
    {
      SKU: 'SPICE-001',
      Product_Name: 'Black Pepper 50g',
      Category: 'spices_condiments',
      Brand: 'Spice Master',
      Quantity: 25,
      Expiry_Date: getDateString(730),
      Manufacture_Date: getDateString(-60),
      Cost_Price: 1.5,
      Selling_Price: 3.99,
      Location: 'SHELF-E2',
      Unit_Type: 'containers',
      Supplier: 'Spice Traders',
    },
    {
      SKU: 'DELI-001',
      Product_Name: 'Caesar Salad Ready',
      Category: 'deli_prepared',
      Brand: 'Fresh Daily',
      Quantity: 12,
      Expiry_Date: getDateString(2),
      Manufacture_Date: getDateString(0),
      Cost_Price: 2.5,
      Selling_Price: 4.99,
      Location: 'DELI-FRIDGE',
      Unit_Type: 'containers',
      Supplier: 'In-house Prep',
    },
  ]

  // Convert to CSV format
  const csvRows = [
    headers.join(','),
    ...sampleData.map(row =>
      headers
        .map(header => {
          const value = row[header as keyof typeof row]
          // Wrap strings containing commas in quotes
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value
        })
        .join(','),
    ),
  ]

  return csvRows.join('\n')
}

function getDateString(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}
