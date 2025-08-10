-- Create practice zone tables for questions and notes

-- Create practice categories table
CREATE TABLE public.practice_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '📚',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practice questions table
CREATE TABLE public.practice_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.practice_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  thumbnail_url TEXT,
  difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  subject TEXT,
  class_level TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practice notes table
CREATE TABLE public.practice_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.practice_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pdf_url TEXT,
  thumbnail_url TEXT,
  subject TEXT,
  class_level TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.practice_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for practice_categories
CREATE POLICY "Practice categories are viewable by everyone" 
ON public.practice_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage practice categories" 
ON public.practice_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for practice_questions
CREATE POLICY "Practice questions are viewable by everyone" 
ON public.practice_questions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage practice questions" 
ON public.practice_questions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policies for practice_notes
CREATE POLICY "Practice notes are viewable by everyone" 
ON public.practice_notes 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admin can manage practice notes" 
ON public.practice_notes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_practice_categories_updated_at
BEFORE UPDATE ON public.practice_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_questions_updated_at
BEFORE UPDATE ON public.practice_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_notes_updated_at
BEFORE UPDATE ON public.practice_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for practice materials
INSERT INTO storage.buckets (id, name, public) VALUES ('practice-materials', 'practice-materials', true);

-- Create policies for practice materials storage
CREATE POLICY "Practice materials are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'practice-materials');

CREATE POLICY "Admin can upload practice materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'practice-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update practice materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'practice-materials' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete practice materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'practice-materials' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default categories
INSERT INTO public.practice_categories (name, description, icon, order_index) VALUES
('Question Papers', 'Previous year question papers and sample papers', '📝', 1),
('Study Notes', 'Chapter-wise notes and summaries', '📚', 2),
('Practice Tests', 'Mock tests and practice quizzes', '🧪', 3),
('Reference Materials', 'Additional study materials and resources', '📖', 4);