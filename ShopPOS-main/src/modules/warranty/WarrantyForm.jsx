import React, { useState, useEffect } from 'react'
import { generateId } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X, Save, Shield } from 'lucide-react'

const WarrantyForm = ({ warranty, customers, products, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    warrantyNumber: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    productId: '',
    productName: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyType: 'manufacturer',
    duration: 12,
    durationType: 'months',
    startDate: '',
    expiryDate: '',
    status: 'active',
    claimDescription: '',
    claimAmount: 0,
    notes: '',
    terms: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (warranty) {
      setFormData({
        warrantyNumber: warranty.warrantyNumber || '',
        customerId: warranty.customerId || '',
        customerName: warranty.customerName || '',
        customerPhone: warranty.customerPhone || '',
        customerEmail: warranty.customerEmail || '',
        productId: warranty.productId || '',
        productName: warranty.productName || '',
        serialNumber: warranty.serialNumber || '',
        purchaseDate: warranty.purchaseDate || '',
        warrantyType: warranty.warrantyType || 'manufacturer',
        duration: warranty.duration || 12,
        durationType: warranty.durationType || 'months',
        startDate: warranty.startDate || '',
        expiryDate: warranty.expiryDate || '',
        status: warranty.status || 'active',
        claimDescription: warranty.claimDescription || '',
        claimAmount: warranty.claimAmount || 0,
        notes: warranty.notes || '',
        terms: warranty.terms || ''
      })
    } else {
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({
        ...prev,
        warrantyNumber: generateId('WRN'),
        purchaseDate: today,
        startDate: today
      }))
    }
  }, [warranty])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Calculate expiry date when duration or start date changes
    if (name === 'duration' || name === 'durationType' || name === 'startDate') {
      calculateExpiryDate(
        name === 'startDate' ? value : formData.startDate,
        name === 'duration' ? parseInt(value) : formData.duration,
        name === 'durationType' ? value : formData.durationType
      )
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const calculateExpiryDate = (startDate, duration, durationType) => {
    if (!startDate || !duration) return

    const start = new Date(startDate)
    let expiry = new Date(start)

    switch (durationType) {
      case 'days':
        expiry.setDate(start.getDate() + duration)
        break
      case 'months':
        expiry.setMonth(start.getMonth() + duration)
        break
      case 'years':
        expiry.setFullYear(start.getFullYear() + duration)
        break
    }

    setFormData(prev => ({
      ...prev,
      expiryDate: expiry.toISOString().split('T')[0]
    }))
  }

  const handleCustomerChange = (e) => {
    const customerId = e.target.value
    const customer = customers.find(c => c.id === customerId)
    
    setFormData(prev => ({
      ...prev,
      customerId,
      customerName: customer?.name || '',
      customerPhone: customer?.phone || '',
      customerEmail: customer?.email || ''
    }))
  }

  const handleProductChange = (e) => {
    const productId = e.target.value
    const product = products.find(p => p.id === productId)
    
    setFormData(prev => ({
      ...prev,
      productId,
      productName: product?.name || ''
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.warrantyNumber.trim()) {
      newErrors.warrantyNumber = 'Warranty number is required'
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required'
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Warranty start date is required'
    }

    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Valid warranty duration is required'
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
      const warrantyData = {
        ...formData,
        duration: parseInt(formData.duration) || 0,
        claimAmount: parseFloat(formData.claimAmount) || 0,
        updatedAt: new Date().toISOString()
      }

      await onSave(warrantyData)
    } catch (error) {
      console.error('Error saving warranty:', error)
      alert('Error saving warranty: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            {warranty ? 'Edit Warranty' : 'Create New Warranty'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Warranty Information */}
            <div className="form-section">
              <h3 className="form-section-title">Warranty Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Warranty Number
                  </label>
                  <Input
                    name="warrantyNumber"
                    value={formData.warrantyNumber}
                    onChange={handleInputChange}
                    placeholder="Auto-generated"
                    disabled
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Warranty Type</label>
                  <select
                    name="warrantyType"
                    value={formData.warrantyType}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="manufacturer">Manufacturer</option>
                    <option value="extended">Extended</option>
                    <option value="service">Service</option>
                    <option value="replacement">Replacement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="active">Active</option>
                    <option value="claimed">Claimed</option>
                    <option value="processing">Processing</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="form-section">
              <h3 className="form-section-title">Customer Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Customer</label>
                  <select
                    name="customerId"
                    value={formData.customerId}
                    onChange={handleCustomerChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="">Select existing customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    placeholder="Enter customer name"
                    className={errors.customerName ? 'border-red-500' : ''}
                  />
                  {errors.customerName && <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    placeholder="Customer phone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    placeholder="Customer email"
                  />
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="form-section">
              <h3 className="form-section-title">Product Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Product</label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleProductChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="">Select product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    className={errors.productName ? 'border-red-500' : ''}
                  />
                  {errors.productName && <p className="text-red-500 text-sm mt-1">{errors.productName}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Serial Number</label>
                  <Input
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleInputChange}
                    placeholder="Product serial number"
                  />
                </div>
              </div>
            </div>

            {/* Warranty Period */}
            <div className="form-section">
              <h3 className="form-section-title">Warranty Period</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Purchase Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                    className={errors.purchaseDate ? 'border-red-500' : ''}
                  />
                  {errors.purchaseDate && <p className="text-red-500 text-sm mt-1">{errors.purchaseDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={errors.startDate ? 'border-red-500' : ''}
                  />
                  {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="12"
                      min="1"
                      className={errors.duration ? 'border-red-500' : ''}
                    />
                    <select
                      name="durationType"
                      value={formData.durationType}
                      onChange={handleInputChange}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  {errors.duration && <p className="text-red-500 text-sm mt-1">{errors.duration}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Expiry Date</label>
                  <Input
                    name="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Claim Information */}
            {(formData.status === 'claimed' || formData.status === 'processing' || formData.status === 'approved' || formData.status === 'completed') && (
              <div className="form-section">
                <h3 className="form-section-title">Claim Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Claim Description</label>
                    <textarea
                      name="claimDescription"
                      value={formData.claimDescription}
                      onChange={handleInputChange}
                      placeholder="Describe the warranty claim"
                      rows="3"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Claim Amount</label>
                      <Input
                        name="claimAmount"
                        type="number"
                        value={formData.claimAmount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div className="form-section">
              <h3 className="form-section-title">Additional Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Warranty Terms</label>
                  <textarea
                    name="terms"
                    value={formData.terms}
                    onChange={handleInputChange}
                    placeholder="Warranty terms and conditions"
                    rows="3"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes"
                    rows="3"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
                    {warranty ? 'Update Warranty' : 'Create Warranty'}
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

export default WarrantyForm
