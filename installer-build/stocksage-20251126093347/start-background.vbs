Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Use the portable Node.js instead of system node
' This avoids PATH issues and character encoding problems
nodeExe = scriptDir & "\nodejs\node.exe"
startJs = scriptDir & "\start.js"

' Check if portable Node.js exists
If Not fso.FileExists(nodeExe) Then
    MsgBox "Portable Node.js not found at: " & nodeExe, vbCritical, "Error"
    WScript.Quit 1
End If

' Run using portable Node.js with proper quoting
command = """" & nodeExe & """ """ & startJs & """"

' Run hidden (0 = hidden window)
WshShell.Run command, 0, False
