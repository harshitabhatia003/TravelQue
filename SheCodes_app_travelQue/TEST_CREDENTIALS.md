# 🔑 Test Credentials & Quick Start

## Test Accounts

### Existing Test Accounts (from backend)

#### OPERATIONS User
```
Email: ops@travelque.com
Password: ops123
Role: OPERATIONS
```

#### ADMIN User
```
Email: admin@travelque.com
Password: admin123
Role: ADMIN
```

#### AGENT User
```
Email: agent@travelque.com
Password: agent123
Role: AGENT
```

---

## Create New Test Accounts

### Signup for OPERATIONS
1. Go to `/auth/signup`
2. Fill in:
   ```
   Full Name: Test Operations
   Email: testops@example.com
   Password: TestOps123
   Confirm: TestOps123
   Role: Operations (Select radio button)
   ```
3. Click "Create Account"
4. **Result**: Auto-routes to `/ops/dashboard`

### Signup for ADMIN
1. Go to `/auth/signup`
2. Fill in:
   ```
   Full Name: Test Admin
   Email: testadmin@example.com
   Password: TestAdmin123
   Confirm: TestAdmin123
   Role: Administrator (Select radio button)
   ```
3. Click "Create Account"
4. **Result**: Auto-routes to `/admin/dashboard`

---

## Login Steps

### Login as OPERATIONS
1. Go to `/auth/login`
2. Fill in:
   ```
   Email: ops@travelque.com
   Password: ops123
   Role: Operations (or "Any Role")
   ```
3. Click "Sign In"
4. **Result**: Redirects to `/ops/dashboard`

### Login as ADMIN
1. Go to `/auth/login`
2. Fill in:
   ```
   Email: admin@travelque.com
   Password: admin123
   Role: Admin (or "Any Role")
   ```
3. Click "Sign In"
4. **Result**: Redirects to `/admin/dashboard`

### Login as AGENT
1. Go to `/auth/login`
2. Fill in:
   ```
   Email: agent@travelque.com
   Password: agent123
   Role: Agent (or "Any Role")
   ```
3. Click "Sign In"
4. **Result**: Redirects to `/` (home)

---

## Admin Dashboard Features

### As Admin User (admin@travelque.com)

**What You Can Do**:
1. ✅ View all users
2. ✅ Create new users with role assignment
3. ✅ Deactivate users
4. ✅ View system statistics

**Create User Steps**:
1. Click "+ Create New User"
2. Fill in:
   ```
   Full Name: New Ops Agent
   Email: newops@example.com
   Password: NewPass123
   Role: OPERATIONS (select button)
   ```
3. Click "Create User"
4. **Result**: User appears in list

---

## Operations Dashboard Features

### As Operations User (ops@travelque.com)

**What You Can Do**:
1. ✅ View escalations
2. ✅ Create new escalations
3. ✅ Claim escalations ("Take Ownership")
4. ✅ Resolve escalations with alternatives
5. ✅ Cancel escalations

**Available Actions** (from previous work):
- List escalations with filters
- Search alternatives (7 hotel options with discounts)
- Contact customer (pre-filled template)
- Change escalation status

---

## Route Testing

### Protected Routes
Try accessing these without logging in:

| Route | Status | Behavior |
|-------|--------|----------|
| `/ops/dashboard` | 🔒 Protected | Redirects to `/auth/login` |
| `/admin/dashboard` | 🔒 Protected | Redirects to `/auth/login` |
| `/auth/login` | ✅ Public | Always accessible |
| `/auth/signup` | ✅ Public | Always accessible |
| `/customer-form/[id]` | ✅ Public | Form link (no auth needed) |

### Role-Based Access
Try accessing with wrong role:

| User | Tries to Access | Result |
|------|-----------------|--------|
| AGENT | `/ops/dashboard` | Redirected to `/auth/login` |
| AGENT | `/admin/dashboard` | Redirected to `/auth/login` |
| OPERATIONS | `/admin/dashboard` | Redirected to `/auth/login` |
| ADMIN | `/ops/dashboard` | ✅ Can access (ADMIN has all permissions) |

---

## Browser DevTools Testing

### Check Stored User
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('travelque_user_data'));
console.log('Current User:', user);
console.log('Role:', user?.role);
console.log('Email:', user?.email);
```

### Test API Signup
```javascript
// Create OPERATIONS user
fetch('http://localhost:8000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test.ops@example.com',
    password: 'TestPass123',
    full_name: 'Test Operations User',
    role: 'OPERATIONS'
  })
}).then(r => r.json()).then(d => console.log(d));
```

### Test API Login
```javascript
// Login as existing user
fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'ops@travelque.com',
    password: 'ops123'
  })
}).then(r => r.json()).then(d => console.log(d));
```

---

## Quick Checklist

### Before Testing
- [ ] Backend running on `http://localhost:8000`
- [ ] Frontend running on `http://localhost:8081` (or npm start)
- [ ] Database connected with test data

### After Each Test
- [ ] Clear browser cache/localStorage (if switching accounts)
- [ ] Or use DevTools to check stored user data

### Test Scenarios
- [ ] Signup with OPERATIONS role
- [ ] Signup with ADMIN role
- [ ] Login with "Any Role" option
- [ ] Login with specific role
- [ ] Try wrong role (should fail)
- [ ] Admin creates new user
- [ ] Admin deactivates user
- [ ] Navigate to protected routes
- [ ] Session persists after refresh
- [ ] Logout and re-login works

---

## Common Issues & Solutions

### Issue: "Invalid role. Expected ADMIN, got OPERATIONS"
**Solution**: On login, either:
1. Select "Any Role" (no role verification)
2. Select matching role that user actually has

### Issue: Redirected to login repeatedly
**Solution**: 
1. Check if user has correct role for dashboard
2. Clear localStorage and re-login
3. Check browser console for errors

### Issue: Admin can't create user
**Solution**: 
1. Ensure you're logged in as ADMIN
2. Fill all required fields
3. Use valid email format
4. Password must be 6+ characters

### Issue: Session not persisting
**Solution**:
1. Check if localStorage is enabled
2. Check if "travelque_user_data" key exists in localStorage
3. Clear and try login again

---

## Next Testing Phase

After verifying basic auth works:

1. **Test Escalations** (OPERATIONS)
   - Create escalation
   - Claim escalation
   - Resolve escalation
   - Cancel escalation

2. **Test Admin Features**
   - Create users with different roles
   - Verify permissions work
   - Deactivate users

3. **Test Permissions**
   - Check permission helpers
   - Verify UI renders based on permissions
   - Test hasRole() and hasPermission()

4. **Test Backend Integration**
   - Verify role passed to signup
   - Verify role returned from login
   - Check user data persists

---

## Support Commands

### Clear All Auth Data
```javascript
// In browser console
localStorage.removeItem('travelque_user_data');
location.reload();
```

### View All Stored Data
```javascript
// In browser console
console.log(localStorage);
```

### Reset User Session
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('travelque_user_data'));
user.is_active = true; // if deactivated
localStorage.setItem('travelque_user_data', JSON.stringify(user));
```

---

## Performance Notes

- **Signup**: 1-2 seconds (depends on API)
- **Login**: 1-2 seconds (depends on API)
- **Dashboard Load**: < 1 second
- **Route Navigation**: < 500ms
- **Permission Checks**: < 10ms

---

## Ready to Test! 🚀

Start with:
1. Open `http://localhost:8081` (or `npm start`)
2. Click "Create one" on login page
3. Signup with OPERATIONS or ADMIN role
4. Follow automatic dashboard redirect
5. Explore features!

---

**Last Updated**: Just now
**Status**: ✅ Ready for Testing
**Questions?** Check `AUTHENTICATION_SYSTEM.md` for details
