@echo off
REM Simple batch wrapper for download-material-icon.ps1
REM Downloads Material Icons to: Material_Icons/ (same folder as this script)
REM 
REM Usage: download-icon.bat <icon-name> [-Style style] [-Filled]
REM 
REM Examples:
REM   download-icon.bat face
REM   download-icon.bat settings -Style rounded
REM   download-icon.bat home -Filled
REM   download-icon.bat "edit,delete,save" -Filled

powershell -ExecutionPolicy Bypass -File "%~dp0download-material-icon.ps1" -OutputFolder "%~dp0Material_Icons" %*
