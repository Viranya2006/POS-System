import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { PieChart, Package } from 'lucide-react'

const TopProductsChart = ({ topProducts = [] }) => {
  if (!topProducts || !Array.isArray(topProducts) || topProducts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Top Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No product sales data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const maxQuantity = Math.max(...topProducts.map(p => p.quantity || 0), 0)
  const totalQuantity = topProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)

  // Generate colors for the chart
  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-yellow-500',
    'bg-purple-500',
    'bg-red-500'
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 mr-2" />
          Top Selling Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No product sales data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">Total Units Sold</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{totalQuantity}</p>
            </div>

            {/* Product List with Visual Bars */}
            <div className="space-y-3">
              {topProducts.map((product, index) => {
                const percentage = totalQuantity > 0 ? (product.quantity / totalQuantity) * 100 : 0
                const colorClass = colors[index % colors.length]
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-white">{product.quantity}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">units</span>
                      </div>
                    </div>
                    
                      <div className="relative">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="absolute -top-1 right-0 text-xs text-gray-600 dark:text-gray-400">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Rankings</h4>
              <div className="grid grid-cols-1 gap-2">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500 dark:text-gray-400">#{index + 1}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">{product.quantity} sold</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Indicator */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Best Performer</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{topProducts[0]?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{topProducts[0]?.quantity} units sold</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TopProductsChart
