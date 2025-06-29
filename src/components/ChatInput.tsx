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
        console.log('🎙️ [RECORDING] Selected MIME type:', type)
        return type
      }
    }
    
    console.log('🎙️ [RECORDING] Using fallback MIME type: audio/webm')
    return 'audio/webm'
  }

  const startRecording = async () => {
    console.log('🎙️ [RECORDING] Starting recording process...')
    setRecordingError('')
    
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser')
      }

      console.log('🎙️ [RECORDING] Requesting microphone access...')
      
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

      console.log('🎙️ [RECORDING] Microphone access granted, stream tracks:', stream.getTracks().length)
      streamRef.current = stream

      // Get supported MIME type
      const mimeType = getSupportedMimeType()
      console.log('🎙️ [RECORDING] Final MIME type selected:', mimeType)

      // Create MediaRecorder instance with optimized settings
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      })

      console.log('🎙️ [RECORDING] MediaRecorder created with state:', recorder.state)

      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        console.log('🎙️ [RECORDING] Data available event fired:', {
          dataSize: event.data.size,
          dataType: event.data.type,
          chunksCount: chunks.length + 1
        })
        
        if (event.data.size > 0) {
          chunks.push(event.data)
          console.log('🎙️ [RECORDING] Audio chunk added:', event.data.size, 'bytes, total chunks:', chunks.length)
        } else {
          console.warn('🎙️ [RECORDING] Received empty data chunk!')
        }
      }

      recorder.onstop = async () => {
        console.log('🎙️ [RECORDING] Recording stopped, processing audio...')
        console.log('🎙️ [RECORDING] Final state:', {
          chunksLength: chunks.length,
          recordingTime: recordingTime,
          totalChunkSizes: chunks.map(chunk => chunk.size),
          streamActive: streamRef.current?.active
        })
        
        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('🎙️ [RECORDING] Stopping track:', track.kind, track.readyState)
            track.stop()
          })
          streamRef.current = null
        }
        
        // Check if we have enough data
        if (chunks.length === 0) {
          console.error('🎙️ [RECORDING] No chunks collected!')
          setRecordingError('No audio data recorded. Please try again.')
          return
        }
        
        // Create audio blob
        const audioBlob = new Blob(chunks, { type: mimeType })
        
        console.log('🎙️ [RECORDING] Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: chunks.length,
          duration: recordingTime,
          chunkSizes: chunks.map(c => c.size)
        })
        
        // Check minimum requirements
        if (audioBlob.size < 1024) {
          console.error('🎙️ [RECORDING] Audio blob too small:', audioBlob.size, 'bytes')
          setRecordingError('Recording too short or empty. Please record for at least 2 seconds.')
          return
        }
        
        if (recordingTime < 1) {
          console.error('🎙️ [RECORDING] Recording time too short:', recordingTime, 'seconds')
          setRecordingError('Recording too short. Please record for at least 2 seconds.')
          return
        }
        
        console.log('🎙️ [RECORDING] Audio blob validation passed, starting transcription...')
        
        // Transcribe the audio
        await transcribeAudio(audioBlob, mimeType)
        
        // Reset state
        setRecordingTime(0)
      }

      recorder.onerror = (event) => {
        console.error('🎙️ [RECORDING] MediaRecorder error:', event)
        setRecordingError('Recording failed. Please try again.')
        stopRecording()
      }

      recorder.onstart = () => {
        console.log('🎙️ [RECORDING] MediaRecorder started successfully')
      }

      recorder.onpause = () => {
        console.log('🎙️ [RECORDING] MediaRecorder paused')
      }

      recorder.onresume = () => {
        console.log('🎙️ [RECORDING] MediaRecorder resumed')
      }

      // Start recording with frequent data collection
      console.log('🎙️ [RECORDING] Starting MediaRecorder...')
      recorder.start(100) // Collect data every 100ms
      setMediaRecorder(recorder)
      setIsRecording(true)

      // Start timer
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1
          console.log('🎙️ [RECORDING] Timer tick:', newTime, 'seconds')
          return newTime
        })
      }, 1000)

      toast.success('🎙️ Recording started - speak clearly into your microphone')

    } catch (error) {
      console.error('🎙️ [RECORDING] Error starting recording:', error)
      
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
    console.log('🎙️ [RECORDING] Stop recording requested, current state:', {
      isRecording,
      mediaRecorderState: mediaRecorder?.state,
      recordingTime,
      hasTimer: !!recordingTimerRef.current
    })
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎙️ [RECORDING] Stopping MediaRecorder...')
      mediaRecorder.stop()
    } else {
      console.warn('🎙️ [RECORDING] MediaRecorder not in recording state:', mediaRecorder?.state)
    }
    
    setIsRecording(false)
    setMediaRecorder(null)
    
    // Clear timer
    if (recordingTimerRef.current) {
      console.log('🎙️ [RECORDING] Clearing recording timer')
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    
    // Stop stream if still active
    if (streamRef.current) {
      console.log('🎙️ [RECORDING] Stopping remaining stream tracks')
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    toast.success('🔄 Recording stopped, processing...')
  }

  const transcribeAudio = async (audioBlob: Blob, originalMimeType: string) => {
    console.log('🔄 [TRANSCRIPTION] Starting transcription process...')
    setIsTranscribing(true)
    setRecordingError('')

    try {
      console.log('🔄 [TRANSCRIPTION] Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type,
        originalMimeType
      })
      
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

      console.log('🔄 [TRANSCRIPTION] Preparing audio file:', {
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

      console.log('🔄 [TRANSCRIPTION] Sending transcription request to Supabase Edge Function...')

      // Send to transcription endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      })

      console.log('🔄 [TRANSCRIPTION] Transcription response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
          console.error('🔄 [TRANSCRIPTION] Error response body:', errorText)
        } catch (e) {
          console.error('🔄 [TRANSCRIPTION] Could not read error response body')
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
      console.log('🔄 [TRANSCRIPTION] Transcription response data:', data)

      if (!data.success) {
        throw new Error(data.error || 'Transcription failed')
      }

      // Update input with transcribed text
      const transcribedText = data.transcription
      if (transcribedText && transcribedText.trim()) {
        // Replace the input with the transcription (voice-first approach)
        setInput(transcribedText)
        console.log('🔄 [TRANSCRIPTION] Transcription successful:', transcribedText)
        toast.success(`✅ "${transcribedText.substring(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`)
      } else {
        console.warn('🔄 [TRANSCRIPTION] Empty transcription received')
        toast.warning('No speech detected in the recording. Please try speaking more clearly.')
      }

    } catch (error) {
      console.error('🔄 [TRANSCRIPTION] Error transcribing audio:', error)
      
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