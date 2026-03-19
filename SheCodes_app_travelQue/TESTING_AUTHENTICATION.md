# 🧪 Role-Based Authentication Testing Guide

## Quick Start Testing

### Test Case 1: Signup as Operations User
**Objective**: Verify OPERATIONS role signup and routing

**Steps**:
1. Open signup screen (`/auth/signup`)
2. Fill in:
   - Full Name: "John Operations"
   - Email: "ops.john@travelque.com"
   - Password: "TestPass123"
   - Confirm Password: "TestPass123"
   - Role: Select "Operations"
3. Click "Create Account"

**Expected Result**:
✅ User created successfully
✅ Automatically routed to `/ops/dashboard`
✅ Dashboard shows "Operations Dashboard" title
✅ User info shows "John Operations" in header

---

### Test Case 2: Signup as Admin User
**Objective**: Verify ADMIN role signup and routing

**Steps**:
1. Open signup screen (`/auth/signup`)
2. Fill in:
   - Full Name: "Jane Admin"
   - Email: "jane.admin@travelque.com"
   - Password: "AdminPass123"
   - Confirm Password: "AdminPass123"
   - Role: Select "Administrator"
3. Click "Create Account"

**Expected Result**:
✅ User created successfully
✅ Automatically routed to `/admin/dashboard`
✅ Dashboard shows "Admin Dashboard" title
✅ Stats cards show: "Total Users", "Active Users", "Operations"
✅ "+ Create New User" button visible

---

### Test Case 3: Login as Operations User
**Objective**: Verify OPERATIONS login with role selection

**Steps**:
1. Logout (if already logged in)
2. Open login screen (`/auth/login`)
3. Fill in:
   - Email: "ops.john@travelque.com"
   - Password: "TestPass123"
   - Role: Select "Operations" (or "Any Role")
4. Click "Sign In"

**Expected Result**:
✅ Login successful
✅ Routed to `/ops/dashboard`
✅ "John Operations" displayed in header

---

### Test Case 4: Login as Admin User
**Objective**: Verify ADMIN login with role selection

**Steps**:
1. Logout (if already logged in)
2. Open login screen (`/auth/login`)
3. Fill in:
   - Email: "jane.admin@travelque.com"
   - Password: "AdminPass123"
   - Role: Select "Admin" (or "Any Role")
4. Click "Sign In"

**Expected Result**:
✅ Login successful
✅ Routed to `/admin/dashboard`
✅ "Jane Admin" displayed in header

---

### Test Case 5: Role Mismatch - Login Wrong Role
**Objective**: Verify role validation on login

**Steps**:
1. On login screen:
   - Email: "ops.john@travelque.com"
   - Password: "TestPass123"
   - Role: Select "Admin" (intentionally wrong)
2. Click "Sign In"

**Expected Result**:
✅ Alert: "Invalid role. Expected ADMIN, got OPERATIONS"
✅ Login fails, stays on login screen
✅ Can retry with correct role or "Any Role"

---

### Test Case 6: Permission Check - View Escalations
**Objective**: Verify permission helper functions work

**Steps**:
1. Login as OPERATIONS user
2. Open `/ops/dashboard`
3. Check if escalation features visible
4. Logout

**Expected Result**:
✅ OPERATIONS sees escalation management features
✅ Can view, claim, resolve escalations

---

### Test Case 7: Route Protection - Unauthorized Access
**Objective**: Verify unauthorized users can't access protected routes

**Steps**:
1. Logout (go to `/`)
2. Try to access `/admin/dashboard` (via browser or deep link)
3. Observe behavior

**Expected Result**:
✅ Redirected to `/auth/login`
❌ Cannot access admin dashboard without ADMIN role

---

### Test Case 8: Admin User Management
**Objective**: Verify admin can create and manage users

**Steps**:
1. Login as ADMIN user
2. On admin dashboard, click "+ Create New User"
3. Fill in:
   - Full Name: "Bob Operations"
   - Email: "bob.ops@travelque.com"
   - Password: "BobPass123"
   - Role: "OPERATIONS"
4. Click "Create User"
5. Verify new user appears in list
6. Try to deactivate the user

**Expected Result**:
✅ Modal opens for user creation
✅ User successfully created
✅ New user appears in user list with role badge
✅ Deactivate button works
✅ User marked as "Inactive"

---

### Test Case 9: Session Persistence
**Objective**: Verify user session persists across app restarts

**Steps**:
1. Login as OPERATIONS user (ops.john@travelque.com)
2. Go to `/ops/dashboard`
3. Close app completely (or clear local state if testing in browser)
4. Reopen app

**Expected Result**:
✅ App loads with loading spinner briefly
✅ User still logged in as "John Operations"
✅ Dashboard displays immediately
❌ No need to login again

---

### Test Case 10: Email Validation
**Objective**: Verify email validation on signup/login

**Steps**:
1. Open signup screen
2. Try to signup with invalid email: "notanemail"
3. Observe validation

**Expected Result**:
✅ Alert: "Please enter a valid email address"
❌ Cannot create account with invalid email

---

### Test Case 11: Password Validation
**Objective**: Verify password requirements

**Steps**:
1. Open signup screen
2. Try to signup with:
   - Full Name: "Test"
   - Email: "test@example.com"
   - Password: "123"
   - Confirm Password: "123"
3. Click "Create Account"

**Expected Result**:
✅ Alert: "Password must be at least 6 characters"
❌ Cannot create account with short password

---

### Test Case 12: Password Mismatch
**Objective**: Verify password confirmation check

**Steps**:
1. Open signup screen
2. Fill in:
   - Full Name: "Test"
   - Email: "test@example.com"
   - Password: "TestPass123"
   - Confirm Password: "DifferentPass123"
3. Click "Create Account"

**Expected Result**:
✅ Alert: "Passwords do not match"
❌ Cannot create account with mismatched passwords

---

## Console Testing

### Check Auth Context
```javascript
// In browser console while logged in
const auth = JSON.parse(localStorage.getItem('travelque_user_data'));
console.log('User:', auth);
console.log('Role:', auth.role);
console.log('Email:', auth.email);
```

### Test API Call
```javascript
// Test signup API with role
fetch('http://localhost:8000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123',
    full_name: 'Test User',
    role: 'OPERATIONS'
  })
}).then(r => r.json()).then(d => console.log(d));
```

---

## Bug Reporting Template

If you find issues, report with:

```
**Title**: [ROLE-BASED-AUTH] Brief description

**Reproduction Steps**:
1. Login as [OPERATIONS/ADMIN/AGENT]
2. Navigate to [route]
3. Perform action [action]

**Expected**: [what should happen]
**Actual**: [what actually happened]

**Environment**:
- Device: [iOS/Android/Web]
- User Role: [OPERATIONS/ADMIN/AGENT]
- Date/Time: [when it happened]

**Screenshots**: [if applicable]
```

---

## Performance Checklist

- [ ] Login takes < 2 seconds
- [ ] Role-based route change is instant
- [ ] Admin dashboard loads in < 3 seconds
- [ ] No console errors on authentication
- [ ] Session persists after app restart
- [ ] No memory leaks on logout/re-login

---

## Success Criteria

✅ All 12 test cases pass
✅ No console errors
✅ User data persists correctly
✅ Role-based routing works
✅ Permission checks work
✅ Admin user management works
✅ Session persistence works
✅ Email/password validation works

---

## Next Testing Phase

When backend is ready to connect:
1. Test real user creation in admin dashboard
2. Test API endpoints for user management
3. Test role changes/modifications
4. Test permission-based UI rendering
5. Test admin reports (when implemented)
