del yarn.lock

FOR /d /r . %%d IN (node_modules) DO @IF EXIST "%%d" rd /s /q "%%d"
FOR /d /r . %%d IN (dist) DO @IF EXIST "%%d" rd /s /q "%%d"


FOR /d /r . %%d IN (node_modules) DO @IF EXIST "%%d" rd /s /q "%%d"
FOR /d /r . %%d IN (dist) DO @IF EXIST "%%d" rd /s /q "%%d"



