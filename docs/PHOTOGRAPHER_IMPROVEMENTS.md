# Photo Portal - Professional Photographer Improvement Suggestions

**Date**: January 1, 2026  
**Reviewed By**: Professional Photography Workflow Advisor  
**Current Version Analysis**: Photo Portal v1.0

---

## Executive Summary

This document outlines improvement suggestions for Photo Portal from a professional photographer's perspective. The current system has a solid foundation with gallery management, client access controls, and basic image delivery. However, there are significant opportunities to enhance photographer efficiency, client experience, and image protection.

### Current Strengths ✅
- Strong gallery organization with folders and timeline views
- Client access control with passwords and expiration dates
- Like/favorite system for photo selection
- Server-side download processing
- Admin panel for system management
- Upload session tracking
- Basic EXIF date extraction
- Analytics and tracking capabilities

### Key Gaps Identified 🎯
1. **No watermarking system** for client previews
2. Limited image metadata preservation
3. No print preparation or sizing options
4. Basic notification system
5. Missing proofing workflow features
6. No client selection limits
7. Limited customization options for client galleries
8. No automated backup verification
9. Missing SEO optimization for public galleries

---

## Priority 1: Critical Features for Professional Workflow

### 1.1 Watermark System 💧
**Problem**: Currently, photographers upload full-resolution images that clients can view and potentially download without proper protection during the selection phase.

**Impact**: HIGH - Protects intellectual property and prevents unauthorized use

**Suggestion**: Implement a comprehensive watermarking system
- **Automatic watermark application** for preview images (not originals)
- **Customizable watermark options**:
  - Upload custom logo/signature
  - Text watermarks with photographer branding
  - Position control (center, corner, diagonal)
  - Opacity and size adjustment
  - Different styles per gallery or global default
- **Smart watermark placement**: Avoid face detection areas using AI
- **Watermark-free downloads**: Only for final approved selections after payment/authorization
- **Preview quality control**: Limit preview resolution (e.g., 2000px max) with watermarks

**Implementation Notes**:
```typescript
// Database schema addition
model WatermarkConfig {
  id              String    @id @default(cuid())
  userId          String    @unique
  type            String    // 'text' | 'image' | 'both'
  text            String?
  imageUrl        String?   // S3/B2 URL for watermark image
  position        String    @default('center') // 'center' | 'bottom-right' | 'diagonal'
  opacity         Float     @default(0.5)
  fontSize        Int?
  fontFamily      String?
  color           String?
  enabled         Boolean   @default(true)
  user            User      @relation(fields: [userId], references: [id])
}
```

### 1.2 Print Package Preparation 🖨️
**Problem**: Photographers often need to provide print-ready files in specific sizes and resolutions.

**Impact**: HIGH - Saves hours of manual work in post-processing

**Suggestion**: Add print preparation automation
- **Predefined print sizes**: 4x6, 5x7, 8x10, 11x14, 16x20, etc.
- **Custom crop tools** for clients to select print areas
- **Aspect ratio protection** with smart cropping suggestions
- **Resolution adjustment**: 300 DPI for prints, web-optimized for digital
- **Color space conversion**: sRGB for web, Adobe RGB for print
- **Batch export**: Download all selected photos in multiple sizes simultaneously
- **Print lab integration**: Direct export to popular print services (WHCC, Miller's Lab)

**Use Case Example**:
```
Client selects 50 photos → 
Photographer sets package: "Wedding Album Collection" →
System generates:
  - 20x30 canvas ready files (2 hero shots)
  - 8x10 prints (10 photos)
  - 5x7 prints (38 photos)
  - Web-sized social media versions (all 50)
All properly cropped, color-corrected, and watermark-free
```

### 1.3 Client Selection Limits 🎯
**Problem**: Clients may over-select photos, creating decision fatigue and increasing photographer workload.

**Impact**: MEDIUM-HIGH - Manages client expectations and streamlines workflow

**Suggestion**: Implement flexible selection controls
- **Maximum selections per gallery**: Set limit (e.g., "Select up to 50 photos")
- **Tiered packages**: 
  - Basic: 30 photos
  - Standard: 50 photos  
  - Premium: 100 photos
- **Visual counter**: Real-time selection count with warning when approaching limit
- **Upgrade prompts**: Suggest package upgrades when limit reached
- **Photographer override**: Can adjust limits per client as needed
- **Selection deadline**: Auto-lock selections after deadline

```typescript
// Database enhancement
model Gallery {
  // ... existing fields
  selectionLimit     Int?       // Max photos client can select
  selectionsLocked   Boolean    @default(false)
  selectionDeadline  DateTime?  // Auto-lock date
  packageTier        String?    // 'basic' | 'standard' | 'premium'
}
```

### 1.4 Enhanced Notification System 📧
**Problem**: Current system lacks proactive communication for key events.

**Impact**: MEDIUM-HIGH - Improves client engagement and reduces manual follow-ups

**Suggestion**: Implement comprehensive notification system
- **Email notifications**:
  - Gallery ready/published
  - Gallery expiring soon (7 days, 1 day warnings)
  - Client made selections
  - Client completed selections
  - Download ready
  - New comments/feedback
- **SMS notifications** (optional integration with Twilio)
- **In-app notifications** with notification center
- **Photographer preferences**: Choose which events trigger notifications
- **Client preferences**: Let clients opt-in/out of notifications
- **Digest mode**: Daily summary instead of per-event emails

### 1.5 Advanced Proofing Workflow 👁️
**Problem**: Missing structured workflow for client feedback and revisions.

**Impact**: MEDIUM - Professional workflows require iterative feedback

**Suggestion**: Add proofing and approval workflow
- **Photo comments**: Clients can leave notes on specific photos
  - "Can you brighten this?"
  - "Remove the person in background"
  - "Love this one!"
- **Approval states**: 
  - Needs Review
  - Approved
  - Needs Editing
  - Rejected
- **Revision tracking**: See edit history per photo
- **Batch comments**: Add notes to multiple photos at once
- **Photographer responses**: Reply to client feedback in-context
- **Comparison view**: Before/after for edited photos
- **Final delivery checklist**: Both parties must approve before final export

---

## Priority 2: Client Experience Enhancements

### 2.1 Gallery Customization & Branding 🎨
**Problem**: All galleries look identical, lacking personal branding.

**Impact**: MEDIUM - Branding differentiates photographers and enhances professionalism

**Suggestion**: Add customization options
- **Custom gallery themes**: Choose colors, fonts, layouts
- **Logo display**: Show photographer logo on gallery pages
- **Custom welcome message**: Personal note to clients
- **Background music**: Optional subtle background audio (copyright-free)
- **Custom domain mapping**: photographers.yourname.com
- **White-label option**: Remove "Powered by Photo Portal" for premium users
- **Gallery templates**: Pre-designed themes (Modern, Classic, Minimalist, etc.)

### 2.2 Enhanced Photo Viewing Experience 🖼️
**Problem**: Basic lightbox with limited navigation and information.

**Impact**: MEDIUM - Better viewing experience increases client satisfaction

**Suggestion**: Improve photo viewing interface
- **Smooth transitions**: Fade effects between photos
- **Keyboard shortcuts**: 
  - Arrow keys: Navigate
  - L: Like/Unlike
  - F: Favorite
  - S: Select for download
  - I: View info
- **Photo metadata display**: 
  - Camera settings (if retained)
  - Capture date/time
  - Photo number in gallery
- **Zoom functionality**: 
  - Mouse wheel zoom
  - Pinch-to-zoom on mobile
  - Pan while zoomed
- **Slideshow mode**: Auto-advance with adjustable timing
- **Comparison mode**: View 2-4 photos side-by-side
- **Share individual photos**: Generate secure link to single photo

### 2.3 Mobile App Experience 📱
**Problem**: Mobile web experience is functional but not app-native.

**Impact**: MEDIUM - 60%+ of clients view on mobile devices

**Suggestion**: Enhance mobile experience
- **Progressive Web App (PWA)**: Install to home screen
- **Offline viewing**: Cache recently viewed galleries
- **Touch gestures**: 
  - Swipe for next/previous
  - Double-tap to like
  - Long-press for actions menu
- **Mobile upload**: Photographers can add photos from phone
- **Push notifications**: Native-style notifications on mobile
- **Optimized thumbnails**: Smaller file sizes for mobile data
- **Gallery sharing**: Native share sheet integration

### 2.4 Social Sharing Features 📲
**Problem**: Clients want to share their photos with friends/family.

**Impact**: LOW-MEDIUM - Marketing opportunity through client networks

**Suggestion**: Add controlled social sharing
- **Secure share links**: Time-limited, view-only gallery access
- **Selected photos sharing**: Share just favorited photos, not entire gallery
- **Social media ready exports**: 
  - Optimized for Instagram (1:1, 4:5)
  - Facebook cover photos
  - Story format (9:16)
- **Privacy controls**: Photographer approves what can be shared
- **Watermarked shares**: Automatically add watermark to shared images
- **Link tracking**: See which shared links are most viewed

---

## Priority 3: Technical & Performance Improvements

### 3.1 Image Metadata Preservation 📊
**Problem**: Important EXIF data may be lost during processing.

**Impact**: MEDIUM - Professional photographers need metadata for organization

**Suggestion**: Comprehensive metadata handling
- **Preserve all EXIF data**: Camera, lens, settings, location (optional)
- **Copyright embedding**: Automatically add copyright info to EXIF
- **Keywords and ratings**: Import from Lightroom/Capture One
- **GPS data handling**: Option to strip location for privacy
- **Color profile preservation**: Maintain ICC profiles
- **Metadata editing**: Bulk update copyright, keywords
- **Export with metadata**: Include EXIF in final deliveries

```typescript
model PhotoMetadata {
  id              String    @id @default(cuid())
  photoId         String    @unique
  cameraMake      String?
  cameraModel     String?
  lens            String?
  focalLength     String?
  aperture        String?
  shutterSpeed    String?
  iso             Int?
  copyright       String?
  keywords        String[]
  rating          Int?
  colorSpace      String?
  latitude        Float?
  longitude       Float?
  photo           Photo     @relation(fields: [photoId], references: [id])
}
```

### 3.2 Advanced Search & Filtering 🔍
**Problem**: Finding photos in large galleries is difficult.

**Impact**: MEDIUM - Time savings for both photographers and clients

**Suggestion**: Implement powerful search
- **Metadata search**: Find by camera, lens, date range
- **AI-powered search**: 
  - "Photos with people"
  - "Outdoor shots"
  - "Close-ups"
  - "Sunset photos"
- **Color search**: Find photos by dominant color
- **Orientation filter**: Portrait vs landscape
- **Smart collections**:
  - Best of gallery (highest rated)
  - Most liked by clients
  - Unselected photos
  - Recently added
- **Saved searches**: Photographers can create custom filters

### 3.3 Performance Optimization ⚡
**Problem**: Large galleries may load slowly.

**Impact**: MEDIUM-HIGH - Speed impacts user experience significantly

**Suggestion**: Optimize loading and rendering
- **Lazy loading**: Load images as user scrolls
- **Progressive JPEG**: Show low-quality preview → full quality
- **WebP format**: Use modern formats for 30% size reduction
- **CDN optimization**: Cache thumbnails globally
- **Infinite scroll**: Load 50-100 photos at a time
- **Image preloading**: Predict next photos user will view
- **Thumbnail generation tiers**:
  - Micro: 50px (grid preview)
  - Small: 400px (thumbnail)
  - Medium: 1200px (lightbox)
  - Large: 2400px (detail view)
- **Loading skeletons**: Show placeholders during load

### 3.4 Backup & Data Integrity 🔐
**Problem**: No verification of successful uploads/storage.

**Impact**: HIGH - Data loss is unacceptable for professional work

**Suggestion**: Implement reliability features
- **Checksum verification**: MD5/SHA256 hash checks
- **Redundant storage**: Store in 2+ locations (primary + backup)
- **Upload verification**: Confirm file integrity after upload
- **Automated backups**: Daily database + file backups
- **Recovery testing**: Regular restore drills
- **Storage monitoring**: Alert when storage approaching limits
- **Version history**: Keep original + edited versions
- **Deletion safeguards**: 30-day soft delete before permanent removal

---

## Priority 4: Business & Analytics Features

### 4.1 Advanced Analytics Dashboard 📈
**Problem**: Basic analytics don't provide actionable business insights.

**Impact**: MEDIUM - Data-driven decisions improve business

**Suggestion**: Enhance analytics capabilities
- **Client engagement metrics**:
  - Time spent in gallery
  - Photos viewed vs selected
  - Device breakdown
  - Peak viewing times
- **Conversion tracking**:
  - Gallery views → selections
  - Selection → download
  - Package upgrades
- **Revenue insights**:
  - Earnings per gallery
  - Most profitable package types
  - Client lifetime value
- **Performance benchmarks**:
  - Average delivery time
  - Client satisfaction scores
  - Response time to inquiries
- **Custom reports**: Export data for tax/accounting
- **Comparative analytics**: Year-over-year growth

### 4.2 Client Relationship Management (CRM) 👥
**Problem**: Client data scattered, hard to track relationships.

**Impact**: MEDIUM - Better client management = more bookings

**Suggestion**: Enhance client management
- **Client profiles**:
  - Contact information
  - Past galleries
  - Total photos delivered
  - Package history
  - Important dates (anniversaries)
- **Tags and segments**: 
  - Wedding clients
  - Corporate clients
  - Repeat customers
  - Referred clients
- **Follow-up reminders**: 
  - "Check if client needs prints"
  - "Anniversary photo session reminder"
  - "Request review/testimonial"
- **Communication history**: Log all interactions
- **Client preferences**: Remember their favorite styles, selections
- **Referral tracking**: See which clients bring new business

### 4.3 Invoicing & Payment Integration 💳
**Problem**: No payment processing within the system.

**Impact**: MEDIUM-HIGH - Streamlines business operations

**Suggestion**: Add payment capabilities
- **Invoice generation**: 
  - Professional PDF invoices
  - Itemized: Session fee, prints, digital files
  - Custom branding
- **Payment integration**: Stripe, PayPal, Square
- **Payment plans**: Split payments for large orders
- **Deposit tracking**: Require deposit before gallery access
- **Automated receipts**: Email confirmation after payment
- **Package management**: 
  - Define standard packages with pricing
  - Add-on services (extra photos, prints, albums)
- **Tax calculations**: Automatic tax based on location
- **Payment required downloads**: Lock downloads until payment received

### 4.4 Testimonials & Portfolio System 🌟
**Problem**: No way to showcase work publicly for marketing.

**Impact**: MEDIUM - Public galleries drive new bookings

**Suggestion**: Add portfolio features
- **Public portfolio mode**: 
  - Showcase best work
  - No download, watermarked
  - SEO optimized
- **Client testimonials**:
  - Request reviews after delivery
  - Display on portfolio
  - Star ratings
- **Featured galleries**: Highlight best work on homepage
- **Blog integration**: Write about sessions, share galleries
- **Before/after showcases**: Show editing skills
- **Award badges**: Display photography awards/certifications

---

## Priority 5: Advanced Professional Features

### 5.1 Collaborative Workflows 🤝
**Problem**: Second photographers and assistants can't access system.

**Impact**: LOW-MEDIUM - Important for teams

**Suggestion**: Add team collaboration
- **Team accounts**: 
  - Lead photographer + assistants
  - Different permission levels
  - Shared client access
- **Upload delegation**: Assistants can upload to photographer's galleries
- **Review workflow**: 
  - Assistant uploads → photographer reviews → publish
  - Star rating system for culling
- **Notes and tags**: Team members can leave notes on photos
- **Activity log**: See who did what and when

### 5.2 AI-Powered Features 🤖
**Problem**: Manual culling and organization is time-consuming.

**Impact**: MEDIUM - AI can save hours of work

**Suggestion**: Implement AI assistance
- **Auto-culling**: 
  - Detect duplicate/similar shots
  - Identify best photo in burst
  - Flag blurry or poorly exposed images
- **Face detection**: 
  - Group photos by person
  - "Photos with bride and groom"
  - Protect faces from watermark placement
- **Smart albums**: 
  - "Getting ready"
  - "Ceremony"
  - "Reception"
  - Auto-organize based on EXIF timestamps
- **Image enhancement suggestions**: 
  - "This photo might benefit from cropping"
  - "Consider brightening this image"
- **Content moderation**: Flag inappropriate content

### 5.3 Integration Ecosystem 🔌
**Problem**: Photographers use multiple tools (Lightroom, CRM, etc.).

**Impact**: MEDIUM - Integrations reduce manual work

**Suggestion**: Add integrations
- **Adobe Lightroom**: 
  - Export directly to Photo Portal
  - Import selections back to Lightroom
  - Sync ratings and flags
- **Calendar integration**: 
  - Google Calendar, iCal
  - Show upcoming delivery deadlines
- **Email marketing**: 
  - Mailchimp, Constant Contact
  - Send gallery announcements
- **Print labs**: 
  - Direct export to WHCC, Miller's Lab
  - Auto-import print orders
- **Contract tools**: 
  - HoneyBook, Dubsado
  - Link contracts to galleries
- **Zapier/Make**: Connect to 1000+ apps

### 5.4 Advanced Gallery Types 📸
**Problem**: One-size-fits-all galleries don't fit all use cases.

**Impact**: LOW-MEDIUM - Flexibility for different photography types

**Suggestion**: Specialized gallery types
- **Event galleries**: 
  - Live upload during event
  - Real-time viewing by guests
  - Guest can download their photos
- **School/sports galleries**: 
  - Organized by person/player
  - Bulk ordering interface
  - Password per family
- **Real estate galleries**: 
  - Property-based organization
  - Room-by-room folders
  - MLS-ready downloads
- **Product photography**: 
  - Organized by SKU
  - Multiple angles per product
  - Client approval workflow
- **Time-lapse projects**: 
  - Show progress over time
  - Side-by-side comparison

---

## Implementation Roadmap

### Phase 1 (Months 1-3): Foundation & Protection
**Priority**: Critical security and workflow features
1. ✅ Watermark system
2. ✅ Selection limits
3. ✅ Enhanced notifications
4. ✅ Backup verification
5. ✅ Metadata preservation

**Estimated Effort**: 250-300 hours
**Business Impact**: HIGH - Essential for professional use

### Phase 2 (Months 4-6): Client Experience
**Priority**: User experience and satisfaction
1. ✅ Gallery customization
2. ✅ Enhanced photo viewing
3. ✅ Mobile PWA
4. ✅ Proofing workflow
5. ✅ Print preparation

**Estimated Effort**: 200-250 hours
**Business Impact**: MEDIUM-HIGH - Differentiates from competitors

### Phase 3 (Months 7-9): Business Operations
**Priority**: Revenue and efficiency
1. ✅ Payment integration
2. ✅ Advanced analytics
3. ✅ CRM features
4. ✅ Invoice generation
5. ✅ Portfolio system

**Estimated Effort**: 200-250 hours
**Business Impact**: MEDIUM-HIGH - Enables business growth

### Phase 4 (Months 10-12): Advanced Features
**Priority**: Competitive advantages
1. ✅ AI-powered features
2. ✅ Team collaboration
3. ✅ Integration ecosystem
4. ✅ Specialized gallery types
5. ✅ Advanced search

**Estimated Effort**: 300-350 hours
**Business Impact**: MEDIUM - Nice-to-have features

---

## Quick Wins (Can Implement Quickly)

### Week 1 Quick Wins
1. **Keyboard shortcuts in lightbox** (8 hours)
   - Arrow keys, L for like, F for favorite
   - Significantly improves navigation speed

2. **Real-time selection counter** (4 hours)
   - Show "X photos selected" badge
   - Visual feedback for clients

3. **Gallery expiration warnings** (6 hours)
   - Email clients 7 days before expiration
   - Reduces "I didn't know it expired" issues

4. **Download progress indicator** (6 hours)
   - Show progress bar during download preparation
   - Reduces client anxiety during long downloads

5. **Photographer logo on galleries** (8 hours)
   - Upload logo in settings
   - Display on all gallery pages
   - Simple branding improvement

**Total Effort**: ~32 hours
**Total Impact**: HIGH - Visible improvements with minimal effort

---

## Competitive Analysis

### How Photo Portal Compares

**vs. Pixieset**
- ✅ Similar: Gallery management, client access
- ❌ Missing: Watermarking, print sales, contracts
- ✅ Better: Open-source, self-hosted, no monthly fees

**vs. Pic-Time**
- ✅ Similar: Proofing, downloads
- ❌ Missing: AI features, advanced marketing
- ✅ Better: Customizable, unlimited storage (self-hosted)

**vs. ShootProof**
- ✅ Similar: Client galleries, downloads
- ❌ Missing: E-commerce, print fulfillment, contracts
- ✅ Better: No transaction fees, full data control

**Opportunity**: By implementing Priority 1 & 2 features, Photo Portal can compete directly with paid services while maintaining the advantage of being self-hosted and open-source.

---

## Success Metrics

### Track These KPIs After Implementation

**Photographer Efficiency**
- ⏱️ Time from upload to delivery (target: <2 hours)
- 📊 Photos uploaded per session (baseline → improvement)
- 🔄 Client revision requests (target: <2 per gallery)
- ⚡ Upload success rate (target: >99.9%)

**Client Satisfaction**
- ⭐ Client ratings (target: >4.5/5)
- 👍 Selection completion rate (target: >90%)
- 🔁 Repeat booking rate (target: >40%)
- 📧 Response time to gallery (target: <24 hours to first view)

**Business Growth**
- 💰 Average order value (track growth)
- 📈 New client acquisition (via portfolio referrals)
- 🎯 Package upgrade rate (target: >20%)
- 💵 Revenue per gallery hour

**Technical Performance**
- ⚡ Page load time (target: <2 seconds)
- 📦 Storage utilization (track growth)
- 🔒 Security incidents (target: 0)
- ⬆️ Upload success rate (target: >99%)

---

## Conclusion

Photo Portal has a solid foundation but needs photographer-focused enhancements to compete with established gallery platforms. The highest-priority improvements are:

1. **Watermarking system** - Protects photographer IP
2. **Selection limits** - Manages client expectations
3. **Print preparation** - Saves post-processing time
4. **Enhanced notifications** - Reduces manual follow-up
5. **Payment integration** - Streamlines business operations

By focusing on these areas, Photo Portal can become a truly professional-grade solution that photographers will choose over paid alternatives, with the added benefits of self-hosting, data ownership, and no transaction fees.

The recommended approach is to implement in phases, starting with critical workflow features (Phase 1), then enhancing client experience (Phase 2), followed by business operations (Phase 3), and finally advanced competitive features (Phase 4).

**Estimated Total Development Time**: 950-1,150 hours across 12 months
**Expected ROI**: High - Each feature directly addresses photographer pain points and can enable monetization through premium tiers or consulting services.

---

## Appendix: Implementation Examples

### Example 1: Watermark Configuration UI (Wireframe)

```
┌─────────────────────────────────────────────────┐
│ Watermark Settings                              │
├─────────────────────────────────────────────────┤
│                                                  │
│ ☑ Enable watermarks on preview images          │
│                                                  │
│ Watermark Type:                                 │
│ ○ Text  ● Image  ○ Both                        │
│                                                  │
│ Upload Logo:  [Browse...]  logo.png            │
│                                                  │
│ Position:     [Dropdown: Center ▼]             │
│ Opacity:      [Slider: ███████░░░] 70%         │
│ Size:         [Slider: ████░░░░░░] 40%         │
│                                                  │
│ Preview:                                        │
│ ┌─────────────────────────────────────┐        │
│ │  [Sample photo with watermark]      │        │
│ └─────────────────────────────────────┘        │
│                                                  │
│ Apply to:                                       │
│ ○ All galleries                                │
│ ○ New galleries only                           │
│ ● Per gallery (configure individually)         │
│                                                  │
│        [Cancel]  [Save Settings]               │
└─────────────────────────────────────────────────┘
```

### Example 2: Selection Limit Implementation

```typescript
// Frontend component
function SelectionCounter({ 
  currentCount, 
  maxCount, 
  packageName 
}: SelectionCounterProps) {
  const remaining = maxCount - currentCount;
  const percentage = (currentCount / maxCount) * 100;
  
  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4">
      <div className="text-sm font-medium mb-2">
        {packageName} Package
      </div>
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold">{currentCount}</div>
        <div className="text-gray-500">/ {maxCount}</div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div 
          className={`h-2 rounded-full transition-all ${
            percentage > 90 ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {remaining <= 10 && remaining > 0 && (
        <div className="text-xs text-orange-600 mt-1">
          Only {remaining} selections remaining
        </div>
      )}
      {remaining === 0 && (
        <div className="text-xs text-red-600 mt-1">
          Selection limit reached. <a href="#upgrade">Upgrade?</a>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Notification Preferences

```typescript
// Database schema
model NotificationPreferences {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  galleryReady            Boolean  @default(true)
  galleryExpiring         Boolean  @default(true)
  clientSelection         Boolean  @default(true)
  downloadReady           Boolean  @default(true)
  clientComment           Boolean  @default(true)
  deliveryMethod          String   @default('email') // 'email' | 'sms' | 'both'
  digestMode              Boolean  @default(false)
  digestFrequency         String   @default('daily') // 'daily' | 'weekly'
  quietHoursStart         String?  // '22:00'
  quietHoursEnd           String?  // '08:00'
  user                    User     @relation(fields: [userId], references: [id])
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 1, 2026  
**Next Review**: After Phase 1 implementation  
**Maintained By**: Photo Portal Development Team
