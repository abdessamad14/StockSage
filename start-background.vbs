Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Change to app directory and run start.js with node
WshShell.CurrentDirectory = scriptDir
WshShell.Run "node start.js", 0, False
