Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Create desktop shortcut
Set desktopShortcut = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Igoodar.lnk")
desktopShortcut.TargetPath = scriptDir & "\start.bat"
desktopShortcut.WorkingDirectory = scriptDir
desktopShortcut.IconLocation = scriptDir & "\nodejs\node.exe,0"
desktopShortcut.Description = "Start Igoodar POS System"
desktopShortcut.WindowStyle = 7  ' Minimized
desktopShortcut.Save

' Create Start Menu shortcuts
startMenuFolder = WshShell.SpecialFolders("StartMenu") & "\Programs\Igoodar"

' Create Start Menu folder if it doesn't exist
If Not fso.FolderExists(startMenuFolder) Then
    fso.CreateFolder(startMenuFolder)
End If

' Create Start Menu - Igoodar shortcut
Set startMenuShortcut = WshShell.CreateShortcut(startMenuFolder & "\Igoodar.lnk")
startMenuShortcut.TargetPath = scriptDir & "\start.bat"
startMenuShortcut.WorkingDirectory = scriptDir
startMenuShortcut.IconLocation = scriptDir & "\nodejs\node.exe,0"
startMenuShortcut.Description = "Start Igoodar POS System"
startMenuShortcut.WindowStyle = 7  ' Minimized
startMenuShortcut.Save

' Create Start Menu - Debug Install shortcut
Set debugShortcut = WshShell.CreateShortcut(startMenuFolder & "\Debug Install.lnk")
debugShortcut.TargetPath = scriptDir & "\debug-install.bat"
debugShortcut.WorkingDirectory = scriptDir
debugShortcut.IconLocation = scriptDir & "\nodejs\node.exe,0"
debugShortcut.Description = "Debug Igoodar Installation"
debugShortcut.WindowStyle = 1  ' Normal
debugShortcut.Save

' Show success message
MsgBox "Shortcuts created successfully!" & vbCrLf & vbCrLf & _
       "Desktop shortcut: Igoodar" & vbCrLf & _
       "Start Menu folder: Programs\Igoodar" & vbCrLf & vbCrLf & _
       "Double-click the desktop icon to start Igoodar!", _
       vbInformation, "Igoodar - Shortcuts Created"
