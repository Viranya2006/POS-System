import html2canvas from 'html2canvas'

/**
 * PDF Generator Service
 * Handles PDF generation for invoices, receipts, and reports
 */
class PDFGenerator {
  /**
   * Generate PDF from HTML element
   */
  async generatePDFFromElement(element, options = {}) {
    const {
      filename = 'document',
      format = 'a4',
      orientation = 'portrait',
      quality = 0.98,
      margin = 10
    } = options

    try {
      // Convert element to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png', quality)
      
      // Calculate dimensions
      const imgWidth = format === 'a4' ? 210 : 80 // A4 width in mm, thermal width
      const pageHeight = format === 'a4' ? 297 : 200 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Create PDF
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format === 'a4' ? 'a4' : [80, 200]
      })

      let heightLeft = imgHeight
      let position = margin

      // Add first page
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth - (margin * 2), imgHeight)
      heightLeft -= pageHeight - (margin * 2)

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth - (margin * 2), imgHeight)
        heightLeft -= pageHeight - (margin * 2)
      }

      return pdf
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw error
    }
  }

  /**
   * Generate invoice/receipt PDF
   */
  async generateInvoicePDF(saleData, shopInfo = {}) {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    let yPos = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text(shopInfo.storeName || 'ShopPOS Store', 105, yPos, { align: 'center' })
    yPos += 10

    if (shopInfo.storeAddress) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(shopInfo.storeAddress, 105, yPos, { align: 'center' })
      yPos += 5
    }

    if (shopInfo.storePhone) {
      pdf.text(`Phone: ${shopInfo.storePhone}`, 105, yPos, { align: 'center' })
      yPos += 5
    }

    // Invoice details
    yPos += 10
    pdf.setDrawColor(0, 0, 0)
    pdf.line(10, yPos, 200, yPos)
    yPos += 10

    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('INVOICE', 10, yPos)
    yPos += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Invoice No: ${saleData.invoiceNo}`, 10, yPos)
    pdf.text(`Date: ${new Date(saleData.date).toLocaleDateString()}`, 150, yPos)
    yPos += 5

    if (saleData.customer?.name) {
      pdf.text(`Customer: ${saleData.customer.name}`, 10, yPos)
      yPos += 5
    }

    // Items table
    yPos += 5
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    
    // Table header
    pdf.text('Item', 10, yPos)
    pdf.text('Qty', 80, yPos)
    pdf.text('Price', 110, yPos)
    pdf.text('Total', 170, yPos)
    yPos += 5
    pdf.line(10, yPos, 200, yPos)
    yPos += 5

    // Table rows
    pdf.setFont('helvetica', 'normal')
    saleData.items?.forEach(item => {
      pdf.text(item.name || item.code || 'Item', 10, yPos)
      pdf.text((item.quantity || 0).toString(), 80, yPos)
      pdf.text(formatCurrency(item.price || 0), 110, yPos)
      pdf.text(formatCurrency(item.total || 0), 170, yPos)
      yPos += 6

      // Page break if needed
      if (yPos > 250) {
        pdf.addPage()
        yPos = 20
      }
    })

    // Totals
    yPos += 5
    pdf.line(10, yPos, 200, yPos)
    yPos += 8

    pdf.text('Subtotal:', 150, yPos)
    pdf.text(formatCurrency(saleData.subtotal || 0), 170, yPos)
    yPos += 6

    if (saleData.tax && saleData.tax > 0) {
      pdf.text(`Tax (${saleData.taxRate || 0}%):`, 150, yPos)
      pdf.text(formatCurrency(saleData.tax), 170, yPos)
      yPos += 6
    }

    if (saleData.discount && saleData.discount > 0) {
      pdf.text('Discount:', 150, yPos)
      pdf.text(`-${formatCurrency(saleData.discount)}`, 170, yPos)
      yPos += 6
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Total:', 150, yPos)
    pdf.text(formatCurrency(saleData.total || 0), 170, yPos)
    yPos += 10

    // Payment info
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Payment Method: ${saleData.paymentMethod || 'Cash'}`, 10, yPos)
    yPos += 5

    if (saleData.cashReceived && saleData.cashReceived > 0) {
      pdf.text(`Cash Received: ${formatCurrency(saleData.cashReceived)}`, 10, yPos)
      yPos += 5
    }

    if (saleData.change && saleData.change > 0) {
      pdf.text(`Change: ${formatCurrency(saleData.change)}`, 10, yPos)
      yPos += 5
    }

    // Footer
    yPos += 10
    pdf.line(10, yPos, 200, yPos)
    yPos += 10

    pdf.setFontSize(9)
    pdf.text(shopInfo.receiptFooter || 'Thank you for your business!', 105, yPos, { align: 'center' })
    yPos += 5

    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' })

    return pdf
  }

  /**
   * Download PDF file
   */
  downloadPDF(pdf, filename) {
    pdf.save(filename)
  }

  /**
   * Get PDF as blob
   */
  getPDFBlob(pdf) {
    return pdf.output('blob')
  }
}

// Helper function for currency formatting in PDF
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator()

