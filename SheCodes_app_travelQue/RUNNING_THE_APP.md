# TravelQue - Complete Running Guide

## 🚀 Quick Start

### Prerequisites
- ✅ Python 3.9+ installed
- ✅ Node.js 16+ installed
- ✅ PostgreSQL database running
- ✅ Git installed (for version control)

---

## 📡 Network Configuration

### Step 1: Find Your Local IP Address

**Windows (PowerShell):**
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -ne '127.0.0.1' }).IPAddress
```

**Result Example:** `192.168.1.100`

**Why do we need this?**
- Your phone/emulator needs to access the backend API
- `localhost` only works on the same device
- Your local IP allows network access within your WiFi

---

## 🗄️ Database Setup

### Current Configuration
**File:** `backend/.env`
```
DATABASE_URL=postgresql+asyncpg://postgres:mite@localhost/travelQue
SECRET_KEY=729a86e1e93b5a2be21971bd58ae3d28ccdbf8f2a3429a5fafbe7d9c6fde849a
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Step 1: Ensure PostgreSQL is Running
**Check Status:**
```powershell
# Windows - check if service is running
Get-Service -Name postgresql*
```

### Step 2: Create Database (if not exists)
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE travelQue;

# Exit
\q
```

### Step 3: Verify Database Connection
The backend will automatically create tables on startup using:
```python
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

---

## 🔧 Backend Server Setup

### Current Configuration
- **Framework:** FastAPI
- **Host:** `0.0.0.0` (accepts connections from any IP)
- **Port:** `8000`
- **CORS:** Enabled for all origins (`allow_origins=["*"]`)

### Step 1: Navigate to Backend
```powershell
cd D:\SheCodes_app_travelQue\backend
```

### Step 2: Activate Virtual Environment
```powershell
.\env\Scripts\Activate.ps1
```

**You should see:** `(env)` prefix in your terminal

### Step 3: Start the Server
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Command Breakdown:**
- `main:app` - Points to FastAPI app in main.py
- `--reload` - Auto-restart on code changes (development only)
- `--host 0.0.0.0` - Listen on all network interfaces (allows external connections)
- `--port 8000` - Run on port 8000

**Successful Output:**
```
INFO:     Will watch for changes in these directories: ['D:\\SheCodes_app_travelQue\\backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using StatReload
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 4: Test Backend is Running

**Option 1: Browser**
- Open: `http://localhost:8000` or `http://192.168.1.100:8000`
- Should see: `{"message": "TravelQue API"}`

**Option 2: PowerShell**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health"
```
- Should return: `@{status=ok}`

**Option 3: Test API Docs**
- Open: `http://localhost:8000/docs`
- FastAPI auto-generated interactive documentation

---

## 📱 Frontend Expo Setup

### Current Configuration
**File:** `frontend/src/api/index.ts`
```typescript
const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

### Step 1: Update API Base URL (IMPORTANT!)

**If your IP is different from `192.168.1.100`:**

Edit `frontend/src/api/index.ts`:
```typescript
const API_BASE_URL = 'http://YOUR_ACTUAL_IP:8000/api';
```

**Also update in:** `frontend/app/customers/new.tsx` (line ~149):
```typescript
const localLink = `exp://YOUR_ACTUAL_IP:8081/--/customer-form/${customerId}`;
```

### Step 2: Navigate to Frontend
```powershell
cd D:\SheCodes_app_travelQue\frontend
```

### Step 3: Install Dependencies (if not done)
```powershell
npm install
```

### Step 4: Start Expo Server
```powershell
npx expo start --clear
```

**Successful Output:**
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
```

---

## 📱 Testing on Your Device

### Option 1: Android Emulator (Recommended for Testing)

1. **Install Android Studio** (if not installed)
2. **Create Virtual Device:**
   - Open Android Studio → Device Manager
   - Create new device (Pixel 5 recommended)
   - Download system image (API 31+)

3. **Start Emulator:**
   - Open Android Studio → Device Manager
   - Click ▶️ on your virtual device

4. **Run App in Expo:**
   ```powershell
   # In the Expo terminal, press 'a'
   a
   ```

**Network Configuration for Emulator:**
- Android emulator can access host machine via `10.0.2.2`
- But your current setup uses actual IP: `192.168.1.100`
- This should work if backend is running with `--host 0.0.0.0`

### Option 2: Physical Android Device

1. **Install Expo Go App:**
   - Google Play Store: "Expo Go"

2. **Connect to Same WiFi:**
   - ⚠️ CRITICAL: Phone and computer MUST be on same WiFi network

3. **Scan QR Code:**
   - Open Expo Go app
   - Tap "Scan QR code"
   - Scan the QR from your terminal

### Option 3: Physical iOS Device

1. **Install Expo Go App:**
   - App Store: "Expo Go"

2. **Scan with Camera App:**
   - iOS Camera app can scan QR codes directly
   - Will automatically open in Expo Go

---

## 🔥 Common Issues & Solutions

### Issue 1: "Network request failed" in App

**Cause:** Frontend can't reach backend

**Solutions:**
1. **Check Backend is Running:**
   ```powershell
   # Test from command line
   Invoke-RestMethod -Uri "http://192.168.1.100:8000/health"
   ```

2. **Verify IP Address Match:**
   - Check your actual IP: `ipconfig` (Windows)
   - Update `frontend/src/api/index.ts` if different

3. **Check Firewall:**
   ```powershell
   # Allow Python through firewall (run as Administrator)
   New-NetFirewallRule -DisplayName "Python Backend" -Direction Inbound -Program "C:\Path\To\python.exe" -Action Allow
   ```

4. **Verify Same Network:**
   - Computer and phone on same WiFi
   - No VPN active on either device

### Issue 2: Backend Starts but Immediately Exits

**Cause:** Database connection failed

**Solution:**
```powershell
# Check PostgreSQL is running
Get-Service -Name postgresql*

# If stopped, start it
Start-Service postgresql-x64-14  # Adjust service name
```

### Issue 3: "Port 8000 already in use"

**Cause:** Another process using port 8000

**Solution:**
```powershell
# Find process using port 8000
Get-NetTCPConnection -LocalPort 8000

# Kill the process (use PID from above)
Stop-Process -Id <PID> -Force

# Or use different port
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Issue 4: Database Connection Error

**Error:** `could not connect to server: Connection refused`

**Solutions:**
1. **Start PostgreSQL:**
   ```powershell
   Start-Service postgresql-x64-14
   ```

2. **Check Database Exists:**
   ```powershell
   psql -U postgres -l
   ```
   Look for `travelQue` in the list

3. **Verify Credentials in `.env`:**
   ```
   DATABASE_URL=postgresql+asyncpg://USERNAME:PASSWORD@localhost/DATABASE_NAME
   ```

### Issue 5: Expo QR Code Doesn't Work

**Solutions:**
1. **Use Direct Connection:**
   ```powershell
   npx expo start --tunnel
   ```
   This creates a tunnel using ngrok (slower but works across networks)

2. **Type URL Manually in Expo Go:**
   - Open Expo Go
   - Tap "Enter URL manually"
   - Enter: `exp://192.168.1.100:8081`

### Issue 6: CORS Error in Browser

**Already Fixed!** Your backend has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🧪 Testing the Full Stack

### Step 1: Test Backend Directly

**Create Agent Account:**
```powershell
$body = @{
    email = "agent@travelque.com"
    password = "Test123!"
    full_name = "Test Agent"
    role = "agent"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/auth/signup" -Method POST -Body $body -ContentType "application/json"
```

**Login:**
```powershell
$body = @{
    email = "agent@travelque.com"
    password = "Test123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.access_token
Write-Host "Token: $token"
```

**Generate Customer Link:**
```powershell
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    agent_notes = "Test customer link"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/customers/generate-link" -Method POST -Headers $headers -Body $body
```

### Step 2: Test Frontend Flow

1. **Start Both Servers:**
   - Terminal 1: Backend (`uvicorn main:app --reload --host 0.0.0.0`)
   - Terminal 2: Frontend (`npx expo start --clear`)

2. **Open App on Device/Emulator**

3. **Test Customer Flow:**
   - Tap "Customers" tab
   - Tap "Add New Customer"
   - Tap "Generate Form Link"
   - Should create customer with ID like `C-1707388800000`
   - Copy link and open in browser or app

4. **Fill Customer Form:**
   - Should load 3-step form
   - Fill required fields
   - Submit
   - Check backend logs for submission

5. **View Customer in List:**
   - Go back to Customers tab
   - Pull to refresh
   - Should see submitted customer

---

## 📊 Monitoring

### Backend Logs
Watch the uvicorn terminal for:
```
INFO:     192.168.1.100:54321 - "POST /api/customers/generate-link HTTP/1.1" 200 OK
INFO:     192.168.1.100:54322 - "GET /api/customers?status=completed HTTP/1.1" 200 OK
```

### Database Verification
```powershell
# Connect to database
psql -U postgres -d travelQue

# Check customers
SELECT id, personal_info->>'first_name' as first_name, 
       personal_info->>'last_name' as last_name, 
       status, created_at 
FROM customers;

# Check users
SELECT id, email, full_name, role FROM users;
```

---

## 🌐 Production Deployment Checklist

When you're ready to deploy:

### Backend (FastAPI)
- [ ] Update `allow_origins` to specific domains (not `["*"]`)
- [ ] Use environment variables for all secrets
- [ ] Set `--host 0.0.0.0` for deployment server
- [ ] Use production WSGI server (Gunicorn + Uvicorn workers)
- [ ] Enable HTTPS with SSL certificate
- [ ] Set up PostgreSQL with strong password
- [ ] Configure database backups

### Frontend (Expo)
- [ ] Update `API_BASE_URL` to production domain
- [ ] Replace `global.authToken` with AsyncStorage
- [ ] Build production app: `npx expo build:android` or `eas build`
- [ ] Test on real devices before release
- [ ] Submit to App Store / Play Store

---

## 📋 Daily Development Workflow

### Morning Startup:
```powershell
# Terminal 1: Backend
cd D:\SheCodes_app_travelQue\backend
.\env\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0

# Terminal 2: Frontend
cd D:\SheCodes_app_travelQue\frontend
npx expo start --clear
```

### During Development:
- Backend auto-reloads on code changes (thanks to `--reload`)
- Frontend hot-reloads on save (Expo Fast Refresh)
- Check console logs for errors
- Use `console.log()` in frontend
- Use `print()` in backend

### Evening Shutdown:
- Press `Ctrl+C` in both terminals
- Deactivate virtual environment: `deactivate`

---

## 🔐 Security Notes

### Current Setup (Development):
- ✅ JWT authentication implemented
- ✅ Password hashing with bcrypt
- ✅ CORS enabled for all origins (development only)
- ⚠️ Token stored in memory (`global.authToken`)
- ⚠️ Database password in plaintext `.env` file

### For Production:
- Switch to AsyncStorage for persistent token storage
- Use environment variables for all secrets
- Restrict CORS to your domain only
- Implement token refresh mechanism
- Use HTTPS everywhere
- Add rate limiting
- Implement logging and monitoring

---

## 📞 Your Current Setup Summary

**Backend:**
- Running on: `http://192.168.1.100:8000`
- Database: PostgreSQL (`travelQue` database)
- Auth: JWT with 24-hour expiry
- API Docs: `http://localhost:8000/docs`

**Frontend:**
- Running on: `exp://192.168.1.100:8081`
- API Target: `http://192.168.1.100:8000/api`
- Framework: Expo SDK ~54
- Navigation: Expo Router (file-based)

**Network:**
- Local IP: `192.168.1.100` (verify with `ipconfig`)
- Backend Port: `8000`
- Frontend Port: `8081` (Expo default)
- Both must be on same network for device testing

---

## 🎯 Next Steps

1. **Verify Everything Works:**
   - Start backend: `uvicorn main:app --reload --host 0.0.0.0`
   - Start frontend: `npx expo start --clear`
   - Test on device: Generate link → Submit form → View in list

2. **Implement Journey Backend:**
   - Journey model and schemas
   - Journey CRUD endpoints
   - Products/booking integration

3. **Update Journey Pages:**
   - Replace mock data with API calls
   - Similar to customer integration

4. **Production Ready:**
   - Deploy backend (Heroku, Railway, DigitalOcean)
   - Build Expo app for stores
   - Set up CI/CD pipeline

---

**Need help?** Check logs in both terminals and verify network configuration!
