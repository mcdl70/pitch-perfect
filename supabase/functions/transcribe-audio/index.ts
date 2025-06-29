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
    } catch (error) {
      console.error('Error parsing FormData:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request format. Expected FormData.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      console.error('No audio file found in FormData')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No audio file provided' 
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
      size: audioFile.size
    })

    // Validate file type - be more permissive with MIME types
    const allowedTypes = [
      'audio/wav', 
      'audio/mp3', 
      'audio/mpeg', 
      'audio/mp4', 
      'audio/webm', 
      'audio/ogg',
      'audio/webm;codecs=opus',
      'audio/x-wav',
      'audio/x-m4a'
    ]
    
    // Also check if the type starts with 'audio/'
    const isValidAudioType = allowedTypes.includes(audioFile.type) || audioFile.type.startsWith('audio/')
    
    if (!isValidAudioType) {
      console.error('Unsupported audio type:', audioFile.type)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Unsupported audio format: ${audioFile.type}. Please use WAV, MP3, MP4, WebM, or OGG.` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check file size (OpenAI has a 25MB limit)
    const maxSize = 25 * 1024 * 1024 // 25MB in bytes
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

    // Check minimum file size (at least 1KB)
    if (audioFile.size < 1024) {
      console.error('File too small:', audioFile.size)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Audio file too small. Please record for at least 1 second.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare FormData for OpenAI API
    const openaiFormData = new FormData()
    
    // Create a new file with a proper extension for OpenAI
    let filename = audioFile.name
    if (!filename || filename === 'blob') {
      // Determine extension based on MIME type
      if (audioFile.type.includes('webm')) {
        filename = 'audio.webm'
      } else if (audioFile.type.includes('mp4')) {
        filename = 'audio.mp4'
      } else if (audioFile.type.includes('wav')) {
        filename = 'audio.wav'
      } else if (audioFile.type.includes('mp3') || audioFile.type.includes('mpeg')) {
        filename = 'audio.mp3'
      } else {
        filename = 'audio.webm' // Default fallback
      }
    }

    // Create a new File object with the correct name and type
    const audioFileForAPI = new File([audioFile], filename, {
      type: audioFile.type || 'audio/webm'
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
      },
      body: openaiFormData,
    })

    console.log('OpenAI response status:', openaiResponse.status)

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI Whisper API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        body: errorData
      })
      
      let errorMessage = 'Failed to transcribe audio'
      if (openaiResponse.status === 400) {
        errorMessage = 'Invalid audio file format or content. Please try recording again.'
      } else if (openaiResponse.status === 413) {
        errorMessage = 'Audio file too large for processing'
      } else if (openaiResponse.status === 429) {
        errorMessage = 'Too many requests. Please try again later.'
      } else if (openaiResponse.status === 401) {
        errorMessage = 'Authentication failed with OpenAI API'
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage 
        }),
        { 
          status: openaiResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const transcriptionData = await openaiResponse.json()
    console.log('OpenAI transcription response:', transcriptionData)
    
    if (!transcriptionData.text) {
      console.error('No transcription text received from OpenAI')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No transcription text received. The audio might be too quiet or unclear.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = {
      success: true,
      transcription: transcriptionData.text.trim(),
      metadata: {
        duration: transcriptionData.duration || null,
        language: transcriptionData.language || 'en',
        transcribedAt: new Date().toISOString(),
        model: 'whisper-1',
        originalFileSize: audioFile.size,
        originalFileType: audioFile.type
      }
    }

    console.log('Transcription successful:', result.transcription)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in transcribe-audio function:', error)
    
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      errorMessage = error.message
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