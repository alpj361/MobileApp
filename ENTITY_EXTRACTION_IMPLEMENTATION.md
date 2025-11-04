# Universal Social Media Entity Extraction Implementation

## Overview
Implemented a universal entity extraction system for social media posts that works across all platforms (X/Twitter, Instagram, TikTok, YouTube, etc.). The system extracts structured data from posts with source prioritization and displays them in the frontend below the transcription section.

## Features Implemented

### 1. Backend Entity Extraction (ExtractorW)

#### **Universal Social Entities Service**
- **File**: `/server/services/socialEntities.js`
- **Purpose**: Platform-agnostic entity extraction from all social media sources
- **Key Functions**:
  - `extractSocialEntities()` - Main extraction function
  - `buildSocialEntityPrompt()` - Creates prompts for Grok AI
  - `extractEntitiesWithGrok()` - AI-powered extraction
  - `extractEntitiesRegex()` - Regex fallback extraction
  - `deduplicateAndMerge()` - Priority-based entity merging

#### **Universal API Endpoint**
- **File**: `/server/routes/socialEntities.js`
- **Endpoint**: `POST /api/social/extract-entities`
- **Input**:
```javascript
{
  platform: 'x' | 'instagram' | 'tiktok' | 'youtube',
  post_url: string,
  content: {
    text?: string,              // Main post text
    transcription?: string,     // HIGH PRIORITY: Spoken content
    vision?: string,            // HIGH PRIORITY: Visual content (OCR)
    description?: string,       // MEDIUM PRIORITY: Additional context
    comments?: Array<{          // LOW PRIORITY: User comments (marked as "possible")
      text: string,
      author: string
    }>,
    author?: string,
    metadata?: object
  }
}
```

#### **Integration with X Async Processing**
- **File**: `/server/routes/x.js`
- **Changes**: Added entity extraction step in `processXPostJob()`
- Entities are extracted after ExtractorT processing completes
- Included in job response alongside media, transcription, vision, comments

---

### 2. Frontend Display

#### **Entity Types**
- **File**: `src/types/entities.ts`
- **Defined Types**:
  - `hashtag` (📌 Blue)
  - `cashtag` (💵 Green)
  - `mention` (👤 Purple)
  - `url` (🔗 Gray)
  - `date` (📅 Orange)
  - `amount` (💰 Emerald)
  - `location` (📍 Red)
  - `entity` (🏢 Indigo - people, organizations)
  - `emoji` (😊 Yellow)

#### **Entity Badge Component**
- **File**: `src/components/EntityBadge.tsx`
- **Features**:
  - Color-coded by entity type
  - Priority indicator (🎯📝💬)
  - "Posible" flag for comment data
  - Occurrence count badge (×2, ×3, etc.)
  - Tap to view details

#### **Entity Panel Component**
- **File**: `src/components/EntityPanel.tsx`
- **Features**:
  - Groups entities by priority:
    - 🎯 **Del Contenido** (HIGH: vision/transcription)
    - 📝 **Del Contexto** (MEDIUM: post/description)
    - 💬 **Datos Posibles** (LOW: comments - collapsible)
  - Summary by entity type
  - Tap entities for detailed information
  - Shows context, sources, confidence

#### **Social Analysis Modal Integration**
- **File**: `src/components/SocialAnalysisModal.tsx`
- **Change**: Added `<EntityPanel>` component below transcription section
- Displays automatically when entities are available

---

### 3. Data Flow

#### **Backend → Frontend**
1. User posts X URL
2. ExtractorT processes media (video/audio transcription, image OCR)
3. ExtractorW receives data from ExtractorT
4. **Entity Extraction**: Extracts from all sources:
   - Vision analysis (OCR, text in images)
   - Transcription (spoken words)
   - Post text (main tweet)
   - Description (extended text)
   - Comments (user reactions)
5. Entities returned with job result
6. Frontend saves entities with analysis data
7. EntityPanel displays below transcription

#### **Source Priority System**
| Priority | Sources | Confidence | Purpose |
|----------|---------|------------|---------|
| **HIGH** | vision, transcription | 1.0x | Actual content (what was shown/said) |
| **MEDIUM** | post, description | 0.9x | Author's context |
| **LOW** | comments | 0.6x | User reactions (marked as "possible") |

#### **Cross-Validation**
- If entity appears in both content AND comments → marked as validated
- `is_possible` flag removed when cross-validated
- Higher priority sources override lower priority in conflicts

---

### 4. Updated Interfaces

#### **XCompleteData** (`src/services/xCompleteService.ts`)
```typescript
export interface XCompleteData {
  // ... existing fields
  entities?: ExtractedEntity[];  // ✅ NEW
}
```

#### **XAsyncJob** (`src/services/xAsyncService.ts`)
```typescript
export interface XCompleteData {
  // ... existing fields
  entities?: ExtractedEntity[];  // ✅ NEW
}
```

#### **SavedItem** (`src/state/savedStore.ts`)
```typescript
xAnalysisInfo?: {
  // ... existing fields
  entities?: ExtractedEntity[];  // ✅ NEW
}
```

#### **StoredXAnalysis** (`src/storage/xAnalysisRepo.ts`)
```typescript
export interface StoredXAnalysis {
  // ... existing fields
  entities?: ExtractedEntity[];  // ✅ NEW
}
```

---

### 5. Entity Extraction Logic

#### **Grok AI Prompt**
- Analyzes ALL sources (vision, transcription, post, description, comments)
- Extracts 9 entity types
- Assigns confidence scores based on source priority
- Marks comment data as `is_possible: true`
- Includes context (120 chars around mention)
- Normalizes values for matching

#### **Regex Fallback**
If Grok AI fails:
- Hashtags: `/(?:^|\s)(#[a-zA-Z0-9_]+)/g`
- Mentions: `/(?:^|\s)(@[a-zA-Z0-9_]+)/g`
- Cashtags: `/(?:^|\s)(\$[A-Z]{1,5})/g`
- URLs: `/https?:\/\/[^\s]+/g`

#### **Deduplication**
- Groups by `type:normalized_value`
- Merges duplicate entities
- Keeps highest priority source
- Combines all sources in `appears_in_sources` array
- Counts occurrences

---

### 6. Example Entity Extraction

**Input (X Video Post):**
```
Post: "Launching our #AI product in Guatemala City 🚀"
Transcription: "We raised $1.5M from @InvestorVC in January 2025..."
Vision: "Slide shows: '$1.5M SEED ROUND' with investor logos"
Comments:
  - @user1: "Congrats! Expanding to El Salvador too?"
  - @user2: "I heard $STARTUP is worth $10M now"
```

**Output (Extracted Entities):**
```json
[
  {
    "type": "amount",
    "value": "$1.5M",
    "normalized_value": "1500000",
    "source": "vision",
    "source_priority": "high",
    "appears_in_sources": ["transcription", "vision"],
    "occurrences": 2,
    "is_possible": false,
    "confidence": 0.99
  },
  {
    "type": "hashtag",
    "value": "#AI",
    "source": "post",
    "source_priority": "medium",
    "is_possible": false,
    "confidence": 0.9
  },
  {
    "type": "location",
    "value": "Guatemala City",
    "source": "post",
    "source_priority": "medium",
    "is_possible": false,
    "confidence": 0.9
  },
  {
    "type": "mention",
    "value": "@InvestorVC",
    "source": "transcription",
    "source_priority": "high",
    "is_possible": false,
    "confidence": 0.95
  },
  {
    "type": "location",
    "value": "El Salvador",
    "source": "comment",
    "source_priority": "low",
    "source_author": "user1",
    "is_possible": true,
    "confidence": 0.6
  }
]
```

---

### 7. Files Created

**Backend:**
- `server/services/socialEntities.js` - Universal extraction service
- `server/routes/socialEntities.js` - API endpoint

**Frontend:**
- `src/types/entities.ts` - Type definitions and constants
- `src/components/EntityBadge.tsx` - Single entity display
- `src/components/EntityPanel.tsx` - Entity list with grouping

**Modified:**
- `server/routes/index.js` - Registered social entities route
- `server/routes/x.js` - Added entity extraction to async job
- `src/services/xCompleteService.ts` - Added entities to interface
- `src/services/xAsyncService.ts` - Added entities to interface
- `src/services/xAnalysisService.ts` - Pass entities through
- `src/state/savedStore.ts` - Added entities to SavedItem
- `src/storage/xAnalysisRepo.ts` - Added entities to storage
- `src/components/SocialAnalysisModal.tsx` - Display EntityPanel

---

### 8. Deployment Notes

**VPS Deployment Required:**
- ExtractorW changes must be pulled and restarted on VPS
- No local Docker needed (services run on VPS)

**Cache Invalidation:**
- Frontend: Clear with `npx expo start --clear`
- Existing cached X posts won't have entities (need re-analysis)
- New posts will automatically extract entities

---

### 9. Future Enhancements

**Phase 2 (Instagram, TikTok):**
- Same service works for all platforms
- Just pass different `platform` parameter
- Entities stored locally with analysis data

**Phase 3 (Advanced Features):**
- Entity relationships graph
- Trending entity dashboard
- Entity-based search/filtering
- Historical entity tracking

---

### 10. Testing

**Manual Testing Steps:**
1. Deploy ExtractorW to VPS
2. Clear frontend cache: `npx expo start --clear`
3. Paste X URL with video/images
4. Wait for analysis to complete
5. Open analysis modal
6. Verify EntityPanel appears below transcription
7. Check entity grouping by priority
8. Tap entities to see details
9. Test with posts containing:
   - Hashtags (#topic)
   - Mentions (@user)
   - Amounts ($1M, "un millón")
   - Locations (cities, countries)
   - Dates (specific and relative)

**Expected Behavior:**
- 🎯 **Del Contenido**: Shows entities from video/images (HIGH priority)
- 📝 **Del Contexto**: Shows entities from post text (MEDIUM priority)
- 💬 **Datos Posibles**: Collapsible section for comment entities (LOW priority)
- Entities with multiple sources show occurrence count (×2, ×3)
- "Posible" tag appears for comment-only data

---

## Summary

✅ **Backend**: Universal entity extraction service integrated into X async processing
✅ **Frontend**: EntityPanel component displaying below transcription
✅ **Priority System**: Vision/transcription > post/description > comments
✅ **Cross-Platform**: Works for any social media platform
✅ **Smart Merging**: Deduplicates entities across sources
✅ **User Feedback**: Clear visual hierarchy with priority badges

Ready for VPS deployment and testing! 🚀
