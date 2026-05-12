@echo off  
setlocal enabledelayedexpansion  
set skip=0  
if exist src\pages\LoginPage.new.jsx del src\pages\LoginPage.new.jsx  
for /f "delims=" %%L in ('type src\pages\LoginPage.jsx') do (  
  set "line=%%L"  
  if !skip!==0 (  
    set "temp=!line:flex flex-wrap gap-3 mb-8=!"  
    if not "!temp!"=="!line!" (  
      set skip=2  
    ) else (  
       echo(!line!  
    )  
  ) else (  
    if "!line!"=="            </div>" set skip=0  
  )  
)  
move /Y src\pages\LoginPage.new.jsx src\pages\LoginPage.jsx  
