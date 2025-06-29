import React from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  BarChart3
} from 'lucide-react'

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
  
  // Get data from navigation state
  const report: FeedbackReport = location.state?.report || {
    overallScore: 7.5,
    overallAssessment: "Strong performance with room for improvement in technical areas",
    strengths: ["Clear communication", "Good problem-solving approach", "Strong cultural fit"],
    areasForImprovement: ["Technical depth", "Specific examples", "Follow-up questions"],
    technicalSkillsAssessment: {
      score: 7.0,
      details: "Good foundational knowledge with some gaps in advanced concepts",
      specificSkills: [
        { skill: "React", rating: 4, feedback: "Solid understanding of core concepts" },
        { skill: "TypeScript", rating: 3, feedback: "Basic knowledge, needs more practice" }
      ]
    },
    behavioralSkillsAssessment: {
      score: 8.0,
      details: "Excellent soft skills and team collaboration abilities",
      traits: [
        { trait: "Leadership", rating: 4, feedback: "Shows natural leadership qualities" },
        { trait: "Communication", rating: 5, feedback: "Excellent verbal communication skills" }
      ]
    },
    communicationSkills: {
      score: 8.5,
      clarity: 9,
      structure: 8,
      engagement: 8,
      feedback: "Very clear and engaging communication style"
    },
    problemSolvingApproach: {
      score: 7.5,
      methodology: "Systematic approach with good analytical thinking",
      creativity: 7,
      analyticalThinking: 8,
      feedback: "Good problem-solving methodology with room for more creative solutions"
    },
    culturalFit: {
      score: 9.0,
      alignment: "Excellent alignment with company values and culture",
      feedback: "Strong cultural fit with demonstrated values alignment"
    },
    recommendedNextSteps: [
      "Practice more advanced technical concepts",
      "Prepare specific examples using STAR method",
      "Research company-specific technologies"
    ],
    hiringRecommendation: 'hire',
    confidenceLevel: 85,
    detailedFeedback: [
      {
        question: "Tell me about yourself",
        candidateResponse: "I'm a software engineer with 5 years of experience...",
        evaluation: "Good introduction but could be more specific about achievements",
        score: 7,
        suggestions: ["Include specific metrics", "Mention relevant projects"]
      }
    ]
  }

  const duration = location.state?.duration || 25
  const jobAnalysis = location.state?.jobAnalysis
  const config = location.state?.config

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>Report ID: {id}</span>
            </Badge>
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
                  <p className="text-sm font-medium">{report.confidenceLevel}%</p>
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
    </div>
  )
}