@echo off
REM Osse Studio - one-click start (Windows)
echo === Osse Studio ===
call npm install || goto :err
call npm run setup || goto :err
echo.
echo Starting app at http://localhost:3000  (press Ctrl+C to stop)
call npm run dev
goto :eof
:err
echo.
echo Setup failed - see the messages above.
pause
