# Security policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

Spartito is a static client-side app. There is no hosted backend and no account
data. Security reports about the app, the optional local MCP server and the
build/release pipeline are all in scope.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: open the repository's **Security**
tab and choose **Report a vulnerability**. If private reporting is unavailable,
contact the maintainer ([@fedetamburlin](https://github.com/fedetamburlin))
privately to arrange a channel. Do not publish exploit details in a public
issue before a fix is available.

Please include:

- the affected version or commit;
- browser and operating system;
- a minimal reproduction (input file or ChordPro source when relevant);
- the impact you believe the issue has.

## Response

This is a small, single-maintainer project. Reports are handled on a best-effort
basis, with an initial acknowledgement target of **7 days**. A confirmed issue
gets a fix, a mitigation or a documented decision, and a coordinated disclosure
date when appropriate.

## Scope

In scope:

- cross-site scripting or unsafe rendering of imported text, ChordPro, JSON or
  PDF content;
- dependency vulnerabilities that affect the shipped app;
- flaws in the local MCP bridge, HTTP transport, origin checks or Chrome
  invocation;
- build or release pipeline issues that could compromise published artifacts.

Out of scope:

- loss of library data because the browser cleared IndexedDB (use the JSON
  backup; this is a documented limitation);
- differences in PDF rendering between browsers;
- self-XSS or social engineering;
- denial of service caused by opening an intentionally huge local file on your
  own machine, unless it crashes the app in a way a normal user can trigger.

## Disclosure

Please give the project a reasonable window to fix the issue before public
disclosure. Credit is offered in the release notes unless you prefer to remain
anonymous. There is no bug bounty.
