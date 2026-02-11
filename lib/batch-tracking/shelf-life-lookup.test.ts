import { describe, expect, it } from '@jest/globals'
import { getDefaultShelfLife, getShelfLifeForCategories } from './shelf-life-lookup'

describe('getDefaultShelfLife', () => {
  describe('Category matching', () => {
    it('should match dairy products to 7 days', () => {
      const result = getDefaultShelfLife('Dairy Products')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('dairy')
    })

    it('should match bakery to 3 days', () => {
      const result = getDefaultShelfLife('Bakery Items')
      expect(result.days).toBe(3)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('bakery')
    })

    it('should match produce to 5 days', () => {
      const result = getDefaultShelfLife('Fresh Produce')
      expect(result.days).toBe(5)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('produce')
    })

    it('should match meat to 5 days', () => {
      const result = getDefaultShelfLife('Meat & Poultry')
      expect(result.days).toBe(5)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('meat')
    })

    it('should match fish/seafood to 3 days', () => {
      const result = getDefaultShelfLife('Fresh Fish')
      expect(result.days).toBe(3)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('fish')
    })

    it('should match frozen to 90 days', () => {
      const result = getDefaultShelfLife('Frozen Foods')
      expect(result.days).toBe(90)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('frozen')
    })

    it('should match canned to 365 days', () => {
      const result = getDefaultShelfLife('Canned Goods')
      expect(result.days).toBe(365)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('canned')
    })
  })

  describe('French category matching', () => {
    it('should match French dairy (lait) to 7 days', () => {
      const result = getDefaultShelfLife('Produits Laitiers')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('lait')
    })

    it('should match French bakery (pain) to 3 days', () => {
      const result = getDefaultShelfLife('Pain et Viennoiseries')
      expect(result.days).toBe(3)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('pain')
    })

    it('should match French meat (viande) to 5 days', () => {
      const result = getDefaultShelfLife('Viande Fraîche')
      expect(result.days).toBe(5)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('viande')
    })
  })

  describe('Dutch category matching', () => {
    it('should match Dutch dairy (melk) to 7 days', () => {
      const result = getDefaultShelfLife('Melk en Zuivel')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('melk')
    })

    it('should match Dutch bakery (brood) to 3 days', () => {
      const result = getDefaultShelfLife('Brood en Gebak')
      expect(result.days).toBe(3)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('brood')
    })

    it('should match Dutch vegetables (groente) to 5 days', () => {
      const result = getDefaultShelfLife('Verse Groente')
      expect(result.days).toBe(5)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('groente')
    })
  })

  describe('Unmatched categories', () => {
    it('should use fallback for cleaning supplies', () => {
      const result = getDefaultShelfLife('Cleaning Supplies')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should use fallback for household items', () => {
      const result = getDefaultShelfLife('Household Items')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should use fallback for paper products', () => {
      const result = getDefaultShelfLife('Paper Products')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should use fallback for toiletries', () => {
      const result = getDefaultShelfLife('Health & Beauty Toiletries')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })
  })

  describe('Fallback behavior', () => {
    it('should use 14-day fallback for unmatched food categories', () => {
      const result = getDefaultShelfLife('Random Food Category')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should use 14-day fallback for generic categories', () => {
      const result = getDefaultShelfLife('General Foods')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should use 14-day fallback for miscellaneous', () => {
      const result = getDefaultShelfLife('Misc')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })
  })

  describe('Case insensitivity', () => {
    it('should match uppercase category names', () => {
      const result = getDefaultShelfLife('DAIRY PRODUCTS')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
    })

    it('should match lowercase category names', () => {
      const result = getDefaultShelfLife('dairy products')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
    })

    it('should match mixed case category names', () => {
      const result = getDefaultShelfLife('DaIrY PrOdUcTs')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
    })
  })

  describe('Partial matching', () => {
    it('should match partial keyword in longer names', () => {
      const result = getDefaultShelfLife('My Dairy Shop Special Items')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('dairy')
    })

    it('should match keyword at end of name', () => {
      const result = getDefaultShelfLife('Premium Cheese')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('cheese')
    })

    it('should match keyword at start of name', () => {
      const result = getDefaultShelfLife('Bread and Pastries')
      expect(result.days).toBe(3)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('bread')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = getDefaultShelfLife('')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should handle whitespace-only string', () => {
      const result = getDefaultShelfLife('   ')
      expect(result.days).toBe(14)
      expect(result.matched).toBe(false)
      expect(result.matchedKeyword).toBeNull()
    })

    it('should trim whitespace before matching', () => {
      const result = getDefaultShelfLife('  Dairy Products  ')
      expect(result.days).toBe(7)
      expect(result.matched).toBe(true)
      expect(result.matchedKeyword).toBe('dairy')
    })
  })

  describe('First match wins', () => {
    it('should match first keyword found (dairy before cheese)', () => {
      const result = getDefaultShelfLife('Dairy Cheese Products')
      // Should match "dairy" (7 days) before "cheese" (14 days)
      expect(result.days).toBe(7)
      expect(result.matchedKeyword).toBe('dairy')
    })
  })
})

describe('getShelfLifeForCategories', () => {
  it('should process multiple categories', () => {
    const categories = ['Dairy', 'Bakery', 'Meat', 'Cleaning']
    const results = getShelfLifeForCategories(categories)

    expect(results.size).toBe(4)
    expect(results.get('Dairy')?.days).toBe(7)
    expect(results.get('Bakery')?.days).toBe(3)
    expect(results.get('Meat')?.days).toBe(5)
    expect(results.get('Cleaning')?.days).toBe(14) // Fallback for unmatched
  })

  it('should handle empty array', () => {
    const results = getShelfLifeForCategories([])
    expect(results.size).toBe(0)
  })

  it('should preserve original category names as keys', () => {
    const categories = ['DAIRY PRODUCTS', 'Fresh Produce']
    const results = getShelfLifeForCategories(categories)

    expect(results.has('DAIRY PRODUCTS')).toBe(true)
    expect(results.has('Fresh Produce')).toBe(true)
  })
})
