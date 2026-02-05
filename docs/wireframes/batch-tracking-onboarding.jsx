import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Search,
  ChevronDown,
  Package,
  Calendar,
  CheckCircle,
  Settings,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Edit3,
  Info,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

// Shared Components
const ProgressIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 mt-8">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full transition-colors ${
          i + 1 === currentStep
            ? 'bg-gray-800 w-6'
            : i + 1 < currentStep
              ? 'bg-gray-600'
              : 'bg-gray-300'
        }`}
      />
    ))}
    <span className="ml-4 text-sm text-gray-500">
      Step {currentStep} of {totalSteps}
    </span>
  </div>
)

const Button = ({ children, variant = 'primary', onClick, disabled, className = '' }) => {
  const baseStyles =
    'px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2'
  const variants = {
    primary: 'bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-400',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:text-gray-800 hover:underline',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = '', selected, onClick }) => (
  <div
    onClick={onClick}
    className={`border rounded-xl p-4 transition-all ${
      selected
        ? 'border-gray-800 bg-gray-50 ring-2 ring-gray-800'
        : 'border-gray-200 hover:border-gray-400'
    } ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </div>
)

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-12 h-6 rounded-full transition-colors ${
      enabled ? 'bg-gray-800' : 'bg-gray-300'
    }`}
  >
    <div
      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-7' : 'translate-x-1'
      }`}
    />
  </button>
)

const ProductAvatar = ({ name }) => {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
      {initials}
    </div>
  )
}

// Screen 1: Welcome
const Screen1Welcome = ({ onNext, onSkip }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <header className="flex justify-between items-center p-6 border-b bg-white">
      <div className="font-bold text-xl text-gray-800">LIFO</div>
      <button
        onClick={onSkip}
        className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
      >
        Skip setup <ChevronRight className="w-4 h-4" />
      </button>
    </header>

    <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center">
      <div className="w-32 h-32 bg-gray-200 rounded-2xl flex items-center justify-center mb-8">
        <div className="flex items-center gap-2">
          <Package className="w-8 h-8 text-gray-400" />
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Calendar className="w-8 h-8 text-gray-400" />
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Check className="w-8 h-8 text-gray-400" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-3">Get set up in 2 minutes</h1>
      <p className="text-gray-600 mb-6">
        Batches help you track inventory by expiration date. A batch = product + quantity + expiry.
      </p>

      <div className="text-left w-full bg-white rounded-xl p-4 mb-8 border border-gray-200">
        <p className="text-sm text-gray-500 mb-3">We'll help you:</p>
        <ul className="space-y-2">
          {[
            'Choose what products to track',
            'Set up automatic expiration dates',
            'Start reducing waste immediately',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-gray-700">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <Button onClick={onNext} className="w-full mb-3">
        Let's get started <ChevronRight className="w-4 h-4" />
      </Button>
      <Button variant="ghost" onClick={onSkip}>
        I'll do this later
      </Button>

      <ProgressIndicator currentStep={1} totalSteps={5} />
    </main>
  </div>
)

// Screen 2: Select Products
const Screen2SelectProducts = ({ onNext, onBack, onSkip }) => {
  const [selection, setSelection] = useState('all')
  const [selectedCategories, setSelectedCategories] = useState(['dairy', 'bakery', 'produce'])

  const categories = [
    { id: 'dairy', name: 'Dairy & Eggs', count: 23 },
    { id: 'bakery', name: 'Fresh Bakery', count: 18 },
    { id: 'drygoods', name: 'Dry Goods', count: 45 },
    { id: 'produce', name: 'Produce', count: 31 },
    { id: 'beverages', name: 'Beverages', count: 30 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex justify-between items-center p-6 border-b bg-white">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          Skip setup <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">What would you like to track?</h1>
        <p className="text-gray-600 mb-6">
          Select the products you want to manage with batch tracking.
        </p>

        <div className="space-y-3 mb-6">
          <Card selected={selection === 'all'} onClick={() => setSelection('all')}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">All products (147 items)</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selection === 'all' ? 'border-gray-800 bg-gray-800' : 'border-gray-300'
                }`}
              >
                {selection === 'all' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </Card>

          <Card selected={selection === 'category'} onClick={() => setSelection('category')}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Select by category</div>
                <div className="text-sm text-gray-500">
                  Choose specific categories from your Square catalog
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selection === 'category' ? 'border-gray-800 bg-gray-800' : 'border-gray-300'
                }`}
              >
                {selection === 'category' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </Card>

          <Card selected={selection === 'individual'} onClick={() => setSelection('individual')}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Select individual products</div>
                <div className="text-sm text-gray-500">Hand-pick which products to track</div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selection === 'individual' ? 'border-gray-800 bg-gray-800' : 'border-gray-300'
                }`}
              >
                {selection === 'individual' && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </Card>
        </div>

        {selection === 'category' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                className="flex-1 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, cat.id])
                      } else {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat.id))
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-gray-900">{cat.name}</span>
                  <span className="text-gray-500 text-sm">({cat.count} products)</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <ProgressIndicator currentStep={2} totalSteps={5} />

        <div className="flex justify-center mt-6">
          <Button onClick={onNext}>Next</Button>
        </div>
      </main>
    </div>
  )
}

// Screen 3: Category Automation
const Screen3CategoryAutomation = ({ onNext, onBack, onSkip }) => {
  const [categories, setCategories] = useState([
    {
      id: 'dairy',
      name: 'Dairy & Eggs',
      icon: '🥛',
      count: 23,
      days: 14,
      enabled: true,
    },
    {
      id: 'bakery',
      name: 'Fresh Bakery',
      icon: '🥖',
      count: 18,
      days: 3,
      enabled: true,
    },
    {
      id: 'drygoods',
      name: 'Dry Goods',
      icon: '📦',
      count: 45,
      days: 30,
      enabled: false,
    },
    {
      id: 'produce',
      name: 'Produce',
      icon: '🥬',
      count: 31,
      days: 5,
      enabled: true,
    },
    {
      id: 'beverages',
      name: 'Beverages',
      icon: '🥤',
      count: 30,
      days: 60,
      enabled: false,
    },
  ])

  const updateCategory = (id, field, value) => {
    setCategories(categories.map(c => (c.id === id ? { ...c, [field]: value } : c)))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex justify-between items-center p-6 border-b bg-white">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          Skip setup <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Want to automate batch creation?</h1>
        <p className="text-gray-600 mb-4">
          Set default expiration timelines by category. When inventory arrives, we'll calculate the
          expiry date automatically.
        </p>

        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg mb-6">
          <Info className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            You can always adjust these later in Settings
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          <div className="grid grid-cols-3 gap-4 p-4 text-sm font-medium text-gray-500">
            <div>Category</div>
            <div>Default Shelf Life</div>
            <div className="text-right">Enabled</div>
          </div>

          {categories.map(cat => (
            <div key={cat.id} className="grid grid-cols-3 gap-4 p-4 items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="font-medium text-gray-900">{cat.name}</span>
                </div>
                <div className="text-sm text-gray-500">{cat.count} products</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={cat.days}
                  onChange={e => updateCategory(cat.id, 'days', parseInt(e.target.value))}
                  disabled={!cat.enabled}
                  className={`w-16 px-3 py-2 border rounded-lg text-center ${
                    cat.enabled ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                />
                <span className={cat.enabled ? 'text-gray-600' : 'text-gray-400'}>days</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Toggle
                  enabled={cat.enabled}
                  onChange={v => updateCategory(cat.id, 'enabled', v)}
                />
                <span className={`text-sm ${cat.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                  {cat.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <ProgressIndicator currentStep={3} totalSteps={5} />

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="secondary" onClick={onNext}>
            Skip automation
          </Button>
          <Button onClick={onNext}>Next</Button>
        </div>
      </main>
    </div>
  )
}

// Screen 4: Product Overrides
const Screen4ProductOverrides = ({ onNext, onBack, onSkip }) => {
  const [products] = useState([
    {
      id: 1,
      name: 'Organic Milk 1L',
      category: 'Dairy & Eggs',
      days: 14,
      isOverride: false,
      hasAutomation: true,
    },
    {
      id: 2,
      name: 'Chaussons aux pommes',
      category: 'Fresh Bakery',
      days: 2,
      isOverride: true,
      hasAutomation: true,
    },
    {
      id: 3,
      name: 'Brie de Meaux 200g',
      category: 'Dry Goods',
      days: null,
      isOverride: false,
      hasAutomation: false,
    },
  ])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex justify-between items-center p-6 border-b bg-white">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onSkip}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          Skip setup <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Fine-tune by product</h1>
          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Optional</span>
        </div>
        <p className="text-gray-600 mb-6">
          Override expiration defaults for specific products. Tap a product to customize. Leave
          as-is to use category defaults.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="flex-1 outline-none text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            Category <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {products.map(product => (
            <div
              key={product.id}
              className={`bg-white rounded-xl border p-4 ${
                product.isOverride ? 'border-gray-800 ring-1 ring-gray-800' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <ProductAvatar name={product.name} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    {product.isOverride && <Edit3 className="w-4 h-4 text-gray-500" />}
                  </div>
                  <div className="text-sm text-gray-500">{product.category}</div>

                  <div
                    className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      product.hasAutomation
                        ? 'bg-gray-100'
                        : 'bg-gray-50 border border-dashed border-gray-300'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {product.hasAutomation ? (
                      <>
                        Expires in{' '}
                        {product.isOverride ? (
                          <input
                            type="number"
                            defaultValue={product.days}
                            className="w-12 px-2 py-0.5 border border-gray-300 rounded text-center"
                          />
                        ) : (
                          <span className="font-medium">{product.days}</span>
                        )}{' '}
                        days
                        {!product.isOverride && (
                          <span className="text-gray-400">(from category)</span>
                        )}
                        {product.isOverride && (
                          <button className="ml-2 text-gray-500 hover:text-gray-700">
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        Manual entry required
                        <button className="ml-2 text-gray-600 hover:text-gray-800 font-medium">
                          Set →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-500 mb-6">
          Showing 3 of 72 products
          <button className="ml-2 text-gray-700 hover:underline">Load more ↓</button>
        </div>

        <ProgressIndicator currentStep={4} totalSteps={5} />

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="secondary" onClick={onNext}>
            Skip this step
          </Button>
          <Button onClick={onNext}>Review setup</Button>
        </div>
      </main>
    </div>
  )
}

// Screen 5: Review
const Screen5Review = ({ onNext, onBack, onSkip, hasAutomation = true }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <header className="flex justify-between items-center p-6 border-b bg-white">
      <button
        onClick={onBack}
        className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>
      <button
        onClick={onSkip}
        className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
      >
        Skip setup <ChevronRight className="w-4 h-4" />
      </button>
    </header>

    <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Review your batch setup</h1>
      <p className="text-gray-600 mb-6">
        {hasAutomation
          ? "Here's how your batches will be created when inventory arrives."
          : "You've chosen to manage batches manually. No problem!"}
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">📊</div>
          <span className="font-medium text-gray-900">Setup Summary</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Products tracked</span>
            <span className="text-gray-900">
              {hasAutomation ? '72 of 147' : 'All 147 products'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Auto-expiration</span>
            <span className="text-gray-900">
              {hasAutomation ? '3 categories enabled' : 'None (manual entry)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Product overrides</span>
            <span className="text-gray-900">
              {hasAutomation ? '2 products customized' : 'None'}
            </span>
          </div>
          {hasAutomation && (
            <div className="flex justify-between">
              <span className="text-gray-500">Manual entry</span>
              <span className="text-gray-900">45 products (Dry Goods, Beverages)</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">🤖</div>
          <span className="font-medium text-gray-900">
            How it works{!hasAutomation && ' (manual mode)'}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <p className="mb-2">When you receive a delivery:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              {hasAutomation
                ? 'Scan or add products to a new batch'
                : 'Create a new batch from "New Deliveries"'}
            </li>
            <li>
              {hasAutomation
                ? 'Expiration dates auto-fill based on your rules'
                : 'Add products and enter expiration dates'}
            </li>
            <li>
              {hasAutomation ? 'Review and confirm quantities' : 'Confirm quantities and save'}
            </li>
            {hasAutomation && <li>Products without rules → you'll enter dates manually</li>}
          </ol>
        </div>
        {!hasAutomation && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5" />
            <span className="text-sm text-gray-600">
              Tip: You can enable automation anytime in Settings
            </span>
          </div>
        )}
      </div>

      {hasAutomation && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                ⚙️
              </div>
              <span className="font-medium text-gray-900">Your automation rules</span>
            </div>
            <button className="text-sm text-gray-600 hover:text-gray-800">Edit →</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Dairy & Eggs</span>
              <span className="text-gray-900">14 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Produce</span>
              <span className="text-gray-900">5 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fresh Bakery</span>
              <span className="text-gray-900">3 days</span>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">+ 2 product overrides</div>
        </div>
      )}

      <ProgressIndicator currentStep={5} totalSteps={5} />

      <div className="flex flex-col items-center gap-3 mt-6">
        <Button onClick={onNext} className="w-full max-w-xs">
          <Check className="w-4 h-4" /> Finish setup
        </Button>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">
          {hasAutomation ? 'Change something? Go back' : 'Want automation? Go back'}
        </button>
      </div>
    </main>
  </div>
)

// Screen 6: Success
const Screen6Success = ({ onFinish }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
    <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center mb-8">
      <CheckCircle className="w-12 h-12 text-gray-600" />
    </div>

    <h1 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h1>
    <p className="text-gray-600 mb-8 text-center max-w-md">
      Your batch tracking is configured and ready to go.
    </p>

    <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-4 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🚀</span>
        <span className="font-medium text-gray-900">What's next?</span>
      </div>

      <div className="space-y-3">
        {[
          {
            icon: Plus,
            title: 'Create your first batch',
            desc: 'Add products from your next delivery',
          },
          {
            icon: LayoutDashboard,
            title: 'Explore the dashboard',
            desc: 'See your inventory overview',
          },
          {
            icon: Settings,
            title: 'Review settings',
            desc: 'Adjust automation rules anytime',
          },
        ].map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <item.icon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{item.title}</div>
              <div className="text-sm text-gray-500">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>

    <Button onClick={onFinish}>Go to Dashboard</Button>
  </div>
)

// Loading State
const LoadingState = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
    <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
    <h2 className="text-xl font-semibold text-gray-900 mb-2">Syncing your Square catalog...</h2>
    <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
      <div className="h-full bg-gray-600 rounded-full w-1/2 animate-pulse" />
    </div>
    <p className="text-sm text-gray-500">Imported 76 of 147 products</p>
  </div>
)

// Error State
const ErrorState = ({ onRetry, onContinue }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
    <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-6 text-center">
      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-yellow-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Couldn't load your products</h2>
      <p className="text-gray-600 mb-6">
        We had trouble connecting to Square. This might be temporary.
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
        <Button onClick={onContinue}>Continue manually</Button>
      </div>
    </div>
  </div>
)

// Main App Component
export default function LIFOOnboardingWireframes() {
  const [currentScreen, setCurrentScreen] = useState(1)
  const [showLoading, setShowLoading] = useState(false)
  const [showError, setShowError] = useState(false)

  const screens = {
    1: Screen1Welcome,
    2: Screen2SelectProducts,
    3: Screen3CategoryAutomation,
    4: Screen4ProductOverrides,
    5: Screen5Review,
    6: Screen6Success,
  }

  const CurrentScreen = screens[currentScreen]

  const handleNext = () => {
    if (currentScreen < 6) {
      setCurrentScreen(currentScreen + 1)
    }
  }

  const handleBack = () => {
    if (currentScreen > 1) {
      setCurrentScreen(currentScreen - 1)
    }
  }

  const handleSkip = () => {
    setCurrentScreen(6)
  }

  const handleFinish = () => {
    setCurrentScreen(1)
  }

  if (showLoading) {
    return <LoadingState />
  }

  if (showError) {
    return <ErrorState onRetry={() => setShowError(false)} onContinue={() => setShowError(false)} />
  }

  return (
    <div className="font-sans">
      {/* Screen Navigation */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 flex items-center gap-2 z-50">
        <span className="text-xs text-gray-500 mr-2">Screen:</span>
        {[1, 2, 3, 4, 5, 6].map(num => (
          <button
            key={num}
            onClick={() => setCurrentScreen(num)}
            className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              currentScreen === num
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {num}
          </button>
        ))}
        <div className="w-px h-6 bg-gray-200 mx-2" />
        <button
          onClick={() => setShowLoading(true)}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
        >
          Loading
        </button>
        <button
          onClick={() => setShowError(true)}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
        >
          Error
        </button>
      </div>

      <CurrentScreen
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
        onFinish={handleFinish}
      />
    </div>
  )
}
