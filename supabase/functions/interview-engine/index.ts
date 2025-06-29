import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InterviewRequest {
  jobAnalysis: {
    keySkills?: string[]
    requiredExperience?: string[]
    companyInfo?: string
    roleResponsibilities?: string[]
    interviewFocus?: string[]
    difficulty?: string
  }
  candidateResponse?: string
  conversationHistory?: Array<{
    role: 'interviewer' | 'candidate'
    content: string
    timestamp: string
  }>
  interviewStage: 'start' | 'technical' | 'behavioral' | 'situational' | 'closing'
}

interface InterviewResponse {
  question: string
  questionType: 'technical' | 'behavioral' | 'situational' | 'opening' | 'closing'
  expectedAnswerPoints: string[]
  followUpQuestions?: string[]
  evaluationCriteria: string[]
  difficulty: number
  timeAllocation: number
  nextStage?: string
  interviewComplete?: boolean
}

// Helper function to safely join arrays with fallback
const safeJoin = (arr: string[] | undefined | null, separator: string = ', ', fallback: string = 'Not specified'): string => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return fallback
  }
  return arr.join(separator)
}

// Helper function to safely get string value
const safeString = (value: string | undefined | null, fallback: string = 'Not specified'): string => {
  return value && typeof value === 'string' ? value : fallback
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

    // Parse request body
    const { 
      jobAnalysis, 
      candidateResponse, 
      conversationHistory = [], 
      interviewStage 
    }: InterviewRequest = await req.json()

    if (!jobAnalysis) {
      return new Response(
        JSON.stringify({ error: 'Job analysis is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // System prompt for interview engine
    const systemPrompt = `You are an expert technical interviewer and hiring manager with 15+ years of experience conducting interviews across all levels and industries. Your role is to conduct a comprehensive, fair, and engaging interview that accurately assesses a candidate's fit for the position.

INTERVIEW METHODOLOGY:
- Ask one thoughtful, well-crafted question at a time
- Tailor questions to the specific job requirements and candidate level
- Progress logically through different interview stages
- Adapt difficulty based on candidate responses
- Maintain a professional yet conversational tone
- Probe deeper when answers are surface-level
- Recognize and acknowledge good answers

INTERVIEW STAGES:
1. OPENING: Warm welcome, role overview, set expectations
2. TECHNICAL: Core technical skills, problem-solving, domain knowledge
3. BEHAVIORAL: Past experiences, soft skills, cultural fit
4. SITUATIONAL: Hypothetical scenarios, decision-making
5. CLOSING: Candidate questions, next steps

QUESTION TYPES TO USE:
- Technical: Specific to role requirements, hands-on problems
- Behavioral: "Tell me about a time when..." format
- Situational: "How would you handle..." scenarios
- Probing: Follow-up questions to dig deeper

EVALUATION CRITERIA:
- Technical competency and depth of knowledge
- Problem-solving approach and methodology
- Communication clarity and structure
- Cultural fit and soft skills
- Growth mindset and learning ability
- Leadership potential (for senior roles)

RESPONSE FORMAT:
Always respond with a JSON object containing:
- question: The next interview question
- questionType: Category of question
- expectedAnswerPoints: Key points a strong answer should include
- followUpQuestions: Potential follow-up questions based on their answer
- evaluationCriteria: What to look for in their response
- difficulty: Scale 1-10
- timeAllocation: Suggested time in minutes
- nextStage: What stage comes next (if applicable)
- interviewComplete: Boolean if interview should end

IMPORTANT GUIDELINES:
- Keep questions focused and specific
- Avoid leading questions or giving away answers
- Be inclusive and avoid bias
- Adapt to candidate's experience level
- Build rapport while maintaining professionalism
- End interviews gracefully with clear next steps`

    // Build conversation context
    let conversationContext = ''
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nCONVERSATION HISTORY:\n'
      conversationHistory.forEach(entry => {
        conversationContext += `${entry.role.toUpperCase()}: ${entry.content}\n`
      })
    }

    if (candidateResponse) {
      conversationContext += `\nCANDIDATE'S LATEST RESPONSE: ${candidateResponse}\n`
    }

    // Safely construct the position details with fallbacks
    const positionDetails = `POSITION DETAILS:
Key Skills Required: ${safeJoin(jobAnalysis.keySkills, ', ', 'General skills assessment')}
Required Experience: ${safeJoin(jobAnalysis.requiredExperience, ', ', 'Experience level to be determined')}
Company Info: ${safeString(jobAnalysis.companyInfo, 'Company details not provided')}
Role Responsibilities: ${safeJoin(jobAnalysis.roleResponsibilities, ', ', 'Standard role responsibilities')}
Interview Focus Areas: ${safeJoin(jobAnalysis.interviewFocus, ', ', 'Comprehensive assessment')}
Position Level: ${safeString(jobAnalysis.difficulty, 'mid-level')}

CURRENT INTERVIEW STAGE: ${interviewStage}

${conversationContext}

Please provide the next interview question as a JSON response. Consider the conversation flow, candidate's responses so far, and ensure we're progressing appropriately through the interview stages.`

    // Prepare the API request
    const apiRequest = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: positionDetails
        }
      ],
      temperature: 0.4,
      max_tokens: 1500
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequest),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const interviewContent = openaiData.choices[0]?.message?.content

    if (!interviewContent) {
      throw new Error('No interview content received from OpenAI')
    }

    // Parse the JSON response from OpenAI
    let interviewResult: InterviewResponse
    try {
      interviewResult = JSON.parse(interviewContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', interviewContent)
      throw new Error('Invalid JSON response from interview engine')
    }

    return new Response(
      JSON.stringify({
        success: true,
        interview: interviewResult,
        metadata: {
          stage: interviewStage,
          questionCount: conversationHistory.filter(h => h.role === 'interviewer').length + 1,
          timestamp: new Date().toISOString(),
          model: 'gpt-4'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in interview-engine function:', error)
    
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