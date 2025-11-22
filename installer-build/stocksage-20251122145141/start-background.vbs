Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Use cmd.exe to run node (properly resolves PATH)
' /c = run command and exit
' /d = don't run AutoRun commands
' cd /d = change drive and directory
command = "cmd.exe /c ""cd /d """ & scriptDir & """ && node start.js"""

' Run hidden (0 = hidden window)
WshShell.Run command, 0, False
