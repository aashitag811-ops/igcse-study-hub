# 🚀 Quick Start Guide - View Past Papers Mode

## Test the Demo

The View Past Papers Mode is now fully implemented! Here's how to test it:

### 1. Access the Demo Paper

Navigate to:
```
http://localhost:3000/view-papers/demo
```

Or add a link in your navigation:
```typescript
<Link href="/view-papers/demo">
  View Demo Paper
</Link>
```

### 2. What You'll See

**Dual-Pane Layout:**
- **Left Pane (Blue):** Question Paper with 5 demo questions
- **Right Pane (Green):** Marking Scheme with assessment criteria

**Interactive Controls:**
- **QP Button:** Toggle Question Paper visibility
- **MS Button:** Toggle Marking Scheme visibility  
- **Sync Button:** Enable/disable scroll synchronization
- **Exit Button:** Return to previous page

### 3. Test the Features

#### A. Synced Scroll Engine
1. Scroll down in the Question Paper (left pane)
2. Watch the Marking Scheme (right pane) automatically scroll to match
3. The corresponding marking criteria appears next to each question

#### B. Examiner Report (ER) Drawer
1. Click the orange **"ER - View Examiner Report"** button under any question
2. A slide-over drawer opens from the right showing:
   - Global pass rate percentage
   - Difficulty rating badge
   - Topics covered tags
   - Common mistakes analysis
   - Examiner's pro tips
3. Click the X or backdrop to close

#### C. Toggle Matrix Panel
1. Click **QP** to hide Question Paper → Marking Scheme expands to full width
2. Click **MS** to hide Marking Scheme → Question Paper expands to full width
3. Click **Sync** to disable scroll synchronization → Scroll independently
4. Toggle back to restore dual-pane view

### 4. Mobile/Tablet Testing

The layout is fully responsive:
- **Desktop (1920px+):** Full dual-pane side-by-side
- **Tablet (768-1919px):** Optimized spacing
- **Mobile (<768px):** Stacked layout with swipe gestures

### 5. Demo Data Structure

The demo uses placeholder images and real examiner insights. Check:
```
public/papers/demo_view_mode.json
```

## 🎨 Customization

### Add Your Own Papers

1. **Create the JSON file:**
```json
{
  "subjectCode": "0610",
  "subjectName": "Biology",
  "yearSession": "m20_qp_22",
  "displayName": "May/June 2020 Paper 22",
  "questions": [...],
  "markingScheme": [...],
  "examinerReports": [...]
}
```

2. **Save as:**
```
public/papers/{paperId}_view_mode.json
```

3. **Access via:**
```
/view-papers/{paperId}
```

### Customize Colors

Edit the component files:
- **QP Theme:** Blue colors in `ViewPastPapersMode.tsx`
- **MS Theme:** Green colors in `ViewPastPapersMode.tsx`
- **ER Theme:** Amber/Orange in `ExaminerReportDrawer.tsx`

## 🔧 Integration with Existing App

### Add to Navigation Menu

```typescript
// In your navigation component
<Link 
  href="/view-papers/0610_m20_qp_22"
  className="nav-link"
>
  📚 View Past Papers
</Link>
```

### Add to Subject Pages

```typescript
// In subject/[code]/page.tsx
<button onClick={() => router.push('/view-papers/0610_m20_qp_22')}>
  View in Study Mode
</button>
```

### Add to MCQ Test Results

```typescript
// After completing a test
<button onClick={() => router.push('/view-papers/' + paperId)}>
  Review with Examiner Reports
</button>
```

## 📊 Performance Tips

### Optimize Images
- Use WebP format for question images
- Compress to ~100KB per image
- Lazy load with placeholders

### Optimize Scroll Sync
- Already optimized with Intersection Observer
- Debounced at 100ms
- Scroll lock prevents infinite loops

### PDF Loading
- PDFs load in native browser viewer
- Fallback to "Open in New Tab" if embedding fails
- Loading states prevent layout shift

## 🐛 Troubleshooting

### Scroll Sync Not Working
- Check browser console for errors
- Verify `data-question-number` attributes exist
- Ensure both panes are visible

### ER Drawer Not Opening
- Verify examiner report data exists in JSON
- Check `questionNumber` matches between question and report
- Inspect browser console for errors

### Images Not Loading
- Verify image URLs are accessible
- Check CORS settings if using external images
- Use placeholder images for testing

### PDF Not Embedding
- Some browsers block PDF embedding
- Use the "Open in New Tab" fallback
- Consider using PDF.js for better control

## 🎯 Next Steps

1. **Add Real Papers:**
   - Extract question images from PDFs
   - Compile marking scheme data
   - Add examiner report insights

2. **Enhance Features:**
   - Add annotation system
   - Implement bookmarking
   - Add print/export functionality

3. **Analytics:**
   - Track time spent per question
   - Monitor ER drawer open rates
   - Measure scroll sync usage

## 📞 Need Help?

Check the full documentation:
```
VIEW_PAST_PAPERS_MODE.md
```

Or review the component files:
- `src/components/past-papers/ViewPastPapersMode.tsx`
- `src/components/past-papers/ExaminerReportDrawer.tsx`
- `src/lib/types/past-papers.types.ts`

---

**Built with ❤️ by Bob**

*Transform your study experience with the most advanced past paper viewer ever created!*