@echo off
setlocal

:: Set base_module variable to the current folder
set "base_module=%cd%"

:: Check if the current folder does not have an `actions.py` and a `requirements.txt` file
if not exist "actions.py" if not exist "requirements.txt" (
    :: Set base_module to the parent folder's "base-module/renjs" folder
    set "base_module=%cd%\..\base-modules\renjs"
)

:menu
::cls
echo Menu:
echo 1. Run localhost server
echo 2. Install requirements
echo 3. Pack
echo 4. Exit

set /p choice="Enter your choice: "

if "%choice%"=="1" call :run_server
if "%choice%"=="2" call :install_requirements
if "%choice%"=="3" call :pack
if "%choice%"=="4" exit

echo Invalid choice. Please enter a number from 1 to 4.
pause
goto :menu

:run_server
echo Running localhost server...
:: Replace this command with your actual command to run the localhost server
python %base_module%\actions.py webserver
goto :menu

:install_requirements
echo Installing requirements...
:: Replace this command with your actual command to install requirements
pip install -r %base_module%\requirements.txt
goto :menu

:pack
echo Packing...
python %base_module%\actions.py pack
exit
