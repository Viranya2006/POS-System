import React from 'react'
import { formatCurrency } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Users, Star, TrendingUp, Award } from 'lucide-react'

const CustomerAnalytics = ({ customers = [], sales = [] }) => {
  // Calculate customer analytics
  const calculateCustomerMetrics = () => {
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return {
        customerTypes: {},
        topCustomers: [],
        segments: { high: 0, medium: 0, low: 0 }
      }
    }
    
    // Customer type distribution
    const customerTypes = customers.reduce((acc, customer) => {
      const type = customer.type || 'regular'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    // Top customers by spending
    const validSales = sales && Array.isArray(sales) ? sales : []
    const customerSpending = customers
      .map(customer => {
        const customerSales = validSales.filter(sale => 
          sale.customerId === customer.id || 
          sale.customerId === customer.customerId ||
          sale.customerId?.toString() === customer.id?.toString()
        )
        const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
        const totalOrders = customerSales.length
        
        return {
          ...customer,
          totalSpent,
          totalOrders,
          avgOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0
        }
      })
      .filter(customer => customer.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)

    // Customer segments
    const segments = {
      high: customerSpending.filter(c => c.totalSpent >= 1000).length,
      medium: customerSpending.filter(c => c.totalSpent >= 500 && c.totalSpent < 1000).length,
      low: customerSpending.filter(c => c.totalSpent > 0 && c.totalSpent < 500).length
    }

    return {
      customerTypes,
      topCustomers: customerSpending,
      segments
    }
  }

  const metrics = calculateCustomerMetrics()

  const typeColors = {
    vip: 'bg-purple-500',
    premium: 'bg-blue-500',
    regular: 'bg-green-500'
  }

  const segmentColors = {
    high: 'text-purple-400 bg-purple-900/20 dark:bg-purple-900/30',
    medium: 'text-blue-400 bg-blue-900/20 dark:bg-blue-900/30',
    low: 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Customer Types Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Customer Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(metrics.customerTypes).length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">No customer data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(metrics.customerTypes).map(([type, count]) => {
                const percentage = customers.length > 0 ? (count / customers.length) * 100 : 0
                const colorClass = typeColors[type] || 'bg-gray-500'
                
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                        <span className="font-medium capitalize">{type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{count}</span>
                        <span className="text-xs text-gray-500 ml-1">customers</span>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="absolute -top-1 right-0 text-xs text-gray-600">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="h-5 w-5 mr-2" />
            Top Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.topCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">No customer purchase data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.topCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.totalOrders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-sm text-gray-500">
                      Avg: {formatCurrency(customer.avgOrderValue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Customer Segments by Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${segmentColors.high}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">High Value</p>
                  <p className="text-xs opacity-75 text-gray-700 dark:text-gray-300">$1,000+ spent</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.segments.high}</p>
                  <Award className="h-5 w-5 mx-auto mt-1 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${segmentColors.medium}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Medium Value</p>
                  <p className="text-xs opacity-75 text-gray-700 dark:text-gray-300">$500 - $999 spent</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.segments.medium}</p>
                  <Star className="h-5 w-5 mx-auto mt-1 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${segmentColors.low}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Regular Value</p>
                  <p className="text-xs opacity-75 text-gray-700 dark:text-gray-300">Under $500 spent</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.segments.low}</p>
                  <Users className="h-5 w-5 mx-auto mt-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          {customers.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Customer Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <p>• <strong>{metrics.segments.high}</strong> high-value customers generate significant revenue</p>
                  <p>• <strong>{((metrics.segments.high / customers.length) * 100).toFixed(1)}%</strong> of customers are high-value</p>
                </div>
                <div>
                  <p>• Focus on converting medium-value customers to high-value</p>
                  <p>• Consider loyalty programs for customer retention</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerAnalytics
