# Grammar Highlighting Test

This document contains intentional grammar errors to test the highlighting functionality:

## Test Cases

1. **Subject-verb disagreement**: "There is many issues with this sentence."
2. **Its vs It's**: "The dog wagged its tail when it saw its owner."
3. **Your vs You're**: "Your going to love this new feature."
4. **Then vs Than**: "This solution is better then the previous one."
5. **Spelling errors**: "I will recieve the package tomorrow and seperate the items."
6. **Style suggestions**: "The document was written by the team in order to explain the process."

## Instructions for Testing

1. Go to the dashboard (/dashboard)
2. Create a new document
3. Copy and paste the test cases above
4. You should see:
   - Red wavy underlines for grammar errors
   - Yellow wavy underlines for spelling errors  
   - Blue wavy underlines for style suggestions
5. Click on any highlighted text to see the suggestion tooltip
6. Test applying and ignoring suggestions

## Expected Highlights

- "There is many issues" → Grammar error (should be "There are many issues")
- "Your going" → Grammar error (should be "You're going")  
- "better then" → Grammar error (should be "better than")
- "recieve" → Spelling error (should be "receive")
- "seperate" → Spelling error (should be "separate")
- "in order to" → Style suggestion (can be simplified to "to") 