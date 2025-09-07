# Reusable UI Components

This directory contains reusable UI components designed for the PaveBoard application. All components follow a consistent dark theme and are built with Tailwind CSS.

## Components Overview

### 1. DataTable
A flexible table component with built-in loading states, sorting, and customizable columns.

```jsx
import { DataTable } from '../../components/ui';

const columns = [
  {
    key: 'name',
    header: 'Name',
    align: 'left',
    render: (row) => row.name
  },
  {
    key: 'status',
    header: 'Status',
    align: 'center',
    render: (row) => <StatusBadge status={row.status} />
  }
];

<DataTable
  columns={columns}
  data={data}
  loading={loading}
  emptyMessage="No data available"
  onRowClick={(row, index) => console.log(row)}
/>
```

**Props:**
- `columns`: Array of column definitions
- `data`: Array of data objects
- `loading`: Boolean for loading state
- `emptyMessage`: String for empty state
- `onRowClick`: Function for row click handling
- `stickyHeader`: Boolean for sticky header
- `className`: Additional CSS classes

### 2. DeleteButton
A customizable delete/cancel button with different variants and states.

```jsx
import { DeleteButton } from '../../components/ui';

<DeleteButton
  onClick={handleDelete}
  variant="danger" // "danger", "cancel", "request", "requested"
  size="sm" // "xs", "sm", "md", "lg"
  disabled={false}
  loading={false}
  icon="❌"
>
  Delete Item
</DeleteButton>
```

**Props:**
- `onClick`: Function to handle click
- `variant`: Button style variant
- `size`: Button size
- `disabled`: Boolean for disabled state
- `loading`: Boolean for loading state
- `icon`: Icon to display
- `title`: Tooltip text

### 3. StatusBadge
A status indicator component with automatic color coding.

```jsx
import { StatusBadge } from '../../components/ui';

<StatusBadge
  status="active" // "active", "cancelled", "pending", etc.
  variant="success" // "success", "danger", "warning", "info"
  size="sm" // "xs", "sm", "md", "lg"
  showIcon={true}
/>
```

**Props:**
- `status`: Status text (auto-determines variant)
- `variant`: Manual variant override
- `size`: Badge size
- `showIcon`: Boolean to show status icon
- `className`: Additional CSS classes

### 4. ExportButton
A styled export button with different export types and loading states.

```jsx
import { ExportButton } from '../../components/ui';

<ExportButton
  onClick={handleExport}
  exportType="excel" // "excel", "pdf", "csv", "custom"
  variant="primary" // "primary", "secondary", "success"
  size="md" // "sm", "md", "lg"
  loading={exporting}
  disabled={!canExport}
>
  Export Data
</ExportButton>
```

**Props:**
- `onClick`: Export function
- `exportType`: Type of export (changes icon)
- `variant`: Button style variant
- `size`: Button size
- `loading`: Boolean for loading state
- `disabled`: Boolean for disabled state
- `icon`: Custom icon override

### 5. InputField
A flexible input component with validation and different variants.

```jsx
import { InputField } from '../../components/ui';

<InputField
  type="text" // "text", "number", "email", "password"
  value={value}
  onChange={setValue}
  placeholder="Enter text..."
  label="Field Label"
  variant="search" // "default", "search", "number", "email", "password"
  size="md" // "sm", "md", "lg"
  error="Error message"
  required={true}
  icon="🔍"
  onIconClick={() => console.log('icon clicked')}
/>
```

**Props:**
- `type`: Input type
- `value`: Input value
- `onChange`: Change handler
- `placeholder`: Placeholder text
- `label`: Field label
- `variant`: Input style variant
- `size`: Input size
- `error`: Error message
- `required`: Boolean for required field
- `icon`: Icon to display
- `onIconClick`: Icon click handler

### 6. DatePicker
A date input component with calendar icon and date formatting.

```jsx
import { DatePicker } from '../../components/ui';

<DatePicker
  value={date}
  onChange={setDate}
  label="Select Date"
  size="md" // "sm", "md", "lg"
  format="YYYY-MM-DD" // "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"
  minDate={new Date()}
  maxDate={new Date('2025-12-31')}
  showIcon={true}
  error="Invalid date"
/>
```

**Props:**
- `value`: Date value
- `onChange`: Date change handler
- `label`: Field label
- `size`: Input size
- `format`: Date format
- `minDate`: Minimum allowed date
- `maxDate`: Maximum allowed date
- `showIcon`: Boolean to show calendar icon
- `error`: Error message

### 7. SelectField
A dropdown select component with customizable options.

```jsx
import { SelectField } from '../../components/ui';

<SelectField
  value={selectedValue}
  onChange={setSelectedValue}
  options={[
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" }
  ]}
  placeholder="Select an option"
  label="Choose Option"
  variant="status" // "default", "status", "sort"
  size="md" // "sm", "md", "lg"
  showIcon={true}
/>
```

**Props:**
- `value`: Selected value
- `onChange`: Change handler
- `options`: Array of option objects
- `placeholder`: Placeholder text
- `label`: Field label
- `variant`: Select style variant
- `size`: Select size
- `showIcon`: Boolean to show dropdown icon
- `error`: Error message

## Usage Examples

### Complete Form Example
```jsx
import { 
  InputField, 
  DatePicker, 
  SelectField, 
  Button 
} from '../../components/ui';

const MyForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    date: '',
    status: ''
  });

  return (
    <div className="space-y-4">
      <InputField
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Enter your name"
        required
      />
      
      <InputField
        type="email"
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        placeholder="Enter your email"
        variant="email"
        required
      />
      
      <DatePicker
        label="Birth Date"
        value={formData.date}
        onChange={(date) => setFormData({...formData, date})}
        placeholder="Select birth date"
      />
      
      <SelectField
        label="Status"
        value={formData.status}
        onChange={(e) => setFormData({...formData, status: e.target.value})}
        options={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" }
        ]}
        variant="status"
      />
      
      <Button variant="primary" onClick={handleSubmit}>
        Submit
      </Button>
    </div>
  );
};
```

### Table with Actions Example
```jsx
import { DataTable, DeleteButton, StatusBadge } from '../../components/ui';

const MyTable = () => {
  const columns = [
    {
      key: 'name',
      header: 'Name',
      align: 'left',
      render: (row) => row.name
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (row) => (
        <DeleteButton
          onClick={() => handleDelete(row.id)}
          variant="danger"
          size="sm"
        >
          Delete
        </DeleteButton>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="No items found"
    />
  );
};
```

## Styling Guidelines

All components use consistent styling:
- **Dark Theme**: Gray backgrounds with light text
- **Rounded Corners**: `rounded-lg` for inputs, `rounded-full` for badges
- **Transitions**: Smooth transitions for hover and focus states
- **Focus States**: Blue accent color for focus rings
- **Error States**: Red accent color for validation errors
- **Loading States**: Spinner animations and disabled states

## Accessibility

Components include:
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance

## Customization

All components accept `className` props for additional styling and can be extended with custom variants and sizes as needed.
