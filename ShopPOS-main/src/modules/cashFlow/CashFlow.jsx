import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate, generateId } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ShoppingCart
} from 'lucide-react'
import CashFlowForm from './CashFlowForm'

const CashFlow = () => {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [showForm, setShowForm] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0
  })

  useEffect(() => {
    loadCashFlowData()
  }, [])

  useEffect(() => {
    filterTransactions()
    calculateSummary()
  }, [transactions, searchQuery, typeFilter, dateRange])

  const loadCashFlowData = async () => {
    try {
      setLoading(true)
      const data = await dbService.readAll('cashFlow')
      
      // Deduplicate transactions - remove duplicates by id, referenceId+type+date, or description+amount+date
      const seen = new Set()
      const uniqueTransactions = data.filter(transaction => {
        const id = transaction.id
        const referenceId = transaction.referenceId?.trim()
        const type = transaction.type
        const date = transaction.date
        const description = transaction.description?.trim().toLowerCase()
        const amount = transaction.amount
        
        // Check if we've seen this transaction before
        if (id && seen.has(`id:${id}`)) return false
        if (referenceId && type && date && seen.has(`ref:${referenceId}:${type}:${date}`)) return false
        if (description && amount && date && seen.has(`desc:${description}:${amount}:${date}`)) return false
        
        // Add to seen set
        if (id) seen.add(`id:${id}`)
        if (referenceId && type && date) seen.add(`ref:${referenceId}:${type}:${date}`)
        if (description && amount && date) seen.add(`desc:${description}:${amount}:${date}`)
        
        return true
      })
      
      setTransactions(uniqueTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (error) {
      console.error('Error loading cash flow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = [...transactions]

    // Date range filter
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    endDate.setHours(23, 59, 59, 999)

    filtered = filtered.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return transactionDate >= startDate && transactionDate <= endDate
    })

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === typeFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(transaction =>
        transaction.description?.toLowerCase().includes(query) ||
        transaction.category?.toLowerCase().includes(query) ||
        transaction.referenceId?.toLowerCase().includes(query)
      )
    }

    setFilteredTransactions(filtered)
  }

  const calculateSummary = () => {
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      netCashFlow: 0
    }

    filteredTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        summary.totalIncome += transaction.amount || 0
      } else if (transaction.type === 'expense') {
        summary.totalExpense += transaction.amount || 0
      }
    })

    summary.netCashFlow = summary.totalIncome - summary.totalExpense
    setSummary(summary)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await dbService.delete('cashFlow', id)
        await loadCashFlowData()
      } catch (error) {
        console.error('Error deleting transaction:', error)
        alert('Error deleting transaction')
      }
    }
  }

  const handleExport = () => {
    const csv = [
      ['Type', 'Category', 'Amount', 'Description', 'Date', 'Reference'].join(','),
      ...filteredTransactions.map(t => [
        t.type,
        t.category || '',
        t.amount || 0,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        formatDate(t.date, 'short'),
        t.referenceId || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cashflow_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFormClose = (shouldReload = true) => {
    setShowForm(false)
    setSelectedTransaction(null)
    if (shouldReload) {
      loadCashFlowData()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cash Flow</h1>
          <p className="text-gray-600 dark:text-gray-400">Track income and expenses</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expense</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpense)}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netCashFlow)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${summary.netCashFlow >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {summary.netCashFlow >= 0 ? (
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
              <Input
                type="date"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Date</label>
              <Input
                type="date"
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
            <CardDescription>Income and expense records</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">No transactions found</p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Transaction
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {transaction.description || transaction.category}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{transaction.category}</span>
                        <span>•</span>
                        <span>{formatDate(transaction.date, 'short')}</span>
                        {transaction.referenceId && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              {transaction.referenceType === 'sale' && <Receipt className="h-3 w-3 mr-1" />}
                              {transaction.referenceType === 'grn' && <ShoppingCart className="h-3 w-3 mr-1" />}
                              {transaction.referenceId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className={`text-lg font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(transaction)
                        setShowForm(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <CashFlowForm
          transaction={selectedTransaction}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}

export default CashFlow

