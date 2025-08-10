import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, FileText, BookOpen, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PracticeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order_index: number;
  is_active: boolean;
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
  order_index: number;
  is_active: boolean;
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
  order_index: number;
  is_active: boolean;
}

const PracticeZoneManagement = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<PracticeCategory[]>([]);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [notes, setNotes] = useState<PracticeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    difficulty_level: 'medium',
    subject: '',
    class_level: '',
    order_index: 0,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  useEffect(() => {
    checkUserRole();
    fetchPracticeData();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setUserRole(null);
        setIsAdmin(false);
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        setUserRole('student'); // default
        setIsAdmin(false);
      } else {
        setUserRole(roleData?.role || 'student');
        setIsAdmin(roleData?.role === 'admin');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('student');
      setIsAdmin(false);
    }
  };

  const fetchPracticeData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('practice_categories')
        .select('*')
        .order('order_index');

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw categoriesError;
      }
      
      console.log('Fetched categories:', categoriesData);
      
      // If no categories exist, create default ones
      if (!categoriesData || categoriesData.length === 0) {
        await createDefaultCategories();
        // Fetch again after creating defaults
        const { data: newCategoriesData, error: newCategoriesError } = await supabase
          .from('practice_categories')
          .select('*')
          .order('order_index');
        
        if (newCategoriesError) throw newCategoriesError;
        setCategories(newCategoriesData || []);
      } else {
        setCategories(categoriesData);
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('practice_questions')
        .select('*')
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('practice_notes')
        .select('*')
        .order('order_index');

      if (notesError) throw notesError;
      setNotes(notesData || []);

    } catch (error) {
      console.error('Error fetching practice data:', error);
      toast({
        title: "Error",
        description: "Failed to load practice data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCategories = async () => {
    try {
      const defaultCategories = [
        { name: 'Question Papers', description: 'Previous year question papers and sample papers', icon: '📝', order_index: 1 },
        { name: 'Study Notes', description: 'Chapter-wise notes and summaries', icon: '📚', order_index: 2 },
        { name: 'Practice Tests', description: 'Mock tests and practice quizzes', icon: '🧪', order_index: 3 },
        { name: 'Reference Materials', description: 'Additional study materials and resources', icon: '📖', order_index: 4 }
      ];

      const { error } = await supabase
        .from('practice_categories')
        .insert(defaultCategories);

      if (error) {
        console.error('Error creating default categories:', error);
        // Don't throw here as categories might already exist
      }
    } catch (error) {
      console.error('Error in createDefaultCategories:', error);
    }
  };

  const uploadPDF = async (file: File): Promise<string> => {
    try {
      // Validate file type
      if (!file.type.includes('pdf')) {
        throw new Error('Only PDF files are allowed');
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 10MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Uploading file to storage bucket:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('practice-materials')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message.includes('not found')) {
          throw new Error('Storage bucket not found. Please contact administrator.');
        } else if (uploadError.message.includes('permission')) {
          throw new Error('Permission denied for file upload. Admin access required.');
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      console.log('File uploaded successfully:', uploadData);

      const { data } = supabase.storage
        .from('practice-materials')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error in uploadPDF:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setUploading(true);
      let pdfUrl = '';

      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      
      // Handle category assignment - ensure we always have a valid category
      let categoryId = formData.category_id;
      
      // If no category selected, try to use the first available category
      if (!categoryId) {
        if (categories.length === 0) {
          // Create default categories if none exist
          await createDefaultCategories();
          // Refetch categories
          const { data: newCategoriesData, error: newCategoriesError } = await supabase
            .from('practice_categories')
            .select('*')
            .order('order_index')
            .limit(1);
          
          if (!newCategoriesError && newCategoriesData && newCategoriesData.length > 0) {
            categoryId = newCategoriesData[0].id;
          } else {
            throw new Error('Failed to create default category. Please refresh and try again.');
          }
        } else {
          // Use the first available category
          categoryId = categories[0].id;
        }
      }

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in.');
      }

      // Check user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleError || !roleData || roleData.role !== 'admin') {
        throw new Error('Admin privileges required to manage practice materials.');
      }

      if (pdfFile) {
        console.log('Uploading PDF file:', pdfFile.name);
        pdfUrl = await uploadPDF(pdfFile);
        console.log('PDF uploaded successfully:', pdfUrl);
      }

      const dataToSubmit = {
        ...formData,
        category_id: categoryId,
        pdf_url: pdfUrl || (editingItem?.pdf_url || ''),
        is_active: true,
      };

      console.log('Submitting data:', dataToSubmit);

      if (activeTab === 'questions') {
        if (editingItem) {
          const { error } = await supabase
            .from('practice_questions')
            .update(dataToSubmit)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('practice_questions')
            .insert([dataToSubmit]);
          if (error) throw error;
        }
      } else {
        if (editingItem) {
          const { error } = await supabase
            .from('practice_notes')
            .update(dataToSubmit)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('practice_notes')
            .insert([dataToSubmit]);
          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: `${activeTab === 'questions' ? 'Question' : 'Note'} ${editingItem ? 'updated' : 'created'} successfully`,
      });

      resetForm();
      fetchPracticeData();
      setIsDialogOpen(false);

    } catch (error: any) {
      console.error('Error saving:', error);
      let errorMessage = "Failed to save practice material";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'PGRST301') {
        errorMessage = "Permission denied. Admin access required.";
      } else if (error.code === '23503') {
        errorMessage = "Invalid category selected.";
      } else if (error.code === '23502') {
        errorMessage = "Required fields are missing.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      category_id: item.category_id,
      difficulty_level: item.difficulty_level || 'medium',
      subject: item.subject || '',
      class_level: item.class_level || '',
      order_index: item.order_index || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, type: 'questions' | 'notes') => {
    try {
      const table = type === 'questions' ? 'practice_questions' : 'practice_notes';
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${type === 'questions' ? 'Question' : 'Note'} deleted successfully`,
      });
      
      fetchPracticeData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      difficulty_level: 'medium',
      subject: '',
      class_level: '',
      order_index: 0,
    });
    setPdfFile(null);
    setEditingItem(null);
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
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading practice zone data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Practice Zone Management</h2>
          <p className="text-muted-foreground">Manage questions and notes for students</p>
        </div>
        <div className="flex items-center gap-4">
          {userRole && (
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-sm">
              Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          )}
        </div>
      </div>

      {!isAdmin && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-medium">Admin Access Required</p>
                <p className="text-sm">You need admin privileges to create or edit practice materials. Contact your administrator for access.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Practice Questions</CardTitle>
                  <CardDescription>Manage question papers and practice materials</CardDescription>
                </div>
                {isAdmin && (
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                        <DialogDescription>
                          Fill in the details for the practice question
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({...formData, title: e.target.value})}
                              placeholder="Enter title"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData({...formData, description: e.target.value})}
                              placeholder="Enter description (optional)"
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select 
                              value={formData.category_id} 
                              onValueChange={(value) => setFormData({...formData, category_id: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Auto-assign category</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.icon} {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {categories.length > 0 
                                ? `${categories.length} categories available`
                                : "Categories will be created automatically"
                              }
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="difficulty">Difficulty</Label>
                              <Select 
                                value={formData.difficulty_level} 
                                onValueChange={(value) => setFormData({...formData, difficulty_level: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">Easy</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="subject">Subject</Label>
                              <Input
                                id="subject"
                                value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                placeholder="e.g., Math, Science"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="class_level">Class Level</Label>
                            <Input
                              id="class_level"
                              value={formData.class_level}
                              onChange={(e) => setFormData({...formData, class_level: e.target.value})}
                              placeholder="e.g., 10, 11, 12"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="pdf">PDF File</Label>
                            <Input
                              id="pdf"
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                            />
                            {editingItem?.pdf_url && !pdfFile && (
                              <p className="text-xs text-muted-foreground">
                                Current PDF will be kept if no new file is selected
                              </p>
                            )}
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={uploading}>
                            {uploading ? (
                              <>
                                <Upload className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              editingItem ? 'Update' : 'Create'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.map((question) => (
                  <div key={question.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{question.title}</h4>
                      {question.description && (
                        <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="secondary" className={getDifficultyColor(question.difficulty_level)}>
                          {question.difficulty_level}
                        </Badge>
                        {question.subject && (
                          <Badge variant="outline">{question.subject}</Badge>
                        )}
                        {question.class_level && (
                          <Badge variant="outline">Class {question.class_level}</Badge>
                        )}
                        <Badge variant={question.is_active ? "default" : "secondary"}>
                          {question.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(question)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(question.id, 'questions')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No questions available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Study Notes</CardTitle>
                  <CardDescription>Manage study notes and reference materials</CardDescription>
                </div>
                {isAdmin && (
                  <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                                          <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Note' : 'Add New Note'}</DialogTitle>
                        <DialogDescription>
                          Fill in the details for the study note
                        </DialogDescription>
                      </DialogHeader>
                      
                                             <form onSubmit={handleSubmit} className="space-y-6">
                         <div className="space-y-4">
                           <div className="space-y-2">
                             <Label htmlFor="title">Title *</Label>
                             <Input
                               id="title"
                               value={formData.title}
                               onChange={(e) => setFormData({...formData, title: e.target.value})}
                               placeholder="Enter title"
                               required
                             />
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="description">Description</Label>
                             <Textarea
                               id="description"
                               value={formData.description}
                               onChange={(e) => setFormData({...formData, description: e.target.value})}
                               placeholder="Enter description (optional)"
                               rows={3}
                             />
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="category">Category</Label>
                             <Select 
                               value={formData.category_id} 
                               onValueChange={(value) => setFormData({...formData, category_id: value})}
                             >
                               <SelectTrigger>
                                 <SelectValue placeholder="Select category (optional)" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="">Auto-assign category</SelectItem>
                                 {categories.map((category) => (
                                   <SelectItem key={category.id} value={category.id}>
                                     {category.icon} {category.name}
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             <p className="text-xs text-muted-foreground">
                               {categories.length > 0 
                                 ? `${categories.length} categories available`
                                 : "Categories will be created automatically"
                               }
                             </p>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <Label htmlFor="subject">Subject</Label>
                               <Input
                                 id="subject"
                                 value={formData.subject}
                                 onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                 placeholder="e.g., Math, Science"
                               />
                             </div>

                             <div className="space-y-2">
                               <Label htmlFor="class_level">Class Level</Label>
                               <Input
                                 id="class_level"
                                 value={formData.class_level}
                                 onChange={(e) => setFormData({...formData, class_level: e.target.value})}
                                 placeholder="e.g., 10, 11, 12"
                               />
                             </div>
                           </div>

                           <div className="space-y-2">
                             <Label htmlFor="pdf">PDF File</Label>
                             <Input
                               id="pdf"
                               type="file"
                               accept=".pdf"
                               onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                             />
                             {editingItem?.pdf_url && !pdfFile && (
                               <p className="text-xs text-muted-foreground">
                                 Current PDF will be kept if no new file is selected
                               </p>
                             )}
                           </div>
                         </div>

                         <DialogFooter>
                           <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                             Cancel
                           </Button>
                           <Button type="submit" disabled={uploading}>
                             {uploading ? (
                               <>
                                 <Upload className="w-4 h-4 mr-2 animate-spin" />
                                 Uploading...
                               </>
                             ) : (
                               editingItem ? 'Update' : 'Create'
                             )}
                           </Button>
                         </DialogFooter>
                       </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{note.title}</h4>
                      {note.description && (
                        <p className="text-sm text-muted-foreground mt-1">{note.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {note.subject && (
                          <Badge variant="outline">{note.subject}</Badge>
                        )}
                        {note.class_level && (
                          <Badge variant="outline">Class {note.class_level}</Badge>
                        )}
                        <Badge variant={note.is_active ? "default" : "secondary"}>
                          {note.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(note)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(note.id, 'notes')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No notes available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PracticeZoneManagement;