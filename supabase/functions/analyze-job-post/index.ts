import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface JobPostRequest {
  jobDescription: string
  companyName?: string
  jobTitle?: string
}

interface JobAnalysisResponse {
  keySkills: string[]
  requiredExperience: string[]
  companyInfo: string
  roleResponsibilities: string[]
  interviewFocus: string[]
  difficulty: 'entry' | 'mid' | 'senior' | 'executive'
  estimatedSalaryRange?: string
  workArrangement?: string
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
    const { jobDescription, companyName, jobTitle }: JobPostRequest = await req.json()

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate job description length and content
    if (jobDescription.trim().length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Job description must be at least 50 characters long. Please provide a more detailed job description.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // System prompt for job post analysis
    const systemPrompt = `You are an expert HR analyst and technical recruiter with deep knowledge across all industries and job functions. Your task is to analyze job postings and extract key information that will be used to generate targeted interview questions.

Analyze the provided job posting and extract the following information:

1. KEY SKILLS: Identify the most important technical and soft skills mentioned or implied
2. REQUIRED EXPERIENCE: Extract specific experience requirements, years, technologies, methodologies
3. COMPANY INFO: Summarize what you can infer about the company culture, size, industry, values
4. ROLE RESPONSIBILITIES: List the main duties and responsibilities of the position
5. INTERVIEW FOCUS: Predict what areas the interview will likely focus on based on the job requirements
6. DIFFICULTY LEVEL: Assess if this is entry-level, mid-level, senior, or executive position
7. SALARY RANGE: If mentioned or if you can reasonably estimate based on role/location
8. WORK ARRANGEMENT: Remote, hybrid, on-site, or flexible

IMPORTANT GUIDELINES:
- Provide your analysis in a structured JSON format
- Be thorough but concise
- Focus on actionable insights that would help someone prepare for an interview for this role
- If the job posting is vague or lacks detail, make reasonable inferences based on the job title and industry standards, but note when you're making assumptions
- Ensure all arrays contain at least 3-5 relevant items
- Make the analysis comprehensive enough to generate meaningful interview questions

REQUIRED JSON STRUCTURE:
{
  "keySkills": ["skill1", "skill2", "skill3", ...],
  "requiredExperience": ["experience1", "experience2", "experience3", ...],
  "companyInfo": "detailed company information",
  "roleResponsibilities": ["responsibility1", "responsibility2", "responsibility3", ...],
  "interviewFocus": ["focus1", "focus2", "focus3", ...],
  "difficulty": "entry|mid|senior|executive",
  "estimatedSalaryRange": "salary range if available",
  "workArrangement": "work arrangement details"
}`

    // Prepare the API request
    const apiRequest = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Please analyze this job posting:

Job Title: ${jobTitle || 'Not specified'}
Company: ${companyName || 'Not specified'}

Job Description:
${jobDescription}

Please provide a comprehensive analysis in JSON format that will be used to create personalized interview questions and preparation materials.`
        }
      ],
      temperature: 0.3,
      max_tokens: 16000
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
    const analysisContent = openaiData.choices[0]?.message?.content

    if (!analysisContent) {
      throw new Error('No analysis content received from OpenAI')
    }

    // Parse the JSON response from OpenAI
    let analysisResult: JobAnalysisResponse
    try {
      // Clean the response to extract JSON if it's wrapped in markdown or other text
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : analysisContent
      analysisResult = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', analysisContent)
      throw new Error('Invalid JSON response from analysis. The job description may be too short or unclear.')
    }

    // Validate the analysis result
    if (!analysisResult.keySkills || !Array.isArray(analysisResult.keySkills) || analysisResult.keySkills.length === 0) {
      throw new Error('Analysis incomplete. Please provide a more detailed job description.')
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
        metadata: {
          analyzedAt: new Date().toISOString(),
          model: 'gpt-4o',
          inputLength: jobDescription.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in analyze-job-post function:', error)
    
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