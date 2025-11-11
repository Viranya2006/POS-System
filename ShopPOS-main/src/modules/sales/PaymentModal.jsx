import React, { useState, useEffect } from 'react'
import { formatCurrency } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  CreditCard,
  DollarSign,
  X,
  CheckCircle
} from 'lucide-react'

const PaymentModal = ({ saleData, onComplete, onCancel }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState(saleData.total)
  const [change, setChange] = useState(0)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Calculate change when cash received changes
    if (paymentMethod === 'cash') {
      const changeAmount = Math.max(0, cashReceived - saleData.total)
      setChange(changeAmount)
    }
  }, [cashReceived, saleData.total, paymentMethod])

  const handleQuickCash = (amount) => {
    setCashReceived(amount)
  }

  const handlePaymentComplete = async () => {
    if (paymentMethod === 'cash' && cashReceived < saleData.total) {
      alert('Insufficient cash received')
      return
    }

    setProcessing(true)

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const paymentData = {
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceived : saleData.total,
        change: paymentMethod === 'cash' ? change : 0,
        paymentDate: new Date().toISOString(),
        paymentStatus: 'completed'
      }

      onComplete(paymentData)
    } catch (error) {
      console.error('Payment processing error:', error)
      alert('Payment processing failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const quickCashAmounts = [
    saleData.total,
    Math.ceil(saleData.total / 10) * 10, // Round up to nearest 10
    Math.ceil(saleData.total / 20) * 20, // Round up to nearest 20
    Math.ceil(saleData.total / 50) * 50, // Round up to nearest 50
    Math.ceil(saleData.total / 100) * 100 // Round up to nearest 100
  ].filter((amount, index, arr) => arr.indexOf(amount) === index) // Remove duplicates

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Process Payment
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sale Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Sale Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Invoice:</span>
                <span className="font-mono">{saleData.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(saleData.subtotal)}</span>
              </div>
              {saleData.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(saleData.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(saleData.tax)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(saleData.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <h3 className="font-semibold mb-3">Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="h-16 flex-col"
                onClick={() => setPaymentMethod('cash')}
              >
                <DollarSign className="h-6 w-6 mb-1" />
                Cash
              </Button>
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                className="h-16 flex-col"
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard className="h-6 w-6 mb-1" />
                Card
              </Button>
            </div>
          </div>

          {/* Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cash Received</label>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  className="text-lg text-right"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <label className="block text-sm font-medium mb-2">Quick Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {quickCashAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickCash(amount)}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Change Calculation */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Change to Return:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(change)}
                  </span>
                </div>
                {cashReceived < saleData.total && (
                  <p className="text-sm text-red-600 mt-2">
                    Insufficient amount. Need {formatCurrency(saleData.total - cashReceived)} more.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Card Payment */}
          {paymentMethod === 'card' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Card Payment:</strong> Processing card payment for {formatCurrency(saleData.total)}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handlePaymentComplete}
              disabled={processing || (paymentMethod === 'cash' && cashReceived < saleData.total)}
              className="flex-1"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Payment
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentModal
