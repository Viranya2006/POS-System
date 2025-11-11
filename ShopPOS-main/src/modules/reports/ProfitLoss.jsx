import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate, exportToCSV } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  FileText,
  BarChart3
} from 'lucide-react'
import { pdfGenerator } from '../../lib/pdfGenerator'
import { activityLogger } from '../../lib/activityLogger'

const ProfitLoss = ({ dateRange, onDateRangeChange }) => {
  const [loading, setLoading] = useState(true)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pnlData, setPnlData] = useState({
    revenue: 0,
    costOfGoodsSold: 0,
    grossProfit: 0,
    grossProfitMargin: 0,
    operatingExpenses: 0,
    otherIncome: 0,
    netProfit: 0,
    netProfitMargin: 0,
    salesBreakdown: [],
    expenseBreakdown: []
  })

  useEffect(() => {
    calculatePnL()
  }, [dateRange.startDate, dateRange.endDate])

  const calculatePnL = async () => {
    try {
      setLoading(true)
      
      const startDate = new Date(dateRange.startDate)
      const endDate = new Date(dateRange.endDate)
      endDate.setHours(23, 59, 59, 999)

      // Get all sales in date range
      const allSales = await dbService.readAll('sales')
      const sales = allSales.filter(sale => {
        const saleDate = new Date(sale.date)
        return saleDate >= startDate && saleDate <= endDate
      })

      // Get all inventory items
      const inventory = await dbService.readAll('inventory')

      // Get cash flow (for expenses and other income)
      const allCashFlow = await dbService.readAll('cashFlow')
      const cashFlow = allCashFlow.filter(cf => {
        const cfDate = new Date(cf.date)
        return cfDate >= startDate && cfDate <= endDate
      })

      // Calculate Revenue
      const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)

      // Calculate Cost of Goods Sold (COGS)
      let costOfGoodsSold = 0
      const salesBreakdown = []

      sales.forEach(sale => {
        let saleCost = 0
        sale.items?.forEach(item => {
          // Find product in inventory to get cost price
          const product = inventory.find(p => p.code === item.code || p.name === item.name)
          if (product && product.costPrice) {
            const itemCost = product.costPrice * (item.quantity || 0)
            saleCost += itemCost
          }
        })
        costOfGoodsSold += saleCost
        
        if (saleCost > 0) {
          salesBreakdown.push({
            invoiceNo: sale.invoiceNo,
            date: sale.date,
            revenue: sale.total || 0,
            cost: saleCost,
            profit: (sale.total || 0) - saleCost,
            margin: ((sale.total || 0) - saleCost) / (sale.total || 0) * 100
          })
        }
      })

      // Calculate Gross Profit
      const grossProfit = revenue - costOfGoodsSold
      const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      // Calculate Operating Expenses from Cash Flow
      const operatingExpenses = cashFlow
        .filter(cf => cf.type === 'expense')
        .reduce((sum, cf) => sum + (cf.amount || 0), 0)

      // Calculate Other Income from Cash Flow
      const otherIncome = cashFlow
        .filter(cf => cf.type === 'income' && cf.category !== 'Sales Revenue')
        .reduce((sum, cf) => sum + (cf.amount || 0), 0)

      // Expense breakdown by category
      const expenseBreakdown = {}
      cashFlow
        .filter(cf => cf.type === 'expense')
        .forEach(cf => {
          const category = cf.category || 'Other'
          expenseBreakdown[category] = (expenseBreakdown[category] || 0) + (cf.amount || 0)
        })

      // Calculate Net Profit
      const netProfit = grossProfit - operatingExpenses + otherIncome
      const netProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

      setPnlData({
        revenue,
        costOfGoodsSold,
        grossProfit,
        grossProfitMargin,
        operatingExpenses,
        otherIncome,
        netProfit,
        netProfitMargin,
        salesBreakdown,
        expenseBreakdown: Object.entries(expenseBreakdown).map(([category, amount]) => ({
          category,
          amount
        }))
      })
    } catch (error) {
      console.error('Error calculating P&L:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Profit & Loss Report'].join(','),
      [`Period: ${formatDate(dateRange.startDate, 'short')} to ${formatDate(dateRange.endDate, 'short')}`].join(','),
      [''].join(','),
      ['Revenue', formatCurrency(pnlData.revenue)].join(','),
      ['Cost of Goods Sold', formatCurrency(pnlData.costOfGoodsSold)].join(','),
      ['Gross Profit', formatCurrency(pnlData.grossProfit)].join(','),
      ['Gross Profit Margin', `${pnlData.grossProfitMargin.toFixed(2)}%`].join(','),
      [''].join(','),
      ['Operating Expenses', formatCurrency(pnlData.operatingExpenses)].join(','),
      ['Other Income', formatCurrency(pnlData.otherIncome)].join(','),
      [''].join(','),
      ['Net Profit', formatCurrency(pnlData.netProfit)].join(','),
      ['Net Profit Margin', `${pnlData.netProfitMargin.toFixed(2)}%`].join(',')
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `profit_loss_${dateRange.startDate}_to_${dateRange.endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    try {
      setPdfGenerating(true)
      const pdf = new (await import('jspdf')).jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPos = 20

      // Header
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Profit & Loss Report', 105, yPos, { align: 'center' })
      yPos += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(
        `${formatDate(dateRange.startDate, 'short')} to ${formatDate(dateRange.endDate, 'short')}`,
        105,
        yPos,
        { align: 'center' }
      )
      yPos += 15

      // Revenue
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Revenue', 10, yPos)
      pdf.text(formatCurrency(pnlData.revenue), 150, yPos, { align: 'right' })
      yPos += 8

      // COGS
      pdf.setFont('helvetica', 'normal')
      pdf.text('Cost of Goods Sold', 10, yPos)
      pdf.text(formatCurrency(pnlData.costOfGoodsSold), 150, yPos, { align: 'right' })
      yPos += 8

      pdf.line(10, yPos, 200, yPos)
      yPos += 8

      // Gross Profit
      pdf.setFont('helvetica', 'bold')
      pdf.text('Gross Profit', 10, yPos)
      pdf.text(formatCurrency(pnlData.grossProfit), 150, yPos, { align: 'right' })
      pdf.text(`(${pnlData.grossProfitMargin.toFixed(2)}%)`, 170, yPos)
      yPos += 10

      // Operating Expenses
      pdf.setFont('helvetica', 'normal')
      pdf.text('Operating Expenses', 10, yPos)
      pdf.text(formatCurrency(pnlData.operatingExpenses), 150, yPos, { align: 'right' })
      yPos += 8

      // Other Income
      pdf.text('Other Income', 10, yPos)
      pdf.text(formatCurrency(pnlData.otherIncome), 150, yPos, { align: 'right' })
      yPos += 8

      pdf.line(10, yPos, 200, yPos)
      yPos += 8

      // Net Profit
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Net Profit', 10, yPos)
      pdf.text(formatCurrency(pnlData.netProfit), 150, yPos, { align: 'right' })
      pdf.text(`(${pnlData.netProfitMargin.toFixed(2)}%)`, 170, yPos)
      yPos += 15

      // Expense Breakdown
      if (pnlData.expenseBreakdown.length > 0) {
        pdf.setFontSize(12)
        pdf.text('Expense Breakdown', 10, yPos)
        yPos += 8
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        
        pnlData.expenseBreakdown.forEach(expense => {
          pdf.text(expense.category, 20, yPos)
          pdf.text(formatCurrency(expense.amount), 150, yPos, { align: 'right' })
          yPos += 6
        })
      }

      // Footer
      yPos = 280
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' })

      const filename = `Profit_Loss_${dateRange.startDate}_to_${dateRange.endDate}.pdf`
      
      if (window.electronAPI) {
        try {
          const result = await window.electronAPI.showSaveDialog({
            title: 'Save P&L Report',
            defaultPath: filename,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
          })
          if (!result.canceled) {
            const blob = pdf.output('blob')
            const arrayBuffer = await blob.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            await window.electronAPI.writeFile(result.filePath, buffer)
          }
        } catch (error) {
          pdf.save(filename)
        }
      } else {
        pdf.save(filename)
      }

      // Log activity
      await activityLogger.logExport('profit-loss', 'pdf', {
        dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
        filename
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF: ' + error.message)
    } finally {
      setPdfGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profit & Loss Report</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Financial summary for selected period
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={pdfGenerating}>
            <FileText className="h-4 w-4 mr-2" />
            {pdfGenerating ? 'Generating PDF...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Profit & Loss Statement</span>
            <span className="text-sm font-normal text-gray-500">
              {formatDate(dateRange.startDate, 'short')} to {formatDate(dateRange.endDate, 'short')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Total Revenue</p>
                <p className="text-sm text-gray-500">From sales</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(pnlData.revenue)}</p>
            </div>

            {/* COGS */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Cost of Goods Sold</p>
                <p className="text-sm text-gray-500">Product costs</p>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {formatCurrency(pnlData.costOfGoodsSold)}
              </p>
            </div>

            {/* Gross Profit */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-t-2 border-b-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Gross Profit</p>
                <p className="text-sm text-gray-500">
                  Margin: {pnlData.grossProfitMargin.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${pnlData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pnlData.grossProfit)}
                </p>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Operating Expenses</p>
                <p className="text-sm text-gray-500">From cash flow</p>
              </div>
              <p className="text-xl font-semibold text-red-600">
                {formatCurrency(pnlData.operatingExpenses)}
              </p>
            </div>

            {/* Other Income */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Other Income</p>
                <p className="text-sm text-gray-500">Non-sales income</p>
              </div>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(pnlData.otherIncome)}
              </p>
            </div>

            {/* Net Profit */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border-t-4 border-purple-500">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Net Profit</p>
                <p className="text-sm text-gray-500">
                  Net Margin: {pnlData.netProfitMargin.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${pnlData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(pnlData.netProfit)}
                </p>
                {pnlData.netProfit >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600 mx-auto mt-2" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600 mx-auto mt-2" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      {pnlData.expenseBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pnlData.expenseBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-red-600 font-semibold">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Sales Breakdown */}
      {pnlData.salesBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Sales by Profit</CardTitle>
            <CardDescription>Showing top 10 most profitable sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Invoice</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Cost</th>
                    <th className="text-right p-2">Profit</th>
                    <th className="text-right p-2">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlData.salesBreakdown
                    .sort((a, b) => b.profit - a.profit)
                    .slice(0, 10)
                    .map((sale, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-2">{sale.invoiceNo}</td>
                        <td className="p-2">{formatDate(sale.date, 'short')}</td>
                        <td className="p-2 text-right">{formatCurrency(sale.revenue)}</td>
                        <td className="p-2 text-right">{formatCurrency(sale.cost)}</td>
                        <td className={`p-2 text-right font-semibold ${sale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(sale.profit)}
                        </td>
                        <td className="p-2 text-right">{sale.margin.toFixed(2)}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProfitLoss

