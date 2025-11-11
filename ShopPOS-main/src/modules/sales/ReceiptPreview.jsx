import React, { useRef, useState } from 'react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { X, Printer, Download, Share } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import QRCode from 'react-qr-code'
import { pdfGenerator } from '../../lib/pdfGenerator'
import { dbService } from '../../lib/database'

const ReceiptPreview = ({ saleData, onClose }) => {
  const receiptRef = useRef(null)

  const handlePrint = async () => {
    if (window.electronAPI) {
      // Use Electron's print functionality
      const receiptHTML = receiptRef.current.innerHTML
      const printOptions = {
        silent: false,
        paperSize: 'thermal' // or 'A4'
      }
      
      try {
        await window.electronAPI.printReceipt(receiptHTML, printOptions)
      } catch (error) {
        console.error('Print error:', error)
        // Fallback to browser print
        window.print()
      }
    } else {
      // Browser print fallback
      window.print()
    }
  }

  const [pdfGenerating, setPdfGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    try {
      setPdfGenerating(true)
      
      // Get shop settings
      let shopInfo = {
        storeName: 'ShopPOS Store',
        storeAddress: '',
        storePhone: '',
        receiptFooter: 'Thank you for your business!'
      }
      
      try {
        const settings = await dbService.readAll('settings')
        // Settings are stored as key-value pairs
        const settingsObj = {}
        settings.forEach(s => {
          if (s.key && s.value !== undefined) {
            settingsObj[s.key] = s.value
          }
        })
        
        shopInfo = {
          storeName: settingsObj.storeName || shopInfo.storeName,
          storeAddress: settingsObj.storeAddress || shopInfo.storeAddress,
          storePhone: settingsObj.storePhone || shopInfo.storePhone,
          receiptFooter: settingsObj.receiptFooter || shopInfo.receiptFooter
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        // Use defaults
      }

      // Generate PDF
      const pdf = await pdfGenerator.generateInvoicePDF(saleData, shopInfo)
      
      // Download PDF
      const filename = `Invoice_${saleData.invoiceNo}_${new Date().toISOString().split('T')[0]}.pdf`
      
      if (window.electronAPI) {
        // In Electron, use save dialog
        const options = {
          title: 'Save Receipt',
          defaultPath: filename,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] }
          ]
        }
        
        try {
          const result = await window.electronAPI.showSaveDialog(options)
          if (!result.canceled) {
            const blob = pdfGenerator.getPDFBlob(pdf)
            const arrayBuffer = await blob.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            await window.electronAPI.writeFile(result.filePath, buffer)
          }
        } catch (error) {
          console.error('Save error:', error)
          // Fallback to browser download
          pdfGenerator.downloadPDF(pdf, filename)
        }
      } else {
        // Browser download
        pdfGenerator.downloadPDF(pdf, filename)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF: ' + error.message)
    } finally {
      setPdfGenerating(false)
    }
  }

  const generateBarcode = (text) => {
    try {
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, text, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 10
      })
      return canvas.toDataURL()
    } catch (error) {
      console.error('Barcode generation error:', error)
      return null
    }
  }

  const qrData = JSON.stringify({
    invoice: saleData?.invoiceNo || 'N/A',
    total: saleData?.total || 0,
    date: saleData?.date || new Date().toISOString()
  })

  // Safeguard against missing saleData
  if (!saleData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Error: No sale data available</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between no-print">
          <CardTitle className="flex items-center">
            <Printer className="h-5 w-5 mr-2" />
            Receipt Preview
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="flex space-x-3 no-print">
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} className="flex-1" disabled={pdfGenerating}>
              <Download className="h-4 w-4 mr-2" />
              {pdfGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="receipt-container bg-white text-black p-6 rounded-lg border">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-2">ShopPOS Store</h1>
              <p className="text-sm">123 Main Street, City, State 12345</p>
              <p className="text-sm">Phone: (555) 123-4567</p>
              <p className="text-sm">Email: info@shoppos.com</p>
              <div className="border-t border-dashed border-gray-400 my-4"></div>
            </div>

            {/* Invoice Details */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Invoice #:</strong> {saleData.invoiceNo || 'N/A'}</p>
                  <p><strong>Date:</strong> {formatDate(saleData.date || new Date().toISOString(), 'long')}</p>
                  <p><strong>Cashier:</strong> {saleData.userId || 'Staff'}</p>
                </div>
                <div>
                  {saleData.customer && saleData.customer.name ? (
                    <>
                      <p><strong>Customer:</strong> {saleData.customer.name}</p>
                      {saleData.customer.phone && <p><strong>Phone:</strong> {saleData.customer.phone}</p>}
                    </>
                  ) : (
                    <p><strong>Customer:</strong> Walk-in</p>
                  )}
                  <p><strong>Payment:</strong> {(saleData.paymentMethod || 'cash').toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleData.items && saleData.items.length > 0 ? (
                    saleData.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-2">
                          <div>
                            <p className="font-medium">{item.name || 'Unknown Item'}</p>
                            <p className="text-xs text-gray-600">Code: {item.code || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="text-center py-2">{item.quantity || 0}</td>
                        <td className="text-right py-2">{formatCurrency(item.price || 0)}</td>
                        <td className="text-right py-2">{formatCurrency(item.total || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-gray-500">No items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mb-6">
              <div className="border-t border-gray-400 pt-4">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(saleData.subtotal || 0)}</span>
                </div>
                
                {(saleData.discount || 0) > 0 && (
                  <div className="flex justify-between mb-2 text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(saleData.discount || 0)}</span>
                  </div>
                )}
                
                <div className="flex justify-between mb-2">
                  <span>Tax ({saleData.taxRate || 10}%):</span>
                  <span>{formatCurrency(saleData.tax || 0)}</span>
                </div>
                
                <div className="border-t border-gray-400 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(saleData.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            {(saleData.paymentMethod || 'cash') === 'cash' && (
              <div className="mb-6 text-sm">
                <div className="flex justify-between">
                  <span>Cash Received:</span>
                  <span>{formatCurrency(saleData.cashReceived || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>{formatCurrency(saleData.change || 0)}</span>
                </div>
              </div>
            )}

            {/* QR Code and Barcode */}
            <div className="text-center mb-6">
              <div className="flex justify-center items-center space-x-8">
                {/* QR Code */}
                <div>
                  <QRCode value={qrData} size={80} />
                  <p className="text-xs mt-2">Scan for details</p>
                </div>
                
                {/* Barcode */}
                <div>
                  {generateBarcode(saleData.invoiceNo) && (
                    <img 
                      src={generateBarcode(saleData.invoiceNo)} 
                      alt="Invoice Barcode"
                      className="mx-auto"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-600 space-y-1">
              <div className="border-t border-dashed border-gray-400 pt-4">
                <p>Thank you for your business!</p>
                <p>Visit us again soon</p>
                <p className="mt-2">Powered by ShopPOS v1.0.0</p>
                <p>Return Policy: 30 days with receipt</p>
              </div>
            </div>
          </div>

          {/* Thermal Receipt Preview */}
          <div className="no-print">
            <h3 className="font-semibold mb-3">Thermal Receipt Preview (80mm)</h3>
            <div className="thermal-receipt bg-white text-black p-4 mx-auto border">
              <div className="text-center mb-4">
                <div className="font-bold text-lg">ShopPOS Store</div>
                <div className="text-xs">123 Main Street</div>
                <div className="text-xs">Phone: (555) 123-4567</div>
                <div className="separator"></div>
              </div>

              <div className="mb-3 text-xs">
                <div>Invoice: {saleData.invoiceNo}</div>
                <div>Date: {formatDate(saleData.date, 'short')}</div>
                <div>Cashier: {saleData.userId}</div>
              </div>

              <div className="separator"></div>

              {saleData.items && saleData.items.length > 0 ? (
                saleData.items.map((item, index) => (
                  <div key={index} className="mb-2">
                    <div className="font-medium">{item.name || 'Unknown Item'}</div>
                    <div className="line-item">
                      <span>{item.quantity || 0} x {formatCurrency(item.price || 0)}</span>
                      <span>{formatCurrency(item.total || 0)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="mb-2 text-center text-gray-500">No items</div>
              )}

              <div className="separator"></div>

              <div className="line-item">
                <span>Subtotal:</span>
                <span>{formatCurrency(saleData.subtotal || 0)}</span>
              </div>
              
              {(saleData.discount || 0) > 0 && (
                <div className="line-item">
                  <span>Discount:</span>
                  <span>-{formatCurrency(saleData.discount || 0)}</span>
                </div>
              )}
              
              <div className="line-item">
                <span>Tax:</span>
                <span>{formatCurrency(saleData.tax || 0)}</span>
              </div>
              
              <div className="separator"></div>
              
              <div className="line-item total">
                <span>TOTAL:</span>
                <span>{formatCurrency(saleData.total || 0)}</span>
              </div>

              {(saleData.paymentMethod || 'cash') === 'cash' && (
                <>
                  <div className="line-item">
                    <span>Cash:</span>
                    <span>{formatCurrency(saleData.cashReceived || 0)}</span>
                  </div>
                  <div className="line-item">
                    <span>Change:</span>
                    <span>{formatCurrency(saleData.change || 0)}</span>
                  </div>
                </>
              )}

              <div className="text-center mt-4">
                <QRCode value={qrData} size={60} />
                <div className="text-xs mt-2">Thank you!</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReceiptPreview
