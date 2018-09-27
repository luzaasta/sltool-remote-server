A web application to make some remote server work easier (should be used only localy now)

Installation
- Clone
- Run `npm install`
- Run `start.bat` in Windows or `start.sh` in Linux (/bin/sh)
- Web is served on `localhost:3001`

Current capabilites
- makes tests for DB2, PostgreSQL or SSH connections based on configurations stored in DB and managed through web interface
- automatic test is performed when applications starts and every 24 hours if application is still running

Drawbacks (for now)
- only local file DB as plain JSON
- passwords not encrypted in DB
- not properly tested so it may contain bugs (concurrency or client side possibly)

