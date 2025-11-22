; Inno Setup Script for Igoodar
; Creates a professional Windows installer

#define MyAppName "Igoodar"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Your Company"
#define MyAppURL "https://www.yourcompany.com"
#define MyAppExeName "start-background.vbs"

[Setup]
; Basic app information
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation directories
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output
OutputDir=packages
OutputBaseFilename=igoodar-setup-{#MyAppVersion}
SetupIconFile=generated-icon.png
Compression=lzma2
SolidCompression=yes

; Windows version requirements
MinVersion=6.1
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; UI
WizardStyle=modern
DisableWelcomePage=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Start Igoodar automatically when Windows starts"; GroupDescription: "Startup Options:"; Flags: checkedonce

[Files]
; Include all application files
Source: "packages\stocksage-*\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Note: The actual source will be the extracted package folder

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\start-background.vbs"""; WorkingDir: "{app}"
Name: "{group}\Open Igoodar in Browser"; Filename: "http://localhost:5003"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\start-background.vbs"""; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\start-background.vbs"""; WorkingDir: "{app}"; Tasks: startupicon

[Run]
; Install npm dependencies during installation
Filename: "{app}\nodejs\npm.cmd"; Parameters: "install --production"; WorkingDir: "{app}"; StatusMsg: "Installing dependencies..."; Flags: runhidden waituntilterminated
; Initialize database
Filename: "{app}\nodejs\node.exe"; Parameters: "scripts\init-sqlite.js"; WorkingDir: "{app}"; StatusMsg: "Initializing database..."; Flags: runhidden waituntilterminated
; Start the application after installation
Filename: "wscript.exe"; Parameters: """{app}\start-background.vbs"""; WorkingDir: "{app}"; Description: "Start {#MyAppName} now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop the application before uninstalling
Filename: "taskkill"; Parameters: "/IM node.exe /F"; Flags: runhidden

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Additional post-install tasks if needed
  end;
end;
