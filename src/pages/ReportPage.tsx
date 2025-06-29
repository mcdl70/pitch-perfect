import React, { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Download,
  Home,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  MessageSquare,
  Users,
  Award,
  AlertTriangle,
  Lightbulb,
  Star,
  BarChart3,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface SkillAssessment {
  skill: string
  rating: number
  feedback: string
}

interface TraitAssessment {
  trait: string
  rating: number
  feedback: string
}

interface DetailedFeedback {
  question: string
  candidateResponse: string
  evaluation: string
  score: number
  suggestions: string[]
}

interface FeedbackReport {
  overallScore: number
  overallAssessment: string
  strengths: string[]
  areasForImprovement: string[]
  technicalSkillsAssessment: {
    score: number
    details: string
    specificSkills: SkillAssessment[]
  }
  behavioralSkillsAssessment: {
    score: number
    details: string
    traits: TraitAssessment[]
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
  detailedFeedback: DetailedFeedback[]
}

// UUID validation function
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function ScoreCard({ title, score, maxScore = 10, description, icon: Icon, trend }: {
  title: string
  score: number
  maxScore?: number
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
}) {
  const percentage = (score / maxScore) * 100
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return null
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{title}</span>
          </div>
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score.toFixed(1)}
            </span>
            <span className="text-muted-foreground">/{maxScore}</span>
          </div>
        </div>
        <Progress value={percentage} className="h-2 mb-2" />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function OverviewTab({ report }: { report: FeedbackReport }) {
  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'strong_hire':
        return <Badge className="bg-green-600">Strong Hire</Badge>
      case 'hire':
        return <Badge className="bg-green-500">Hire</Badge>
      case 'no_hire':
        return <Badge variant="secondary">No Hire</Badge>
      case 'strong_no_hire':
        return <Badge variant="destructive">Strong No Hire</Badge>
      default:
        return <Badge variant="outline">Under Review</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">{report.overallScore}</span>
          </div>
          <CardTitle className="text-2xl">Overall Interview Performance</CardTitle>
          <CardDescription className="text-lg">
            {getRecommendationBadge(report.hiringRecommendation)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <Progress value={report.overallScore * 10} className="h-4 mb-4" />
            <p className="text-muted-foreground">{report.overallAssessment}</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                Key Strengths
              </h4>
              <ul className="space-y-1">
                {report.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                Areas for Improvement
              </h4>
              <ul className="space-y-1">
                {report.areasForImprovement.map((area, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title="Technical Skills"
          score={report.technicalSkillsAssessment.score}
          icon={Brain}
          description="Domain knowledge and problem-solving"
        />
        <ScoreCard
          title="Communication"
          score={report.communicationSkills.score}
          icon={MessageSquare}
          description="Clarity and articulation"
        />
        <ScoreCard
          title="Behavioral Skills"
          score={report.behavioralSkillsAssessment.score}
          icon={Users}
          description="Soft skills and cultural fit"
        />
        <ScoreCard
          title="Problem Solving"
          score={report.problemSolvingApproach.score}
          icon={Target}
          description="Analytical thinking approach"
        />
      </div>
    </div>
  )
}

function TechnicalTab({ report }: { report: FeedbackReport }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Technical Skills Assessment</span>
          </CardTitle>
          <CardDescription>
            Evaluation of technical competency and domain knowledge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Technical Score</span>
              <span className="text-2xl font-bold text-blue-600">
                {report.technicalSkillsAssessment.score}/10
              </span>
            </div>
            <Progress value={report.technicalSkillsAssessment.score * 10} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {report.technicalSkillsAssessment.details}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Specific Skills Breakdown</h4>
            {report.technicalSkillsAssessment.specificSkills?.map((skill, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{skill.skill}</span>
                  <div className="flex items-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < skill.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{skill.feedback}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Problem Solving Approach</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Methodology</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {report.problemSolvingApproach.methodology}
              </p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Creativity</span>
                    <span>{report.problemSolvingApproach.creativity}/10</span>
                  </div>
                  <Progress value={report.problemSolvingApproach.creativity * 10} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Analytical Thinking</span>
                    <span>{report.problemSolvingApproach.analyticalThinking}/10</span>
                  </div>
                  <Progress value={report.problemSolvingApproach.analyticalThinking * 10} className="h-2" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Detailed Feedback</h4>
              <p className="text-sm text-muted-foreground">
                {report.problemSolvingApproach.feedback}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BehavioralTab({ report }: { report: FeedbackReport }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Behavioral Skills Assessment</span>
          </CardTitle>
          <CardDescription>
            Evaluation of soft skills, leadership, and teamwork abilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Overall Behavioral Score</span>
              <span className="text-2xl font-bold text-green-600">
                {report.behavioralSkillsAssessment.score}/10
              </span>
            </div>
            <Progress value={report.behavioralSkillsAssessment.score * 10} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">
              {report.behavioralSkillsAssessment.details}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Behavioral Traits</h4>
            {report.behavioralSkillsAssessment.traits?.map((trait, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{trait.trait}</span>
                  <div className="flex items-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < trait.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{trait.feedback}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Communication Skills</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {report.communicationSkills.clarity}/10
              </div>
              <div className="text-sm text-muted-foreground">Clarity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {report.communicationSkills.structure}/10
              </div>
              <div className="text-sm text-muted-foreground">Structure</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {report.communicationSkills.engagement}/10
              </div>
              <div className="text-sm text-muted-foreground">Engagement</div>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            {report.communicationSkills.feedback}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5" />
            <span>Cultural Fit</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Cultural Alignment Score</span>
              <span className="text-2xl font-bold text-purple-600">
                {report.culturalFit.score}/10
              </span>
            </div>
            <Progress value={report.culturalFit.score * 10} className="h-3" />
          </div>
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-2">Alignment Assessment</h4>
              <p className="text-sm text-muted-foreground">{report.culturalFit.alignment}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Detailed Feedback</h4>
              <p className="text-sm text-muted-foreground">{report.culturalFit.feedback}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DetailedTab({ report }: { report: FeedbackReport }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Question-by-Question Analysis</span>
          </CardTitle>
          <CardDescription>
            Detailed breakdown of each interview question and response
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-6">
              {report.detailedFeedback?.map((feedback, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">Question {index + 1}</Badge>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Score:</span>
                      <span className={`font-bold ${
                        feedback.score >= 8 ? 'text-green-600' :
                        feedback.score >= 6 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {feedback.score}/10
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Question</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {feedback.question}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Your Response</h4>
                      <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
                        {feedback.candidateResponse}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Evaluation</h4>
                      <p className="text-sm text-muted-foreground">
                        {feedback.evaluation}
                      </p>
                    </div>
                    
                    {feedback.suggestions && feedback.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center">
                          <Lightbulb className="h-4 w-4 mr-1" />
                          Suggestions for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {feedback.suggestions.map((suggestion, suggestionIndex) => (
                            <li key={suggestionIndex} className="text-sm text-muted-foreground flex items-start">
                              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Recommended Next Steps</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {report.recommendedNextSteps?.map((step, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Get data from navigation state or try to fetch from database
  const [report, setReport] = useState<FeedbackReport | null>(location.state?.report || null)
  const [duration, setDuration] = useState<number>(location.state?.duration || 25)
  const [jobAnalysis, setJobAnalysis] = useState(location.state?.jobAnalysis || null)
  const [config, setConfig] = useState(location.state?.config || null)

  // Check if there was an error from the interview completion
  const interviewError = location.state?.error

  useEffect(() => {
    // Validate UUID format first
    if (id && id !== 'error') {
      if (!isValidUUID(id)) {
        setError('Invalid report ID format. Please check the URL and try again.')
        return
      }
    }

    // If we don't have report data and have a valid ID, try to fetch from database
    if (!report && id && id !== 'error' && user) {
      fetchReportData()
    } else if (id === 'error' || interviewError) {
      setError('Report not found or you do not have permission to view it.')
    }
  }, [id, report, user, interviewError])

  const fetchReportData = async () => {
    if (!id || !isValidUUID(id)) {
      setError('Invalid report ID format. Please check the URL and try again.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Interview report not found or you do not have permission to view it.')
        }
        throw new Error('Failed to load interview report. Please try again.')
      }

      if (data) {
        setReport(data.report_data)
        setJobAnalysis(data.job_details)
        setDuration(data.transcript?.duration || 25)
        setConfig(data.transcript?.config || null)
      } else {
        throw new Error('Interview report not found.')
      }
    } catch (err) {
      console.error('Error fetching report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load interview report. Please try again.')
      toast.error('Failed to load interview report')
    } finally {
      setLoading(false)
    }
  }

  const retryFetchReport = () => {
    if (id && id !== 'error' && isValidUUID(id)) {
      fetchReportData()
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-container">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading interview report...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-container">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Report Not Found</h1>
            <p className="text-gray-600 max-w-md mx-auto">
              {error || 'The interview report you\'re looking for could not be found or you do not have permission to view it.'}
            </p>
          </div>

          <Alert variant="destructive" className="max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Report not found or access denied'}
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {id && id !== 'error' && isValidUUID(id) && (
              <Button
                variant="outline"
                onClick={retryFetchReport}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/?tab=past-interviews">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Reports
              </Link>
            </Button>
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>If you believe this is an error, please:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check that the URL is correct</li>
              <li>Make sure you're logged in with the correct account</li>
              <li>Verify that the interview was completed successfully</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-container">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/?tab=past-interviews">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Link>
            </Button>
            <Badge variant="outline" className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>Report ID: {id}</span>
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
            <Button asChild size="sm">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                New Interview
              </Link>
            </Button>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Interview Performance Report</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of your interview performance with actionable insights
        </p>
      </div>

      {/* Show warning if there was an error during interview completion */}
      {interviewError && (
        <Alert className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            There was an issue generating the complete report. Some data may be missing or incomplete.
          </AlertDescription>
        </Alert>
      )}

      {/* Interview Metadata */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Candidate</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">Interview Date</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{duration} minutes</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{report.confidenceLevel || 85}%</p>
                <p className="text-xs text-muted-foreground">Confidence Level</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
          <TabsTrigger value="detailed">Detailed</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <OverviewTab report={report} />
        </TabsContent>
        
        <TabsContent value="technical">
          <TechnicalTab report={report} />
        </TabsContent>
        
        <TabsContent value="behavioral">
          <BehavioralTab report={report} />
        </TabsContent>
        
        <TabsContent value="detailed">
          <DetailedTab report={report} />
        </TabsContent>
      </Tabs>
    </div>
  )
}