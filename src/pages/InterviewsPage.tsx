import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Briefcase,
  Calendar, 
  Clock, 
  TrendingUp,
  Search,
  Filter,
  Eye,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Download,
  Plus,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Play,
  Bookmark,
  BookmarkCheck,
  FileText,
  Trash2,
  Edit
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface InterviewRecord {
  id: string
  created_at: string
  job_details: any
  overall_score: number | null
  report_data: any
}

type SortOption = 'date_desc' | 'date_asc' | 'score_desc' | 'score_asc' | 'company_asc' | 'company_desc'
type ViewMode = 'grid' | 'list'
type FilterOption = 'all' | 'saved' | 'completed'

export function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([])
  const [filteredInterviews, setFilteredInterviews] = useState<InterviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchInterviews()
    }
  }, [user])

  useEffect(() => {
    filterAndSortInterviews()
  }, [interviews, searchTerm, sortBy, filterBy])

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

      if (fetchError) {
        throw new Error('Failed to load interview history')
      }

      setInterviews(data || [])
    } catch (err) {
      console.error('Error fetching interviews:', err)
      setError(err instanceof Error ? err.message : 'Failed to load interview history')
      toast.error('Failed to load interview history')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortInterviews = () => {
    let filtered = [...interviews]

    // Apply type filter
    if (filterBy === 'saved') {
      filtered = filtered.filter(interview => 
        interview.report_data === null && interview.overall_score === null
      )
    } else if (filterBy === 'completed') {
      filtered = filtered.filter(interview => 
        interview.report_data !== null && interview.overall_score !== null
      )
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(interview => {
        const jobTitle = getJobTitle(interview.job_details).toLowerCase()
        const companyName = getCompanyName(interview.job_details).toLowerCase()
        return jobTitle.includes(term) || companyName.includes(term)
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'score_desc':
          return (b.overall_score || 0) - (a.overall_score || 0)
        case 'score_asc':
          return (a.overall_score || 0) - (b.overall_score || 0)
        case 'company_asc':
          return getCompanyName(a.job_details).localeCompare(getCompanyName(b.job_details))
        case 'company_desc':
          return getCompanyName(b.job_details).localeCompare(getCompanyName(a.job_details))
        default:
          return 0
      }
    })

    setFilteredInterviews(filtered)
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

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 6) return 'text-accent-yellow bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

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

  const deleteInterview = async (interviewId: string) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId)
        .eq('user_id', user?.id)

      if (error) {
        throw new Error('Failed to delete interview')
      }

      toast.success('Interview deleted successfully')
      fetchInterviews() // Refresh the list
    } catch (err) {
      console.error('Error deleting interview:', err)
      toast.error('Failed to delete interview')
    }
  }

  const getStats = () => {
    const savedConfigs = interviews.filter(isSavedJobConfig)
    const completedInterviews = interviews.filter(isCompletedInterview)
    const scores = completedInterviews.filter(i => i.overall_score).map(i => i.overall_score!)
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
    
    return {
      total: interviews.length,
      saved: savedConfigs.length,
      completed: completedInterviews.length,
      averageScore: averageScore
    }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your interviews...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
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
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-h1 mb-2">Interview Management</h1>
              <p className="text-muted-foreground">
                Manage your saved job configurations and completed interviews
              </p>
            </div>
            <Button asChild>
              <Link to="/">
                <Plus className="mr-2 h-4 w-4" />
                New Interview
              </Link>
            </Button>
          </div>

          {/* Stats Cards */}
          {interviews.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Saved Configs</p>
                      <p className="text-2xl font-bold">{stats.saved}</p>
                    </div>
                    <Bookmark className="h-8 w-8 text-accent-blue" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption font-medium text-muted-foreground">Avg Score</p>
                      <p className="text-2xl font-bold">
                        {stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '--'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {interviews.length === 0 ? (
          <Card className="shadow-medium">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Interviews Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first job configuration to start practicing interviews.
                </p>
                <Button asChild>
                  <Link to="/">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create First Interview
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters and Search */}
            <Card className="mb-6 shadow-medium">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by job title or company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
                    <SelectTrigger className="w-full md:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Interviews</SelectItem>
                      <SelectItem value="saved">Saved Configs</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">
                        <div className="flex items-center">
                          <SortDesc className="h-4 w-4 mr-2" />
                          Newest First
                        </div>
                      </SelectItem>
                      <SelectItem value="date_asc">
                        <div className="flex items-center">
                          <SortAsc className="h-4 w-4 mr-2" />
                          Oldest First
                        </div>
                      </SelectItem>
                      <SelectItem value="score_desc">Highest Score</SelectItem>
                      <SelectItem value="score_asc">Lowest Score</SelectItem>
                      <SelectItem value="company_asc">Company A-Z</SelectItem>
                      <SelectItem value="company_desc">Company Z-A</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="mb-4">
              <p className="text-caption text-muted-foreground">
                Showing {filteredInterviews.length} of {interviews.length} interviews
              </p>
            </div>

            {/* Interview List */}
            {filteredInterviews.length === 0 ? (
              <Card className="shadow-medium">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No interviews found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredInterviews.map((interview) => (
                  <Card key={interview.id} className="hover:shadow-lift transition-shadow pricing-card shadow-medium">
                    <CardContent className="pt-6">
                      <div className={viewMode === 'list' ? 'flex items-center justify-between' : ''}>
                        <div className={viewMode === 'list' ? 'flex-1' : ''}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {isSavedJobConfig(interview) ? (
                                <Bookmark className="h-4 w-4 text-primary" />
                              ) : (
                                <FileText className="h-4 w-4 text-green-600" />
                              )}
                              <h3 className="font-semibold text-lg line-clamp-1">
                                {getJobTitle(interview.job_details)}
                              </h3>
                            </div>
                            {interview.overall_score && (
                              <Badge className={`${getScoreColor(interview.overall_score)} border ml-2`}>
                                {interview.overall_score.toFixed(1)}/10
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-muted-foreground mb-3">
                            {getCompanyName(interview.job_details)}
                          </p>

                          <div className="flex items-center space-x-2 mb-3">
                            {isSavedJobConfig(interview) ? (
                              <Badge variant="outline" className="text-xs bg-primary-light border-primary/30">
                                Ready to Interview
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                                Completed
                              </Badge>
                            )}
                            {interview.report_data?.hiringRecommendation && (
                              <div className="text-xs">
                                {getRecommendationBadge(interview.report_data.hiringRecommendation)}
                              </div>
                            )}
                          </div>
                          
                          <div className={`flex items-center space-x-4 text-sm text-muted-foreground ${viewMode === 'list' ? 'mb-0' : 'mb-4'}`}>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(interview.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(interview.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={viewMode === 'list' ? 'flex items-center space-x-2 ml-4' : 'flex space-x-2'}>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => startInterviewFromSaved(interview)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {isSavedJobConfig(interview) ? 'Start Interview' : 'Interview Again'}
                          </Button>
                          
                          {isCompletedInterview(interview) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/report/${interview.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Report
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteInterview(interview.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="text-center mt-8 space-x-4">
              <Button variant="outline" onClick={fetchInterviews}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button asChild>
                <Link to="/">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Interview
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}