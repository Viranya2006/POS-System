import React, { useState, useEffect, useRef } from 'react'
import { dbService, db } from '../../lib/database'
import { generateInvoiceNumber, formatCurrency, calculateTax, calculateDiscount } from '../../lib/utils'
import { activityLogger } from '../../lib/activityLogger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Scan,
  Plus,
  Minus,
  Trash2,
  Calculator,
  CreditCard,
  DollarSign,
  Receipt,
  Search,
  ShoppingCart,
  User,
  Percent,
  Save,
  Printer,
  AlertTriangle
} from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'
import PaymentModal from './PaymentModal'
import ReceiptPreview from './ReceiptPreview'

const Sales = () => {
  const [saleItems, setSaleItems] = useState([])
  const [currentSale, setCurrentSale] = useState({
    invoiceNo: generateInvoiceNumber(),
    customerId: null,
    customer: null,
    subtotal: 0,
    tax: 0,
    taxRate: 10, // 10% default tax
    discount: 0,
    discountType: 'percentage', // 'percentage' or 'amount'
    discountValue: 0,
    total: 0,
    paymentMethod: 'cash',
    cashReceived: 0,
    change: 0,
    date: new Date().toISOString(),
    userId: 'current-user' // This should come from auth context
  })
  
  const [barcodeInput, setBarcodeInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [customers, setCustomers] = useState([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [barcodeError, setBarcodeError] = useState('')
  
  const barcodeInputRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [saleItems, currentSale.discountValue, currentSale.discountType, currentSale.taxRate])

  useEffect(() => {
    // Focus barcode input on component mount
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    }

    // Listen for keyboard shortcuts
    const handleKeyDown = (e) => {
      const t = e.target
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) {
        // Never intercept typing inside editable fields
        return
      }
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'p':
            e.preventDefault()
            handlePrint()
            break
          case 'n':
            e.preventDefault()
            handleNewSale()
            break
          case 's':
            e.preventDefault()
            handleSaveSale()
            break
        }
      } else if (e.key === 'F2') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        if (saleItems.length > 0) {
          setShowPaymentModal(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadCustomers = async () => {
    try {
      const customerData = await dbService.readAll('customers')
      
      // Deduplicate customers - remove duplicates by customerId, email, phone, or name+phone
      const seen = new Set()
      const uniqueCustomers = customerData.filter(customer => {
        const customerId = customer.customerId?.trim()
        const email = customer.email?.trim().toLowerCase()
        const phone = customer.phone?.trim()
        const name = customer.name?.trim().toLowerCase()
        const namePhoneKey = name && phone ? `${name}:${phone}` : null
        
        // Check if we've seen any of these identifiers before
        if (customerId && seen.has(`id:${customerId}`)) return false
        if (email && seen.has(`email:${email}`)) return false
        if (phone && seen.has(`phone:${phone}`)) return false
        if (namePhoneKey && seen.has(`namephone:${namePhoneKey}`)) return false
        
        // Add all identifiers to seen set
        if (customerId) seen.add(`id:${customerId}`)
        if (email) seen.add(`email:${email}`)
        if (phone) seen.add(`phone:${phone}`)
        if (namePhoneKey) seen.add(`namephone:${namePhoneKey}`)
        
        return true
      })
      
      setCustomers(uniqueCustomers)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    let discount = 0
    if (currentSale.discountValue > 0) {
      discount = calculateDiscount(subtotal, currentSale.discountValue, currentSale.discountType === 'percentage')
    }
    
    const discountedSubtotal = subtotal - discount
    const tax = calculateTax(discountedSubtotal, currentSale.taxRate)
    const total = discountedSubtotal + tax

    setCurrentSale(prev => ({
      ...prev,
      subtotal,
      discount,
      tax,
      total
    }))
  }

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    // Clear any previous error
    setBarcodeError('')

    try {
      const product = await dbService.getInventoryByBarcode(barcodeInput.trim())
      if (product) {
        addItemToSale(product)
        setBarcodeInput('')
        // Refocus input immediately for next scan
        setTimeout(() => barcodeInputRef.current?.focus(), 0)
      } else {
        // Show non-blocking error message
        setBarcodeError(`Product not found with barcode: ${barcodeInput}`)
        // Clear error after 3 seconds
        setTimeout(() => setBarcodeError(''), 3000)
        // Refocus input immediately so user can continue typing
        setTimeout(() => barcodeInputRef.current?.focus(), 0)
      }
    } catch (error) {
      console.error('Error searching product by barcode:', error)
      // Show non-blocking error message
      setBarcodeError('Error searching for product. Please try again.')
      // Clear error after 3 seconds
      setTimeout(() => setBarcodeError(''), 3000)
      // Refocus input immediately so user can continue typing
      setTimeout(() => barcodeInputRef.current?.focus(), 0)
    }
  }

  const handleProductSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const inventory = await dbService.readAll('inventory')
      const results = inventory.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.code.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10) // Limit to 10 results
      
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching products:', error)
    }
  }

  const addItemToSale = (product, quantity = 1) => {
    const existingItemIndex = saleItems.findIndex(item => item.code === product.code)
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...saleItems]
      updatedItems[existingItemIndex].quantity += quantity
      setSaleItems(updatedItems)
    } else {
      // Add new item
      const newItem = {
        code: product.code,
        name: product.name,
        price: product.sellPrice,
        quantity: quantity,
        tax: 0, // Can be customized per item
        discount: 0, // Can be customized per item
        total: product.sellPrice * quantity
      }
      setSaleItems([...saleItems, newItem])
    }
    
    setSearchQuery('')
    setSearchResults([])
  }

  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(index)
      return
    }

    const updatedItems = [...saleItems]
    updatedItems[index].quantity = newQuantity
    updatedItems[index].total = updatedItems[index].price * newQuantity
    setSaleItems(updatedItems)
  }

  const updateItemPrice = (index, newPrice) => {
    const updatedItems = [...saleItems]
    updatedItems[index].price = newPrice
    updatedItems[index].total = newPrice * updatedItems[index].quantity
    setSaleItems(updatedItems)
  }

  const removeItem = (index) => {
    const updatedItems = saleItems.filter((_, i) => i !== index)
    setSaleItems(updatedItems)
  }

  const handleCustomerSelect = (customer) => {
    setCurrentSale(prev => ({
      ...prev,
      customerId: customer.id,
      customer: customer
    }))
  }

  const handleDiscountChange = (value, type) => {
    setCurrentSale(prev => ({
      ...prev,
      discountValue: value,
      discountType: type
    }))
  }

  const handleSaveSale = async () => {
    if (saleItems.length === 0) {
      alert('Please add items to the sale')
      return
    }

    try {
      setLoading(true)
      
      const saleData = {
        ...currentSale,
        items: saleItems.map(item => ({
          code: item.code,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          total: item.total
        }))
      }

      // Save sale to database
      const savedSale = await dbService.create('sales', saleData)
      
      // Update inventory quantities (batched transaction + background queue for sync)
      try {
        // Resolve all products first
        const resolved = await Promise.all(saleItems.map(async (item) => {
          const byBarcode = item.barcode ? await dbService.getInventoryByBarcode(item.barcode) : null
          const product = byBarcode || await db.inventory.where('code').equals(item.code).first()
          return { item, product }
        }))

        const updates = resolved.filter(r => !!r.product).map(({ item, product }) => ({
          id: product.id,
          product,
          newQty: (product.qty || 0) - (item.quantity || 0)
        }))

        // Apply all inventory updates in a single Dexie transaction (fast, non-blocking UI)
        await db.transaction('rw', db.inventory, async () => {
          const nowIso = new Date().toISOString()
          for (const u of updates) {
            if (u.newQty < 0) throw new Error('Insufficient stock')
            await db.inventory.update(u.id, { qty: u.newQty, updatedAt: nowIso, synced: false })
          }
        })

        // Queue Firebase sync for each updated product (do not await)
        const nowIso2 = new Date().toISOString()
        updates.forEach(({ product, newQty }) => {
          const record = { ...product, qty: newQty, updatedAt: nowIso2, synced: false, id: product.id }
          dbService.addToSyncQueue('inventory', 'update', record).catch(() => {})
        })

        // Warn for any missing products
        resolved.filter(r => !r.product).forEach(({ item }) => {
          console.warn(`Product not found: ${item.code} - ${item.name}`)
        })
      } catch (invErr) {
        console.error('Inventory batch update error:', invErr)
      }

      // Auto-create cash flow entry for income
      try {
        await dbService.create('cashFlow', {
          type: 'income',
          category: 'Sales Revenue',
          amount: saleData.total,
          description: `Sale - Invoice ${saleData.invoiceNo}`,
          date: saleData.date,
          referenceId: saleData.invoiceNo,
          referenceType: 'sale',
          userId: saleData.userId
        })
      } catch (cfError) {
        console.warn('Error creating cash flow entry:', cfError)
        // Don't block sale if cash flow entry fails
      }

      // Log activity
      await activityLogger.logSale(savedSale.id, saleData.invoiceNo, saleData.total, {
        itemsCount: saleItems.length,
        customerId: saleData.customerId
      })

      setLastSale(savedSale)
      setShowReceiptPreview(true)
      
      // Reset form
      handleNewSale()
      
      // Avoid blocking modal alerts that can interfere with focus in Electron
      console.log('Sale saved successfully!')
    } catch (error) {
      console.error('Error saving sale:', error)
      alert('Error saving sale: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentComplete = (paymentData) => {
    setCurrentSale(prev => ({
      ...prev,
      ...paymentData
    }))
    setShowPaymentModal(false)
    handleSaveSale()
  }

  const handleNewSale = () => {
    setSaleItems([])
    setCurrentSale({
      invoiceNo: generateInvoiceNumber(),
      customerId: null,
      customer: null,
      subtotal: 0,
      tax: 0,
      taxRate: 10,
      discount: 0,
      discountType: 'percentage',
      discountValue: 0,
      total: 0,
      paymentMethod: 'cash',
      cashReceived: 0,
      change: 0,
      date: new Date().toISOString(),
      userId: 'current-user'
    })
    setBarcodeInput('')
    setSearchQuery('')
    setSearchResults([])
    barcodeInputRef.current?.focus()
  }

  const handlePrint = () => {
    if (lastSale) {
      setShowReceiptPreview(true)
    } else {
      alert('No recent sale to print')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-600 dark:text-gray-400">Process sales and manage transactions</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleNewSale}>
            <Plus className="h-4 w-4 mr-2" />
            New Sale
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Last Receipt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Barcode Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scan className="h-5 w-5 mr-2" />
                Barcode Scanner
              </CardTitle>
              <CardDescription>Scan or enter product barcode</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="space-y-2">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan barcode or enter manually..."
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value)
                        // Clear error when user starts typing
                        if (barcodeError) setBarcodeError('')
                      }}
                      className={`barcode-input w-full ${barcodeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    />
                  </div>
                  <Button type="submit">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {barcodeError && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1 flex-shrink-0" />
                      {barcodeError}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500">Press F2 to focus barcode input</p>
              </form>
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Product Search
              </CardTitle>
              <CardDescription>Search products by name or code</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleProductSearch(e.target.value)
                }}
              />
              
              {searchResults.length > 0 && (
                <div className="mt-3 max-h-60 overflow-y-auto border rounded-lg">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => addItemToSale(product)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">Code: {product.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(product.sellPrice)}</p>
                          <p className="text-sm text-gray-500">Stock: {product.qty}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sale Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Sale Items ({saleItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {saleItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No items added to sale</p>
                  <p className="text-sm">Scan a barcode or search for products to add items</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {saleItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">Code: {item.code}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateItemQuantity(index, item.quantity - 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                          min="1"
                        />
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateItemQuantity(index, item.quantity + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="w-24">
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                          className="text-right"
                          step="0.01"
                        />
                      </div>
                      
                      <div className="w-24 text-right font-semibold">
                        {formatCurrency(item.total)}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sale Summary */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                value={currentSale.customerId || ''}
                onChange={(e) => {
                  const selectedValue = e.target.value
                  if (selectedValue === '') {
                    handleCustomerSelect(null)
                  } else {
                    // Convert to number to match Dexie auto-increment ID
                    const customerId = Number(selectedValue)
                    const customer = customers.find(c => c.id === customerId)
                    handleCustomerSelect(customer || null)
                  }
                }}
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Discount */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2" />
                Discount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Discount value"
                  value={currentSale.discountValue}
                  onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0, currentSale.discountType)}
                  step="0.01"
                />
                <select
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={currentSale.discountType}
                  onChange={(e) => handleDiscountChange(currentSale.discountValue, e.target.value)}
                >
                  <option value="percentage">%</option>
                  <option value="amount">$</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Sale Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Sale Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(currentSale.subtotal)}</span>
              </div>
              
              {currentSale.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(currentSale.discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Tax ({currentSale.taxRate}%):</span>
                <span>{formatCurrency(currentSale.tax)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(currentSale.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowPaymentModal(true)}
              disabled={saleItems.length === 0 || loading}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Process Payment (F4)
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSaveSale}
              disabled={saleItems.length === 0 || loading}
            >
              <Save className="h-5 w-5 mr-2" />
              Save Sale (Ctrl+S)
            </Button>
          </div>

          {/* Invoice Info */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="font-mono font-bold">{currentSale.invoiceNo}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          saleData={currentSale}
          onComplete={handlePaymentComplete}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && lastSale && (
        <ReceiptPreview
          saleData={lastSale}
          onClose={() => {
            setShowReceiptPreview(false)
            // Restore typing focus after closing preview
            setTimeout(() => barcodeInputRef.current?.focus(), 0)
          }}
        />
      )}
    </div>
  )
}

export default Sales
