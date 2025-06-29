import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Transcribe Audio Function Started ===')
    console.log('Request method:', req.method)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

    // Get OpenAI API key from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in environment variables')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'OpenAI API key not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if request is POST
    if (req.method !== 'POST') {
      console.error('Invalid request method:', req.method)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Method not allowed' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Processing transcription request...')

    // Parse FormData from request
    let formData: FormData
    try {
      formData = await req.formData()
      console.log('FormData parsed successfully')
    } catch (error) {
      console.error('Error parsing FormData:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request format. Expected FormData with audio file.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the audio file from FormData
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      console.error('No audio file found in FormData')
      console.log('FormData keys:', Array.from(formData.keys()))
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No audio file provided in the request' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Audio file received:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      lastModified: audioFile.lastModified
    })

    // Validate file size constraints
    const minSize = 100 // 100 bytes minimum
    const maxSize = 25 * 1024 * 1024 // 25MB maximum (OpenAI limit)
    
    if (audioFile.size < minSize) {
      console.error('File too small:', audioFile.size)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Audio file too small. Please record for at least 2 seconds.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (audioFile.size > maxSize) {
      console.error('File too large:', audioFile.size)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Audio file too large. Maximum size is 25MB.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate and normalize MIME type
    let mimeType = audioFile.type || 'audio/wav'
    console.log('Original MIME type:', mimeType)

    // List of supported audio formats by OpenAI Whisper
    const supportedFormats = [
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 
      'audio/webm', 'audio/ogg', 'audio/flac', 'audio/m4a'
    ]

    // Check if the MIME type is supported or starts with 'audio/'
    const isValidAudioType = supportedFormats.includes(mimeType) || 
                            mimeType.startsWith('audio/') ||
                            mimeType === 'application/octet-stream' // Sometimes browsers use this for audio

    if (!isValidAudioType) {
      console.error('Unsupported audio type:', mimeType)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Unsupported audio format: ${mimeType}. Please use WAV, MP3, MP4, WebM, or OGG.` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare the file for OpenAI API
    let filename = audioFile.name || 'recording.wav'
    
    // Ensure filename has proper extension
    if (!filename.includes('.') || filename === 'blob') {
      if (mimeType.includes('webm')) {
        filename = 'recording.webm'
      } else if (mimeType.includes('mp4')) {
        filename = 'recording.mp4'
      } else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
        filename = 'recording.mp3'
      } else if (mimeType.includes('ogg')) {
        filename = 'recording.ogg'
      } else if (mimeType.includes('wav')) {
        filename = 'recording.wav'
      } else {
        filename = 'recording.wav' // Default fallback
      }
    }

    console.log('Preparing file for OpenAI:', {
      filename: filename,
      mimeType: mimeType,
      size: audioFile.size
    })

    // Create FormData for OpenAI API
    const openaiFormData = new FormData()
    
    // Create a new File object with proper name and type for OpenAI
    const audioFileForAPI = new File([audioFile], filename, {
      type: mimeType
    })

    openaiFormData.append('file', audioFileForAPI)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('response_format', 'json')
    openaiFormData.append('language', 'en') // Specify English for better accuracy

    console.log('Sending request to OpenAI Whisper API...')

    // Call OpenAI Whisper API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        // Don't set Content-Type header - let the browser set it for FormData
      },
      body: openaiFormData,
    })

    console.log('OpenAI response received:', {
      status: openaiResponse.status,
      statusText: openaiResponse.statusText,
      ok: openaiResponse.ok
    })

    if (!openaiResponse.ok) {
      let errorData = ''
      try {
        errorData = await openaiResponse.text()
        console.error('OpenAI Whisper API error response:', errorData)
      } catch (e) {
        console.error('Could not read OpenAI error response')
      }
      
      let errorMessage = 'Failed to transcribe audio'
      if (openaiResponse.status === 400) {
        errorMessage = 'Invalid audio file format or content. The audio might be corrupted or too short.'
      } else if (openaiResponse.status === 413) {
        errorMessage = 'Audio file too large for processing'
      } else if (openaiResponse.status === 429) {
        errorMessage = 'Too many requests. Please try again later.'
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Authentication failed with OpenAI API'
      } else if (openaiResponse.status === 500) {
        errorMessage = 'OpenAI service error. Please try again later.'
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: errorData ? errorData.substring(0, 200) : undefined
        }),
        { 
          status: openaiResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the transcription response
    let transcriptionData
    try {
      transcriptionData = await openaiResponse.json()
      console.log('OpenAI transcription response:', transcriptionData)
    } catch (error) {
      console.error('Error parsing OpenAI response JSON:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid response from transcription service' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    if (!transcriptionData.text) {
      console.error('No transcription text received from OpenAI')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No speech detected in the audio. Please speak more clearly or record for longer.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const transcribedText = transcriptionData.text.trim()
    
    if (transcribedText.length === 0) {
      console.error('Empty transcription text received')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No speech detected in the audio. Please speak more clearly.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = {
      success: true,
      transcription: transcribedText,
      metadata: {
        duration: transcriptionData.duration || null,
        language: transcriptionData.language || 'en',
        transcribedAt: new Date().toISOString(),
        model: 'whisper-1',
        originalFileSize: audioFile.size,
        originalFileType: audioFile.type,
        processedFilename: filename
      }
    }

    console.log('Transcription successful:', {
      textLength: transcribedText.length,
      text: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : '')
    })

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in transcribe-audio function:', error)
    
    let errorMessage = 'Internal server error during transcription'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})