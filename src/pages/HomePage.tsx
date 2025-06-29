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
  RefreshCw
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
  overall_score: number
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

      toast.success('Job posting analyzed successfully!')
      onJobAnalyzed(data.analysis)
      
      // Navigate to interview page with analysis data
      navigate('/interview', { 
        state: { 
          jobAnalysis: data.analysis,
          jobDetails: {
            title: jobTitle.trim() || 'Untitled Position',
            company: companyName.trim() || 'Company',
            description: jobDescription.trim(),
            cvFile: cvFile?.name,
            coverLetter: coverLetter.trim()
          }
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Start Your Interview Preparation</CardTitle>
        <CardDescription className="text-lg">
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
              <Label htmlFor="jobUrl" className="text-sm font-medium">Job Posting URL (Optional)</Label>
              <Input
                id="jobUrl"
                placeholder="https://company.com/careers/job-posting"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            <div>
              <Label htmlFor="jobTitle" className="text-sm font-medium">Job Title</Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Senior Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            <div>
              <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
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
              <Label htmlFor="cvUpload" className="text-sm font-medium">Upload CV/Resume (Optional)</Label>
              <div className="mt-1">
                <Input
                  id="cvUpload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isAnalyzing}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
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
              <Label htmlFor="coverLetter" className="text-sm font-medium">Cover Letter (Optional)</Label>
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
          <Label htmlFor="jobDescription" className="text-sm font-medium">
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
            className={`mt-1 ${jobDescription.length > 0 && jobDescription.length < 50 ? 'border-orange-300 focus:border-orange-500' : ''}`}
          />
          {jobDescription.length > 0 && jobDescription.length < 50 && (
            <p className="text-sm text-orange-600 mt-1">
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
              Analyzing Job Posting...
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
        .limit(20)

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
    if (score >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getJobTitle = (jobDetails: any) => {
    if (jobDetails?.title) return jobDetails.title
    if (jobDetails?.keySkills?.length > 0) {
      return `${jobDetails.keySkills[0]} Position`
    }
    return 'Interview Session'
  }

  const getCompanyName = (jobDetails: any) => {
    if (jobDetails?.company) return jobDetails.company
    if (jobDetails?.companyInfo) {
      // Extract company name from company info if possible
      const match = jobDetails.companyInfo.match(/^([^.]+)/)
      if (match) return match[1].trim()
    }
    return 'Company'
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
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
      <Card className="w-full max-w-4xl mx-auto">
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

  if (interviews.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
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
        <h2 className="text-2xl font-bold mb-2">Your Interview History</h2>
        <p className="text-muted-foreground">
          Review your past interview performances and track your progress
        </p>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {interviews.map((interview) => (
            <Card key={interview.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {getJobTitle(interview.job_details)}
                      </h3>
                      {interview.overall_score && (
                        <Badge className={`${getScoreColor(interview.overall_score)} border`}>
                          {interview.overall_score.toFixed(1)}/10
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-3">
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
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/report/${interview.id}`)}
                    className="ml-4"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <Badge variant="outline" className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Powered Interview Prep
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Master Your Next
          <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Job Interview
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          PitchPerfect uses advanced AI to analyze job postings, create personalized interview 
          simulations, and provide detailed feedback to help you land your dream job.
        </p>
      </div>

      {/* User Status */}
      {user && (
        <div className="max-w-md mx-auto mb-12">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Welcome back, {user.email}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      {user ? (
        <div className="mb-16">
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
          <Card className="border-2 border-dashed border-muted-foreground/25">
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

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {features.map((feature, index) => (
          <Card key={index} className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
              <CardDescription className="text-base">{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Tech Stack */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-8">Powered by Advanced AI Technology</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['OpenAI GPT-4o', 'React', 'TypeScript', 'Supabase', 'Tailwind CSS', 'shadcn/ui'].map((tech) => (
            <Badge key={tech} variant="secondary" className="px-4 py-2 text-sm">
              {tech}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}