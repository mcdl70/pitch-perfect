import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  Mic, 
  Square, 
  Loader2, 
  AlertTriangle,
  MicOff 
} from 'lucide-react'
import { toast } from 'sonner'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ 
  input, 
  setInput, 
  handleSubmit, 
  isLoading, 
  disabled = false,
  placeholder = "Speak your response using the microphone or type here for confirmation..."
}: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingError, setRecordingError] = useState('')
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getSupportedMimeType = () => {
    // Try different MIME types in order of preference for OpenAI compatibility
    const types = [
      'audio/wav',
      'audio/mp4',
      'audio/mpeg',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Selected MIME type:', type)
        return type
      }
    }
    
    console.log('Using fallback MIME type: audio/webm')
    return 'audio/webm'
  }

  const startRecording = async () => {
    setRecordingError('')
    
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser')
      }

      // Request microphone access with optimized constraints for speech
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Higher quality for better transcription
          channelCount: 1, // Mono audio
        } 
      })

      streamRef.current = stream

      // Get supported MIME type
      const mimeType = getSupportedMimeType()

      // Create MediaRecorder instance with optimized settings
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
          console.log('Audio chunk received:', event.data.size, 'bytes')
        }
      }

      recorder.onstop = async () => {
        console.log('Recording stopped, processing audio...')
        
        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        
        // Check if we have enough data
        if (chunks.length === 0) {
          setRecordingError('No audio data recorded. Please try again.')
          return
        }
        
        // Create audio blob
        const audioBlob = new Blob(chunks, { type: mimeType })
        
        console.log('Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: chunks.length,
          duration: recordingTime
        })
        
        // Check minimum requirements
        if (audioBlob.size < 1024) {
          setRecordingError('Recording too short or empty. Please record for at least 2 seconds.')
          return
        }
        
        if (recordingTime < 1) {
          setRecordingError('Recording too short. Please record for at least 2 seconds.')
          return
        }
        
        // Transcribe the audio
        await transcribeAudio(audioBlob, mimeType)
        
        // Reset state
        setRecordingTime(0)
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setRecordingError('Recording failed. Please try again.')
        stopRecording()
      }

      // Start recording with frequent data collection
      recorder.start(100) // Collect data every 100ms
      setMediaRecorder(recorder)
      setIsRecording(true)

      // Start timer
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast.success('🎙️ Recording started - speak clearly into your microphone')

    } catch (error) {
      console.error('Error starting recording:', error)
      
      let errorMessage = 'Failed to start recording'
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.'
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = 'No microphone found. Please connect a microphone and try again.'
        } else if (error.message.includes('not supported')) {
          errorMessage = error.message
        }
      }
      
      setRecordingError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('Stopping recording...')
      mediaRecorder.stop()
    }
    
    setIsRecording(false)
    setMediaRecorder(null)
    
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    
    // Stop stream if still active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    toast.success('🔄 Recording stopped, processing...')
  }

  const transcribeAudio = async (audioBlob: Blob, originalMimeType: string) => {
    setIsTranscribing(true)
    setRecordingError('')

    try {
      console.log('Starting transcription process...')
      
      // Determine the best filename and format for OpenAI
      let filename = 'recording.wav'
      let finalMimeType = originalMimeType
      
      if (originalMimeType.includes('mp4')) {
        filename = 'recording.mp4'
      } else if (originalMimeType.includes('mpeg') || originalMimeType.includes('mp3')) {
        filename = 'recording.mp3'
      } else if (originalMimeType.includes('webm')) {
        filename = 'recording.webm'
      } else if (originalMimeType.includes('ogg')) {
        filename = 'recording.ogg'
      } else if (originalMimeType.includes('wav')) {
        filename = 'recording.wav'
      }

      console.log('Preparing audio file:', {
        originalSize: audioBlob.size,
        originalType: originalMimeType,
        filename: filename,
        finalType: finalMimeType
      })

      // Create FormData with the audio file
      const formData = new FormData()
      
      // Create a proper File object with correct MIME type
      const audioFile = new File([audioBlob], filename, {
        type: finalMimeType
      })
      
      formData.append('audio', audioFile)

      console.log('Sending transcription request to Supabase Edge Function...')

      // Send to transcription endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      })

      console.log('Transcription response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
          console.error('Transcription error response body:', errorText)
        } catch (e) {
          console.error('Could not read error response body')
        }
        
        let errorMessage = 'Failed to transcribe audio'
        if (response.status === 400) {
          errorMessage = 'Invalid audio format. Please try recording again with a different browser or device.'
        } else if (response.status === 413) {
          errorMessage = 'Audio file too large. Please record a shorter message.'
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'Authentication error. Please refresh the page and try again.'
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again or use text input instead.'
        }
        
        throw new Error(`${errorMessage} (Status: ${response.status})`)
      }

      const data = await response.json()
      console.log('Transcription response data:', data)

      if (!data.success) {
        throw new Error(data.error || 'Transcription failed')
      }

      // Update input with transcribed text
      const transcribedText = data.transcription
      if (transcribedText && transcribedText.trim()) {
        // Replace the input with the transcription (voice-first approach)
        setInput(transcribedText)
        toast.success(`✅ "${transcribedText.substring(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`)
      } else {
        toast.warning('No speech detected in the recording. Please try speaking more clearly.')
      }

    } catch (error) {
      console.error('Error transcribing audio:', error)
      
      let errorMessage = 'Failed to transcribe audio. Please try again or use text input.'
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('format') || error.message.includes('Invalid audio')) {
          errorMessage = 'Audio format not supported. Please try recording again or use text input.'
        } else if (error.message.includes('large')) {
          errorMessage = 'Recording too long. Please record a shorter message.'
        } else if (error.message.includes('requests') || error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('403')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.'
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later or use text input.'
        } else {
          errorMessage = error.message
        }
      }
      
      setRecordingError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Prevent recording if it's too short
  const canStopRecording = recordingTime >= 2

  return (
    <div className="space-y-3">
      {/* Recording Error Alert */}
      {recordingError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{recordingError}</AlertDescription>
        </Alert>
      )}

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-red-50 border border-red-200 rounded-lg p-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>🎙️ Recording... {formatRecordingTime(recordingTime)}</span>
          {recordingTime < 2 && (
            <span className="text-xs text-orange-600">(minimum 2 seconds)</span>
          )}
        </div>
      )}

      {/* Transcribing Status */}
      {isTranscribing && (
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>🔄 Transcribing audio...</span>
        </div>
      )}

      {/* Input Area - Voice-First Layout */}
      <div className="flex space-x-2">
        {/* Large Voice Recording Button - Primary Input Method */}
        <Button
          type="button"
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          onClick={isRecording ? (canStopRecording ? stopRecording : undefined) : startRecording}
          disabled={disabled || isLoading || isTranscribing || (isRecording && !canStopRecording)}
          className="px-6"
          title={
            isRecording 
              ? (canStopRecording ? "Stop recording" : "Recording... (minimum 2 seconds)")
              : "Start voice recording (Primary input method)"
          }
        >
          {isRecording ? (
            <>
              <Square className="h-5 w-5 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-5 w-5 mr-2" />
              Record
            </>
          )}
        </Button>

        {/* Text Input - Secondary/Confirmation Method */}
        <div className="flex-1 flex space-x-2">
          <Textarea
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled || isLoading || isTranscribing}
            rows={2}
            className="flex-1 resize-none text-sm"
          />
          
          {/* Send Button */}
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || isTranscribing || disabled}
            size="sm"
            variant="outline"
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        🎙️ <strong>Voice-First:</strong> Click "Record" to speak your response, or type for confirmation. 
        Press Enter to send, Shift+Enter for new line.
      </p>
    </div>
  )
}