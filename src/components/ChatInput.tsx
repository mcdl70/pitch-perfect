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
  placeholder = "Type your response here... (Press Enter to send, Shift+Enter for new line)"
}: ChatInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingError, setRecordingError] = useState('')
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getSupportedMimeType = () => {
    // Try different MIME types in order of preference
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    // Fallback to default
    return 'audio/webm'
  }

  const startRecording = async () => {
    setRecordingError('')
    
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser')
      }

      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Lower sample rate for better compatibility
          channelCount: 1, // Mono audio
        } 
      })

      // Get supported MIME type
      const mimeType = getSupportedMimeType()
      console.log('Using MIME type:', mimeType)

      // Create MediaRecorder instance
      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Set bit rate for consistent quality
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
        
        // Check if we have enough data
        if (chunks.length === 0) {
          setRecordingError('No audio data recorded. Please try again.')
          return
        }
        
        // Create audio blob with explicit type
        const audioBlob = new Blob(chunks, { 
          type: mimeType
        })
        
        // Check minimum file size (at least 1KB)
        if (audioBlob.size < 1024) {
          setRecordingError('Recording too short. Please record for at least 1 second.')
          return
        }
        
        console.log('Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          duration: recordingTime
        })
        
        // Transcribe the audio
        await transcribeAudio(audioBlob, mimeType)
        
        // Reset state
        setAudioChunks([])
        setRecordingTime(0)
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setRecordingError('Recording failed. Please try again.')
        stopRecording()
      }

      // Start recording
      recorder.start(250) // Collect data every 250ms for better quality
      setMediaRecorder(recorder)
      setIsRecording(true)
      setAudioChunks(chunks)

      // Start timer
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast.success('Recording started')

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
      mediaRecorder.stop()
    }
    
    setIsRecording(false)
    setMediaRecorder(null)
    
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    
    toast.success('Recording stopped')
  }

  const transcribeAudio = async (audioBlob: Blob, originalMimeType: string) => {
    setIsTranscribing(true)
    setRecordingError('')

    try {
      // Convert to a more compatible format if needed
      let finalBlob = audioBlob
      let filename = 'recording.webm'
      
      // Determine file extension based on MIME type
      if (originalMimeType.includes('mp4')) {
        filename = 'recording.mp4'
      } else if (originalMimeType.includes('wav')) {
        filename = 'recording.wav'
      } else if (originalMimeType.includes('webm')) {
        filename = 'recording.webm'
      }

      console.log('Preparing to transcribe:', {
        size: finalBlob.size,
        type: finalBlob.type,
        filename: filename
      })

      // Create FormData with proper file structure
      const formData = new FormData()
      
      // Create a proper File object instead of just appending the blob
      const audioFile = new File([finalBlob], filename, {
        type: finalBlob.type || 'audio/webm'
      })
      
      formData.append('audio', audioFile)

      console.log('Sending transcription request...')

      // Send to transcription endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      })

      console.log('Transcription response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Transcription error response:', errorText)
        
        let errorMessage = 'Failed to transcribe audio'
        if (response.status === 400) {
          errorMessage = 'Invalid audio format or file. Please try recording again.'
        } else if (response.status === 413) {
          errorMessage = 'Audio file too large. Please record a shorter message.'
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Transcription response:', data)

      if (!data.success) {
        throw new Error(data.error || 'Failed to transcribe audio')
      }

      // Update input with transcribed text
      const transcribedText = data.transcription
      if (transcribedText && transcribedText.trim()) {
        // If there's existing text, add a space before the transcription
        const newText = input.trim() ? `${input} ${transcribedText}` : transcribedText
        setInput(newText)
        toast.success('Audio transcribed successfully!')
      } else {
        toast.warning('No speech detected in the recording')
      }

    } catch (error) {
      console.error('Error transcribing audio:', error)
      
      let errorMessage = 'Failed to transcribe audio. Please try again.'
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('format') || error.message.includes('Invalid audio')) {
          errorMessage = 'Audio format not supported. Please try recording again.'
        } else if (error.message.includes('large')) {
          errorMessage = 'Recording too long. Please record a shorter message.'
        } else if (error.message.includes('requests')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
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
  const canStopRecording = recordingTime >= 1

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
          <span>Recording... {formatRecordingTime(recordingTime)}</span>
          {recordingTime < 1 && (
            <span className="text-xs text-orange-600">(minimum 1 second)</span>
          )}
        </div>
      )}

      {/* Transcribing Status */}
      {isTranscribing && (
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Transcribing audio...</span>
        </div>
      )}

      {/* Input Area */}
      <div className="flex space-x-2">
        <Textarea
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || isLoading || isTranscribing}
          rows={2}
          className="flex-1 resize-none"
        />
        
        <div className="flex flex-col space-y-2">
          {/* Voice Recording Button */}
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            onClick={isRecording ? (canStopRecording ? stopRecording : undefined) : startRecording}
            disabled={disabled || isLoading || isTranscribing || (isRecording && !canStopRecording)}
            className="self-end"
            title={
              isRecording 
                ? (canStopRecording ? "Stop recording" : "Recording... (minimum 1 second)")
                : "Start voice recording"
            }
          >
            {isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>

          {/* Send Button */}
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading || isTranscribing || disabled}
            size="sm"
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
        Press Enter to send, Shift+Enter for new line, or use the microphone to record your response
      </p>
    </div>
  )
}