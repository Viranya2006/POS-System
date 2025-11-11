import React, { useState, useEffect } from 'react'
import { dbService, db } from '../../lib/database'
import { formatCurrency, formatDate, generateId } from '../../lib/utils'
import { activityLogger } from '../../lib/activityLogger'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Printer
} from 'lucide-react'
import GRNForm from './GRNForm'

const GRN = () => {
  const [grns, setGrns] = useState([])
  const [filteredGrns, setFilteredGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showGrnForm, setShowGrnForm] = useState(false)
  const [selectedGrn, setSelectedGrn] = useState(null)
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    loadGrnData()
  }, [])

  useEffect(() => {
    filterGrns()
  }, [grns, searchQuery, statusFilter])

  const loadGrnData = async () => {
    try {
      setLoading(true)
      
      // Load GRNs
      const grnData = await dbService.readAll('grn')
      setGrns(grnData)
      
      // Load suppliers and deduplicate
      const supplierData = await dbService.readAll('suppliers')
      const seen = new Set()
      const uniqueSuppliers = supplierData.filter(supplier => {
        const key1 = supplier.supplierId ? `id:${supplier.supplierId}` : null
        const key2 = supplier.email ? `email:${supplier.email.toLowerCase().trim()}` : null
        const key3 = supplier.phone ? `phone:${supplier.phone.trim()}` : null
        const key4 = supplier.name && supplier.phone ? `name+phone:${supplier.name.toLowerCase().trim()}+${supplier.phone.trim()}` : null
        
        if (key1 && seen.has(key1)) return false
        if (key2 && seen.has(key2)) return false
        if (key3 && seen.has(key3)) return false
        if (key4 && seen.has(key4)) return false
        
        if (key1) seen.add(key1)
        if (key2) seen.add(key2)
        if (key3) seen.add(key3)
        if (key4) seen.add(key4)
        
        return true
      })
      setSuppliers(uniqueSuppliers)
      
    } catch (error) {
      console.error('Error loading GRN data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterGrns = () => {
    let filtered = [...grns]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(grn => 
        (grn.grnNumber || grn.grnNo || '').toLowerCase().includes(query) ||
        (grn.supplierName || '').toLowerCase().includes(query) ||
        (grn.poNumber || '').toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(grn => grn.status === statusFilter)
    }

    setFilteredGrns(filtered)
  }

  const handleAddGrn = () => {
    setSelectedGrn(null)
    setShowGrnForm(true)
  }

  const handleEditGrn = (grn) => {
    setSelectedGrn(grn)
    setShowGrnForm(true)
  }

  const handleDeleteGrn = async (grnId) => {
    if (window.confirm('Are you sure you want to delete this GRN?')) {
      try {
        await dbService.delete('grn', grnId)
        await loadGrnData()
      } catch (error) {
        console.error('Error deleting GRN:', error)
        alert('Error deleting GRN')
      }
    }
  }

  const handleGrnSave = async (grnData) => {
    try {
      if (selectedGrn) {
        // Update existing GRN
        await dbService.update('grn', selectedGrn.id, grnData)
      } else {
        // Create new GRN
        const newGrn = {
          ...grnData,
          grnNumber: grnData.grnNumber || generateId('GRN'),
          createdAt: new Date().toISOString(),
          createdBy: 'current-user'
        }
        await dbService.create('grn', newGrn)
      }
      
      await loadGrnData()
      setShowGrnForm(false)
      setSelectedGrn(null)
    } catch (error) {
      console.error('Error saving GRN:', error)
      alert('Error saving GRN')
    }
  }

  const handleExportGrns = () => {
    try {
      const csv = [
        ['GRN Number', 'Supplier Name', 'PO Number', 'Status', 'Total Amount', 'Items Count', 'Expected Date', 'Received Date'].join(','),
        ...filteredGrns.map(grn => [
          grn.grnNumber || '',
          `"${(grn.supplierName || '').replace(/"/g, '""')}"`,
          grn.poNumber || '',
          grn.status || '',
          grn.totalAmount || 0,
          grn.items?.length || 0,
          grn.expectedDate ? formatDate(grn.expectedDate, 'short') : '',
          grn.receivedDate ? formatDate(grn.receivedDate, 'short') : ''
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `grn_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting GRNs:', error)
      alert('Error exporting GRNs: ' + error.message)
    }
  }

  const handlePrintGrn = (grn) => {
    try {
      const printWindow = window.open('', '_blank')
      const printContent = `
        <html>
          <head>
            <title>GRN ${grn.grnNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .total { font-weight: bold; font-size: 1.2em; }
            </style>
          </head>
          <body>
            <h1>Goods Received Note</h1>
            <p><strong>GRN Number:</strong> ${grn.grnNumber}</p>
            <p><strong>Supplier:</strong> ${grn.supplierName}</p>
            <p><strong>PO Number:</strong> ${grn.poNumber || 'N/A'}</p>
            <p><strong>Status:</strong> ${grn.status}</p>
            <p><strong>Date:</strong> ${formatDate(grn.createdAt, 'long')}</p>
            <h2>Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${(grn.items || []).map(item => `
                  <tr>
                    <td>${item.productCode || ''}</td>
                    <td>${item.productName || ''}</td>
                    <td>${item.expectedQty || item.receivedQty || 0}</td>
                    <td>${formatCurrency(item.unitPrice || 0)}</td>
                    <td>${formatCurrency(item.totalPrice || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="total" style="text-align: right;">Total Amount:</td>
                  <td class="total">${formatCurrency(grn.totalAmount || 0)}</td>
                </tr>
              </tfoot>
            </table>
            ${grn.notes ? `<p><strong>Notes:</strong> ${grn.notes}</p>` : ''}
          </body>
        </html>
      `
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    } catch (error) {
      console.error('Error printing GRN:', error)
      alert('Error printing GRN: ' + error.message)
    }
  }

  const handleReceiveGrn = async (grnId) => {
    try {
      const grn = grns.find(g => g.id === grnId)
      if (!grn) return

      // Calculate total cost
      const totalCost = grn.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0

      // Update GRN status
      await dbService.update('grn', grnId, {
        status: 'received',
        receivedDate: new Date().toISOString(),
        receivedBy: 'current-user',
        totalAmount: totalCost
      })

      // Update inventory quantities
      for (const item of grn.items) {
        try {
          // Try to find product by code or barcode
          const product = await db.inventory.where('code').equals(item.productCode || item.code).first() ||
                         await db.inventory.where('barcode').equals(item.barcode || item.productCode).first()
          
          if (product) {
            await dbService.updateInventoryQuantity(product.id, item.receivedQty || item.quantity || 0, 'add')
          } else {
            console.warn(`Product not found for GRN item: ${item.productCode || item.code || item.name}`)
          }
        } catch (error) {
          console.error(`Error updating inventory for GRN item ${item.productCode}:`, error)
        }
      }

      // Auto-create cash flow entry for expense
      try {
        await dbService.create('cashFlow', {
          type: 'expense',
          category: 'Purchase Cost',
          amount: totalCost,
          description: `GRN ${grn.grnNumber} - ${grn.supplierName || 'Supplier'}`,
          date: new Date().toISOString(),
          referenceId: grn.grnNumber,
          referenceType: 'grn',
          userId: 'current-user'
        })
      } catch (cfError) {
        console.warn('Error creating cash flow entry:', cfError)
        // Don't block GRN if cash flow entry fails
      }

      // Log activity
      await activityLogger.logGRN(grnId, grn.grnNumber, totalCost, {
        supplierId: grn.supplierId,
        itemsCount: grn.items?.length || 0
      })

      await loadGrnData()
      alert('GRN received successfully and inventory updated!')
    } catch (error) {
      console.error('Error receiving GRN:', error)
      alert('Error receiving GRN')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-900/20 dark:bg-yellow-900/30'
      case 'partial': return 'text-blue-400 bg-blue-900/20 dark:bg-blue-900/30'
      case 'received': return 'text-green-400 bg-green-900/20 dark:bg-green-900/30'
      case 'cancelled': return 'text-red-400 bg-red-900/20 dark:bg-red-900/30'
      default: return 'text-gray-400 bg-gray-900/20 dark:bg-gray-900/30'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'partial': return <AlertTriangle className="h-4 w-4" />
      case 'received': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <Trash2 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
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

  const totalGrns = grns.length
  const pendingGrns = grns.filter(g => g.status === 'pending').length
  const receivedGrns = grns.filter(g => g.status === 'received').length
  const totalValue = grns.reduce((sum, g) => sum + (g.totalAmount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Goods Received Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage incoming stock and supplier deliveries</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportGrns}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddGrn}>
            <Plus className="h-4 w-4 mr-2" />
            New GRN
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total GRNs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGrns}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingGrns}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Received</p>
                <p className="text-2xl font-bold text-green-600">{receivedGrns}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search GRNs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadGrnData} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRN List */}
      <Card>
        <CardHeader>
          <CardTitle>GRN List ({filteredGrns.length})</CardTitle>
          <CardDescription>
            Manage goods received notes and track deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGrns.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No GRNs found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {grns.length === 0 
                  ? "Get started by creating your first GRN"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {grns.length === 0 && (
                <Button onClick={handleAddGrn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First GRN
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">GRN Number</th>
                    <th className="text-left p-3 font-semibold">Supplier</th>
                    <th className="text-left p-3 font-semibold">PO Number</th>
                    <th className="text-center p-3 font-semibold">Items</th>
                    <th className="text-right p-3 font-semibold">Total Amount</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-center p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrns.map((grn) => (
                    <tr key={grn.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{grn.grnNumber}</p>
                          <p className="text-sm text-gray-500">
                            {formatDate(grn.createdAt, 'short')}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{grn.supplierName}</p>
                        <p className="text-sm text-gray-500">{grn.supplierContact}</p>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm">{grn.poNumber || 'N/A'}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-semibold">{grn.items?.length || 0}</span>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatCurrency(grn.totalAmount || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center space-x-1 ${getStatusColor(grn.status)}`}>
                          {getStatusIcon(grn.status)}
                          <span className="capitalize">{grn.status}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{formatDate(grn.expectedDate, 'short')}</p>
                        {grn.receivedDate && (
                          <p className="text-xs text-green-600">
                            Received: {formatDate(grn.receivedDate, 'short')}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditGrn(grn)}
                            title="Edit GRN"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          {grn.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReceiveGrn(grn.id)}
                              title="Mark as Received"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintGrn(grn)}
                            title="Print GRN"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGrn(grn.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete GRN"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GRN Form Modal */}
      {showGrnForm && (
        <GRNForm
          grn={selectedGrn}
          suppliers={suppliers}
          onSave={handleGrnSave}
          onCancel={() => {
            setShowGrnForm(false)
            setSelectedGrn(null)
          }}
        />
      )}
    </div>
  )
}

export default GRN
