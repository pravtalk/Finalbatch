import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, BookOpen, ExternalLink, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface PracticeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order_index: number;
}

interface PracticeQuestion {
  id: string;
  category_id: string;
  title: string;
  description: string;
  pdf_url: string;
  thumbnail_url: string;
  difficulty_level: string;
  subject: string;
  class_level: string;
}

interface PracticeNote {
  id: string;
  category_id: string;
  title: string;
  description: string;
  pdf_url: string;
  thumbnail_url: string;
  subject: string;
  class_level: string;
}

const PracticeZone = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<PracticeCategory[]>([]);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [notes, setNotes] = useState<PracticeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("questions");

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchPracticeData();
  }, [user, navigate]);

  const fetchPracticeData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('practice_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('practice_questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('practice_notes')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (notesError) throw notesError;
      setNotes(notesData || []);

    } catch (error) {
      console.error('Error fetching practice data:', error);
      toast({
        title: "Error",
        description: "Failed to load practice materials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openPDF = (pdfUrl: string, title: string) => {
    if (!pdfUrl) {
      toast({
        title: "Error",
        description: "PDF not available",
        variant: "destructive",
      });
      return;
    }
    
    // Open PDF in a new tab
    window.open(pdfUrl, '_blank');
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading practice materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">🎯 Practice Zone</h1>
              <p className="text-muted-foreground">Access questions, notes, and study materials</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Questions ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Notes ({notes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-6">
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryQuestions = questions.filter(q => q.category_id === category.id);
                
                if (categoryQuestions.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h2 className="text-xl font-semibold">{category.name}</h2>
                        <p className="text-muted-foreground text-sm">{category.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryQuestions.map((question) => (
                        <Card key={question.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPDF(question.pdf_url, question.title)}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base line-clamp-2">{question.title}</CardTitle>
                              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                            </div>
                            {question.description && (
                              <CardDescription className="line-clamp-2">{question.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {question.difficulty_level && (
                                <Badge variant="secondary" className={getDifficultyColor(question.difficulty_level)}>
                                  {question.difficulty_level}
                                </Badge>
                              )}
                              {question.subject && (
                                <Badge variant="outline">{question.subject}</Badge>
                              )}
                              {question.class_level && (
                                <Badge variant="outline">Class {question.class_level}</Badge>
                              )}
                            </div>
                            <Button size="sm" className="w-full" disabled={!question.pdf_url}>
                              <Download className="w-4 h-4 mr-2" />
                              Open PDF
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {questions.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
                  <p className="text-muted-foreground">Practice questions will appear here once added by admin.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            <div className="space-y-6">
              {categories.map((category) => {
                const categoryNotes = notes.filter(n => n.category_id === category.id);
                
                if (categoryNotes.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h2 className="text-xl font-semibold">{category.name}</h2>
                        <p className="text-muted-foreground text-sm">{category.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryNotes.map((note) => (
                        <Card key={note.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPDF(note.pdf_url, note.title)}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base line-clamp-2">{note.title}</CardTitle>
                              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                            </div>
                            {note.description && (
                              <CardDescription className="line-clamp-2">{note.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {note.subject && (
                                <Badge variant="outline">{note.subject}</Badge>
                              )}
                              {note.class_level && (
                                <Badge variant="outline">Class {note.class_level}</Badge>
                              )}
                            </div>
                            <Button size="sm" className="w-full" disabled={!note.pdf_url}>
                              <Download className="w-4 h-4 mr-2" />
                              Open PDF
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {notes.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Notes Available</h3>
                  <p className="text-muted-foreground">Study notes will appear here once added by admin.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PracticeZone;