import React, { useState, useEffect, useRef } from 'react'
import { generateId, generateBarcode } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X, Save, Package, Scan } from 'lucide-react'

const ProductForm = ({ product, suppliers, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    supplier: '',
    costPrice: '',
    sellPrice: '',
    qty: '',
    reorderLevel: '',
    barcode: '',
    expiry: '',
    description: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const barcodeInputRef = useRef(null)
  const scanTimeoutRef = useRef(null)

  // Handle barcode scanner input (barcode scanners typically send data as keyboard input)
  useEffect(() => {
    const handleBarcodeScan = (e) => {
      // Barcode scanners typically send data very quickly
      // Clear any existing timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }

      // If barcode input is focused, capture the scanned value
      if (document.activeElement === barcodeInputRef.current) {
        scanTimeoutRef.current = setTimeout(() => {
          // The value is already in the input field, just ensure it's captured
          if (barcodeInputRef.current && barcodeInputRef.current.value) {
            setFormData(prev => ({
              ...prev,
              barcode: barcodeInputRef.current.value.trim()
            }))
          }
        }, 100)
      }
    }

    // Listen for keyboard input (barcode scanners act as keyboard devices)
    window.addEventListener('keypress', handleBarcodeScan)
    
    return () => {
      window.removeEventListener('keypress', handleBarcodeScan)
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
    }
  }, [])

  // Handle paste events (some scanners paste barcode data)
  const handleBarcodePaste = (e) => {
    const pastedData = e.clipboardData.getData('text')
    if (pastedData && pastedData.trim()) {
      e.preventDefault()
      setFormData(prev => ({
        ...prev,
        barcode: pastedData.trim()
      }))
    }
  }

  useEffect(() => {
    if (product) {
      setFormData({
        code: product.code || '',
        name: product.name || '',
        category: product.category || '',
        supplier: product.supplier || '',
        costPrice: product.costPrice || '',
        sellPrice: product.sellPrice || '',
        qty: product.qty || '',
        reorderLevel: product.reorderLevel || '',
        barcode: product.barcode || '',
        expiry: product.expiry || '',
        description: product.description || ''
      })
    } else {
      // Generate defaults for new product
      setFormData(prev => ({
        ...prev,
        code: generateId('ITEM'),
        barcode: generateBarcode()
      }))
    }
  }, [product])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Product code is required'
    }

    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      newErrors.sellPrice = 'Valid sell price is required'
    }

    if (formData.costPrice && parseFloat(formData.costPrice) < 0) {
      newErrors.costPrice = 'Cost price cannot be negative'
    }

    if (formData.qty && parseInt(formData.qty) < 0) {
      newErrors.qty = 'Quantity cannot be negative'
    }

    if (formData.reorderLevel && parseInt(formData.reorderLevel) < 0) {
      newErrors.reorderLevel = 'Reorder level cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent duplicate submissions
    if (loading) {
      return
    }
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const productData = {
        ...formData,
        costPrice: parseFloat(formData.costPrice) || 0,
        sellPrice: parseFloat(formData.sellPrice) || 0,
        qty: parseInt(formData.qty) || 0,
        reorderLevel: parseInt(formData.reorderLevel) || 0
      }

      await onSave(productData)
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateBarcode = () => {
    setFormData(prev => ({
      ...prev,
      barcode: generateBarcode()
    }))
  }

  const handleGenerateCode = () => {
    setFormData(prev => ({
      ...prev,
      code: generateId('ITEM')
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            {product ? 'Edit Product' : 'Add New Product'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="form-section-title">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      placeholder="Enter product code"
                      className={errors.code ? 'border-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateCode}
                    >
                      Generate
                    </Button>
                  </div>
                  {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
                  <div className="flex space-x-2">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Or enter new"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Supplier</label>
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows="3"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="form-section">
              <h3 className="form-section-title">Pricing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cost Price</label>
                  <Input
                    name="costPrice"
                    type="number"
                    value={formData.costPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.costPrice ? 'border-red-500' : ''}
                  />
                  {errors.costPrice && <p className="text-red-500 text-sm mt-1">{errors.costPrice}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Sell Price <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="sellPrice"
                    type="number"
                    value={formData.sellPrice}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={errors.sellPrice ? 'border-red-500' : ''}
                  />
                  {errors.sellPrice && <p className="text-red-500 text-sm mt-1">{errors.sellPrice}</p>}
                </div>
              </div>

              {formData.costPrice && formData.sellPrice && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Profit Margin:</strong> {' '}
                    {((parseFloat(formData.sellPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.sellPrice) * 100).toFixed(2)}%
                  </p>
                </div>
              )}
            </div>

            {/* Inventory */}
            <div className="form-section">
              <h3 className="form-section-title">Inventory</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Current Quantity</label>
                  <Input
                    name="qty"
                    type="number"
                    value={formData.qty}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className={errors.qty ? 'border-red-500' : ''}
                  />
                  {errors.qty && <p className="text-red-500 text-sm mt-1">{errors.qty}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reorder Level</label>
                  <Input
                    name="reorderLevel"
                    type="number"
                    value={formData.reorderLevel}
                    onChange={handleInputChange}
                    placeholder="10"
                    min="0"
                    className={errors.reorderLevel ? 'border-red-500' : ''}
                  />
                  {errors.reorderLevel && <p className="text-red-500 text-sm mt-1">{errors.reorderLevel}</p>}
                  <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Barcode</label>
                  <div className="flex space-x-2">
                    <Input
                      ref={barcodeInputRef}
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      onPaste={handleBarcodePaste}
                      onFocus={() => {
                        // Auto-select all text when focused to allow easy scanning
                        if (barcodeInputRef.current) {
                          barcodeInputRef.current.select()
                        }
                      }}
                      placeholder="Type barcode or scan with scanner"
                      autoComplete="off"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateBarcode}
                      title="Generate random barcode"
                    >
                      Generate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (barcodeInputRef.current) {
                          barcodeInputRef.current.focus()
                          barcodeInputRef.current.select()
                        }
                      }}
                      title="Click to scan barcode (focuses input field)"
                    >
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Click the scan icon, then scan with your barcode scanner. The input field will auto-capture scanned codes.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Expiry Date</label>
                  <Input
                    name="expiry"
                    type="date"
                    value={formData.expiry}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {product ? 'Update Product' : 'Save Product'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductForm
