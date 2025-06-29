import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Send, 
  User, 
  Bot, 
  Clock, 
  Settings, 
  MessageSquare,
  Loader2,
  CheckCircle,
  ArrowRight,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'interviewer' | 'candidate'
  content: string
  timestamp: string
  questionType?: string
}

interface InterviewSetupProps {
  jobAnalysis: any
  onStartInterview: (config: InterviewConfig) => void
}

interface InterviewConfig {
  interviewerPersona: string
  interviewType: string
  difficulty: string
  focusAreas: string[]
  duration: number
}

function InterviewSetup({ jobAnalysis, onStartInterview }: InterviewSetupProps) {
  const [config, setConfig] = useState<InterviewConfig>({
    interviewerPersona: 'professional',
    interviewType: 'comprehensive',
    difficulty: 'adaptive',
    focusAreas: [],
    duration: 30
  })

  const interviewerPersonas = [
    { value: 'professional', label: 'Professional & Formal', description: 'Traditional corporate interview style' },
    { value: 'friendly', label: 'Friendly & Conversational', description: 'Relaxed and approachable interviewer' },
    { value: 'technical', label: 'Technical Expert', description: 'Deep technical focus with challenging questions' },
    { value: 'startup', label: 'Startup Culture', description: 'Fast-paced, culture-focused interview' }
  ]

  const interviewTypes = [
    { value: 'comprehensive', label: 'Comprehensive Interview', description: 'Full interview covering all areas' },
    { value: 'technical', label: 'Technical Focus', description: 'Emphasis on technical skills and problem-solving' },
    { value: 'behavioral', label: 'Behavioral Focus', description: 'Focus on past experiences and soft skills' },
    { value: 'case-study', label: 'Case Study', description: 'Scenario-based problem solving' }
  ]

  const availableFocusAreas = jobAnalysis?.interviewFocus || [
    'Technical Skills',
    'Problem Solving',
    'Communication',
    'Leadership',
    'Cultural Fit'
  ]

  const handleFocusAreaChange = (area: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      focusAreas: checked 
        ? [...prev.focusAreas, area]
        : prev.focusAreas.filter(a => a !== area)
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Interview Setup</h1>
        <p className="text-muted-foreground">
          Customize your interview experience based on the analyzed job requirements
        </p>
      </div>

      {/* Job Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Job Analysis Complete</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Key Skills Required</h4>
              <div className="flex flex-wrap gap-2">
                {jobAnalysis?.keySkills?.slice(0, 6).map((skill: string, index: number) => (
                  <Badge key={index} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Position Level</h4>
              <Badge variant="outline" className="capitalize">
                {jobAnalysis?.difficulty || 'Mid-Level'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Interviewer Persona */}
        <Card>
          <CardHeader>
            <CardTitle>Interviewer Persona</CardTitle>
            <CardDescription>Choose the interviewer style that matches your target company</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={config.interviewerPersona} onValueChange={(value) => setConfig(prev => ({ ...prev, interviewerPersona: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interviewerPersonas.map(persona => (
                  <SelectItem key={persona.value} value={persona.value}>
                    <div>
                      <div className="font-medium">{persona.label}</div>
                      <div className="text-sm text-muted-foreground">{persona.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Interview Type */}
        <Card>
          <CardHeader>
            <CardTitle>Interview Type</CardTitle>
            <CardDescription>Select the focus and structure of your interview</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={config.interviewType} onValueChange={(value) => setConfig(prev => ({ ...prev, interviewType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interviewTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Focus Areas</CardTitle>
          <CardDescription>Select specific areas you want to practice (based on job analysis)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {availableFocusAreas.map((area: string) => (
              <div key={area} className="flex items-center space-x-2">
                <Checkbox
                  id={area}
                  checked={config.focusAreas.includes(area)}
                  onCheckedChange={(checked) => handleFocusAreaChange(area, checked as boolean)}
                />
                <Label htmlFor={area} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {area}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Duration</CardTitle>
          <CardDescription>Choose how long you want to practice</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={config.duration.toString()} onValueChange={(value) => setConfig(prev => ({ ...prev, duration: parseInt(value) }))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes - Quick practice</SelectItem>
              <SelectItem value="30">30 minutes - Standard interview</SelectItem>
              <SelectItem value="45">45 minutes - Extended practice</SelectItem>
              <SelectItem value="60">60 minutes - Full interview simulation</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Button 
        onClick={() => onStartInterview(config)}
        size="lg"
        className="w-full"
      >
        <Play className="mr-2 h-5 w-5" />
        Start Interview
      </Button>
    </div>
  )
}

interface ChatInterfaceProps {
  jobAnalysis: any
  config: InterviewConfig
  onInterviewComplete: (data: any) => void
}

function ChatInterface({ jobAnalysis, config, onInterviewComplete }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [interviewStage, setInterviewStage] = useState<'start' | 'technical' | 'behavioral' | 'situational' | 'closing'>('start')
  const [startTime] = useState(Date.now())
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Start the interview with an opening question
    startInterview()
  }, [])

  const startInterview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobAnalysis,
          interviewStage: 'start',
          conversationHistory: []
        })
      })

      const data = await response.json()
      if (data.success) {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'interviewer',
          content: data.interview.question,
          timestamp: new Date().toISOString(),
          questionType: data.interview.questionType
        }
        setMessages([welcomeMessage])
      }
    } catch (error) {
      console.error('Error starting interview:', error)
      toast.error('Failed to start interview')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const candidateMessage: Message = {
      id: Date.now().toString(),
      role: 'candidate',
      content: currentMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, candidateMessage])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const conversationHistory = [...messages, candidateMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobAnalysis,
          candidateResponse: currentMessage,
          conversationHistory,
          interviewStage
        })
      })

      const data = await response.json()
      if (data.success) {
        const interviewerMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'interviewer',
          content: data.interview.question,
          timestamp: new Date().toISOString(),
          questionType: data.interview.questionType
        }

        setMessages(prev => [...prev, interviewerMessage])

        // Update stage if needed
        if (data.interview.nextStage) {
          setInterviewStage(data.interview.nextStage)
        }

        // Check if interview is complete
        if (data.interview.interviewComplete) {
          setTimeout(() => {
            completeInterview()
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const completeInterview = async () => {
    const interviewDuration = Math.round((Date.now() - startTime) / 1000 / 60) // in minutes
    
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        questionType: msg.questionType
      }))

      // Generate feedback report
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-feedback-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobAnalysis,
          conversationHistory,
          interviewDuration
        })
      })

      const feedbackData = await response.json()
      
      if (feedbackData.success) {
        // Save interview to database
        const { data: interviewRecord, error } = await supabase
          .from('interviews')
          .insert({
            user_id: user?.id,
            job_details: jobAnalysis,
            transcript: { messages, config },
            report_data: feedbackData.report,
            overall_score: feedbackData.report.overallScore
          })
          .select()
          .single()

        if (error) {
          console.error('Error saving interview:', error)
        }

        onInterviewComplete({
          interviewId: interviewRecord?.id,
          report: feedbackData.report,
          duration: interviewDuration
        })
      }
    } catch (error) {
      console.error('Error completing interview:', error)
      toast.error('Failed to generate feedback report')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getStageProgress = () => {
    const stages = ['start', 'technical', 'behavioral', 'situational', 'closing']
    const currentIndex = stages.indexOf(interviewStage)
    return ((currentIndex + 1) / stages.length) * 100
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="capitalize">
                {interviewStage} Stage
              </Badge>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{Math.round((Date.now() - startTime) / 1000 / 60)} min</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecording(!isRecording)}
                className={isRecording ? 'bg-red-50 border-red-200' : ''}
              >
                {isRecording ? <Mic className="h-4 w-4 text-red-600" /> : <MicOff className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm">
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Interview Progress</span>
              <span>{Math.round(getStageProgress())}%</span>
            </div>
            <Progress value={getStageProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Interview Session</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'candidate' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'interviewer' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {message.role === 'interviewer' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${
                    message.role === 'candidate' ? 'text-right' : ''
                  }`}>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'interviewer'
                        ? 'bg-muted'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Interviewer is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <Separator />
          
          {/* Input Area */}
          <div className="p-4">
            <div className="flex space-x-2">
              <Textarea
                placeholder="Type your response here... (Press Enter to send, Shift+Enter for new line)"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows={2}
                className="flex-1 resize-none"
              />
              <Button 
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function InterviewPage() {
  const [currentView, setCurrentView] = useState<'setup' | 'active' | 'complete'>('setup')
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null)
  const [interviewData, setInterviewData] = useState<any>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const jobAnalysis = location.state?.jobAnalysis
  const jobDetails = location.state?.jobDetails

  useEffect(() => {
    if (!jobAnalysis) {
      toast.error('No job analysis found. Please start from the home page.')
      navigate('/')
    }
  }, [jobAnalysis, navigate])

  const handleStartInterview = (config: InterviewConfig) => {
    setInterviewConfig(config)
    setCurrentView('active')
  }

  const handleInterviewComplete = (data: any) => {
    setInterviewData(data)
    navigate(`/report/${data.interviewId}`, { 
      state: { 
        report: data.report,
        duration: data.duration,
        jobAnalysis,
        config: interviewConfig
      } 
    })
  }

  if (!jobAnalysis) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert>
          <AlertDescription>
            No job analysis found. Please return to the home page and analyze a job posting first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {currentView === 'setup' && (
        <InterviewSetup 
          jobAnalysis={jobAnalysis}
          onStartInterview={handleStartInterview}
        />
      )}
      
      {currentView === 'active' && interviewConfig && (
        <ChatInterface
          jobAnalysis={jobAnalysis}
          config={interviewConfig}
          onInterviewComplete={handleInterviewComplete}
        />
      )}
    </div>
  )
}