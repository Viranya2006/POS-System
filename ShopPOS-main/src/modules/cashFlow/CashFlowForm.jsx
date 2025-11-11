import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X } from 'lucide-react'

const CashFlowForm = ({ transaction, onClose = () => {} }) => {
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    referenceId: '',
    referenceType: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type || 'income',
        category: transaction.category || '',
        amount: transaction.amount || '',
        description: transaction.description || '',
        date: transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
        referenceId: transaction.referenceId || '',
        referenceType: transaction.referenceType || ''
      })
    }
  }, [transaction])

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent duplicate submissions
    if (loading) {
      return
    }
    
    if (!formData.category || !formData.amount || !formData.date) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const transactionData = {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: new Date(formData.date).toISOString(),
        referenceId: formData.referenceId || null,
        referenceType: formData.referenceType || null,
        userId: 'current-user' // This should come from auth context
      }

      if (transaction && transaction.id) {
        await dbService.update('cashFlow', transaction.id, transactionData)
      } else {
        await dbService.create('cashFlow', transactionData)
      }

      // Call onClose - it accepts optional shouldReload parameter
      if (typeof onClose === 'function') {
        onClose(true) // Pass true to reload data
      } else {
        onClose?.() // Fallback if not a function
      }
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert('Error saving transaction: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const incomeCategories = [
    'Sales Revenue',
    'Other Income',
    'Investment',
    'Refund',
    'Commission'
  ]

  const expenseCategories = [
    'Purchase Cost',
    'Salary',
    'Rent',
    'Utilities',
    'Transport',
    'Marketing',
    'Repair & Maintenance',
    'Other Expense'
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</CardTitle>
            <CardDescription>Record income or expense</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              >
                <option value="">Select category</option>
                {(formData.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Amount *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Transaction description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Date *</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Reference Type</label>
              <select
                value={formData.referenceType}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceType: e.target.value }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">None</option>
                <option value="sale">Sale/Invoice</option>
                <option value="grn">GRN</option>
                <option value="job">Job Note</option>
              </select>
            </div>

            {formData.referenceType && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Reference ID</label>
                <Input
                  value={formData.referenceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
                  placeholder="Invoice No, GRN No, etc."
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : transaction ? 'Update' : 'Add'} Transaction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default CashFlowForm

