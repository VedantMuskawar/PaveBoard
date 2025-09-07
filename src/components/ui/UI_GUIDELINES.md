# PaveBoard UI Guidelines - Diesel Ledger Style

## Overview
This document defines the UI rules and patterns to follow across all pages, based on the Diesel Ledger design system. These guidelines ensure consistency, professionalism, and a cohesive user experience.

## 🎨 Design Principles

### 1. Dark Theme Foundation
- **Background**: Radial gradient `radial-gradient(1200px 800px at 20% -10%, #1f232a 0%, #0b0d0f 60%)`
- **Text Color**: `#f5f5f7` for primary text, `#9ba3ae` for secondary text
- **Typography**: Apple system fonts with antialiasing
- **Consistency**: All pages must use the same dark theme

### 2. Minimal Header Design
- **No Title**: PageHeader should not include page titles for cleaner design
- **Essential Elements Only**: Back button (left) and role badge (right)
- **Full Width**: Header spans entire page width with `width: "100%"`
- **Clean Layout**: Minimalist approach focusing on functionality over decoration

### 3. Spacing System (Based on DieselLedger Analysis)
- **Main Content Container**: `marginTop: "1.5rem", padding: "0 2rem"`
- **Page Bottom Padding**: `paddingBottom: "2rem"`
- **Filter Bar**: `padding: "2rem", marginBottom: "2rem", gap: "1.5rem"`
- **Summary Cards**: `margin: "1rem 0", padding: "1rem 2rem"`
- **Table Container**: `padding: "1rem", marginTop: "1rem"`
- **Card Padding**: `2rem` (32px) for main content cards
- **Element Gaps**: `1rem` (16px) for form elements, `1.5rem` (24px) for card elements
- **Form Elements**: `marginBottom: "1rem"`
- **Button Padding**: `padding: "0.5rem 1rem"`
- **Date Filter Gaps**: `gap: "1rem", marginBottom: "1.1rem"`

### 4. Component Hierarchy
```
DieselPage (Root Container)
├── PageHeader (Minimal Navigation - Back Button + Role Badge)
├── FilterBar (Search & Actions)
├── SummaryCards (Statistics)
├── Content Cards (Main Data)
└── Modals (Overlays)
```

## 📐 Layout Rules

### Page Structure
1. **DieselPage**: Always wrap pages with DieselPage component
2. **PageHeader**: Use PageHeader for navigation (full width, no title - clean minimal design)
3. **Content Spacing**: Use consistent `marginTop: "1.5rem"` for main content
4. **Max Width**: Content should not exceed `1200px` width
5. **Centering**: Use `margin: "0 auto"` for centered layouts

### Detailed Spacing Rules (From DieselLedger Analysis)

#### Main Content Container
```jsx
<div style={{ marginTop: "1.5rem", padding: "0 2rem" }}>
  {/* All page content goes here */}
</div>
```

#### PageHeader Implementation
```jsx
<PageHeader 
  onBack={() => window.history.back()}
  role="manager"
  roleDisplay="👔 Manager"
/>
{/* PageHeader automatically has full width: "100%" and proper spacing */}
{/* No title - clean minimal header with back button and role badge only */}
{/* Essential elements: Back button (left), Role badge (right) */}
```

#### Header Design Rules
- **✅ DO**: Use minimal header with back button and role badge only
- **✅ DO**: Ensure full width with `width: "100%"`
- **❌ DON'T**: Include page titles in the header
- **❌ DON'T**: Add unnecessary decorative elements
- **❌ DON'T**: Use complex layouts in the header

#### Filter Bar Spacing
```jsx
<FilterBar style={{ marginTop: "1.5rem", marginBottom: "2rem" }}>
  {/* FilterBar has built-in padding: "2rem" and gap: "1.5rem" */}
</FilterBar>
```

#### Summary Cards Spacing
```jsx
<div style={{ margin: "1rem 0" }}>
  <SummaryCard /> {/* Built-in padding: "1rem 2rem" */}
</div>
```

#### Table Container Spacing
```jsx
<Card style={{ marginTop: "1rem" }}>
  {/* Card has built-in padding: "1rem" */}
</Card>
```

#### Form Element Spacing
```jsx
<div style={{ marginBottom: "1rem" }}>
  <InputField />
</div>
```

#### Button Styling (Exact DieselLedger Match)
```jsx
// Primary Button
<Button variant="primary">
  {/* background: "linear-gradient(180deg, #0A84FF, #0066CC)" */}
  {/* borderRadius: 12, padding: "10px 16px", fontSize: "14px" */}
  {/* boxShadow: "0 8px 20px rgba(10,132,255,0.25)" */}
</Button>

// Secondary Button
<Button variant="secondary">
  {/* background: "linear-gradient(180deg, rgba(44,44,46,0.9), rgba(36,36,38,0.9))" */}
  {/* borderRadius: 10, padding: "6px 10px", fontSize: "0.82rem" */}
</Button>

// Success Button
<Button variant="success">
  {/* background: "#28a745", borderRadius: 8, padding: "0.5rem 1rem" */}
</Button>

// Danger Button
<Button variant="danger">
  {/* background: "linear-gradient(180deg, #FF453A, #C62D23)" */}
  {/* borderRadius: 10, padding: "6px 10px", fontSize: "0.82rem" */}
</Button>

// Outline Button
<Button variant="outline">
  {/* background: "transparent", color: "#ccc", border: "1px solid #ccc" */}
  {/* borderRadius: 6, padding: "0.5rem 1rem", fontSize: "0.95rem" */}
</Button>
```

#### Date Filter Spacing
```jsx
<div style={{ gap: "1rem", marginBottom: "1.1rem" }}>
  <DateRangeFilter />
</div>
```

#### Table Styling (Exact DieselLedger Match)
```jsx
// Table Container
<div style={{
  background: "transparent",
  padding: "1rem",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.30)",
  overflowX: "auto",
  marginTop: "1rem",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)"
}}>
  <table style={{ width: "100%", borderCollapse: "collapse" }}>
    <thead style={{ background: "#1f1f1f" }}>
      <tr>
        <th style={{
          padding: "12px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          fontWeight: 700,
          color: "#E5E7EB",
          fontSize: "0.98rem",
          background: "transparent"
        }}>Header</th>
      </tr>
    </thead>
    <tbody>
      <tr style={{
        background: "rgba(28,28,30,0.42)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        transition: "background-color 160ms ease, transform 120ms ease",
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)"
      }}>
        <td style={{
          padding: "12px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          textAlign: "center",
          color: "#EDEEF0",
          fontSize: "0.95rem"
        }}>Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Table Border Specifications (Exact DieselLedger Match)
- **Container Border**: `1px solid rgba(255,255,255,0.08)`
- **Header Border**: `1px solid rgba(255,255,255,0.06)` (bottom only)
- **Row Border**: `1px solid rgba(255,255,255,0.06)` (bottom only)
- **Cell Border**: `1px solid rgba(255,255,255,0.06)` (bottom only)
- **Border Radius**: `16px` for container, no radius for table elements
- **Border Collapse**: `collapse` for table

### Header Rules
- **Sticky Positioning**: Headers should be sticky with `zIndex: 100`
- **Backdrop Blur**: Use `backdropFilter: "blur(14px)"`
- **Role Badges**: Display user role (Admin/Manager/Member) in header
- **Action Buttons**: Place primary actions in header when appropriate

### Card Layout Rules
- **Background**: `#181c1f` for main cards, `#1e1e1e` for summary cards
- **Border Radius**: `8px` for main cards, `12px` for summary cards
- **Box Shadow**: `0 2px 12px rgba(0,0,0,0.18)` for main cards
- **Padding**: `2rem` for main content, `1rem 2rem` for summary cards
- **Margins**: `2rem` between cards

## 🎯 Component Usage Rules

### FilterBar
- **Purpose**: Primary search and action area
- **Layout**: Centered search when no actions, left-aligned actions when present
- **Spacing**: `2rem` padding, `1.5rem` gap between elements
- **Background**: `#181c1f` with `8px` border radius

### SummaryCard
- **Purpose**: Display key statistics and metrics
- **Layout**: Grid layout (3 columns on desktop, 1 on mobile)
- **Spacing**: `1rem 0` margins, `1rem 2rem` padding
- **Colors**: Use semantic colors (#00c3ff for info, #32D74B for success, #FF453A for danger)

### LoadingState
- **Page Variant**: Full page loading with DieselPage background
- **Inline Variant**: Loading within content areas
- **Icons**: Use contextual icons (👤 for user, 🏢 for organization, ⏳ for general)
- **Messages**: Clear, descriptive loading messages

### ConfirmationModal
- **Purpose**: Confirm destructive or important actions
- **Layout**: Centered content with clear action buttons
- **Colors**: Danger variant for destructive actions, primary for others
- **Icons**: Use warning icons (⚠️) for confirmations

## 🎨 Color Palette

### Primary Colors
- **Background Gradient**: `#1f232a` to `#0b0d0f`
- **Card Background**: `#181c1f` (main), `#1e1e1e` (summary)
- **Text Primary**: `#f5f5f7`
- **Text Secondary**: `#9ba3ae`

### Semantic Colors
- **Success**: `#32D74B` (green)
- **Danger**: `#FF453A` (red)
- **Warning**: `#FF9500` (orange)
- **Info**: `#0A84FF` (blue)
- **Neutral**: `#8e8e93` (gray)

### Border Colors
- **Primary**: `rgba(255,255,255,0.08)`
- **Secondary**: `rgba(255,255,255,0.06)`
- **Focus**: `rgba(10,132,255,0.2)`

## 📱 Responsive Rules

### Breakpoints
- **Mobile**: < 768px (single column layouts)
- **Tablet**: 768px - 1024px (2-column layouts)
- **Desktop**: > 1024px (3-column layouts)

### Grid Systems
- **Summary Cards**: `grid-cols-1 md:grid-cols-3`
- **Form Elements**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- **Content Areas**: `grid-cols-1 lg:grid-cols-2`

## 🔧 Implementation Rules

### Required Imports
```jsx
import { 
  DieselPage,
  PageHeader,
  FilterBar,
  SummaryCard,
  LoadingState,
  EmptyState,
  ConfirmationModal
} from "../../components/ui";
```

### Page Template
```jsx
function MyPage() {
  return (
    <DieselPage>
      <PageHeader
        title="📋 Page Title"
        onBack={() => navigate("/home")}
        role={userRole}
        roleDisplay={roleDisplay}
      >
        {/* Optional header actions */}
      </PageHeader>

      {/* Filter Bar */}
      <FilterBar>
        <FilterBar.Search placeholder="Search..." />
      </FilterBar>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SummaryCard title="Metric" value="123" />
      </div>

      {/* Main Content */}
      <Card className="mb-6">
        {/* Content */}
      </Card>

      {/* Modals */}
      <ConfirmationModal />
    </DieselPage>
  );
}
```

## ✅ Quality Checklist

### Before Publishing
- [ ] Page wrapped in DieselPage
- [ ] PageHeader with proper title and role
- [ ] Consistent spacing (2rem between sections)
- [ ] Proper color usage (semantic colors)
- [ ] Responsive layout (mobile-first)
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Confirmation modals for destructive actions
- [ ] Accessibility labels and ARIA attributes
- [ ] Consistent typography and font smoothing

### Performance
- [ ] Components use proper memoization
- [ ] Images optimized and lazy-loaded
- [ ] Bundle size optimized
- [ ] No unnecessary re-renders

## 🚫 Anti-Patterns

### Don't Do
- ❌ Use light themes or inconsistent colors
- ❌ Mix different spacing systems
- ❌ Create custom components without following guidelines
- ❌ Use hardcoded colors instead of semantic colors
- ❌ Skip loading or empty states
- ❌ Ignore responsive design
- ❌ Use inconsistent typography

### Do Instead
- ✅ Use DieselPage for all pages
- ✅ Follow the spacing system
- ✅ Use existing UI components
- ✅ Use semantic color variables
- ✅ Implement proper state management
- ✅ Design mobile-first
- ✅ Use consistent typography

## 📚 Examples

### Good Example
```jsx
<DieselPage>
  <PageHeader title="📊 Dashboard" role="admin" roleDisplay="Administrator">
    <Button variant="success">Export</Button>
  </PageHeader>
  
  <FilterBar>
    <FilterBar.Search placeholder="Search..." />
  </FilterBar>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <SummaryCard title="Total" value="123" valueColor="#00c3ff" />
  </div>
</DieselPage>
```

### Bad Example
```jsx
<div className="bg-white text-black">
  <div className="p-4">
    <h1>Dashboard</h1>
    <input placeholder="Search" />
    <div className="bg-gray-100 p-2">
      Total: 123
    </div>
  </div>
</div>
```

---

**Remember**: Consistency is key. Every page should feel like part of the same application, with the Diesel Ledger's professional, dark theme aesthetic.
