import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { X, Printer } from 'lucide-react'
import JsBarcode from 'jsbarcode'

const BarcodeGenerator = ({ product, onClose }) => {
  const barcodeCanvasRef = useRef(null)
  const [barcodeType, setBarcodeType] = useState('CODE128') // Default to CODE128
  const [barcodeValue, setBarcodeValue] = useState(product.barcode || product.code || '')

  // Generate standard barcode using JsBarcode
  useEffect(() => {
    if (barcodeCanvasRef.current && barcodeValue) {
      try {
        // Determine barcode format based on length and content
        let format = barcodeType
        const numericValue = barcodeValue.replace(/\D/g, '')
        
        // Auto-select format based on length if CODE128 is selected
        if (barcodeType === 'CODE128') {
          if (numericValue.length === 13 && /^\d{13}$/.test(barcodeValue)) {
            format = 'EAN13'
          } else if (numericValue.length === 12 && /^\d{12}$/.test(barcodeValue)) {
            format = 'EAN12'
          } else if (numericValue.length === 8 && /^\d{8}$/.test(barcodeValue)) {
            format = 'EAN8'
          } else if (numericValue.length === 11 && /^\d{11}$/.test(barcodeValue)) {
            format = 'UPC'
          }
        } else {
          format = barcodeType
        }

        // Generate barcode with proper standards
        JsBarcode(barcodeCanvasRef.current, barcodeValue, {
          format: format,
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
          valid: function(valid) {
            if (!valid && barcodeType === 'CODE128') {
              // If format validation fails, try CODE128 as fallback
              console.warn('Format validation failed, using CODE128')
            }
          }
        })
      } catch (error) {
        console.error('Error generating barcode:', error)
        // Fallback to CODE128 if format fails
        try {
          JsBarcode(barcodeCanvasRef.current, barcodeValue, {
            format: 'CODE128',
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 16,
            margin: 10
          })
        } catch (fallbackError) {
          console.error('Barcode generation failed:', fallbackError)
        }
      }
    }
  }, [barcodeValue, barcodeType])

  const handlePrint = () => {
    if (!barcodeCanvasRef.current) return
    
    const printWindow = window.open('', '_blank')
    const barcodeValue = product.barcode || product.code || ''
    
    // Get canvas data URL
    const canvasDataUrl = barcodeCanvasRef.current.toDataURL('image/png')
    
    const printContent = `
      <html>
        <head>
          <title>Barcode - ${product.name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
              @page { margin: 10mm; }
            }
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
              margin: 0;
            }
            .barcode-container { 
              margin: 0 auto; 
              padding: 20px; 
              border: 1px solid #000; 
              max-width: 400px;
              page-break-inside: avoid;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .product-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .product-code {
              font-size: 12px;
              color: #666;
              margin-bottom: 10px;
            }
            .barcode-number {
              font-size: 14px;
              font-weight: bold;
              margin-top: 10px;
              font-family: monospace;
              letter-spacing: 2px;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="product-name">${product.name}</div>
            <div class="product-code">Code: ${product.code}</div>
            <img src="${canvasDataUrl}" alt="Barcode" />
            <div class="barcode-number">${barcodeValue}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            }
          </script>
        </body>
      </html>
    `
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Barcode Generator</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold mb-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Code: {product.code}</p>
            
            {/* Barcode Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Barcode Format
              </label>
              <select
                value={barcodeType}
                onChange={(e) => setBarcodeType(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="CODE128">CODE128 (Alphanumeric)</option>
                <option value="EAN13">EAN-13 (13 digits)</option>
                <option value="EAN8">EAN-8 (8 digits)</option>
                <option value="UPC">UPC-A (12 digits)</option>
                <option value="CODE39">CODE39</option>
              </select>
            </div>

            {/* Barcode Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Barcode Value
              </label>
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-center font-mono"
                placeholder="Enter barcode value"
              />
              <p className="text-xs text-gray-500 mt-1">
                {barcodeType === 'EAN13' && 'Must be exactly 13 digits'}
                {barcodeType === 'EAN8' && 'Must be exactly 8 digits'}
                {barcodeType === 'UPC' && 'Must be exactly 12 digits'}
                {barcodeType === 'CODE128' && 'Supports alphanumeric characters'}
              </p>
            </div>
            
            {/* Barcode Display */}
            <div className="bg-white border-2 border-gray-300 dark:border-gray-600 p-6 rounded-lg mb-4 flex flex-col items-center">
              <div className="mb-2 text-sm font-medium">{product.name}</div>
              <div className="mb-4 text-xs text-gray-500">{product.code}</div>
              
              {/* Standard Barcode Canvas */}
              <canvas
                ref={barcodeCanvasRef}
                className="max-w-full"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              
              {/* Barcode Number */}
              <div className="font-mono text-lg font-bold tracking-wider mt-2">
                {barcodeValue}
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-4">
              Standard barcode format: {barcodeType}. Scan-compatible and printable.
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1 no-print">
              Close
            </Button>
            <Button onClick={handlePrint} className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Barcode Label
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BarcodeGenerator
