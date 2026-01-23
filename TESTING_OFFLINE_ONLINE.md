# Testing Offline → Online Login Flash Prevention

## Quick Test Steps

### 1. **Start the development server**
```bash
npm run dev
```

### 2. **Open Chrome DevTools**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
- Go to the **Network** tab
- Find the **Throttling** dropdown (usually shows "No throttling")
- Select **"Offline"** from the dropdown

### 3. **Test Scenario 1: Already Authenticated User**
1. **Before going offline:**
   - Log in to your app at `http://localhost:3000/login`
   - Navigate to the dashboard
   - You should be authenticated

2. **Go offline:**
   - In DevTools Network tab, select **"Offline"**
   - The page might show network errors in console (this is normal)

3. **Come back online:**
   - In DevTools Network tab, select **"No throttling"** or **"Online"**
   - **Expected behavior:**
     - ✅ You should see a loading spinner briefly
     - ✅ You should stay on the dashboard
     - ✅ **NO login form should flash**

### 4. **Test Scenario 2: Login Page While Offline**
1. **Go to login page while offline:**
   - Set Network to **"Offline"**
   - Navigate to `http://localhost:3000/login`
   - **Expected behavior:**
     - ✅ You should see "Loading..." spinner
     - ✅ **NO login form should appear** while checking authentication

2. **Come back online:**
   - Set Network to **"Online"** or **"No throttling"**
   - **Expected behavior:**
     - ✅ If you're authenticated: See "Redirecting to dashboard..." then dashboard
     - ✅ If you're not authenticated: See the login form
     - ✅ **NO flash of login form** if you're authenticated

### 5. **Test Scenario 3: Root Page Redirect**
1. **Navigate to root:**
   - Go to `http://localhost:3000/`
   - **Expected behavior:**
     - ✅ You should see "Loading..." spinner
     - ✅ Should redirect to `/login`
     - ✅ **NO homepage content should flash**

### 6. **Test Scenario 4: Window Focus (Tab Switching)**
1. **While authenticated:**
   - Log in and go to dashboard
   - Switch to another browser tab (or minimize window)
   - Wait a few seconds
   - Switch back to the app tab
   - **Expected behavior:**
     - ✅ Session should refetch (check Network tab for `/api/auth/session` request)
     - ✅ You should stay on dashboard
     - ✅ **NO login form should flash**

## Visual Indicators to Look For

### ✅ **Correct Behavior:**
- Loading spinner with "Loading..." or "Redirecting to dashboard..." text
- Smooth transitions between states
- No flash of login form when authenticated
- Consistent loading screen design (gradient background, spinner, shield icon)

### ❌ **Incorrect Behavior (What to Fix):**
- Login form appears briefly then disappears
- White flash or blank screen
- Dashboard content flashes before redirect
- Inconsistent loading screens

## Advanced Testing: Simulate Network Issues

### Using Chrome DevTools Network Conditions:
1. Open DevTools → **Network** tab
2. Click **"Network conditions"** (or press `Cmd+Shift+P` → type "Network conditions")
3. Uncheck **"Disable cache"** (optional)
4. Use **"Offline"** or set custom throttling:
   - **Slow 3G**: Simulates slow connection
   - **Fast 3G**: Simulates moderate connection
   - **Offline**: Completely blocks network

### Using Service Worker (if you have one):
- You can also test by disabling network in Service Worker settings

## Console Checks

While testing, check the browser console for:
- ✅ Session refetch requests: `/api/auth/session`
- ✅ No errors related to authentication
- ✅ React Query refetch logs (if you have logging enabled)

## Quick Verification Checklist

- [ ] Login form doesn't flash when already authenticated
- [ ] Loading screen shows during authentication check
- [ ] "Redirecting to dashboard..." shows when authenticated
- [ ] Root page redirects to login without showing homepage
- [ ] Window focus triggers session refetch
- [ ] Network reconnect triggers data refetch
- [ ] All loading screens have consistent design

## Troubleshooting

### If login form still flashes:
1. Check that `refetchOnWindowFocus={true}` is set on all SessionProviders
2. Verify the order of checks in login page (authenticated → loading → unauthenticated)
3. Check browser console for errors
4. Clear browser cache and cookies
5. Try in incognito/private mode

### If redirects don't work:
1. Check that `router.replace()` is being called correctly
2. Verify middleware isn't interfering
3. Check Next.js console for routing errors
