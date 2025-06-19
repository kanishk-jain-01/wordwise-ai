-- Add ignored_suggestions table for document-scoped ignore functionality
CREATE TABLE IF NOT EXISTS ignored_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Context for matching suggestions
    original_text VARCHAR(255) NOT NULL,
    suggestion_type VARCHAR(50) NOT NULL, -- 'grammar', 'spelling', 'style'
    rule_id VARCHAR(255), -- Optional rule identifier for more precise matching
    
    -- Position and context for fuzzy matching
    position_start INTEGER NOT NULL,
    position_end INTEGER NOT NULL,
    context_before VARCHAR(100), -- Text before the suggestion
    context_after VARCHAR(100),  -- Text after the suggestion
    
    -- Metadata
    ignored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user can only ignore same suggestion once per document
    UNIQUE(document_id, original_text, suggestion_type, position_start)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ignored_suggestions_document_id ON ignored_suggestions(document_id);
CREATE INDEX IF NOT EXISTS idx_ignored_suggestions_user_id ON ignored_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ignored_suggestions_lookup ON ignored_suggestions(document_id, original_text, suggestion_type); 