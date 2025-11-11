import React, { useState, useEffect } from 'react'
import { dbService } from '../../lib/database'
import { formatCurrency, formatDate, generateId, generateBarcode, exportToCSV } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  AlertTriangle,
  BarChart3,
  Printer,
  Eye,
  RefreshCw
} from 'lucide-react'
import ProductForm from './ProductForm'
import BarcodeGenerator from './BarcodeGenerator'
import StockAdjustment from './StockAdjustment'

const Inventory = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showBarcodeGenerator, setShowBarcodeGenerator] = useState(false)
  const [showStockAdjustment, setShowStockAdjustment] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    loadInventoryData()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [products, searchQuery, selectedCategory, stockFilter])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      
      // Load products
      const productData = await dbService.readAll('inventory')
      setProducts(productData)
      
      // Extract unique categories
      const uniqueCategories = [...new Set(productData.map(p => p.category).filter(Boolean))]
      setCategories(uniqueCategories)
      
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
      console.error('Error loading inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = [...products]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Stock filter
    switch (stockFilter) {
      case 'low':
        filtered = filtered.filter(product => product.qty <= (product.reorderLevel || 10))
        break
      case 'out':
        filtered = filtered.filter(product => product.qty === 0)
        break
      case 'available':
        filtered = filtered.filter(product => product.qty > 0)
        break
      default:
        break
    }

    setFilteredProducts(filtered)
  }

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setShowProductForm(true)
  }

  const handleEditProduct = (product) => {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await dbService.delete('inventory', productId)
        await loadInventoryData()
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Error deleting product')
      }
    }
  }

  const handleProductSave = async (productData) => {
    try {
      if (selectedProduct) {
        // Update existing product
        await dbService.update('inventory', selectedProduct.id, productData)
      } else {
        // Create new product
        const newProduct = {
          ...productData,
          code: productData.code || generateId('ITEM'),
          barcode: productData.barcode || generateBarcode()
        }
        await dbService.create('inventory', newProduct)
      }
      
      await loadInventoryData()
      setShowProductForm(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error saving product')
    }
  }

  const handleStockAdjustment = (product) => {
    setSelectedProduct(product)
    setShowStockAdjustment(true)
  }

  const handleStockUpdate = async (productId, newQuantity, reason) => {
    try {
      await dbService.update('inventory', productId, { qty: newQuantity })
      
      // Log stock adjustment (you could create a separate table for this)
      console.log('Stock adjusted:', { productId, newQuantity, reason, date: new Date() })
      
      await loadInventoryData()
      setShowStockAdjustment(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Error updating stock')
    }
  }

  const handleExportCSV = () => {
    const exportData = filteredProducts.map(product => ({
      Code: product.code,
      Name: product.name,
      Category: product.category || '',
      Supplier: product.supplier || '',
      'Cost Price': product.costPrice || 0,
      'Sell Price': product.sellPrice || 0,
      Quantity: product.qty || 0,
      'Reorder Level': product.reorderLevel || 0,
      Barcode: product.barcode || '',
      'Expiry Date': product.expiry || '',
      'Created Date': formatDate(product.createdAt, 'short')
    }))
    
    exportToCSV(exportData, `inventory_${new Date().toISOString().split('T')[0]}`)
  }

  const handlePrintBarcode = (product) => {
    setSelectedProduct(product)
    setShowBarcodeGenerator(true)
  }

  const getStockStatus = (product) => {
    if (!product.qty || product.qty === 0) return { 
      status: 'out', 
      color: 'text-red-600 dark:text-red-400', 
      bg: 'bg-red-50 dark:bg-red-900/20' 
    }
    if (product.qty <= (product.reorderLevel || 10)) return { 
      status: 'low', 
      color: 'text-orange-600 dark:text-orange-400', 
      bg: 'bg-orange-50 dark:bg-orange-900/20' 
    }
    return { 
      status: 'good', 
      color: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-50 dark:bg-green-900/20' 
    }
  }

  const getStockStatusText = (status) => {
    switch (status) {
      case 'out': return 'Out of Stock'
      case 'low': return 'Low Stock'
      case 'good': return 'In Stock'
      default: return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
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

  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + (p.qty * p.costPrice), 0)
  const lowStockCount = products.filter(p => p.qty <= (p.reorderLevel || 10)).length
  const outOfStockCount = products.filter(p => p.qty === 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your products and stock levels</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleAddProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
              <Package className="h-8 w-8 text-red-500" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Stock Status</label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="all">All Stock</option>
                <option value="available">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadInventoryData} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
          <CardDescription>
            Manage your product inventory and stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No products found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {products.length === 0 
                  ? "Get started by adding your first product"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {products.length === 0 && (
                <Button onClick={handleAddProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-left p-3 font-semibold">Category</th>
                    <th className="text-right p-3 font-semibold">Cost Price</th>
                    <th className="text-right p-3 font-semibold">Sell Price</th>
                    <th className="text-center p-3 font-semibold">Stock</th>
                    <th className="text-center p-3 font-semibold">Status</th>
                    <th className="text-center p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product)
                    
                    return (
                      <tr key={product.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Code: {product.code}</p>
                            {product.barcode && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">Barcode: {product.barcode}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-900 dark:text-white">
                            {product.category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="p-3 text-right text-gray-900 dark:text-white">{formatCurrency(product.costPrice || 0)}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">{formatCurrency(product.sellPrice || 0)}</td>
                        <td className="p-3 text-center">
                          <span className="font-mono text-gray-900 dark:text-white">{product.qty || 0}</span>
                          {product.reorderLevel && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">Min: {product.reorderLevel}</p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                            {getStockStatusText(stockStatus.status)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditProduct(product)}
                            title="Edit Product"
                            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStockAdjustment(product)}
                              title="Adjust Stock"
                              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintBarcode(product)}
                              title="Print Barcode"
                              className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete Product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showProductForm && (
        <ProductForm
          product={selectedProduct}
          suppliers={suppliers}
          categories={categories}
          onSave={handleProductSave}
          onCancel={() => {
            setShowProductForm(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {showBarcodeGenerator && selectedProduct && (
        <BarcodeGenerator
          product={selectedProduct}
          onClose={() => {
            setShowBarcodeGenerator(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {showStockAdjustment && selectedProduct && (
        <StockAdjustment
          product={selectedProduct}
          onSave={handleStockUpdate}
          onCancel={() => {
            setShowStockAdjustment(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </div>
  )
}

export default Inventory
