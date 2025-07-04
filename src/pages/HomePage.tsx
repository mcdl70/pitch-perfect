import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Shield, 
  Users, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  Briefcase,
  Upload,
  Loader2,
  Sparkles,
  Target,
  Brain,
  AlertTriangle,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Eye,
  RefreshCw,
  Play,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface JobInputFormProps {
  onJobAnalyzed: (analysis: any) => void
}

interface InterviewRecord {
  id: string
  created_at: string
  job_details: any
  overall_score: number | null
  report_data: any
}

function JobInputForm({ onJobAnalyzed }: JobInputFormProps) {
  const [jobUrl, setJobUrl] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/pdf' || file.type === 'application/msword' || 
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setCvFile(file)
        setError('')
      } else {
        setError('Please upload a PDF or Word document')
        setCvFile(null)
      }
    }
  }

  const validateInput = () => {
    if (!jobDescription.trim()) {
      setError('Please provide a job description')
      return false
    }

    if (jobDescription.trim().length < 50) {
      setError('Job description must be at least 50 characters long. Please provide a more detailed job description.')
      return false
    }

    // Check if the job description contains meaningful content
    const meaningfulWords = jobDescription.trim().split(/\s+/).filter(word => word.length > 2)
    if (meaningfulWords.length < 10) {
      setError('Please provide a more detailed job description with at least 10 meaningful words.')
      return false
    }

    return true
  }

  const analyzeJobPost = async () => {
    if (!validateInput()) {
      return
    }

    setIsAnalyzing(true)
    setError('')

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-job-post`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          companyName: companyName.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze job posting')
      }

      // Validate that we received proper analysis data
      if (!data.analysis || typeof data.analysis !== 'object') {
        throw new Error('Invalid analysis data received')
      }

      // Prepare job details to save
      const rawInput = {
        title: jobTitle.trim() || 'Untitled Position',
        company: companyName.trim() || 'Company',
        description: jobDescription.trim(),
        url: jobUrl.trim() || null,
        cvFile: cvFile?.name || null,
        coverLetter: coverLetter.trim() || null
      }

      const fullJobDetails = {
        raw_input: rawInput,
        analysis: data.analysis
      }

      // Save job configuration to database
      if (user) {
        const { data: savedInterview, error: saveError } = await supabase
          .from('interviews')
          .insert({
            user_id: user.id,
            job_details: fullJobDetails,
            transcript: null,
            report_data: null,
            overall_score: null
          })
          .select()
          .single()

        if (saveError) {
          console.error('Error saving job configuration:', saveError)
          toast.error('Failed to save job configuration')
        } else {
          toast.success('Job configuration saved successfully!')
          
          // Navigate to interview page with saved interview ID and job details
          navigate('/interview', { 
            state: { 
              interviewId: savedInterview.id,
              fullJobDetails: fullJobDetails,
              jobAnalysis: data.analysis,
              jobDetails: rawInput
            } 
          })
          return
        }
      }

      // Fallback: navigate without saving (for non-authenticated users)
      onJobAnalyzed(data.analysis)
      navigate('/interview', { 
        state: { 
          jobAnalysis: data.analysis,
          jobDetails: rawInput
        } 
      })

    } catch (err) {
      console.error('Error analyzing job post:', err)
      
      // Set user-friendly error message
      let errorMessage = 'Could not analyze the job post. Please check your input and try again.'
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.'
        } else if (err.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (err.message.includes('500')) {
          errorMessage = 'Server error. The job description might be too short or unclear. Please provide a more detailed job description and try again.'
        } else if (err.message.includes('Invalid JSON') || err.message.includes('Invalid analysis')) {
          errorMessage = 'The job description provided was not detailed enough for analysis. Please provide a complete job posting with requirements, responsibilities, and qualifications.'
        }
      }
      
      setError(errorMessage)
      toast.error('Failed to analyze job posting')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const isFormValid = jobDescription.trim().length >= 50

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-medium">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent-blue rounded-2xl flex items-center justify-center mb-4 icon-geometric">
          <Briefcase className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-h1">Start Your Interview Preparation</CardTitle>
        <CardDescription className="text-body-large">
          Paste a job posting and upload your CV to get personalized interview practice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="jobUrl" className="text-caption font-medium">Job Posting URL (Optional)</Label>
              <Input
                id="jobUrl"
                placeholder="https://company.com/careers/job-posting"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            <div>
              <Label htmlFor="jobTitle" className="text-caption font-medium">Job Title</Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            <div>
              <Label htmlFor="companyName" className="text-caption font-medium">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g. TechCorp Inc."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cvUpload" className="text-caption font-medium">Upload CV/Resume (Optional)</Label>
              <div className="mt-1">
                <Input
                  id="cvUpload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isAnalyzing}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover"
                />
                {cvFile && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center">
                    <Upload className="h-4 w-4 mr-1" />
                    {cvFile.name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="coverLetter" className="text-caption font-medium">Cover Letter (Optional)</Label>
              <Textarea
                id="coverLetter"
                placeholder="Paste your cover letter here..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                disabled={isAnalyzing}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="jobDescription" className="text-caption font-medium">
            Job Description *
            <span className="text-xs text-muted-foreground ml-2">
              ({jobDescription.length}/50 characters minimum)
            </span>
          </Label>
          <Textarea
            id="jobDescription"
            placeholder="Paste the complete job description here including responsibilities, requirements, qualifications, and any other relevant details..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            disabled={isAnalyzing}
            rows={8}
            className={`mt-1 ${jobDescription.length > 0 && jobDescription.length < 50 ? 'border-accent-orange focus:border-accent-orange' : ''}`}
          />
          {jobDescription.length > 0 && jobDescription.length < 50 && (
            <p className="text-sm text-accent-orange mt-1">
              Please provide a more detailed job description (at least 50 characters)
            </p>
          )}
        </div>

        <Button 
          onClick={analyzeJobPost}
          disabled={isAnalyzing || !isFormValid}
          size="lg"
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing & Saving Job...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Analyze & Start Interview Prep
            </>
          )}
        </Button>
        
        {!isFormValid && jobDescription.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Please provide a complete job description to enable analysis
          </p>
        )}

        {user && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              <Bookmark className="h-3 w-3 inline mr-1" />
              Job configurations are automatically saved for future interviews
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PastInterviews() {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchInterviews()
    }
  }, [user])

  const fetchInterviews = async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('interviews')
        .select('id, created_at, job_details, overall_score, report_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        throw new Error('Failed to load interview history')
      }

      setInterviews(data || [])
    } catch (err) {
      console.error('Error fetching interviews:', err)
      setError(err instanceof Error ? err.message : 'Failed to load interview history')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 6) return 'text-accent-yellow bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getJobTitle = (jobDetails: any) => {
    // New structure: job_details.raw_input.title
    if (jobDetails?.raw_input?.title) return jobDetails.raw_input.title
    // Legacy structure: job_details.title
    if (jobDetails?.title) return jobDetails.title
    // Fallback to analysis data
    if (jobDetails?.analysis?.keySkills?.length > 0) {
      return `${jobDetails.analysis.keySkills[0]} Position`
    }
    if (jobDetails?.keySkills?.length > 0) {
      return `${jobDetails.keySkills[0]} Position`
    }
    return 'Interview Session'
  }

  const getCompanyName = (jobDetails: any) => {
    // New structure: job_details.raw_input.company
    if (jobDetails?.raw_input?.company) return jobDetails.raw_input.company
    // Legacy structure: job_details.company
    if (jobDetails?.company) return jobDetails.company
    // Fallback to analysis data
    if (jobDetails?.analysis?.companyInfo) {
      const match = jobDetails.analysis.companyInfo.match(/^([^.]+)/)
      if (match) return match[1].trim()
    }
    if (jobDetails?.companyInfo) {
      const match = jobDetails.companyInfo.match(/^([^.]+)/)
      if (match) return match[1].trim()
    }
    return 'Company'
  }

  const isCompletedInterview = (interview: InterviewRecord) => {
    return interview.report_data !== null && interview.overall_score !== null
  }

  const isSavedJobConfig = (interview: InterviewRecord) => {
    return interview.report_data === null && interview.overall_score === null
  }

  const startInterviewFromSaved = (interview: InterviewRecord) => {
    const fullJobDetails = interview.job_details
    const jobAnalysis = fullJobDetails?.analysis || fullJobDetails
    const jobDetails = fullJobDetails?.raw_input || {
      title: getJobTitle(fullJobDetails),
      company: getCompanyName(fullJobDetails),
      description: fullJobDetails?.description || 'No description available',
      cvFile: fullJobDetails?.cvFile || null,
      coverLetter: fullJobDetails?.coverLetter || null
    }

    navigate('/interview', { 
      state: { 
        interviewId: interview.id,
        fullJobDetails: fullJobDetails,
        jobAnalysis: jobAnalysis,
        jobDetails: jobDetails
      } 
    })
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-medium">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your interview history...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-medium">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInterviews}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const completedInterviews = interviews.filter(isCompletedInterview)
  const savedJobConfigs = interviews.filter(isSavedJobConfig)

  if (interviews.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-medium">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Interview History</h3>
            <p className="text-muted-foreground mb-4">
              You haven't completed any interviews yet. Start your first interview to see your reports here.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              <Sparkles className="mr-2 h-4 w-4" />
              Start Your First Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-h1 mb-2">Your Interview History</h2>
        <p className="text-muted-foreground">
          Review your past interview performances and start new interviews from saved job configurations
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-6 pr-4">
          {/* Saved Job Configurations */}
          {savedJobConfigs.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <BookmarkCheck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Saved Job Configurations</h3>
                <Badge variant="outline">{savedJobConfigs.length}</Badge>
              </div>
              <div className="space-y-3">
                {savedJobConfigs.map((interview) => (
                  <Card key={interview.id} className="hover:shadow-lift transition-shadow cursor-pointer pricing-card border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Bookmark className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold">
                              {getJobTitle(interview.job_details)}
                            </h4>
                            <Badge variant="outline" className="text-xs bg-primary-light border-primary/30">
                              Ready to Interview
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground mb-2">
                            {getCompanyName(interview.job_details)}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Saved {new Date(interview.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(interview.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => startInterviewFromSaved(interview)}
                          size="sm"
                          className="ml-4"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Interview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Interviews */}
          {completedInterviews.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Completed Interviews</h3>
                <Badge variant="outline">{completedInterviews.length}</Badge>
              </div>
              <div className="space-y-3">
                {completedInterviews.map((interview) => (
                  <Card key={interview.id} className="hover:shadow-lift transition-shadow cursor-pointer pricing-card">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold">
                              {getJobTitle(interview.job_details)}
                            </h4>
                            {interview.overall_score && (
                              <Badge className={`${getScoreColor(interview.overall_score)} border`}>
                                {interview.overall_score.toFixed(1)}/10
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-muted-foreground mb-2">
                            {getCompanyName(interview.job_details)}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(interview.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(interview.created_at).toLocaleTimeString()}</span>
                            </div>
                            {interview.report_data?.hiringRecommendation && (
                              <div className="flex items-center space-x-1">
                                <TrendingUp className="h-4 w-4" />
                                <span className="capitalize">
                                  {interview.report_data.hiringRecommendation.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startInterviewFromSaved(interview)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Interview Again
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/report/${interview.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Report
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="text-center">
        <Button variant="outline" onClick={fetchInterviews}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )
}

export function HomePage() {
  const { user } = useAuth()

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced job posting analysis to identify key requirements and focus areas'
    },
    {
      icon: Target,
      title: 'Personalized Interviews',
      description: 'Tailored interview questions based on your specific role and experience'
    },
    {
      icon: Shield,
      title: 'Comprehensive Feedback',
      description: 'Detailed performance reports with actionable improvement suggestions'
    }
  ]

  const handleJobAnalyzed = (analysis: any) => {
    console.log('Job analyzed:', analysis)
  }

  return (
    <div className="container mx-auto px-4 py-80px max-w-container">
      {/* Hero Section */}
      <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
        {/* Left side - Text content */}
        <div>
          <Badge variant="outline" className="mb-4 bg-primary-light border-primary/20">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Interview Prep
          </Badge>
          <h1 className="text-hero tracking-tight mb-6">
            Master Your Next
            <span className="block bg-gradient-to-r from-primary to-accent-blue bg-clip-text text-transparent">
              Job Interview
            </span>
          </h1>
          <p className="text-body-large text-muted-foreground mb-8">
            PitchPerfect uses advanced AI to analyze job postings, create personalized interview 
            simulations, and provide detailed feedback to help you land your dream job.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild>
              <Link to={user ? "#new-interview" : "/signup"}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Right side - Dashboard SVG */}
        <div className="flex items-center justify-center p-8">
          <svg 
            width="100%" 
            height="400" 
            viewBox="0 0 400 300" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="dashboard-svg max-w-md"
          >
            {/* Main dashboard frame */}
            <rect 
              x="20" 
              y="20" 
              width="360" 
              height="260" 
              rx="16" 
              fill="white" 
              stroke="#E8EAED" 
              strokeWidth="2"
              className="shadow-medium"
            />
            
            {/* Header bar */}
            <rect x="40" y="40" width="320" height="40" rx="8" fill="#F8F9FA"/>
            <circle cx="60" cy="60" r="6" fill="#00D924"/>
            <rect x="80" y="55" width="80" height="10" rx="5" fill="#E8EAED"/>
            <rect x="320" y="55" width="20" height="10" rx="5" fill="#E8EAED"/>
            
            {/* Chart area background */}
            <rect x="40" y="100" width="320" height="140" rx="8" fill="#FAFBFC" stroke="#F1F3F4"/>
            
            {/* Grid lines */}
            <line x1="40" y1="130" x2="360" y2="130" stroke="#F1F3F4" strokeWidth="1"/>
            <line x1="40" y1="160" x2="360" y2="160" stroke="#F1F3F4" strokeWidth="1"/>
            <line x1="40" y1="190" x2="360" y2="190" stroke="#F1F3F4" strokeWidth="1"/>
            <line x1="40" y1="220" x2="360" y2="220" stroke="#F1F3F4" strokeWidth="1"/>
            
            {/* Performance trend line (green) */}
            <path 
              id="performance-line" 
              d="M60 200 Q120 160, 180 180 T300 140" 
              stroke="#00D924" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Skills assessment line (blue) */}
            <path 
              id="skills-line" 
              d="M60 220 Q120 200, 180 190 T300 170" 
              stroke="#4285F4" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Data points for performance line */}
            <circle className="data-point performance" cx="60" cy="200" r="5" fill="#00D924"/>
            <circle className="data-point performance" cx="120" cy="160" r="5" fill="#00D924"/>
            <circle className="data-point performance" cx="180" cy="180" r="5" fill="#00D924"/>
            <circle className="data-point performance" cx="240" cy="150" r="5" fill="#00D924"/>
            <circle className="data-point performance" cx="300" cy="140" r="5" fill="#00D924"/>

            {/* Data points for skills line */}
            <circle className="data-point skills" cx="60" cy="220" r="5" fill="#4285F4"/>
            <circle className="data-point skills" cx="120" cy="200" r="5" fill="#4285F4"/>
            <circle className="data-point skills" cx="180" cy="190" r="5" fill="#4285F4"/>
            <circle className="data-point skills" cx="240" cy="180" r="5" fill="#4285F4"/>
            <circle className="data-point skills" cx="300" cy="170" r="5" fill="#4285F4"/>

            {/* Legend */}
            <g className="legend">
              <rect x="50" y="250" width="12" height="3" fill="#00D924" rx="1.5"/>
              <text x="70" y="255" fontSize="12" fill="#5F6368" fontFamily="Inter">Performance Score</text>
              <rect x="200" y="250" width="12" height="3" fill="#4285F4" rx="1.5"/>
              <text x="220" y="255" fontSize="12" fill="#5F6368" fontFamily="Inter">Skills Assessment</text>
            </g>

            {/* Central insight icon */}
            <g className="insight-icon" transform="translate(320, 100)">
              <circle cx="20" cy="20" r="18" fill="#FFD700" opacity="0.9"/>
              <path d="M20 12 L26 20 L20 28 L14 20 Z" fill="white"/>
            </g>
            
            {/* Floating score cards */}
            <g className="score-card" transform="translate(280, 40)">
              <rect x="0" y="0" width="60" height="30" rx="6" fill="white" stroke="#E8EAED" strokeWidth="1"/>
              <text x="30" y="12" fontSize="10" fill="#5F6368" textAnchor="middle" fontFamily="Inter">Score</text>
              <text x="30" y="24" fontSize="14" fill="#00D924" textAnchor="middle" fontFamily="Inter" fontWeight="600">8.5</text>
            </g>
          </svg>
        </div>
      </div>

      {/* User Status */}
      {user && (
        <div className="max-w-md mx-auto mb-12">
          <Card className="border-primary/20 bg-primary-light">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-caption font-medium">Welcome back, {user.email}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      {user ? (
        <div className="mb-16" id="new-interview">
          <Tabs defaultValue="new-interview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
              <TabsTrigger value="new-interview">New Interview</TabsTrigger>
              <TabsTrigger value="past-interviews">Past Interviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="new-interview">
              <JobInputForm onJobAnalyzed={handleJobAnalyzed} />
            </TabsContent>
            
            <TabsContent value="past-interviews">
              <PastInterviews />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <Card className="border-2 border-dashed border-muted-foreground/25 shadow-medium">
            <CardContent className="pt-8 pb-8">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Sign in to get started</h3>
                  <p className="text-muted-foreground mb-4">
                    Create an account to access personalized interview preparation and track your progress
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                      <Link to="/signup">
                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Grid with Gradient Background */}
      <div className="relative mb-16">
        <div className="absolute inset-0 bg-gradient-brand rounded-2xl opacity-10"></div>
        <div className="relative p-80px">
          <div className="text-center mb-12">
            <h2 className="text-h1 mb-4">Why Choose PitchPerfect?</h2>
            <p className="text-body-large text-muted-foreground">
              Advanced AI technology meets personalized interview preparation
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`text-center hover:shadow-lift transition-shadow pricing-card ${index < features.length - 1 ? 'feature-separator relative' : ''}`}>
                <CardHeader>
                  <div className="mx-auto w-12 h-12 icon-geometric rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="text-center">
        <h2 className="text-h1 mb-8">Powered by Advanced AI Technology</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['OpenAI GPT-4o', 'React', 'TypeScript', 'Supabase', 'Tailwind CSS', 'shadcn/ui'].map((tech) => (
            <Badge key={tech} variant="secondary" className="px-4 py-2 text-caption">
              {tech}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}