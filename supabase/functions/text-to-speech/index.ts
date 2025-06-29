import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TTSRequest {
  text: string
  voiceId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Eleven Labs API key from environment variables
    const elevenLabsApiKey = Deno.env.get('ELEVEN_LABS')
    if (!elevenLabsApiKey) {
      throw new Error('Eleven Labs API key not configured')
    }

    // Parse request body
    const { 
      text, 
      voiceId = 'pNInz6obpgDQGcFmaJgB', // Default to Adam voice (professional male)
      stability = 0.5,
      similarityBoost = 0.8,
      style = 0.0,
      useSpeakerBoost = true
    }: TTSRequest = await req.json()

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required for speech synthesis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate text length (Eleven Labs has limits)
    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Text too long. Maximum 5000 characters allowed.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Generating speech for text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''))
    console.log('Using voice ID:', voiceId)

    // Prepare the request body for Eleven Labs API
    const requestBody = {
      text: text.trim(),
      model_id: 'eleven_monolingual_v1', // Use the standard model for better performance
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: style,
        use_speaker_boost: useSpeakerBoost
      }
    }

    // Call Eleven Labs Text-to-Speech API
    const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey,
      },
      body: JSON.stringify(requestBody),
    })

    console.log('Eleven Labs response status:', elevenLabsResponse.status)

    if (!elevenLabsResponse.ok) {
      let errorData = ''
      try {
        errorData = await elevenLabsResponse.text()
        console.error('Eleven Labs API error response:', errorData)
      } catch (e) {
        console.error('Could not read Eleven Labs error response')
      }
      
      let errorMessage = 'Failed to generate speech'
      if (elevenLabsResponse.status === 400) {
        errorMessage = 'Invalid request parameters for speech generation'
      } else if (elevenLabsResponse.status === 401) {
        errorMessage = 'Invalid Eleven Labs API key'
      } else if (elevenLabsResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (elevenLabsResponse.status === 422) {
        errorMessage = 'Text contains unsupported characters or is too long'
      } else if (elevenLabsResponse.status === 500) {
        errorMessage = 'Eleven Labs service error. Please try again later.'
      }
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          details: errorData ? errorData.substring(0, 200) : undefined
        }),
        { 
          status: elevenLabsResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the audio data as ArrayBuffer
    const audioData = await elevenLabsResponse.arrayBuffer()
    
    if (audioData.byteLength === 0) {
      throw new Error('Received empty audio data from Eleven Labs')
    }

    console.log('Audio generated successfully, size:', audioData.byteLength, 'bytes')

    // Return the audio data directly
    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })

  } catch (error) {
    console.error('Error in text-to-speech function:', error)
    
    let errorMessage = 'Internal server error during speech generation'
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