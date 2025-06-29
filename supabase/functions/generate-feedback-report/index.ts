import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FeedbackRequest {
  jobAnalysis: {
    keySkills: string[]
    requiredExperience: string[]
    companyInfo: string
    roleResponsibilities: string[]
    interviewFocus: string[]
    difficulty: string
  }
  conversationHistory: Array<{
    role: 'interviewer' | 'candidate'
    content: string
    timestamp: string
    questionType?: string
    evaluationCriteria?: string[]
  }>
  interviewDuration: number
}

interface FeedbackReport {
  overallScore: number
  overallAssessment: string
  strengths: string[]
  areasForImprovement: string[]
  technicalSkillsAssessment: {
    score: number
    details: string
    specificSkills: Array<{
      skill: string
      rating: number
      feedback: string
    }>
  }
  behavioralSkillsAssessment: {
    score: number
    details: string
    traits: Array<{
      trait: string
      rating: number
      feedback: string
    }>
  }
  communicationSkills: {
    score: number
    clarity: number
    structure: number
    engagement: number
    feedback: string
  }
  problemSolvingApproach: {
    score: number
    methodology: string
    creativity: number
    analyticalThinking: number
    feedback: string
  }
  culturalFit: {
    score: number
    alignment: string
    feedback: string
  }
  recommendedNextSteps: string[]
  hiringRecommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire'
  confidenceLevel: number
  detailedFeedback: Array<{
    question: string
    candidateResponse: string
    evaluation: string
    score: number
    suggestions: string[]
  }>
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
      conversationHistory, 
      interviewDuration 
    }: FeedbackRequest = await req.json()

    if (!jobAnalysis || !conversationHistory || conversationHistory.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Job analysis and conversation history are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // System prompt for feedback generation
    const systemPrompt = `You are a senior hiring manager and interview expert with 20+ years of experience evaluating candidates across all industries and levels. Your task is to provide comprehensive, fair, and actionable feedback based on interview performance.

EVALUATION FRAMEWORK:
You must assess candidates across multiple dimensions using a holistic approach:

1. TECHNICAL SKILLS (40% weight for technical roles, 25% for non-technical)
   - Domain knowledge depth and accuracy
   - Problem-solving methodology
   - Technical communication ability
   - Hands-on experience demonstration
   - Learning agility and adaptability

2. BEHAVIORAL SKILLS (30% weight)
   - Leadership and initiative
   - Teamwork and collaboration
   - Adaptability and resilience
   - Work ethic and motivation
   - Conflict resolution abilities

3. COMMUNICATION SKILLS (20% weight)
   - Clarity and articulation
   - Active listening
   - Structure and organization of responses
   - Engagement and rapport building
   - Question asking and curiosity

4. CULTURAL FIT (10% weight)
   - Alignment with company values
   - Work style compatibility
   - Growth mindset
   - Enthusiasm for role and company

SCORING SYSTEM:
- Use a 1-10 scale for all assessments
- 9-10: Exceptional, top 5% of candidates
- 7-8: Strong, above average performance
- 5-6: Meets expectations, average performance
- 3-4: Below expectations, concerns present
- 1-2: Significant deficiencies, not suitable

FEEDBACK PRINCIPLES:
- Be specific and evidence-based
- Provide actionable improvement suggestions
- Balance constructive criticism with recognition of strengths
- Consider the candidate's experience level and role requirements
- Avoid bias and focus on job-relevant criteria
- Include specific examples from the interview

HIRING RECOMMENDATIONS:
- STRONG_HIRE: Exceptional candidate, immediate offer
- HIRE: Good candidate, recommend moving forward
- NO_HIRE: Does not meet requirements, pass
- STRONG_NO_HIRE: Significant concerns, definitely pass

Your response must be a comprehensive JSON object with detailed analysis and specific feedback for each area assessed.`

    // Build conversation summary
    const conversationSummary = conversationHistory.map((entry, index) => {
      return `${index + 1}. ${entry.role.toUpperCase()}: ${entry.content}`
    }).join('\n\n')

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
          content: `POSITION REQUIREMENTS:
Key Skills: ${jobAnalysis.keySkills.join(', ')}
Required Experience: ${jobAnalysis.requiredExperience.join(', ')}
Company Context: ${jobAnalysis.companyInfo}
Role Responsibilities: ${jobAnalysis.roleResponsibilities.join(', ')}
Focus Areas: ${jobAnalysis.interviewFocus.join(', ')}
Position Level: ${jobAnalysis.difficulty}

INTERVIEW DETAILS:
Duration: ${interviewDuration} minutes
Total Exchanges: ${conversationHistory.length}

COMPLETE INTERVIEW TRANSCRIPT:
${conversationSummary}

Please provide a comprehensive feedback report in JSON format. Analyze the candidate's performance across all dimensions, provide specific examples from their responses, and give actionable feedback for improvement. Be thorough, fair, and constructive in your assessment.`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
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
    const feedbackContent = openaiData.choices[0]?.message?.content

    if (!feedbackContent) {
      throw new Error('No feedback content received from OpenAI')
    }

    // Parse the JSON response from OpenAI
    let feedbackResult: FeedbackReport
    try {
      feedbackResult = JSON.parse(feedbackContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', feedbackContent)
      throw new Error('Invalid JSON response from feedback generator')
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: feedbackResult,
        metadata: {
          generatedAt: new Date().toISOString(),
          interviewDuration,
          totalExchanges: conversationHistory.length,
          model: 'gpt-4'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in generate-feedback-report function:', error)
    
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