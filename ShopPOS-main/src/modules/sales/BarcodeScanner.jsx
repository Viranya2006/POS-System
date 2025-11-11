import React, { useRef, useEffect, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Camera, CameraOff, Scan } from 'lucide-react'

const BarcodeScanner = ({ onScan, onError }) => {
  const videoRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [codeReader, setCodeReader] = useState(null)
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    setCodeReader(reader)

    // Get available video devices
    reader.listVideoInputDevices()
      .then((videoInputDevices) => {
        setDevices(videoInputDevices)
        if (videoInputDevices.length > 0) {
          setSelectedDevice(videoInputDevices[0].deviceId)
        }
      })
      .catch((err) => {
        console.error('Error listing video devices:', err)
        setError('Unable to access camera devices')
      })

    return () => {
      if (reader) {
        reader.reset()
      }
    }
  }, [])

  const startScanning = async () => {
    if (!codeReader || !selectedDevice) {
      setError('Camera not available')
      return
    }

    try {
      setIsScanning(true)
      setError('')

      const result = await codeReader.decodeOnceFromVideoDevice(selectedDevice, videoRef.current)
      
      if (result) {
        onScan(result.getText())
        stopScanning()
      }
    } catch (err) {
      console.error('Scanning error:', err)
      setError('Error scanning barcode: ' + err.message)
      if (onError) {
        onError(err)
      }
    }
  }

  const stopScanning = () => {
    if (codeReader) {
      codeReader.reset()
    }
    setIsScanning(false)
  }

  const handleDeviceChange = (deviceId) => {
    setSelectedDevice(deviceId)
    if (isScanning) {
      stopScanning()
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Scan className="h-5 w-5 mr-2" />
          Barcode Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera Selection */}
        {devices.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Camera:</label>
            <select
              value={selectedDevice}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video Preview */}
        <div className="relative">
          <video
            ref={videoRef}
            className={`w-full h-48 bg-black rounded-lg ${isScanning ? 'video-visible' : 'video-hidden'}`}
          />
          
          {!isScanning && (
            <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Camera preview will appear here</p>
              </div>
            </div>
          )}

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-32 border-2 border-red-500 rounded-lg relative">
                <div className="scan-corner scan-corner-tl"></div>
                <div className="scan-corner scan-corner-tr"></div>
                <div className="scan-corner scan-corner-bl"></div>
                <div className="scan-corner scan-corner-br"></div>
                
                {/* Scanning Line Animation */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-2">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              disabled={!selectedDevice}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="outline"
              className="flex-1"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Position the barcode within the red frame</p>
          <p>• Ensure good lighting for better scanning</p>
          <p>• Hold steady until the barcode is detected</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default BarcodeScanner
