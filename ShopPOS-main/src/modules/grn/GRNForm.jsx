import React, { useState, useEffect } from 'react'
import { generateId } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X, Save, Plus, Trash2, Package } from 'lucide-react'

const GRNForm = ({ grn, suppliers, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    grnNumber: '',
    supplierId: '',
    supplierName: '',
    supplierContact: '',
    poNumber: '',
    expectedDate: '',
    notes: '',
    status: 'pending',
    items: []
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (grn) {
      setFormData({
        grnNumber: grn.grnNumber || '',
        supplierId: grn.supplierId || '',
        supplierName: grn.supplierName || '',
        supplierContact: grn.supplierContact || '',
        poNumber: grn.poNumber || '',
        expectedDate: grn.expectedDate || '',
        notes: grn.notes || '',
        status: grn.status || 'pending',
        items: grn.items || []
      })
    } else {
      setFormData(prev => ({
        ...prev,
        grnNumber: generateId('GRN'),
        expectedDate: new Date().toISOString().split('T')[0]
      }))
    }
  }, [grn])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value
    const supplier = suppliers.find(s => s.id === supplierId)
    
    setFormData(prev => ({
      ...prev,
      supplierId,
      supplierName: supplier?.name || '',
      supplierContact: supplier?.phone || supplier?.email || ''
    }))
  }

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      productCode: '',
      productName: '',
      expectedQty: 0,
      receivedQty: 0,
      unitPrice: 0,
      totalPrice: 0
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const updateItem = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value }
          
          // Calculate total price when quantity or unit price changes
          if (field === 'expectedQty' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.expectedQty * updatedItem.unitPrice
          }
          
          return updatedItem
        }
        return item
      })
    }))
  }

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.grnNumber.trim()) {
      newErrors.grnNumber = 'GRN number is required'
    }

    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required'
    }

    if (!formData.expectedDate) {
      newErrors.expectedDate = 'Expected date is required'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required'
    }

    // Validate items
    const itemErrors = formData.items.some(item => 
      !item.productCode || !item.productName || item.expectedQty <= 0 || item.unitPrice <= 0
    )
    
    if (itemErrors) {
      newErrors.items = 'All items must have valid product details, quantities, and prices'
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
      const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)
      
      const grnData = {
        ...formData,
        totalAmount,
        updatedAt: new Date().toISOString()
      }

      await onSave(grnData)
    } catch (error) {
      console.error('Error saving GRN:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            {grn ? 'Edit GRN' : 'Create New GRN'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  GRN Number <span className="text-red-500">*</span>
                </label>
                <Input
                  name="grnNumber"
                  value={formData.grnNumber}
                  onChange={handleInputChange}
                  placeholder="Enter GRN number"
                  className={errors.grnNumber ? 'border-red-500' : ''}
                />
                {errors.grnNumber && <p className="text-red-500 text-sm mt-1">{errors.grnNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleSupplierChange}
                  className={`w-full p-2 border ${errors.supplierId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
                {errors.supplierId && <p className="text-red-500 text-sm mt-1">{errors.supplierId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">PO Number</label>
                <Input
                  name="poNumber"
                  value={formData.poNumber}
                  onChange={handleInputChange}
                  placeholder="Enter PO number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expected Date <span className="text-red-500">*</span>
                </label>
                <Input
                  name="expectedDate"
                  type="date"
                  value={formData.expectedDate}
                  onChange={handleInputChange}
                  className={errors.expectedDate ? 'border-red-500' : ''}
                />
                {errors.expectedDate && <p className="text-red-500 text-sm mt-1">{errors.expectedDate}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter any notes or comments"
                rows="3"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" onClick={addItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {errors.items && <p className="text-red-500 text-sm mb-4">{errors.items}</p>}

              {formData.items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-500">No items added yet</p>
                  <Button type="button" onClick={addItem} className="mt-3">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Product Code</label>
                          <Input
                            value={item.productCode}
                            onChange={(e) => updateItem(item.id, 'productCode', e.target.value)}
                            placeholder="Product code"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Product Name</label>
                          <Input
                            value={item.productName}
                            onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                            placeholder="Product name"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Expected Qty</label>
                          <Input
                            type="number"
                            value={item.expectedQty}
                            onChange={(e) => updateItem(item.id, 'expectedQty', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            min="1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Unit Price</label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Total Price</label>
                          <Input
                            value={item.totalPrice.toFixed(2)}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Summary */}
            {formData.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    Rs.{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

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
                    {grn ? 'Update GRN' : 'Create GRN'}
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

export default GRNForm
