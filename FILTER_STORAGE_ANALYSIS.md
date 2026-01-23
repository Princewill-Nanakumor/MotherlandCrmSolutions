# Filter Storage Analysis - All Leads Page

## Summary of Inconsistencies

The filters on the all-leads page are stored inconsistently across different storage mechanisms (localStorage, URL params, Zustand store, and component state). This causes filters to not persist correctly or sync properly.

---

## Filter Storage Breakdown

### 1. **Country Filter** (`filterByCountry`)

#### Storage Locations:
- **localStorage**: `"leads_filter_by_country"` - Stores as **JSON stringified array** `JSON.stringify(uiState.filterByCountry)`
- **URL Params**: `?country=...` - Stores as **JSON stringified array** `JSON.stringify(countries)`
- **Component State**: `uiState.filterByCountry` - Stores as **array** `string[]`
- **Mode Storage**: `"countryFilterMode"` - Stores as **plain string** `"include"` or `"exclude"`

#### Issues:
- ✅ **Consistent**: All use arrays, JSON stringified in storage
- ⚠️ **Mode stored separately**: Mode is in different localStorage key

---

### 2. **Status Filter** (`filterByStatus`)

#### Storage Locations:
- **localStorage**: `"leads_filter_by_status"` - Stores as **JSON stringified array** `JSON.stringify(uiState.filterByStatus)`
- **URL Params**: `?status=...` - Stores as **JSON stringified array** `JSON.stringify(statuses)`
- **Component State**: `uiState.filterByStatus` - Stores as **array** `string[]`
- **Mode Storage**: `"statusFilterMode"` - Stores as **plain string** `"include"` or `"exclude"`

#### Issues:
- ✅ **Consistent**: All use arrays, JSON stringified in storage
- ⚠️ **Mode stored separately**: Mode is in different localStorage key

---

### 3. **Source Filter** (`filterBySource`)

#### Storage Locations:
- **localStorage**: `"leads_filter_by_source"` - Stores as **JSON stringified array** `JSON.stringify(uiState.filterBySource)`
- **URL Params**: `?source=...` - Stores as **JSON stringified array** `JSON.stringify(sources)`
- **Component State**: `uiState.filterBySource` - Stores as **array** `string[]`
- **Mode Storage**: `"sourceFilterMode"` - Stores as **plain string** `"include"` or `"exclude"`

#### Issues:
- ✅ **Consistent**: All use arrays, JSON stringified in storage
- ⚠️ **Mode stored separately**: Mode is in different localStorage key

---

### 4. **User Filter** (`filterByUser`) ⚠️ **MAJOR INCONSISTENCY**

#### Storage Locations:
- **localStorage**: `"leads_filter_by_user"` - Stores as **JSON stringified array** `JSON.stringify(userFilter)` where `userFilter` is converted from string to array
- **URL Params**: ❌ **NOT STORED IN URL** - Only page number is updated, filter is NOT in URL
- **Zustand Store**: `filterByUser` - Stores as **string** (`"all"`, `"unassigned"`, or comma-separated `"userId1,userId2"`)
- **Component State**: Uses Zustand store directly, not in `uiState`

#### Issues:
- ❌ **CRITICAL**: User filter is **NOT synced to URL params** (unlike other filters)
- ❌ **Type mismatch**: Zustand store uses **string**, but localStorage stores as **array**
- ❌ **Conversion needed**: Code converts between string and array formats
- ❌ **No URL persistence**: Filter is lost on page refresh if not in URL

#### Code Evidence:
```typescript
// In handleFilterChange - NO URL update for user filter
const handleFilterChange = useCallback(
  (values: string[]) => {
    const value = values.length === 0 ? "all" : values.join(",");
    setFilterByUser(value); // Only updates Zustand store
    
    const params = new URLSearchParams(window.location.search);
    params.set("page", "1");
    // ❌ MISSING: params.set("filter", ...) or params.set("user", ...)
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  },
  [setFilterByUser]
);

// In localStorage persistence - converts string to array
const userFilter = Array.isArray(filterByUser) 
  ? filterByUser 
  : filterByUser === "all" || !filterByUser 
    ? [] 
    : [filterByUser];
localStorage.setItem(STORAGE_KEYS.FILTER_BY_USER, JSON.stringify(userFilter));
```

---

## Initialization Priority Issues

### Current Priority Order (inconsistent):

1. **Country/Status/Source Filters**:
   - Priority 1: URL params (if present)
   - Priority 2: localStorage (if URL not present)
   - Priority 3: Default empty array `[]`

2. **User Filter**:
   - Priority 1: Zustand store (persisted via Zustand persist middleware)
   - Priority 2: localStorage (but converted from string to array)
   - Priority 3: Default `"all"` (in Zustand store)
   - ❌ **Missing**: URL params check

3. **Filter Modes** (include/exclude):
   - Priority 1: localStorage (always checked)
   - Priority 2: Default `"include"`
   - ❌ **Missing**: URL params (modes not in URL)

---

## URL Sync Issues

### What Gets Synced to URL:
- ✅ Country filter: `?country=["Canada","USA"]`
- ✅ Status filter: `?status=["NEW","CONTACTED"]`
- ✅ Source filter: `?source=["Interpol","Manual"]`
- ❌ User filter: **NOT in URL**
- ❌ Filter modes: **NOT in URL**

### What Gets Synced FROM URL:
- ✅ Country filter: Reads from `?country=...`
- ✅ Status filter: Reads from `?status=...`
- ✅ Source filter: Reads from `?source=...`
- ❌ User filter: **NOT read from URL**
- ❌ Filter modes: **NOT read from URL**

---

## Storage Format Inconsistencies

| Filter | localStorage Format | URL Format | Zustand Format | Component State Format |
|--------|-------------------|------------|----------------|------------------------|
| **Country** | `JSON.stringify([])` | `JSON.stringify([])` | ❌ Not stored | `string[]` |
| **Status** | `JSON.stringify([])` | `JSON.stringify([])` | ❌ Not stored | `string[]` |
| **Source** | `JSON.stringify([])` | `JSON.stringify([])` | ❌ Not stored | `string[]` |
| **User** | `JSON.stringify([])` | ❌ Not in URL | `"all"` or `"userId1,userId2"` | Uses Zustand directly |
| **Country Mode** | `"include"` or `"exclude"` | ❌ Not in URL | ❌ Not stored | `"include" \| "exclude"` |
| **Status Mode** | `"include"` or `"exclude"` | ❌ Not in URL | ❌ Not stored | `"include" \| "exclude"` |
| **Source Mode** | `"include"` or `"exclude"` | ❌ Not in URL | ❌ Not stored | `"include" \| "exclude"` |

---

## Problems Identified

### 1. **User Filter Not in URL** ❌
- **Impact**: Filter is lost when sharing URL or refreshing page
- **Location**: `handleFilterChange` in `useLeadsPage.ts` line 1071-1087
- **Fix Needed**: Add user filter to URL params

### 2. **Filter Modes Not in URL** ❌
- **Impact**: Include/exclude mode is lost on page refresh or URL share
- **Location**: All mode change handlers
- **Fix Needed**: Add modes to URL params

### 3. **User Filter Type Mismatch** ⚠️
- **Impact**: Conversion needed between string (Zustand) and array (localStorage)
- **Location**: Multiple places in `useLeadsPage.ts`
- **Fix Needed**: Standardize on one format (preferably array like other filters)

### 4. **Initialization Race Condition** ⚠️
- **Impact**: Filters might not initialize correctly if localStorage and URL conflict
- **Location**: `getInitialFilterValue` function and URL sync effect
- **Fix Needed**: Clear priority order: URL > localStorage > default

### 5. **Zustand Store Persistence** ⚠️
- **Impact**: User filter is persisted via Zustand's persist middleware, but other filters are not
- **Location**: `leadsStore.ts` partialize config
- **Fix Needed**: Either persist all filters in Zustand, or remove Zustand persistence for filters

---

## Recommended Fixes

### Priority 1: Add User Filter to URL
```typescript
// In handleFilterChange
const params = new URLSearchParams(window.location.search);
params.set("page", "1");
if (value === "all") {
  params.delete("user"); // or "filter"
} else {
  params.set("user", value); // Store as string or JSON array
}
window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
```

### Priority 2: Add Filter Modes to URL
```typescript
// In handleCountryFilterModeChange, handleStatusFilterModeChange, handleSourceFilterModeChange
const params = new URLSearchParams(Array.from(searchParams.entries()));
params.set("countryMode", mode); // or statusMode, sourceMode
window.history.replaceState({}, "", `${pathname}?${params.toString()}`);
```

### Priority 3: Standardize User Filter Format
- Change Zustand store to use array format like other filters
- Or change all filters to use string format
- **Recommendation**: Use array format (more flexible for multi-select)

### Priority 4: Unified Initialization
- Create a single function that handles all filter initialization
- Priority: URL params > localStorage > default
- Apply same logic to all filters

### Priority 5: Remove Zustand Persistence for Filters
- Store all filters in localStorage and URL only
- Use Zustand for temporary state only
- Or move all filters to Zustand with proper URL sync

---

## Files That Need Changes

1. **`src/hooks/useLeadsPage.ts`**
   - Add user filter to URL in `handleFilterChange`
   - Add filter modes to URL in mode change handlers
   - Fix initialization priority
   - Standardize user filter format

2. **`src/stores/leadsStore.ts`**
   - Change `filterByUser` from string to array (or remove from persist)
   - Update filter logic to handle array format

3. **`src/components/dashboardComponents/leadsFilters/UserFilter.tsx`** (if exists)
   - Update to work with array format
   - Sync with URL params

---

## Current Storage Keys Reference

### localStorage Keys:
- `"leads_filter_by_country"` - JSON array
- `"leads_filter_by_status"` - JSON array
- `"leads_filter_by_source"` - JSON array
- `"leads_filter_by_user"` - JSON array (converted from string)
- `"countryFilterMode"` - Plain string
- `"statusFilterMode"` - Plain string
- `"sourceFilterMode"` - Plain string

### URL Param Keys:
- `?country=...` - JSON stringified array
- `?status=...` - JSON stringified array
- `?source=...` - JSON stringified array
- ❌ `?user=...` - **MISSING**
- ❌ `?countryMode=...` - **MISSING**
- ❌ `?statusMode=...` - **MISSING**
- ❌ `?sourceMode=...` - **MISSING**

### Zustand Store Keys:
- `filterByUser` - String (`"all"`, `"unassigned"`, or comma-separated)
- `filterByCountry` - String (legacy, not used in all-leads page)
- ❌ Other filters not in Zustand store
