"""Cyber security: threats and protection; firewalls, endpoint and SOC basics; frameworks and architecture."""
from . import q, TF, CISCO_NETACAD, MS_LEARN

COURSES = {}

CERT_IN = ("CERT-In: incident reporting, advisories and the cyber security directions of 28 April 2022", "https://www.cert-in.org.in/")
NIST_CSF = ("NIST Cybersecurity Framework (CSF) 2.0", "https://www.nist.gov/cyberframework")
NIST_PW = ("NIST SP 800-63B: Digital Identity Guidelines (authentication and passwords)", "https://pages.nist.gov/800-63-4/")
ISO27001 = ("ISO/IEC 27001:2022: information security management systems", "https://www.iso.org/standard/27001")
CIS = ("CIS Critical Security Controls", "https://www.cisecurity.org/controls")
MITRE = ("MITRE ATT&CK: knowledge base of adversary tactics and techniques", "https://attack.mitre.org/")
CISA = ("CISA: Secure Our World (phishing, MFA and passwords guidance)", "https://www.cisa.gov/secure-our-world")
NIST_ZT = ("NIST SP 800-207: Zero Trust Architecture", "https://csrc.nist.gov/pubs/sp/800/207/final")
FIDO = ("FIDO Alliance: passkeys and phishing-resistant authentication", "https://fidoalliance.org/")

COURSES["Cyber Security Basic: Threats and Protection"] = {
    "lessons": [
        """
Cyber threats affect organisations of every size. Attackers want money, data or disruption, and they often target people and small mistakes rather than advanced technical weaknesses. Understanding the main threats is the first step to defending against them.

## Common threats

- **Phishing:** fake emails, messages or calls that trick people into clicking links, opening attachments or sharing passwords and OTPs.
- **Ransomware:** malware that encrypts files and demands payment, often also stealing data and threatening to publish it.
- **Business email compromise (BEC):** criminals impersonate executives or suppliers to request urgent payments or bank detail changes.
- **Malware:** harmful software such as viruses, trojans and spyware.
- **Credential attacks:** using stolen or guessed passwords to log in, often from data breaches at other sites.
- **Denial of service (DoS/DDoS):** flooding a service with traffic so that it becomes unavailable.
- **Insider threats:** employees or contractors misusing access, deliberately or by accident.
- **Supply chain attacks:** compromising a supplier or software update to reach its customers.

## Why attacks succeed

- Unpatched software with known vulnerabilities.
- Weak or reused passwords without multi-factor authentication.
- Users who are not trained to spot phishing.
- Too many people with administrator rights.
- No tested backups, so ransomware has more impact.

## Key terms

- **Vulnerability:** a weakness that can be exploited.
- **Exploit:** a method of taking advantage of a vulnerability.
- **Malware:** malicious software.
- **Attack surface:** all the points where an attacker could try to get in.

## Real-world example

A mid-sized manufacturer receives an email that appears to come from a regular supplier, with an "updated invoice" attachment. An accounts clerk opens it, and malware installs silently. Over the next week, attackers move through the network and then launch ransomware on a Friday night. Because backups were connected to the same network, they are encrypted too. Recovery takes weeks. Training, patching, MFA and offline backups would each have reduced the damage.

## Common mistakes

- Thinking "we are too small to be targeted".
- Relying only on antivirus.
- Keeping backups online and reachable by attackers.

## Key takeaways

- Phishing, ransomware, BEC and credential attacks are the most common threats.
- Attacks usually exploit unpatched systems, weak passwords and untrained users.
- Every organisation is a target.
""",
        """
No single security product can stop every attack. Defence in depth uses several layers of protection, so that if one layer fails, others still stand between the attacker and the organisation's data.

## The layers of protection

- **People:** security awareness training, clear policies and a culture of reporting.
- **Identity:** strong passwords, multi-factor authentication and least-privilege access.
- **Endpoint:** endpoint protection or EDR, patching and device management on laptops, desktops and servers.
- **Network:** firewalls, segmentation and secure Wi-Fi.
- **Email and web:** filtering of malicious emails, links and websites.
- **Applications:** secure configuration and regular updates.
- **Data:** encryption, access controls and data loss prevention.
- **Backup and recovery:** regular, tested backups, with at least one copy offline or immutable.
- **Monitoring and response:** detecting suspicious activity and responding quickly.

## The 3-2-1 backup rule

A widely recommended practice is to keep at least **three** copies of important data, on **two** different types of media, with **one** copy off-site or offline. Many organisations now add an immutable copy that cannot be changed or deleted, to resist ransomware.

## Key terms

- **Defence in depth:** multiple layers of security controls.
- **Least privilege:** giving users only the access they need.
- **EDR:** endpoint detection and response.
- **Immutable backup:** a backup that cannot be altered or deleted for a set period.

## Real-world example

An employee at a logistics company clicks a phishing link and enters her password on a fake login page. The attacker tries to log in but is stopped by MFA. The suspicious attempt is flagged by monitoring, and the security team resets the password and reminds staff about the phishing campaign. One layer (the user) failed, but two others (MFA and monitoring) stopped the attack.

## Common mistakes

- Relying on one product, such as a firewall, to stop everything.
- Giving everyone administrator rights.
- Never testing backup restores.

## Key takeaways

- Use multiple layers: people, identity, endpoint, network, email, data, backup and monitoring.
- Follow the 3-2-1 backup rule with an offline or immutable copy.
- Assume one layer may fail; design so others still protect you.
""",
        """
Passwords remain the most common way people log in, and stolen passwords are one of the most common ways attackers get in. Strong password practices and multi-factor authentication (MFA) block most account takeovers.

## Good password practice

Modern guidance, such as NIST Special Publication 800-63B, focuses on making passwords hard to guess and easy to use:

- **Length matters more than complexity:** long passphrases are stronger and easier to remember than short, complex passwords.
- **Use a unique password for every account,** so a breach at one site does not expose others.
- **Use a password manager** to generate and store passwords.
- **Check passwords against lists of known breached passwords.**
- **Avoid forced periodic changes** unless there is evidence of compromise; frequent forced changes lead to weaker, predictable passwords.
- **Never share passwords** or write them where others can see them.

## Multi-factor authentication

MFA requires two or more types of evidence:

- Something you **know:** a password or PIN.
- Something you **have:** a phone app, hardware key or smart card.
- Something you **are:** a fingerprint or face.

Some MFA methods are stronger than others. SMS codes are better than nothing but can be intercepted. Authenticator apps are stronger. **Phishing-resistant MFA,** such as FIDO2 security keys and passkeys, is the strongest, because it cannot be tricked into working on a fake website.

## MFA fatigue

Attackers who have a password sometimes send repeated MFA push requests, hoping the user will approve one to stop the alerts. Never approve an MFA prompt you did not start; report it.

## Key terms

- **Passphrase:** a long password made of several words.
- **Password manager:** software that stores and generates passwords securely.
- **MFA:** multi-factor authentication.
- **Passkey:** a phishing-resistant credential based on FIDO standards.

## Real-world example

An employee reuses his work password on a shopping website that is later breached. Attackers try the leaked email and password on the company's email system. Because MFA is enabled, the login fails. The security team sees the attempt, forces a password reset, and the employee starts using a password manager.

## Common mistakes

- Reusing passwords across sites.
- Approving unexpected MFA prompts.
- Relying only on SMS codes for high-risk accounts.

## Key takeaways

- Use long, unique passwords and a password manager.
- Turn on MFA everywhere, preferring authenticator apps or passkeys.
- Never approve an MFA prompt you did not start.
""",
        """
Quick reporting is one of the most effective security controls. The sooner a suspected incident is reported, the sooner it can be contained, and the less damage it causes.

## What to report

- Suspicious emails, especially ones you clicked or replied to.
- Unusual computer behaviour: pop-ups, slowness, files you cannot open, or programs starting on their own.
- Lost or stolen laptops, phones or ID cards.
- Unexpected MFA prompts or password reset emails.
- Requests for payments or bank detail changes that seem unusual.
- Accidentally sending sensitive data to the wrong person.

## How to report

1. Report immediately to the IT helpdesk or security team using the company's reporting channel.
2. Describe what happened, when, and what you clicked or entered.
3. Follow instructions, such as disconnecting from the network. Do not turn off the device unless told to, as this can destroy evidence.
4. Do not try to investigate or fix the problem yourself.
5. Do not delete the suspicious email; the security team may need it.

## Why speed matters

In India, the CERT-In directions of 28 April 2022 require organisations to report specified cyber security incidents to CERT-In within **six hours** of noticing them. The company can meet this only if employees report quickly.

## Key terms

- **Security incident:** an event that may compromise the confidentiality, integrity or availability of information.
- **Containment:** limiting the spread of an incident.
- **CERT-In:** the Indian Computer Emergency Response Team.

## Real-world example

A sales executive realises, an hour after clicking a link, that the "shared document" login page looked odd. She reports it immediately and admits she entered her password. The security team resets her password, revokes active sessions and checks for suspicious activity. They find the attacker had already set up an email forwarding rule to send her emails outside the company, and remove it within minutes. Her quick report prevented a much bigger breach.

## Common mistakes

- Staying silent out of embarrassment.
- Waiting to see if anything bad happens.
- Deleting evidence or trying to fix it yourself.

## Key takeaways

- Report suspicious events immediately, even if unsure.
- Describe what happened and follow instructions; do not investigate yourself.
- Quick reporting helps meet the CERT-In six-hour reporting requirement.
""",
    ],
    "questions": [
        q("SINGLE", "An email from a 'supplier' asks you to urgently pay to a new bank account. What type of attack might this be?", ["DDoS", "Business email compromise", "Patching", "Backup"], ["Business email compromise"],
          explanation="BEC impersonates executives or suppliers to redirect payments."),
        q("SINGLE", "What does the 3-2-1 backup rule recommend?", ["3 passwords, 2 users, 1 server", "3 copies, 2 media types, 1 off-site or offline", "Backups every 3 hours, 2 days, 1 week", "3 firewalls, 2 switches, 1 router"], ["3 copies, 2 media types, 1 off-site or offline"],
          explanation="The rule protects against single failures and ransomware."),
        q("MULTIPLE", "Which are good password practices?", ["Long passphrases", "Unique passwords for each account", "Using a password manager", "Sharing passwords with trusted colleagues"], ["Long passphrases", "Unique passwords for each account", "Using a password manager"],
          explanation="Passwords must never be shared."),
        q("SINGLE", "Which MFA method is phishing-resistant?", ["SMS code", "Email code", "FIDO2 security key or passkey", "Security question"], ["FIDO2 security key or passkey"],
          explanation="FIDO2 credentials work only with the genuine website."),
        q("TRUE_FALSE", "You should approve an unexpected MFA prompt to stop the notifications.", TF, ["False"],
          explanation="Unexpected prompts can mean an attacker has your password. Deny and report."),
        q("SINGLE", "Within how many hours must specified incidents be reported to CERT-In?", ["2", "6", "24", "72"], ["6"],
          explanation="The CERT-In directions of 28 April 2022 set a six-hour reporting window."),
        q("TRUE_FALSE", "If you suspect your laptop has malware, you should delete the suspicious email and try to fix it yourself before telling anyone.", TF, ["False"],
          explanation="Report immediately and keep evidence."),
    ],
    "sources": [CERT_IN, CISA, NIST_PW, FIDO],
}

COURSES["Cyber Security Intermediate: Firewalls, Endpoint and SOC Basics"] = {
    "lessons": [
        """
A firewall controls traffic between networks based on rules. A well-designed rule set lets legitimate business traffic through and blocks everything else. A badly managed rule set grows into hundreds of unclear rules that open hidden holes.

## Firewall types

- **Stateful firewalls:** track connections and allow return traffic automatically.
- **Next-generation firewalls (NGFW):** add application awareness, user identity, intrusion prevention, URL filtering and malware inspection.
- **Web application firewalls (WAF):** protect web applications from attacks such as SQL injection.
- **Cloud firewalls and security groups:** control traffic in cloud environments.

## Principles of good policy design

- **Default deny:** block everything not explicitly allowed.
- **Least privilege:** allow only the specific sources, destinations, applications and ports needed.
- **Zones:** group networks by trust level, such as internet, DMZ, users, servers and management.
- **Clear documentation:** every rule has an owner, a business reason and, where possible, an expiry date.
- **Logging:** log allowed and denied traffic on important rules.
- **Change control:** request, review, approve and test rule changes.
- **Regular review:** remove unused, duplicate and overly broad rules.

## Key terms

- **NGFW:** next-generation firewall.
- **DMZ:** a zone for public-facing servers, separated from internal networks.
- **Rule base:** the ordered list of firewall rules.
- **Any-any rule:** a rule allowing all traffic, which should be avoided.

## Real-world example

During a security review, an SI finds a firewall rule allowing "any" source on the internet to reach a server on remote desktop (RDP). It was added years ago for a vendor's temporary support access and never removed. Attackers had been trying passwords on it for months. The rule is removed, vendor access moves to a secure remote-access solution with MFA, and every rule now has an owner and review date.

## Common mistakes

- Broad "any" rules added for convenience.
- Temporary rules that are never removed.
- No logging or review of the rule base.

## Key takeaways

- Use default deny and least privilege, organised by zones.
- Document an owner and reason for every rule, and control changes.
- Review the rule base regularly and remove unused rules.
""",
        """
Endpoints, such as laptops, desktops and servers, are where most attacks land. Traditional antivirus that matches known malware signatures is no longer enough. Endpoint detection and response (EDR) adds behaviour monitoring, investigation and response.

## Endpoint protection layers

- **Next-generation antivirus (NGAV):** blocks known and unknown malware using signatures, behaviour analysis and machine learning.
- **EDR:** continuously records endpoint activity, such as processes, files, network connections and registry changes, detects suspicious behaviour and lets analysts investigate and respond remotely.
- **XDR (extended detection and response):** combines data from endpoints, email, identity, network and cloud for broader detection.
- **MDR (managed detection and response):** a service where an outside team monitors and responds to alerts around the clock.

## Supporting controls

- **Patch management:** apply operating system and application updates quickly, especially for actively exploited vulnerabilities.
- **Application control:** allow only approved applications to run.
- **Disk encryption:** protect data on lost or stolen devices.
- **Remove local administrator rights** from standard users.
- **Device management:** enforce policies and configurations.

## What EDR response looks like

When EDR detects ransomware-like behaviour, such as a process rapidly encrypting files, it can kill the process, isolate the device from the network and alert analysts, who can then investigate the root cause.

## Key terms

- **EDR:** endpoint detection and response.
- **XDR:** extended detection and response across multiple data sources.
- **MDR:** managed detection and response service.
- **Isolation:** cutting a device off from the network while keeping it reachable for investigation.

## Real-world example

An employee opens a malicious attachment. The NGAV does not recognise the file, but EDR notices it launching PowerShell to download further code and contacting an unknown server. EDR isolates the laptop automatically and alerts the MDR team at 11 p.m. The team confirms the attack, cleans the device and blocks the attacker's server across the company before any other device is affected.

## Common mistakes

- Relying on traditional antivirus alone.
- Deploying EDR but nobody watching the alerts.
- Leaving users with local administrator rights.

## Key takeaways

- EDR monitors behaviour and enables investigation and response.
- XDR adds wider visibility; MDR provides 24x7 monitoring.
- Combine EDR with patching, application control, encryption and least privilege.
""",
        """
A security operations centre (SOC) is the team, processes and technology that monitor an organisation's security around the clock, detect threats and respond to incidents. Many organisations build their own SOC; others use a managed SOC from a service provider.

## SOC tools

- **SIEM (security information and event management):** collects logs from firewalls, servers, endpoints, cloud and applications, correlates them and raises alerts.
- **SOAR (security orchestration, automation and response):** automates repetitive response steps, such as blocking an IP address or disabling an account.
- **EDR/XDR:** endpoint and extended detection data.
- **Threat intelligence:** information about current attacker tools, techniques and indicators.

## SOC roles

- **Level 1 analysts:** monitor alerts, triage them and escalate real incidents.
- **Level 2 analysts:** investigate incidents in depth and lead containment.
- **Level 3 / threat hunters:** search proactively for hidden threats and handle complex incidents.
- **SOC manager:** runs operations, reporting and improvement.

## Frameworks used in SOCs

The **MITRE ATT&CK** framework is a widely used knowledge base of attacker tactics and techniques. SOCs use it to map detections, find gaps and describe attacks in a common language.

## Key metrics

- **Mean time to detect (MTTD):** how long until an attack is detected.
- **Mean time to respond (MTTR):** how long until it is contained.
- **False positive rate:** how many alerts turn out to be harmless.

## Key terms

- **SIEM:** central log collection and correlation.
- **SOAR:** automation of response workflows.
- **Triage:** quickly deciding whether an alert is real and how urgent it is.
- **MITRE ATT&CK:** a framework of attacker tactics and techniques.

## Real-world example

A SIEM correlates three events: a user's login from an unusual country, followed minutes later by a login from the user's usual city, and a new mailbox forwarding rule. Individually, each might be ignored. Together, they trigger a high-priority alert. A Level 1 analyst escalates, and Level 2 confirms account compromise, disables the account, removes the rule and resets credentials within 20 minutes.

## Common mistakes

- Collecting logs without useful detection rules.
- Too many low-value alerts, causing alert fatigue.
- No clear escalation and response procedures.

## Key takeaways

- A SOC combines people, processes and tools such as SIEM, SOAR and EDR.
- Analysts work in levels from triage to deep investigation and hunting.
- Use MITRE ATT&CK and measure detection and response times.
""",
        """
Logs are records of what happens on systems and networks. Reading them is a core skill for security and operations staff: logs show who did what, when and from where.

## Common log sources

- **Windows Security event log:** logons, account changes and privilege use.
- **Linux logs:** for example authentication logs in /var/log (such as auth.log or secure, depending on the distribution).
- **Firewall logs:** allowed and denied connections, with source, destination, port and action.
- **Web server and proxy logs:** requests, response codes and user agents.
- **Cloud and email audit logs:** sign-ins, configuration changes and mail rules.

## Useful Windows event IDs

- **4624:** an account successfully logged on.
- **4625:** an account failed to log on.
- **4720:** a user account was created.
- **4672:** special privileges were assigned to a new logon (often an administrator).
- **4740:** a user account was locked out.

## What to look for

- Many failed logins followed by a success (possible password guessing).
- Logins at unusual times or from unusual locations.
- New administrator accounts or privilege changes.
- Firewall logs showing internal devices connecting to unknown external addresses.
- Large data transfers out of the network.

## Good practice

- Synchronise clocks on all systems with NTP; the CERT-In directions require organisations to connect to NTP servers of the National Informatics Centre or the National Physical Laboratory, or servers traceable to them.
- Keep logs long enough; CERT-In requires ICT system logs to be retained for 180 days within India.
- Centralise logs in a SIEM or log server.

## Key terms

- **Event ID:** a number identifying the type of Windows event.
- **Brute-force attack:** trying many passwords to guess the right one.
- **Log retention:** how long logs are kept.

## Real-world example

An analyst reviewing a server's logs sees 2,000 event 4625 failed logins for the "administrator" account from one external IP address over an hour, followed by a single 4624 successful logon. This pattern suggests a successful brute-force attack. The analyst escalates immediately, the account is disabled, the source is blocked and the exposed remote access service is closed.

## Common mistakes

- Not collecting logs centrally.
- Clocks out of sync, making timelines confusing.
- Deleting logs too soon.

## Key takeaways

- Know the main log sources and key Windows event IDs (4624, 4625, 4720, 4672).
- Look for failed-then-successful logins, unusual times and new privileges.
- Synchronise time, centralise logs and keep them for at least 180 days.
""",
    ],
    "questions": [
        q("SINGLE", "What does 'default deny' mean in firewall design?", ["Allow everything unless blocked", "Block everything not explicitly allowed", "Deny only internet traffic", "Turn off the firewall at night"], ["Block everything not explicitly allowed"],
          explanation="Default deny means only explicitly allowed traffic passes."),
        q("SINGLE", "Which tool collects and correlates logs from many systems?", ["EDR", "SIEM", "UPS", "DHCP"], ["SIEM"],
          explanation="A SIEM centralises and correlates logs to raise alerts."),
        q("SINGLE", "Which Windows event ID records a failed logon?", ["4624", "4625", "4720", "4672"], ["4625"],
          explanation="4625 is a failed logon; 4624 is a successful logon."),
        q("TRUE_FALSE", "EDR can isolate an infected laptop from the network automatically.", TF, ["True"],
          explanation="Isolation stops spread while keeping the device reachable for investigation."),
        q("MULTIPLE", "Which log patterns suggest a possible attack?", ["Many failed logins followed by a success", "A new administrator account created at 3 a.m.", "Internal device connecting to an unknown external address", "A user logging in at the usual time from the office"], ["Many failed logins followed by a success", "A new administrator account created at 3 a.m.", "Internal device connecting to an unknown external address"],
          explanation="Normal logins are expected; the other patterns need investigation."),
        q("SINGLE", "What is the MITRE ATT&CK framework?", ["A firewall brand", "A knowledge base of attacker tactics and techniques", "A backup method", "A password standard"], ["A knowledge base of attacker tactics and techniques"],
          explanation="SOCs use ATT&CK to map detections and describe attacks."),
        q("MATCHING", "Match each term to its meaning.", ["MDR=Outside team monitors and responds 24x7", "SOAR=Automates response workflows", "DMZ=Zone for public-facing servers", "MTTD=Average time to detect an attack"],
          explanation="These are common SOC and security terms."),
    ],
    "sources": [MITRE, CERT_IN, CIS, CISCO_NETACAD, MS_LEARN],
}

COURSES["Cyber Security Advanced: Compliance Frameworks and Security Architecture"] = {
    "lessons": [
        """
Security frameworks give organisations a structured way to manage cyber risk. Customers, regulators and auditors increasingly expect organisations to follow a recognised framework.

## Major frameworks and standards

- **NIST Cybersecurity Framework (CSF) 2.0:** published by the US National Institute of Standards and Technology on 26 February 2024. It organises cyber security outcomes into six functions: **Govern, Identify, Protect, Detect, Respond and Recover.** CSF 2.0 added "Govern" to emphasise leadership, risk strategy and supply chain risk. It is voluntary and widely used worldwide.
- **ISO/IEC 27001:2022:** the international standard for an information security management system (ISMS), against which organisations can be certified. Its Annex A lists **93 controls** grouped into four themes: organisational (37), people (8), physical (14) and technological (34). The transition period from the 2013 version ended on 31 October 2025.
- **CIS Critical Security Controls:** a prioritised set of 18 controls with implementation groups, practical for organisations starting out.
- **PCI DSS:** required for organisations that store, process or transmit payment card data; version 4.0 and its update 4.0.1 are current.

## Indian regulatory context

- **CERT-In directions (2022):** incident reporting within six hours, log retention for 180 days and time synchronisation.
- **Digital Personal Data Protection Act, 2023** and the DPDP Rules, 2025: reasonable security safeguards and breach notification.
- **Sector regulators:** RBI for banks and payment companies, SEBI for market entities (including its cyber security and cyber resilience framework) and IRDAI for insurers issue their own cyber security requirements.

## Key terms

- **ISMS:** information security management system.
- **Control:** a measure that reduces risk.
- **Certification:** independent confirmation that an organisation meets a standard such as ISO/IEC 27001.
- **Framework:** a structured set of guidelines and outcomes.

## Real-world example

A mid-sized IT services company wants to bid for a bank's managed services contract. The bank requires ISO/IEC 27001 certification and alignment with RBI's expectations for outsourced service providers. The company uses NIST CSF 2.0 to assess its overall maturity, builds an ISMS, implements the required Annex A controls and achieves certification within a year, allowing it to bid.

## Common mistakes

- Treating certification as a one-time project.
- Choosing a framework without considering customer and regulatory needs.
- Copying policies without implementing them.

## Key takeaways

- NIST CSF 2.0 has six functions: Govern, Identify, Protect, Detect, Respond, Recover.
- ISO/IEC 27001:2022 has 93 Annex A controls in four themes and supports certification.
- Indian organisations must also meet CERT-In, DPDP and sector regulator requirements.
""",
        """
A gap assessment compares an organisation's current security against a target, such as a framework, a regulation or a customer requirement. It shows what is missing and what to prioritise.

## Running a gap assessment

1. **Define scope:** which business units, systems and locations are included.
2. **Choose the reference:** for example NIST CSF 2.0, ISO/IEC 27001:2022 Annex A, CIS Controls or a regulator's requirements.
3. **Collect evidence:** policies, configurations, interviews, technical scans and logs.
4. **Rate each control or outcome:** for example not implemented, partially implemented or fully implemented, or a maturity score.
5. **Identify gaps and risks:** what is missing and how it could be exploited.
6. **Prioritise:** by risk to the business, regulatory deadlines and effort.
7. **Report:** a clear summary for leadership and a detailed list for technical teams.

## Evidence matters

A policy that exists on paper but is not followed is still a gap. Good assessments check what actually happens, for example by sampling user access reviews, patch records or backup restore tests.

## Key terms

- **Gap assessment:** comparison of current state against a target.
- **Maturity level:** a rating of how well a capability is established and managed.
- **Evidence:** proof that a control operates, such as records or configurations.
- **Risk rating:** a combination of likelihood and impact.

## Real-world example

A school group asks for help after a ransomware scare. A gap assessment against the CIS Controls finds that asset inventory, MFA, patching and offline backups are all weak, while it has a modern firewall. The report shows that spending on MFA and backups first would reduce the most risk for the least cost. Leadership approves a phased plan.

## Common mistakes

- Assessing policies without checking whether they are followed.
- Producing a long list of gaps with no prioritisation.
- Not involving business owners in rating risks.

## Key takeaways

- Compare current state to a chosen framework or requirement using evidence.
- Prioritise gaps by risk, deadlines and effort.
- Report clearly for both leadership and technical teams.
""",
        """
Security architecture is the design of security controls across an organisation's systems, so they work together to protect what matters most. Modern architecture assumes that attackers may already be inside.

## Key architectural principles

- **Zero trust:** never trust by default; verify every user, device and request based on identity, device health and context. NIST SP 800-207 describes zero trust architecture.
- **Identity as the new perimeter:** strong identity management, single sign-on, MFA and least privilege, as users work from anywhere.
- **Segmentation:** separate networks and workloads so that one compromise does not spread.
- **Defence in depth:** multiple layers of controls.
- **Secure by design:** build security into systems from the start.
- **Resilience:** plan to detect, respond and recover, not just to prevent.

## Common architectural building blocks

- **Identity and access management (IAM)** with privileged access management (PAM) for administrators.
- **Secure access service edge (SASE)** or security service edge (SSE): cloud-delivered security for users wherever they are.
- **Network segmentation and micro-segmentation** in data centres and cloud.
- **Endpoint security with EDR.**
- **Data protection:** classification, encryption and data loss prevention.
- **Security monitoring:** SIEM and SOC.
- **Backup and recovery:** immutable and offline copies.

## Key terms

- **PAM:** privileged access management for administrator accounts.
- **SASE / SSE:** cloud-delivered network and security services.
- **Micro-segmentation:** fine-grained segmentation between individual workloads.
- **Secure by design:** security built in from the start.

## Real-world example

A company's staff work from offices, home and customer sites. All traffic is sent back to head office through a VPN, causing slow cloud applications and gaps in protection. The SI designs an architecture with single sign-on and phishing-resistant MFA, a cloud-delivered SSE service for web and application access, EDR on all endpoints and PAM for administrators. Security improves and users get faster access.

## Common mistakes

- Relying on the network perimeter alone.
- Leaving administrator accounts unmanaged.
- Adding tools that do not work together.

## Key takeaways

- Design around zero trust, identity, segmentation, defence in depth and resilience.
- Use IAM and PAM, SASE/SSE, EDR, data protection, monitoring and resilient backups.
- Make controls work together as one architecture.
""",
        """
A security roadmap turns assessment findings and architecture goals into a practical plan over time. It helps leadership fund security in stages and track progress.

## Building a roadmap

1. **Start from risks and gaps:** use the gap assessment and business priorities.
2. **Group work into initiatives:** such as identity and MFA, endpoint security, backup resilience, security monitoring and awareness.
3. **Prioritise:** quick wins and high-risk items first, regulatory deadlines next, then longer-term improvements.
4. **Phase the work:** for example 0–3 months, 3–12 months and 12–24 months.
5. **Estimate cost and effort:** including people, technology and services.
6. **Define measures of success:** such as MFA coverage, patching times and restore test results.
7. **Assign owners and governance:** regular reviews with leadership.

## Example quick wins

- MFA for email and remote access.
- Removing local administrator rights.
- Offline or immutable backups and restore tests.
- Patching internet-facing systems.
- Phishing awareness training.

## Communicating with leadership

- Explain risks in business terms: downtime, fines, lost customers and reputation.
- Show how each initiative reduces specific risks.
- Report progress with simple measures and a red/amber/green status.

## Key terms

- **Roadmap:** a time-phased plan of initiatives.
- **Quick win:** a low-effort, high-impact improvement.
- **Key risk indicator:** a measure showing the level of a specific risk.
- **Governance:** the oversight and decision-making structure.

## Real-world example

After a gap assessment, a healthcare company's roadmap starts with MFA, immutable backups and patching of internet-facing systems in the first quarter. Year one adds EDR with a managed SOC, and year two focuses on segmentation and data protection to support DPDP obligations. Quarterly reviews with the board show steady progress, and the budget is approved year after year.

## Common mistakes

- A roadmap that is a shopping list of products.
- No owners or measures of success.
- Ignoring quick wins while planning large projects.

## Key takeaways

- Build the roadmap from risks and gaps, grouped into initiatives.
- Prioritise quick wins, high risks and regulatory deadlines, then phase the rest.
- Assign owners, measure progress and report in business terms.
""",
    ],
    "questions": [
        q("SINGLE", "Which function was added in NIST CSF 2.0?", ["Identify", "Protect", "Govern", "Recover"], ["Govern"],
          explanation="CSF 2.0 (February 2024) added Govern to the original five functions."),
        q("MULTIPLE", "Which are the six functions of NIST CSF 2.0?", ["Govern", "Identify", "Protect", "Detect", "Respond", "Recover"], ["Govern", "Identify", "Protect", "Detect", "Respond", "Recover"],
          explanation="All six are CSF 2.0 functions."),
        q("SINGLE", "How many Annex A controls does ISO/IEC 27001:2022 contain?", ["114", "93", "18", "64"], ["93"],
          explanation="The 2022 version has 93 controls in four themes; the 2013 version had 114."),
        q("TRUE_FALSE", "A gap assessment should check whether policies are actually followed, not just whether they exist.", TF, ["True"],
          explanation="Evidence of operation matters more than documents."),
        q("SINGLE", "Which NIST publication describes zero trust architecture?", ["SP 800-207", "SP 800-63B", "SP 800-145", "SP 800-34"], ["SP 800-207"],
          explanation="SP 800-207 defines zero trust architecture."),
        q("SINGLE", "Which is a typical security roadmap quick win?", ["Rebuilding the whole data centre", "Enabling MFA for email and remote access", "Replacing every laptop", "Changing the company logo"], ["Enabling MFA for email and remote access"],
          explanation="MFA is low effort and blocks many attacks."),
        q("SHORT_ANSWER", "In two or three sentences, explain why Indian organisations need more than an international framework to be compliant.",
          explanation="International frameworks such as ISO/IEC 27001 and NIST CSF guide good practice, but Indian law adds specific duties. These include CERT-In's six-hour reporting and 180-day log retention, the DPDP Act's safeguards and breach notice, and sector regulators' rules."),
    ],
    "sources": [NIST_CSF, ISO27001, CIS, NIST_ZT, CERT_IN, ("MeitY: Digital Personal Data Protection Act, 2023 and Rules", "https://www.meity.gov.in/")],
}
