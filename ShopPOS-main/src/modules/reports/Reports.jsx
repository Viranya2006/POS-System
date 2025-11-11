import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate, exportToCSV } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  Download,
  Filter,
  Eye,
  FileText,
  PieChart,
  Activity
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import SalesChart from './SalesChart'
import TopProductsChart from './TopProductsChart'
import CustomerAnalytics from './CustomerAnalytics'
import ProfitLoss from './ProfitLoss'

const Reports = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [reportData, setReportData] = useState({
    sales: [],
    customers: [],
    inventory: [],
    jobs: [],
    warranties: []
  })
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalSales: 0,
    totalCustomers: 0,
    totalProducts: 0,
    avgOrderValue: 0,
    topSellingProducts: [],
    revenueGrowth: 0,
    salesGrowth: 0,
    customerGrowth: 0,
    lowStockProducts: [],
    recentTransactions: []
  })

  useEffect(() => {
    loadReportData()
  }, [dateRange.startDate, dateRange.endDate])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      // Load all data
      const [sales, customers, inventory, jobs, warranties] = await Promise.all([
        dbService.readAll('sales'),
        dbService.readAll('customers'),
        dbService.readAll('inventory'),
        dbService.readAll('jobNotes'),
        dbService.readAll('warranty')
      ])

      setReportData({ sales, customers, inventory, jobs, warranties })
      
      // Calculate analytics with current dateRange
      calculateAnalytics({ sales, customers, inventory, jobs, warranties }, dateRange)
      
    } catch (error) {
      console.error('Error loading report data:', error)
      alert('Error loading report data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (data, currentDateRange) => {
    const { sales, customers, inventory } = data
    const range = currentDateRange || dateRange
    const startDate = new Date(range.startDate)
    const endDate = new Date(range.endDate)
    
    // Normalize dates for comparison
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    
    // Filter sales by date range
    const filteredSales = sales.filter(sale => {
      if (!sale.date) return false
      const saleDate = new Date(sale.date)
      saleDate.setHours(0, 0, 0, 0)
      return saleDate >= startDate && saleDate <= endDate
    })

    // Basic metrics
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const totalSales = filteredSales.length
    const totalCustomers = customers.length
    const totalProducts = inventory.length
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

    // Product analytics
    const productSales = {}
    filteredSales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (item && item.name) {
            const quantity = item.quantity || 0
            if (productSales[item.name]) {
              productSales[item.name] += quantity
            } else {
              productSales[item.name] = quantity
            }
          }
        })
      }
    })

    const topSellingProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }))

    // Low stock products
    const lowStockProducts = inventory
      .filter(product => (product.qty || 0) <= (product.reorderLevel || 10))
      .sort((a, b) => (a.qty || 0) - (b.qty || 0))
      .slice(0, 10)

    // Growth calculations (compare with previous period)
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const previousEndDate = new Date(startDate.getTime() - 1)

    const previousSales = sales.filter(sale => {
      if (!sale.date) return false
      const saleDate = new Date(sale.date)
      return saleDate >= previousStartDate && saleDate <= previousEndDate
    })

    const previousRevenue = previousSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const previousSalesCount = previousSales.length

    const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const salesGrowth = previousSalesCount > 0 ? ((totalSales - previousSalesCount) / previousSalesCount) * 100 : 0

    // Recent transactions
    const recentTransactions = filteredSales
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)

    setAnalytics({
      totalRevenue,
      totalSales,
      totalCustomers,
      totalProducts,
      avgOrderValue,
      topSellingProducts,
      revenueGrowth,
      salesGrowth,
      customerGrowth: 0, // Would need historical customer data
      lowStockProducts,
      recentTransactions
    })
  }

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleExportReport = (reportType) => {
    let exportData = []
    let filename = ''

    switch (reportType) {
      case 'sales':
        exportData = reportData.sales.map(sale => ({
          'Invoice No': sale.invoiceNo || '',
          'Date': formatDate(sale.date, 'short'),
          'Customer': sale.customerName || sale.customer?.name || 'Walk-in',
          'Items': sale.items?.length || 0,
          'Subtotal': sale.subtotal || 0,
          'Tax': sale.tax || 0,
          'Discount': sale.discount || 0,
          'Total': sale.total || 0,
          'Payment Method': sale.paymentMethod || 'cash'
        }))
        filename = `sales_report_${dateRange.startDate}_to_${dateRange.endDate}`
        break
      case 'inventory':
        exportData = reportData.inventory.map(product => ({
          'Product Code': product.code || '',
          'Name': product.name || '',
          'Category': product.category || '',
          'Quantity': product.qty || 0,
          'Min Stock': product.reorderLevel || 0,
          'Cost Price': product.costPrice || 0,
          'Selling Price': product.sellPrice || 0,
          'Status': (product.qty || 0) <= (product.reorderLevel || 10) ? 'Low Stock' : 'In Stock'
        }))
        filename = `inventory_report_${new Date().toISOString().split('T')[0]}`
        break
      case 'customers':
        exportData = reportData.customers.map(customer => ({
          'Customer ID': customer.customerId,
          'Name': customer.name,
          'Email': customer.email || '',
          'Phone': customer.phone || '',
          'Type': customer.type || 'regular',
          'Total Spent': customer.totalSpent || 0,
          'Total Orders': customer.totalOrders || 0,
          'Created Date': formatDate(customer.createdAt, 'short')
        }))
        filename = `customers_report_${new Date().toISOString().split('T')[0]}`
        break
    }

    exportToCSV(exportData, filename)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Business insights and performance metrics</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => handleExportReport('sales')}>
            <Download className="h-4 w-4 mr-2" />
            Export Sales
          </Button>
          <Button variant="outline" onClick={() => handleExportReport('inventory')}>
            <Download className="h-4 w-4 mr-2" />
            Export Inventory
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Start Date</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">End Date</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadReportData} className="w-full">
                <Activity className="h-4 w-4 mr-2" />
                Update Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different report types */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profit-loss" className="space-y-6">
          <ProfitLoss dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.totalRevenue)}</p>
                <div className="flex items-center mt-1">
                  {analytics.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${analytics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.revenueGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalSales}</p>
                <div className="flex items-center mt-1">
                  {analytics.salesGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${analytics.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(analytics.salesGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(analytics.avgOrderValue)}</p>
                <p className="text-sm text-gray-500 mt-1">Per transaction</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalCustomers}</p>
                <p className="text-sm text-gray-500 mt-1">Registered</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
            </CardContent>
          </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart 
          salesData={reportData.sales} 
          dateRange={dateRange}
        />
        <TopProductsChart 
          topProducts={analytics.topSellingProducts}
        />
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>
              Products that need restocking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.lowStockProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">All products are well stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">Code: {product.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{product.qty || 0} left</p>
                      <p className="text-sm text-gray-500">Min: {product.reorderLevel || 10}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Latest sales activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">No transactions in selected period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">#{transaction.invoiceNo}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.date, 'short')} • {transaction.customerName || 'Walk-in'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(transaction.total)}</p>
                      <p className="text-sm text-gray-500 capitalize">{transaction.paymentMethod}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </div>

          {/* Customer Analytics */}
          <CustomerAnalytics 
            customers={reportData.customers}
            sales={reportData.sales}
          />

          {/* Export Section */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Reports
          </CardTitle>
          <CardDescription>
            Download detailed reports in CSV format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" onClick={() => handleExportReport('sales')} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Sales Report
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('inventory')} className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Inventory Report
            </Button>
            <Button variant="outline" onClick={() => handleExportReport('customers')} className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Customer Report
            </Button>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Reports
