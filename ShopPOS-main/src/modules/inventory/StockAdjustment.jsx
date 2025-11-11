import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { X, Save } from 'lucide-react'

const StockAdjustment = ({ product, onSave, onCancel }) => {
  const [newQuantity, setNewQuantity] = useState(product.qty || 0)
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(product.id, newQuantity, reason)
  }

  const difference = newQuantity - (product.qty || 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Adjustment</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-500">Code: {product.code}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Current Stock</label>
              <Input value={product.qty || 0} disabled />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">New Quantity</label>
              <Input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            
            {difference !== 0 && (
              <div className={`p-3 rounded ${difference > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="text-sm">
                  {difference > 0 ? 'Increase' : 'Decrease'}: {Math.abs(difference)} units
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for adjustment"
                rows="3"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Update Stock
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default StockAdjustment
