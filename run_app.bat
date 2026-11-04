@echo off
chcp 65001 >nul
echo ====================================================================
echo  DSS RECRUIT-INSIGHT - HE THONG HO TRO RA QUYET DINH TUYEN DUNG
echo  Nhom N14 - Hoc vien / DH CNTT & Truyen Thong
echo ====================================================================
echo.
echo [1/3] Kiem tra moi truong Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js. Vui long cai dat Node.js v20+ tu https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Kiem tra thu vien phu thuoc...
if not exist "node_modules" (
    echo Dang cai dat thu vien npm...
    call npm install
)

echo [3/3] Khoi dong Server DSS Recruit-Insight...
echo --------------------------------------------------------------------
echo May chu dang chay tai: http://localhost:3000
echo Tai khoan Demo:
echo   - Sales Key Account: yen.vu@recruitinsight.vn (MK: password123)
echo   - Customer Success: thao.pham@recruitinsight.vn (MK: password123)
echo   - Sales Manager: tuan.do@recruitinsight.vn (MK: password123)
echo   - Executive (CCO): cco@recruitinsight.vn (MK: password123)
echo --------------------------------------------------------------------
echo.

start "" http://localhost:3000
call npm run dev
