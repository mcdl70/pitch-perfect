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

  const startRecording = async () => {
    setRecordingError('')
    
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser')
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      })

      // Create MediaRecorder instance
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
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
        
        // Create audio blob
        const audioBlob = new Blob(chunks, { 
          type: recorder.mimeType || 'audio/webm' 
        })
        
        // Transcribe the audio
        await transcribeAudio(audioBlob)
        
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
      recorder.start(1000) // Collect data every second
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

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setRecordingError('')

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      // Send to transcription endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

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
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('413')) {
          errorMessage = 'Audio file too large. Please record a shorter message.'
        } else if (error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (error.message.includes('format')) {
          errorMessage = 'Unsupported audio format. Please try recording again.'
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
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isLoading || isTranscribing}
            className="self-end"
            title={isRecording ? "Stop recording" : "Start voice recording"}
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