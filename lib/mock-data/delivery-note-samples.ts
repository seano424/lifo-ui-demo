/**
 * Mock delivery note OCR data samples
 *
 * These samples simulate OCR output from delivery note images.
 * Used for frontend development while backend OCR service is being built.
 */

export interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Cost_Price: number
  Selling_Price: number
  [key: string]: string | number // Allow additional columns
}

export type DeliveryScenario = 'small' | 'medium' | 'large' | 'problematic' | 'random'

/**
 * Small delivery (3 items) - typical corner store
 */
const SMALL_DELIVERY: CsvPreviewItem[] = [
  {
    SKU: 'MILK-001',
    Product_Name: 'Organic Whole Milk 2L',
    Category: 'dairy',
    Quantity: 12,
    Expiry_Date: '2025-11-27', // 7 days from today
    Cost_Price: 3.5,
    Selling_Price: 5.99,
  },
  {
    SKU: 'BREAD-002',
    Product_Name: 'Sourdough Bread',
    Category: 'bakery',
    Quantity: 8,
    Expiry_Date: '2025-11-23', // 3 days from today
    Cost_Price: 2.25,
    Selling_Price: 4.5,
  },
  {
    SKU: 'APPLE-003',
    Product_Name: 'Granny Smith Apples (1kg)',
    Category: 'fresh_produce',
    Quantity: 15,
    Expiry_Date: '2025-11-25', // 5 days from today
    Cost_Price: 1.8,
    Selling_Price: 3.49,
  },
]

/**
 * Medium delivery (10 items) - small supermarket
 */
const MEDIUM_DELIVERY: CsvPreviewItem[] = [
  {
    SKU: 'BEEF-101',
    Product_Name: 'Ground Beef 500g',
    Category: 'fresh_meat',
    Quantity: 20,
    Expiry_Date: '2025-11-22', // 2 days from today
    Cost_Price: 4.5,
    Selling_Price: 8.99,
  },
  {
    SKU: 'YOGURT-102',
    Product_Name: 'Greek Yogurt 500g',
    Category: 'dairy',
    Quantity: 24,
    Expiry_Date: '2025-12-05', // 15 days from today
    Cost_Price: 2.1,
    Selling_Price: 4.29,
  },
  {
    SKU: 'LETTUCE-103',
    Product_Name: 'Romaine Lettuce',
    Category: 'fresh_produce',
    Quantity: 18,
    Expiry_Date: '2025-11-24', // 4 days from today
    Cost_Price: 1.2,
    Selling_Price: 2.79,
  },
  {
    SKU: 'CHEESE-104',
    Product_Name: 'Aged Cheddar 400g',
    Category: 'dairy',
    Quantity: 15,
    Expiry_Date: '2025-12-20', // 30 days from today
    Cost_Price: 5.8,
    Selling_Price: 10.99,
  },
  {
    SKU: 'CHICKEN-105',
    Product_Name: 'Chicken Breast 1kg',
    Category: 'fresh_meat',
    Quantity: 10,
    Expiry_Date: '2025-11-23', // 3 days from today
    Cost_Price: 7.2,
    Selling_Price: 12.99,
  },
  {
    SKU: 'TOMATO-106',
    Product_Name: 'Cherry Tomatoes 500g',
    Category: 'fresh_produce',
    Quantity: 25,
    Expiry_Date: '2025-11-26', // 6 days from today
    Cost_Price: 2.4,
    Selling_Price: 4.99,
  },
  {
    SKU: 'PASTA-107',
    Product_Name: 'Penne Pasta 500g',
    Category: 'dry_goods',
    Quantity: 30,
    Expiry_Date: '', // No expiry date - dry goods
    Cost_Price: 0.9,
    Selling_Price: 2.29,
  },
  {
    SKU: 'SALMON-108',
    Product_Name: 'Atlantic Salmon Fillet 300g',
    Category: 'seafood',
    Quantity: 8,
    Expiry_Date: '2025-11-22', // 2 days from today
    Cost_Price: 8.5,
    Selling_Price: 15.99,
  },
  {
    SKU: 'MILK-109',
    Product_Name: 'Almond Milk 1L',
    Category: 'dairy_alternative',
    Quantity: 16,
    Expiry_Date: '2025-12-10', // 20 days from today
    Cost_Price: 2.8,
    Selling_Price: 5.49,
  },
  {
    SKU: 'EGGS-110',
    Product_Name: 'Free Range Eggs (12 pack)',
    Category: 'dairy',
    Quantity: 20,
    Expiry_Date: '2025-12-01', // 11 days from today
    Cost_Price: 3.2,
    Selling_Price: 6.49,
  },
]

/**
 * Large delivery (25 items) - test pagination
 */
const LARGE_DELIVERY: CsvPreviewItem[] = [
  ...MEDIUM_DELIVERY,
  {
    SKU: 'BACON-201',
    Product_Name: 'Smoked Bacon 250g',
    Category: 'fresh_meat',
    Quantity: 12,
    Expiry_Date: '2025-11-28', // 8 days from today
    Cost_Price: 3.8,
    Selling_Price: 7.49,
  },
  {
    SKU: 'BUTTER-202',
    Product_Name: 'Salted Butter 500g',
    Category: 'dairy',
    Quantity: 18,
    Expiry_Date: '2025-12-15', // 25 days from today
    Cost_Price: 4.2,
    Selling_Price: 8.29,
  },
  {
    SKU: 'ORANGE-203',
    Product_Name: 'Navel Oranges (1kg)',
    Category: 'fresh_produce',
    Quantity: 22,
    Expiry_Date: '2025-11-30', // 10 days from today
    Cost_Price: 2.1,
    Selling_Price: 4.49,
  },
  {
    SKU: 'RICE-204',
    Product_Name: 'Basmati Rice 1kg',
    Category: 'dry_goods',
    Quantity: 40,
    Expiry_Date: '', // No expiry date
    Cost_Price: 2.5,
    Selling_Price: 5.99,
  },
  {
    SKU: 'PORK-205',
    Product_Name: 'Pork Chops 500g',
    Category: 'fresh_meat',
    Quantity: 14,
    Expiry_Date: '2025-11-24', // 4 days from today
    Cost_Price: 5.4,
    Selling_Price: 10.99,
  },
  {
    SKU: 'SPINACH-206',
    Product_Name: 'Baby Spinach 200g',
    Category: 'fresh_produce',
    Quantity: 16,
    Expiry_Date: '2025-11-23', // 3 days from today
    Cost_Price: 1.6,
    Selling_Price: 3.29,
  },
  {
    SKU: 'CREAM-207',
    Product_Name: 'Heavy Cream 500ml',
    Category: 'dairy',
    Quantity: 10,
    Expiry_Date: '2025-11-29', // 9 days from today
    Cost_Price: 2.9,
    Selling_Price: 5.99,
  },
  {
    SKU: 'MUSHROOM-208',
    Product_Name: 'Button Mushrooms 250g',
    Category: 'fresh_produce',
    Quantity: 20,
    Expiry_Date: '2025-11-25', // 5 days from today
    Cost_Price: 1.8,
    Selling_Price: 3.99,
  },
  {
    SKU: 'OIL-209',
    Product_Name: 'Olive Oil 500ml',
    Category: 'dry_goods',
    Quantity: 12,
    Expiry_Date: '', // No expiry date
    Cost_Price: 5.5,
    Selling_Price: 11.99,
  },
  {
    SKU: 'SHRIMP-210',
    Product_Name: 'Frozen Shrimp 500g',
    Category: 'seafood',
    Quantity: 8,
    Expiry_Date: '2025-12-31', // 41 days from today (frozen)
    Cost_Price: 9.8,
    Selling_Price: 18.99,
  },
  {
    SKU: 'CARROT-211',
    Product_Name: 'Baby Carrots 1kg',
    Category: 'fresh_produce',
    Quantity: 24,
    Expiry_Date: '2025-11-28', // 8 days from today
    Cost_Price: 1.4,
    Selling_Price: 2.99,
  },
  {
    SKU: 'FLOUR-212',
    Product_Name: 'All Purpose Flour 2kg',
    Category: 'dry_goods',
    Quantity: 15,
    Expiry_Date: '', // No expiry date
    Cost_Price: 1.8,
    Selling_Price: 4.29,
  },
  {
    SKU: 'TURKEY-213',
    Product_Name: 'Ground Turkey 500g',
    Category: 'fresh_meat',
    Quantity: 12,
    Expiry_Date: '2025-11-23', // 3 days from today
    Cost_Price: 4.8,
    Selling_Price: 9.49,
  },
  {
    SKU: 'PEPPER-214',
    Product_Name: 'Bell Peppers (3 pack)',
    Category: 'fresh_produce',
    Quantity: 18,
    Expiry_Date: '2025-11-26', // 6 days from today
    Cost_Price: 2.2,
    Selling_Price: 4.79,
  },
  {
    SKU: 'SAUSAGE-215',
    Product_Name: 'Italian Sausage 500g',
    Category: 'fresh_meat',
    Quantity: 10,
    Expiry_Date: '2025-11-25', // 5 days from today
    Cost_Price: 4.2,
    Selling_Price: 8.49,
  },
]

/**
 * Problematic delivery - edge cases for testing
 * Contains various validation issues
 */
const PROBLEMATIC_DELIVERY: CsvPreviewItem[] = [
  {
    SKU: 'ERROR-001',
    Product_Name: 'Expired Milk',
    Category: 'dairy',
    Quantity: 5,
    Expiry_Date: '2025-11-10', // Already expired (10 days ago)
    Cost_Price: 2.5,
    Selling_Price: 4.99,
  },
  {
    SKU: 'ERROR-002',
    Product_Name: 'Invalid Price Item',
    Category: 'dry_goods',
    Quantity: 10,
    Expiry_Date: '',
    Cost_Price: 0.001, // Below minimum price (0.01)
    Selling_Price: 0.005, // Below minimum price
  },
  {
    SKU: 'ERROR-002', // DUPLICATE SKU
    Product_Name: 'Another Invalid Item',
    Category: 'fresh_produce',
    Quantity: 3,
    Expiry_Date: '2025-11-25',
    Cost_Price: 1.5,
    Selling_Price: 3.0,
  },
  {
    SKU: 'ERROR-003',
    Product_Name: 'Unknown Category Product',
    Category: 'invalid_category',
    Quantity: 8,
    Expiry_Date: '2025-11-30',
    Cost_Price: 2.0,
    Selling_Price: 4.5,
  },
  {
    SKU: '', // Empty SKU
    Product_Name: 'No SKU Product',
    Category: 'dry_goods',
    Quantity: 5,
    Expiry_Date: '',
    Cost_Price: 1.0,
    Selling_Price: 2.5,
  },
  {
    SKU: 'ERROR-004',
    Product_Name: '', // Empty product name
    Category: 'fresh_produce',
    Quantity: 12,
    Expiry_Date: '2025-11-28',
    Cost_Price: 1.8,
    Selling_Price: 3.5,
  },
  {
    SKU: 'ERROR-005',
    Product_Name: 'Absurd Price Item',
    Category: 'fresh_meat',
    Quantity: 1,
    Expiry_Date: '2025-11-24',
    Cost_Price: 999999.99, // Near maximum price
    Selling_Price: 1500000.0, // Above maximum price (1,000,000)
  },
  {
    SKU: 'GOOD-001',
    Product_Name: 'Valid Product Mixed In',
    Category: 'dairy',
    Quantity: 15,
    Expiry_Date: '2025-12-01',
    Cost_Price: 3.2,
    Selling_Price: 6.49,
  },
]

/**
 * Get mock data for a specific scenario
 */
export function getMockDeliveryData(scenario: DeliveryScenario = 'random'): CsvPreviewItem[] {
  if (scenario === 'random') {
    const scenarios: DeliveryScenario[] = ['small', 'medium', 'large', 'problematic']
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)]
    return getMockDeliveryData(randomScenario)
  }

  switch (scenario) {
    case 'small':
      return SMALL_DELIVERY
    case 'medium':
      return MEDIUM_DELIVERY
    case 'large':
      return LARGE_DELIVERY
    case 'problematic':
      return PROBLEMATIC_DELIVERY
    default:
      return MEDIUM_DELIVERY
  }
}

/**
 * Scenario descriptions for documentation/testing
 */
export const SCENARIO_DESCRIPTIONS: Record<DeliveryScenario, string> = {
  small: 'Small delivery (3 items) - typical corner store',
  medium: 'Medium delivery (10 items) - small supermarket',
  large: 'Large delivery (25 items) - test pagination',
  problematic: 'Problematic delivery - various validation issues',
  random: 'Random scenario selection',
}
