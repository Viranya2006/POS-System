import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  Plus,
  BarChart3,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    todaysSales: 0,
    todaysProfit: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentSales: [],
    salesChart: [],
    topProducts: [],
    lowStockItems: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    
    // Refresh dashboard data every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Get all sales data for calculations
      const allSales = await dbService.readAll('sales')
      
      // Get today's sales
      const todaysSales = await dbService.getTodaysSales()
      const todaysSalesTotal = todaysSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
      
      // Get inventory data for profit calculation
      const inventory = await dbService.readAll('inventory')
      
      // Calculate real profit from actual cost data
      const todaysProfit = todaysSales.reduce((sum, sale) => {
        let saleProfit = 0
        sale.items?.forEach(item => {
          // Find product in inventory to get cost price
          const product = inventory.find(p => p.code === item.code || p.name === item.name)
          if (product && product.costPrice) {
            const itemCost = product.costPrice * (item.quantity || 0)
            const itemRevenue = (item.price || 0) * (item.quantity || 0)
            saleProfit += itemRevenue - itemCost
          }
        })
        return sum + saleProfit
      }, 0)

      const inventoryValue = inventory.reduce((sum, item) => sum + ((item.qty || 0) * (item.costPrice || 0)), 0)
      const lowStockItems = await dbService.getLowStockItems(10)

      // Get customers count
      const customers = await dbService.readAll('customers')

      // Generate real chart data from last 7 days sales
      const salesChart = generateSalesChartDataFromRealData(allSales, inventory)
      
      // Get real top products from actual sales data
      const topProducts = generateTopProductsFromSales(allSales, inventory)

      // Get recent sales (last 10, all time, not just today)
      const recentSales = allSales
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)

      setDashboardData({
        todaysSales: todaysSalesTotal,
        todaysProfit: todaysProfit,
        inventoryValue: inventoryValue,
        lowStockCount: lowStockItems.length,
        totalCustomers: customers.length,
        totalProducts: inventory.length,
        recentSales: recentSales,
        salesChart: salesChart,
        topProducts: topProducts,
        lowStockItems: lowStockItems.slice(0, 5) // Show only top 5
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSalesChartDataFromRealData = (allSales, inventory) => {
    const data = []
    const today = new Date()
    today.setHours(0, 0, 0, 0, 0)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      // Get sales for this date (check if sale date falls on this day)
      const daySales = allSales.filter(sale => {
        if (!sale.date) return false
        const saleDate = new Date(sale.date)
        saleDate.setHours(0, 0, 0, 0)
        return saleDate.getTime() === date.getTime()
      })
      
      const daySalesTotal = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0)
      
      // Calculate real profit for this day
      let dayProfit = 0
      daySales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            if (item && item.code) {
              const product = inventory.find(p => 
                p.code === item.code || 
                p.name === item.name ||
                (p.barcode && p.barcode === item.code)
              )
              if (product && product.costPrice !== undefined) {
                const itemCost = (product.costPrice || 0) * (item.quantity || 0)
                const itemRevenue = (item.price || 0) * (item.quantity || 0)
                dayProfit += itemRevenue - itemCost
              }
            }
          })
        }
      })
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sales: daySalesTotal,
        profit: dayProfit
      })
    }
    
    return data
  }

  const generateTopProductsFromSales = (allSales, inventory) => {
    // Calculate product sales from actual sales data
    const productStats = {}
    
    allSales.forEach(sale => {
      sale.items?.forEach(item => {
        const productName = item.name || 'Unknown'
        if (!productStats[productName]) {
          productStats[productName] = {
            name: productName,
            sales: 0,
            revenue: 0
          }
        }
        productStats[productName].sales += item.quantity || 0
        productStats[productName].revenue += (item.price || 0) * (item.quantity || 0)
      })
    })
    
    // Convert to array, sort by revenue, take top 5
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((product, index) => ({
        ...product,
        color: colors[index] || colors[0]
      }))
  }

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue' }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      red: 'from-red-500 to-red-600'
    }

    return (
      <Card className="dashboard-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              {trend && (
                <div className="flex items-center mt-2">
                  {trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ml-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trendValue}
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's what's happening in your store today.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link to="/sales">
              <Plus className="h-4 w-4 mr-2" />
              New Sale
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inventory">
              <Package className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(dashboardData.todaysSales)}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(dashboardData.todaysProfit)}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(dashboardData.inventoryValue)}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Low Stock Items"
          value={dashboardData.lowStockCount}
          icon={AlertTriangle}
          color={dashboardData.lowStockCount > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Sales Overview (Last 7 Days)
            </CardTitle>
            <CardDescription>Daily sales and profit trends</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.salesChart.length === 0 || dashboardData.salesChart.every(d => d.sales === 0 && d.profit === 0) ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">No sales data available for the last 7 days</p>
                <p className="text-sm text-gray-400 mt-1">Start making sales to see analytics</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.salesChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stackId="2"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Top Selling Products
            </CardTitle>
            <CardDescription>Best performing products this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: product.color }}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.sales} units sold</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Recent Sales
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/reports">View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recentSales.length > 0 ? (
                dashboardData.recentSales.map((sale, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Invoice #{sale.invoiceNo}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(sale.date, 'time')}
                      </p>
                    </div>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(sale.total)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No sales recorded today</p>
                  <Button className="mt-3" asChild>
                    <Link to="/sales">Make First Sale</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Low Stock Alerts
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/inventory">Manage Stock</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.lowStockItems.length > 0 ? (
                dashboardData.lowStockItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Code: {item.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600">
                        {item.qty} left
                      </p>
                      <p className="text-xs text-gray-500">
                        Min: {item.reorderLevel}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>All products are well stocked</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-blue-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {dashboardData.totalCustomers}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-8 w-8 mx-auto mb-3 text-green-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {dashboardData.totalProducts}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Products in Stock</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-3 text-purple-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatDate(new Date(), 'short')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Today's Date</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
