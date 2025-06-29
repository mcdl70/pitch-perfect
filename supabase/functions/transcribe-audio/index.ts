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
      throw new Error('OpenAI API key not configured')
    }

    // Check if request is POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse FormData from request
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg']
    if (!allowedTypes.includes(audioFile.type)) {
      return new Response(
        JSON.stringify({ error: 'Unsupported audio format. Please use WAV, MP3, MP4, WebM, or OGG.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check file size (OpenAI has a 25MB limit)
    const maxSize = 25 * 1024 * 1024 // 25MB in bytes
    if (audioFile.size > maxSize) {
      return new Response(
        JSON.stringify({ error: 'Audio file too large. Maximum size is 25MB.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare FormData for OpenAI API
    const openaiFormData = new FormData()
    openaiFormData.append('file', audioFile)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('response_format', 'json')
    openaiFormData.append('language', 'en') // Optional: specify language for better accuracy

    // Call OpenAI Whisper API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: openaiFormData,
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI Whisper API error:', errorData)
      
      let errorMessage = 'Failed to transcribe audio'
      if (openaiResponse.status === 400) {
        errorMessage = 'Invalid audio file or format'
      } else if (openaiResponse.status === 413) {
        errorMessage = 'Audio file too large'
      } else if (openaiResponse.status === 429) {
        errorMessage = 'Too many requests. Please try again later.'
      }
      
      throw new Error(errorMessage)
    }

    const transcriptionData = await openaiResponse.json()
    
    if (!transcriptionData.text) {
      throw new Error('No transcription text received')
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription: transcriptionData.text.trim(),
        metadata: {
          duration: transcriptionData.duration || null,
          language: transcriptionData.language || 'en',
          transcribedAt: new Date().toISOString(),
          model: 'whisper-1'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in transcribe-audio function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})