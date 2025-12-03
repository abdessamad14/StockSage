Set WshShell = CreateObject("WScript.Shell")

' Open browser directly to Igoodar
WshShell.Run "http://localhost:5003", 1, False
