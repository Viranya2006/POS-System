import React from 'react'
import { formatCurrency } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { BarChart3 } from 'lucide-react'

const SalesChart = ({ salesData, dateRange }) => {
  // Process sales data for chart
  const processChartData = () => {
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0) {
      return []
    }
    
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    
    // Filter sales by date range
    const filteredSales = salesData.filter(sale => {
      if (!sale || !sale.date) return false
      const saleDate = new Date(sale.date)
      saleDate.setHours(0, 0, 0, 0)
      return saleDate >= startDate && saleDate <= endDate
    })

    // Group sales by day
    const dailySales = {}
    filteredSales.forEach(sale => {
      const dateKey = sale.date.split('T')[0] // Get YYYY-MM-DD format
      if (dailySales[dateKey]) {
        dailySales[dateKey] += sale.total
      } else {
        dailySales[dateKey] = sale.total
      }
    })

    // Convert to array and sort by date
    const chartData = Object.entries(dailySales)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    return chartData
  }

  const chartData = processChartData()
  const maxValue = Math.max(...chartData.map(d => d.total), 0)
  const totalRevenue = chartData.reduce((sum, d) => sum + d.total, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Sales Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No sales data for selected period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Revenue</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{formatCurrency(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Days with Sales</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{chartData.length}</p>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                <span>Daily Sales</span>
                <span>Amount</span>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-20 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                          style={{ 
                            width: maxValue > 0 ? `${(item.total / maxValue) * 100}%` : '0%' 
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Daily Revenue</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SalesChart
