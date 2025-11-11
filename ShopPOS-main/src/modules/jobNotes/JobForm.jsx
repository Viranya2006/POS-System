import React, { useState, useEffect } from 'react'
import { generateId } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X, Save, Wrench } from 'lucide-react'

const JobForm = ({ job, customers, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    jobNumber: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deviceType: '',
    deviceModel: '',
    deviceSerial: '',
    issue: '',
    diagnosis: '',
    solution: '',
    status: 'pending',
    priority: 'medium',
    estimatedCost: 0,
    actualCost: 0,
    laborCost: 0,
    partsCost: 0,
    totalCost: 0,
    estimatedDays: 1,
    notes: '',
    technicianNotes: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (job) {
      setFormData({
        jobNumber: job.jobNumber || '',
        customerId: job.customerId || '',
        customerName: job.customerName || '',
        customerPhone: job.customerPhone || '',
        customerEmail: job.customerEmail || '',
        deviceType: job.deviceType || '',
        deviceModel: job.deviceModel || '',
        deviceSerial: job.deviceSerial || '',
        issue: job.issue || '',
        diagnosis: job.diagnosis || '',
        solution: job.solution || '',
        status: job.status || 'pending',
        priority: job.priority || 'medium',
        estimatedCost: job.estimatedCost || 0,
        actualCost: job.actualCost || 0,
        laborCost: job.laborCost || 0,
        partsCost: job.partsCost || 0,
        totalCost: job.totalCost || 0,
        estimatedDays: job.estimatedDays || 1,
        notes: job.notes || '',
        technicianNotes: job.technicianNotes || ''
      })
    } else {
      setFormData(prev => ({
        ...prev,
        jobNumber: generateId('JOB')
      }))
    }
  }, [job])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Calculate total cost when cost fields change
    if (['laborCost', 'partsCost'].includes(name)) {
      const laborCost = name === 'laborCost' ? parseFloat(value) || 0 : prev.laborCost
      const partsCost = name === 'partsCost' ? parseFloat(value) || 0 : prev.partsCost
      setFormData(prev => ({
        ...prev,
        [name]: value,
        totalCost: laborCost + partsCost
      }))
    }
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
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

  const validateForm = () => {
    const newErrors = {}

    if (!formData.jobNumber.trim()) {
      newErrors.jobNumber = 'Job number is required'
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (!formData.deviceType.trim()) {
      newErrors.deviceType = 'Device type is required'
    }

    if (!formData.issue.trim()) {
      newErrors.issue = 'Issue description is required'
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
      const jobData = {
        ...formData,
        estimatedCost: parseFloat(formData.estimatedCost) || 0,
        actualCost: parseFloat(formData.actualCost) || 0,
        laborCost: parseFloat(formData.laborCost) || 0,
        partsCost: parseFloat(formData.partsCost) || 0,
        totalCost: parseFloat(formData.totalCost) || 0,
        estimatedDays: parseInt(formData.estimatedDays) || 1,
        updatedAt: new Date().toISOString()
      }

      await onSave(jobData)
    } catch (error) {
      console.error('Error saving job:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Wrench className="h-5 w-5 mr-2" />
            {job ? 'Edit Service Job' : 'Create New Service Job'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Information */}
            <div className="form-section">
              <h3 className="form-section-title">Job Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Job Number
                  </label>
                  <Input
                    name="jobNumber"
                    value={formData.jobNumber}
                    onChange={handleInputChange}
                    placeholder="Auto-generated"
                    disabled
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="waiting-parts">Waiting Parts</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
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

            {/* Device Information */}
            <div className="form-section">
              <h3 className="form-section-title">Device Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="deviceType"
                    value={formData.deviceType}
                    onChange={handleInputChange}
                    placeholder="e.g., Smartphone, Laptop, Tablet"
                    className={errors.deviceType ? 'border-red-500' : ''}
                  />
                  {errors.deviceType && <p className="text-red-500 text-sm mt-1">{errors.deviceType}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <Input
                    name="deviceModel"
                    value={formData.deviceModel}
                    onChange={handleInputChange}
                    placeholder="Device model"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Serial Number</label>
                  <Input
                    name="deviceSerial"
                    value={formData.deviceSerial}
                    onChange={handleInputChange}
                    placeholder="Serial number"
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="form-section">
              <h3 className="form-section-title">Service Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Issue Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="issue"
                    value={formData.issue}
                    onChange={handleInputChange}
                    placeholder="Describe the problem reported by customer"
                    rows="3"
                    className={`w-full p-2 border ${errors.issue ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
                  />
                  {errors.issue && <p className="text-red-500 text-sm mt-1">{errors.issue}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Diagnosis</label>
                  <textarea
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    placeholder="Technical diagnosis of the issue"
                    rows="3"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Solution</label>
                  <textarea
                    name="solution"
                    value={formData.solution}
                    onChange={handleInputChange}
                    placeholder="Solution or repair performed"
                    rows="3"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* Cost Information */}
            <div className="form-section">
              <h3 className="form-section-title">Cost Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Labor Cost</label>
                  <Input
                    name="laborCost"
                    type="number"
                    value={formData.laborCost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Parts Cost</label>
                  <Input
                    name="partsCost"
                    type="number"
                    value={formData.partsCost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Total Cost</label>
                  <Input
                    name="totalCost"
                    type="number"
                    value={formData.totalCost}
                    disabled
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Days</label>
                  <Input
                    name="estimatedDays"
                    type="number"
                    value={formData.estimatedDays}
                    onChange={handleInputChange}
                    placeholder="1"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <h3 className="form-section-title">Notes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Customer Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Notes visible to customer"
                    rows="4"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Technician Notes</label>
                  <textarea
                    name="technicianNotes"
                    value={formData.technicianNotes}
                    onChange={handleInputChange}
                    placeholder="Internal technician notes"
                    rows="4"
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
                    {job ? 'Update Job' : 'Create Job'}
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

export default JobForm
