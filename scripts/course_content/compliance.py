"""Compliance: code of conduct, data protection and statutory requirements, contract compliance."""
from . import q, TF

COURSES = {}

MEITY_DPDP = ("MeitY: Digital Personal Data Protection Act, 2023 and DPDP Rules, 2025", "https://www.meity.gov.in/")
CERT_IN = ("CERT-In: incident reporting and the cyber security directions of 28 April 2022", "https://www.cert-in.org.in/")
INDIA_CODE = ("India Code: official text of central Acts (Prevention of Corruption Act, Indian Contract Act, Arbitration Act)", "https://www.indiacode.nic.in/")
MCA = ("Ministry of Corporate Affairs: Companies Act 2013 (vigil mechanism, Section 177)", "https://www.mca.gov.in/")
CVC = ("Central Vigilance Commission: integrity pact and vigilance guidance", "https://cvc.gov.in/")
SHE_BOX = ("SHe-Box: Ministry of Women and Child Development complaint portal under the POSH Act", "https://shebox.wcd.gov.in/")

COURSES["Compliance Basic: Code of Conduct and Company Policies"] = {
    "lessons": [
        """
A code of conduct describes how everyone in the company is expected to behave: with customers, partners, government officials and each other. It turns the company's values into everyday rules. Following it protects customers, the company's reputation and you personally.

> **[PLACEHOLDER]** 3C IT Solutions & Telecoms India Limited code of conduct: the full policy text, the policy owner and where employees acknowledge it each year. The LMS administrator adds these details.

## What a code of conduct usually covers

- **Integrity:** honest dealings, accurate records and no bribery or corruption.
- **Fair competition:** no agreements with competitors to fix prices or divide customers.
- **Conflicts of interest:** declaring personal interests that could affect business decisions.
- **Confidentiality:** protecting company, customer and partner information.
- **Respectful workplace:** no harassment or discrimination. In India, the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act) requires employers with ten or more employees to set up an Internal Committee to handle complaints.
- **Health and safety:** safe working practices at offices and customer sites.
- **Use of company assets:** laptops, phones, vehicles and data used for business purposes.
- **Speaking up:** how to raise concerns without fear of retaliation.

## Applying the code: a quick test

When you are unsure, ask yourself:

- Is it legal and in line with company policy?
- Would I be comfortable if it were reported in the newspaper or seen by my manager?
- Would it damage trust with a customer or partner?

If the answer worries you, stop and ask your manager or the compliance team.

## Key terms

- **Code of conduct:** the company's rules for ethical behaviour.
- **Internal Committee (IC):** the body required under the POSH Act to handle sexual harassment complaints.
- **Retaliation:** punishing someone for raising a concern in good faith; not allowed.

## Real-world example

A customer's IT manager asks a salesperson to inflate a quotation so that the extra amount can be "adjusted" later for him. The salesperson recognises this as a request that breaks the code of conduct and possibly the law. She politely declines, informs her manager and the compliance team, and the company handles the account carefully from then on.

## Common mistakes

- Thinking the code applies only to senior staff.
- Staying silent when you see a problem.
- Assuming "everyone does it" makes something acceptable.

## Key takeaways

- The code of conduct applies to everyone, every day.
- When unsure, use the quick test and ask before acting.
- Speaking up in good faith is protected.
""",
        """
Conflicts of interest, gifts and bribery are areas where good intentions can still lead to serious trouble. Indian law treats bribery very seriously, and companies can be held responsible for what their employees and agents do.

## Conflicts of interest

A conflict of interest exists when your personal interests could influence, or appear to influence, your work decisions. Examples:

- A relative owns a company that wants to become our vendor.
- You have a financial stake in a competitor or customer.
- You take a second job with a partner or competitor.

Declare any potential conflict to your manager or the compliance team in writing, and step away from the related decision.

## Gifts and hospitality

- Small, occasional courtesies, such as a working lunch or a festival sweet box, may be acceptable within the company's limits.
- Cash, gift cards, expensive gifts, travel or anything given to influence a decision are not acceptable.
- Never offer anything of value to a government official without explicit approval; public servants are bound by strict conduct rules.
- Record gifts given and received as the company policy requires.

## Anti-bribery law in India

The **Prevention of Corruption Act, 1988**, as amended in 2018, makes it an offence to give or promise an undue advantage to a public servant. Under the amended Section 9, a commercial organisation can be held liable if a person associated with it, such as an employee or agent, gives a bribe to obtain or keep business. The organisation's defence is to show that it had adequate procedures in place to prevent such conduct. That is why companies have strict gift and hospitality rules.

## Key terms

- **Conflict of interest:** a personal interest that could affect business judgement.
- **Undue advantage:** any gratification other than legal remuneration.
- **Facilitation payment:** a small payment to speed up a routine action; these are bribes under Indian law.

## Real-world example

During a government tender, a vendor's agent offers to "help" by arranging a meeting with an evaluation committee member over an expensive dinner paid by the company. The bid manager refuses and reports it. Taking part could expose both the employee and the company to criminal liability under the Prevention of Corruption Act.

## Common mistakes

- Accepting expensive gifts because "it would be rude to refuse".
- Not declaring a relative's business relationship.
- Treating small "speed money" payments as harmless.

## Key takeaways

- Declare conflicts of interest and step away from related decisions.
- Follow gift limits; never give anything to influence a decision.
- Companies can be liable for bribes paid by employees or agents.
""",
        """
Information security is everyone's responsibility. Most cyber attacks begin with a person, not a machine: a click on a phishing link, a reused password or a laptop left unlocked. Simple habits prevent most incidents.

## Everyday security habits

- **Strong passwords:** use long passphrases, a different one for each account, and a password manager if the company provides one.
- **Multi-factor authentication (MFA):** turn it on wherever it is available.
- **Phishing awareness:** check the sender, look for urgency or unusual requests, hover over links before clicking and never share passwords or one-time passwords (OTPs).
- **Lock your screen** whenever you leave your desk (Windows key + L).
- **Updates:** install system and software updates when prompted.
- **Approved tools only:** store company data only in approved systems, not personal email or unapproved cloud storage.
- **Clean desk:** do not leave customer documents or passwords on your desk.

## Protecting customer information

As a system integrator, we often see customers' network diagrams, passwords and data. Treat this information as strictly confidential, share it only with those who need it, and delete it securely when a project ends.

## Key terms

- **Phishing:** a fraudulent message designed to trick you into revealing information or installing malware.
- **MFA:** using two or more factors to log in, such as a password and a code from an app.
- **Social engineering:** manipulating people into breaking security rules.
- **Need to know:** sharing information only with people who need it for their work.

## Real-world example

An accounts executive receives an email, apparently from the managing director, asking for an urgent payment to a new vendor before the end of the day. The email address is slightly different from the real one. She calls the managing director's office to check, and the request turns out to be fake. This type of fraud, known as business email compromise, has cost companies large sums.

## Common mistakes

- Reusing the same password across sites.
- Approving MFA prompts you did not start.
- Sending customer data to a personal email to work from home.

## Key takeaways

- Use strong, unique passwords and MFA.
- Verify unusual requests through a separate, known channel.
- Treat customer information as strictly confidential.
""",
        """
A speak-up or whistle-blower process lets employees raise concerns about wrongdoing safely. A grievance process lets employees raise problems about their own working conditions. Both help the company find and fix problems early.

> **[PLACEHOLDER]** Company whistle-blower and grievance process: how to report (email, phone line or portal), who receives reports, how confidentiality is protected and the expected response times. The LMS administrator adds these details.

## Whistle-blowing versus grievance

- **Whistle-blowing** is reporting suspected misconduct that affects the company or others, such as fraud, bribery, data misuse, safety violations or breaches of the code of conduct.
- **A grievance** is a personal concern about your own employment, such as workload, pay, leave or treatment by a manager.

## The legal background

Under Section 177 of the Companies Act, 2013, listed companies and certain other companies must establish a vigil mechanism for directors and employees to report genuine concerns, with safeguards against victimisation and, in appropriate cases, direct access to the chair of the audit committee. Even where the law does not require it, most well-run companies have one.

## How to raise a concern well

- Report facts: what happened, when, where and who was involved.
- Provide any evidence you have, but do not investigate on your own.
- Report in good faith; you do not need to be certain, only to have a reasonable concern.
- Keep the matter confidential.

## Key terms

- **Vigil mechanism:** the formal whistle-blower channel required for certain companies.
- **Good faith:** reporting honestly, believing the concern to be true.
- **Victimisation:** unfair treatment of someone because they raised a concern.

## Real-world example

An engineer notices that the same few vendors win every small purchase, often at higher prices, and learns that a purchase officer is related to one of them. He reports it through the speak-up channel with the details he has. An investigation confirms an undeclared conflict of interest. The company changes its purchase approvals, and the engineer's identity is kept confidential throughout.

## Common mistakes

- Staying silent because you are not completely sure.
- Investigating on your own and collecting data you are not authorised to access.
- Using the whistle-blower channel for a personal grievance, or the reverse.

## Key takeaways

- Report suspected misconduct through the speak-up channel; raise personal concerns through the grievance process.
- Report facts in good faith; you do not need proof.
- Retaliation against people who speak up is not allowed.
""",
    ],
    "questions": [
        q("SINGLE", "A relative owns a company that wants to become our vendor. What should you do?", ["Nothing", "Declare the conflict in writing and step away from the decision", "Approve the vendor quickly", "Tell the vendor to use a different name"], ["Declare the conflict in writing and step away from the decision"],
          explanation="Conflicts of interest must be declared and the person should not take part in the decision."),
        q("TRUE_FALSE", "Under the Prevention of Corruption Act as amended in 2018, a company can be liable for a bribe paid by its employee or agent.", TF, ["True"],
          explanation="Section 9 makes commercial organisations liable unless they had adequate procedures to prevent bribery."),
        q("MULTIPLE", "Which are signs of a phishing email?", ["Unexpected urgency", "A slightly different sender address", "A request for passwords or OTPs", "A meeting invite from your manager's correct address about an agreed meeting"], ["Unexpected urgency", "A slightly different sender address", "A request for passwords or OTPs"],
          explanation="Urgency, look-alike addresses and requests for credentials are classic phishing signs."),
        q("SINGLE", "You receive an urgent payment request from the 'managing director' by email. What should you do?", ["Pay immediately", "Verify by calling the managing director's office on a known number", "Reply to the email asking if it is real", "Forward it to the vendor"], ["Verify by calling the managing director's office on a known number"],
          explanation="Verify through a separate, known channel. Replying to the email may reach the fraudster."),
        q("TRUE_FALSE", "You must be certain of wrongdoing before reporting it through the whistle-blower channel.", TF, ["False"],
          explanation="A reasonable concern raised in good faith is enough."),
        q("SINGLE", "Under the POSH Act, which body handles sexual harassment complaints in a workplace with ten or more employees?", ["The sales team", "The Internal Committee", "The IT helpdesk", "The customer"], ["The Internal Committee"],
          explanation="The POSH Act requires an Internal Committee in workplaces with ten or more employees."),
        q("MATCHING", "Match each situation to the right channel or response.", ["Suspected vendor fraud=Whistle-blower channel", "Dispute about your leave=Grievance process", "Offer of an expensive gift from a vendor=Decline and report under the gift policy", "Suspicious payment email=Verify through a known channel"],
          explanation="Using the right channel makes sure concerns reach the right people."),
    ],
    "sources": [INDIA_CODE, MCA, CERT_IN, SHE_BOX],
}

COURSES["Compliance Intermediate: Data Protection and Statutory Requirements"] = {
    "lessons": [
        """
Personal data is any information about an identifiable person: a name, phone number, email address, employee ID, Aadhaar number, photograph or location. India's main privacy law is the **Digital Personal Data Protection Act, 2023 (DPDP Act)**. The Digital Personal Data Protection Rules, 2025 were notified on 14 November 2025, with obligations coming into force in phases over about 18 months.

## Who is who under the DPDP Act

- **Data Principal:** the person the data is about, such as an employee or a customer's staff member.
- **Data Fiduciary:** the organisation that decides why and how personal data is processed. We are a data fiduciary for our own employees' and contacts' data.
- **Data Processor:** an organisation that processes data on behalf of a fiduciary. When we manage a customer's systems, we may act as their processor.
- **Data Protection Board of India:** the authority that handles complaints and imposes penalties.

## Core principles

- **Lawful processing with notice and consent,** or for certain legitimate uses listed in the Act, such as employment purposes.
- **Purpose limitation:** use data only for the purpose it was collected for.
- **Data minimisation:** collect only what is needed.
- **Accuracy:** keep data correct and up to date.
- **Storage limitation:** delete data when it is no longer needed for the purpose.
- **Reasonable security safeguards** to prevent breaches.
- **Accountability:** the fiduciary is responsible, including for its processors.

## Rights of individuals

Data principals have rights to access information about their data, to correction and erasure, to grievance redressal and to nominate someone to act for them.

## Key terms

- **Personal data:** data about an individual who can be identified by or in relation to it.
- **Consent manager:** a registered entity through which individuals can give and manage consent.
- **Significant Data Fiduciary (SDF):** a fiduciary notified by the government with extra obligations.

## Real-world example

The marketing team wants to use a list of attendees from a customer's event to send promotional emails. The attendees gave their details only to register for the event. Under the purpose limitation principle, the team cannot reuse the list for marketing without a lawful basis, such as consent. They instead invite attendees to opt in to future updates.

## Common mistakes

- Collecting more personal data than needed "just in case".
- Using data for a new purpose without a lawful basis.
- Keeping data indefinitely.

## Key takeaways

- The DPDP Act 2023 and the DPDP Rules 2025 govern personal data in India, with phased commencement.
- Process data lawfully, for a stated purpose, using only what is needed, and keep it secure.
- Individuals have rights to access, correction, erasure and grievance redressal.
""",
        """
Principles become real in daily work. Every employee handles personal data: in CRM records, HR files, support tickets, visitor logs and customer systems. Handling it carefully prevents breaches and builds trust with customers.

## Practical rules

- **Access:** see only the data you need for your role, and do not share login credentials.
- **Sharing:** share personal data only with people and vendors who need it, through approved, secure channels.
- **Storage:** keep data in approved systems, not on personal devices, USB drives or personal cloud storage.
- **Email:** double-check recipients before sending files with personal data; use encryption or passwords where required.
- **Printing:** collect printouts immediately and shred them when no longer needed.
- **Retention:** follow the company's retention schedule and delete data securely when it expires.
- **Customer environments:** when working on a customer's systems, access only what the task requires and never copy their data to our devices.

## Working with vendors and processors

When we share personal data with a vendor, such as a payroll provider or a cloud service, there must be a contract that limits use to our instructions, requires security safeguards and requires the vendor to report breaches. Under the DPDP Act, we remain responsible for processing done on our behalf.

## Key terms

- **Least privilege:** giving users only the access they need.
- **Retention schedule:** a policy that sets how long each type of data is kept.
- **Data processing agreement (DPA):** a contract that sets how a processor may handle personal data.
- **Encryption:** converting data into a form that only authorised people can read.

## Real-world example

An engineer troubleshooting a customer's HR application copies a database extract containing employee salaries to his laptop to "check it later". The laptop is stolen from his car. Even though the engineer meant no harm, the customer must now treat this as a personal data breach. Following the rule "never copy customer data to our devices" would have prevented it.

## Common mistakes

- Sending spreadsheets of personal data to the wrong recipient.
- Keeping copies of customer data after a project ends.
- Sharing data with vendors without a proper contract.

## Key takeaways

- Access, share and store personal data only as your role requires, in approved systems.
- Never copy customer data to personal or company devices without authorisation.
- Use contracts with security and breach-reporting terms for every processor.
""",
        """
A personal data breach is any unauthorised processing or accidental disclosure, acquisition, sharing, use, alteration, destruction or loss of access to personal data that compromises its confidentiality, integrity or availability. Breaches happen to well-run companies too. What matters is detecting them quickly and responding correctly.

## Reporting obligations in India

- **DPDP Act and Rules:** a data fiduciary must inform the Data Protection Board and each affected data principal of a personal data breach. Under the DPDP Rules, 2025, affected individuals must be informed without delay, and a detailed report must be given to the Board within 72 hours of becoming aware of the breach, unless the Board allows longer.
- **CERT-In directions (28 April 2022):** organisations must report specified types of cyber security incidents to CERT-In within **6 hours** of noticing them, and keep logs of their ICT systems for **180 days** within India.
- **Contracts:** customer contracts often require us to notify them of incidents affecting their data within a set time.

## What to do if you suspect a breach

1. **Report immediately** to your manager and the IT or security team. Do not wait to be sure.
2. **Contain:** follow instructions, such as disconnecting an infected device from the network. Do not delete evidence.
3. **Record** what you saw and when.
4. **Do not** contact customers, the media or authorities yourself unless asked; the response team coordinates communication.

## Key terms

- **Personal data breach:** compromise of the confidentiality, integrity or availability of personal data.
- **Containment:** steps to stop a breach from spreading.
- **CERT-In:** the Indian Computer Emergency Response Team, the national agency for cyber incidents.
- **Incident response plan:** the company's documented steps for handling incidents.

## Real-world example

On a Friday evening, a support engineer notices that a shared folder containing customer contact lists has been made public by mistake. She reports it immediately. The security team removes public access within minutes, checks logs to see whether the folder was accessed, and the legal team assesses the reporting obligations. Fast reporting limits the impact and lets the company meet its deadlines.

## Common mistakes

- Waiting until Monday, or until you are sure, before reporting.
- Trying to fix the issue quietly without telling anyone.
- Deleting logs or files that could show what happened.

## Key takeaways

- Report suspected breaches immediately; the clock for legal reporting may already be running.
- CERT-In requires reporting of specified incidents within 6 hours; the DPDP Rules require prompt notice to individuals and a detailed report to the Board within 72 hours.
- Contain, preserve evidence and let the response team handle communication.
""",
        """
Beyond data protection, a company must comply with many laws: tax, labour, corporate and sector-specific rules. This lesson gives an overview of the statutory areas most relevant to an IT services company. Your administrator will add 3C's specific obligations below.

> **[PLACEHOLDER]** Statutory obligations relevant to 3C: registrations held, licences (for example any telecom-related authorisations), compliance owners and the compliance calendar. The LMS administrator adds these details.

## Common statutory areas

- **Corporate law:** Companies Act, 2013, covering board meetings, annual filings and the vigil mechanism where applicable.
- **Tax:** GST registration, returns and e-invoicing; income tax and TDS.
- **Labour law:** wages, provident fund (EPF), employees' state insurance (ESI), gratuity and bonus. The four Labour Codes consolidate many older labour laws; follow the company's HR team for how they apply.
- **Workplace:** the POSH Act, 2013, and the state Shops and Establishments Act.
- **Information technology:** the Information Technology Act, 2000, and CERT-In directions on incident reporting and log retention.
- **Data protection:** the DPDP Act, 2023 and the DPDP Rules, 2025.
- **Sector-specific:** customers in banking, insurance, telecom and government often impose extra requirements from their regulators, such as the RBI, IRDAI or DoT.

## Why it matters to you

You may not file returns yourself, but your actions affect compliance: an invoice with wrong GST details, a missing e-way bill, a contractor without a proper agreement, or a security incident not reported on time. Knowing the basics helps you spot issues early.

## Key terms

- **Statutory compliance:** meeting the requirements of laws and regulations.
- **Compliance calendar:** a schedule of filing and renewal dates.
- **Regulator:** a government body that supervises a sector, such as the RBI for banks.

## Real-world example

A bank customer's contract requires that our engineers working on its systems complete background verification and that incidents be reported within a few hours, reflecting RBI expectations for outsourcing. A project manager who knows this plans verification before engineers are deployed, avoiding delays and contract breaches.

## Common mistakes

- Assuming compliance is only the legal or finance team's job.
- Ignoring regulator-driven requirements in customer contracts.
- Missing renewal dates for registrations and licences.

## Key takeaways

- An IT company must comply with corporate, tax, labour, IT and data protection laws.
- Customers' regulators often add requirements through contracts.
- Everyone's daily actions affect statutory compliance.
""",
    ],
    "questions": [
        q("SINGLE", "Under the DPDP Act, what is the organisation that decides why and how personal data is processed called?", ["Data Principal", "Data Fiduciary", "Data Processor", "Consent Manager"], ["Data Fiduciary"],
          explanation="The data fiduciary decides the purpose and means of processing."),
        q("MULTIPLE", "Which are principles of data protection under the DPDP framework?", ["Purpose limitation", "Data minimisation", "Storage limitation", "Collect as much as possible"], ["Purpose limitation", "Data minimisation", "Storage limitation"],
          explanation="Collect only what is needed, use it for the stated purpose and delete it when no longer needed."),
        q("SINGLE", "Within how many hours must specified cyber incidents be reported to CERT-In?", ["6 hours", "24 hours", "72 hours", "7 days"], ["6 hours"],
          explanation="The CERT-In directions of 28 April 2022 require reporting within 6 hours of noticing the incident."),
        q("SINGLE", "How long do the CERT-In directions require ICT system logs to be kept within India?", ["30 days", "90 days", "180 days", "5 years"], ["180 days"],
          explanation="Logs must be kept for a rolling period of 180 days within Indian jurisdiction."),
        q("TRUE_FALSE", "You should wait until you are sure a breach has happened before reporting it.", TF, ["False"],
          explanation="Report suspected breaches immediately; legal reporting clocks may already be running."),
        q("SINGLE", "An engineer needs to analyse a customer's data. What is the right approach?", ["Copy it to a laptop", "Work within the customer's environment, accessing only what the task needs", "Email it to a personal account", "Upload it to a free online tool"], ["Work within the customer's environment, accessing only what the task needs"],
          scenario="The customer's HR application is slow and the engineer must investigate.",
          explanation="Never copy customer data to our devices; follow least privilege."),
        q("TRUE_FALSE", "When a vendor processes personal data for us, we remain responsible under the DPDP Act.", TF, ["True"],
          explanation="The data fiduciary is accountable for processing carried out on its behalf."),
    ],
    "sources": [MEITY_DPDP, CERT_IN, INDIA_CODE, MCA],
}

COURSES["Compliance Advanced: Contract Compliance"] = {
    "lessons": [
        """
Contracts set out what we promise to deliver and what the customer promises in return. In IT projects, a few clauses carry most of the risk. Sales, presales, project and finance teams should all understand them, because a promise made in a meeting or proposal can become a contractual obligation.

## Key clauses and what they mean

- **Scope of work:** exactly what we will deliver. Anything outside it is a change.
- **Acceptance:** how and when the customer confirms that deliverables are complete. Payments often depend on it.
- **Payment terms:** amounts, milestones, due dates and consequences of late payment.
- **Warranty and support:** what we fix, for how long and within what response times.
- **Service levels (SLAs):** measurable commitments, such as uptime or resolution time, often with service credits.
- **Liquidated damages (LD):** pre-agreed compensation for delay. Under Section 74 of the Indian Contract Act, 1872, a court allows reasonable compensation up to the stated amount.
- **Limitation of liability:** a cap on how much either party can claim, often linked to the contract value.
- **Indemnity:** a promise to cover the other party's losses arising from specified events, such as intellectual property infringement.
- **Confidentiality and data protection:** how information must be protected.
- **Termination:** when and how either party can end the contract.
- **Force majeure:** relief when events beyond control, such as natural disasters, prevent performance.
- **Dispute resolution:** often negotiation, then arbitration under the Arbitration and Conciliation Act, 1996, and the governing law and seat.

## Key terms

- **Liquidated damages:** a pre-agreed amount payable for a specific breach, typically delay.
- **Limitation of liability:** a contractual cap on damages.
- **Indemnity:** a promise to compensate for certain losses.
- **Force majeure:** events beyond reasonable control that excuse delay.

## Real-world example

A contract for 200 site installations includes liquidated damages of 0.5% of the order value per week of delay, capped at 10%. The project team plans without reading the contract and falls four weeks behind due to late site readiness from the customer. Because no one recorded the customer's delays in writing, the company struggles to contest the LD deduction. Contract awareness from day one would have protected it.

## Common mistakes

- Not reading the contract before planning the project.
- Accepting unlimited liability without approval.
- Failing to record customer-caused delays in writing.

## Key takeaways

- Scope, acceptance, payment, SLAs, LD, liability, indemnity and termination carry most of the risk.
- Promises in proposals can become contract obligations.
- Read the contract before delivery begins and keep written records.
""",
        """
Signing a contract is the start, not the end. Every contract creates obligations with dates and conditions. Obligation tracking makes sure we meet ours, and that the customer meets theirs.

## What to track

- **Delivery milestones** and their due dates.
- **Service levels** and how they are measured and reported.
- **Reports and reviews** we must provide, such as monthly SLA reports.
- **Payment milestones** and the documents needed to claim them.
- **Bank guarantees and insurance** with expiry dates.
- **Renewal and notice dates,** such as the notice period for non-renewal.
- **Customer obligations,** such as site readiness, access and approvals.

## How to track effectively

1. After signature, prepare a short **contract summary** listing every obligation, owner and date.
2. Put the dates on a shared calendar with reminders well ahead.
3. Review obligations in project meetings and monthly account reviews.
4. Record evidence of completion, such as signed acceptance certificates.
5. Record customer delays and changes in writing, as they happen.

## Key terms

- **Contract summary:** a short document listing key obligations, owners and dates.
- **Milestone:** a defined point in the project, often linked to payment.
- **Notice period:** the time required to inform the other party before ending or not renewing a contract.
- **Change request:** a formal request to change the scope, time or price.

## Real-world example

A three-year managed services contract renews automatically unless notice is given 90 days before expiry. The customer wants to renegotiate prices, and so does the company, because costs have risen. Because the account manager tracked the notice date, the company opens discussions four months early and agrees a new rate before the automatic renewal at the old price.

## Common mistakes

- Filing the contract away after signature.
- Missing bank guarantee expiry or renewal notice dates.
- Doing extra work without a change request.

## Key takeaways

- Turn every contract into a list of obligations, owners and dates.
- Use shared calendars and regular reviews.
- Record evidence of completion, customer delays and changes in writing.
""",
        """
Customers often propose their own contract terms, and some are risky for us. Non-standard terms must be reviewed and approved before we accept them, so that someone with the right authority has weighed the risk against the value of the deal.

## Common risky terms in IT contracts

- **Unlimited liability** or liability caps far above the contract value.
- **Broad indemnities,** for example covering all losses, including indirect losses.
- **High liquidated damages** with no cap, or penalties for matters outside our control.
- **Back-to-back terms** that pass obligations to us that our OEM will not support, such as longer warranties than the manufacturer offers.
- **Long payment terms** or payment only after the customer's end client pays.
- **Unilateral termination** for convenience without compensation for work done.
- **Intellectual property transfer** of our pre-existing tools or methods.

## The approval process

1. **Identify** deviations from our standard terms early, ideally at the RFP or proposal stage.
2. **Assess** the risk: likelihood, potential cost and whether it can be passed to OEMs or insured.
3. **Negotiate** alternatives, such as caps, carve-outs or mutual obligations.
4. **Approve** according to the contract approval matrix, involving legal and finance.
5. **Record** the approved deviations in the contract summary.

## Key terms

- **Deviation:** a contract term that differs from the company's standard.
- **Back-to-back:** aligning our obligations to the customer with the OEM's or subcontractor's obligations to us.
- **Carve-out:** an exception to a clause, such as excluding indirect losses from liability.
- **Indirect loss:** loss not directly caused by the breach, such as lost profits.

## Real-world example

A customer's draft contract requires a five-year on-site warranty for equipment, but the OEM provides three years. The presales team flags it during the RFP. The company prices two years of extended OEM support into the bid and gets legal approval for the remaining terms. Had the gap been missed, the company would have carried two years of hardware risk at its own cost.

## Common mistakes

- Discovering risky terms only at signature.
- Accepting customer terms that the OEM does not support.
- Approving deviations without the right authority.

## Key takeaways

- Identify non-standard terms early and assess their risk.
- Align obligations back-to-back with OEMs and subcontractors.
- Get approval from the right authority and record approved deviations.
""",
        """
Each company sets who can approve which contracts and deviations. This lesson explains how a contract approval matrix usually works. Your administrator will add 3C's own matrix below.

> **[PLACEHOLDER]** Company contract approval matrix: approval levels by contract value and by type of deviation (liability, LD, payment terms, IP), required reviewers from legal and finance, and authorised signatories. The LMS administrator adds these details.

## How approval matrices usually work

- **By value:** for example, contracts up to one value approved by a sales head, higher values by a director, and the largest by the managing director or board.
- **By risk:** some deviations, such as unlimited liability or IP transfer, need senior or legal approval regardless of value.
- **Reviewers:** legal reviews terms, finance reviews payment and credit, and delivery reviews feasibility.
- **Signatories:** only authorised persons may sign contracts on behalf of the company.

## Good practice

- Start the approval process early; legal reviews take time.
- Provide a clear summary: customer, value, margin, key deviations and their risk.
- Keep the approval record with the signed contract.
- Never sign or accept customer terms by email unless you are authorised.

## Key terms

- **Authorised signatory:** a person empowered by the company to sign contracts.
- **Approval matrix:** the table of who approves what.
- **Board resolution:** a decision of the board of directors, sometimes needed for major contracts or to authorise signatories.

## Real-world example

A sales manager receives a customer's purchase order with attached terms that include unlimited liability. He nearly accepts it by email to secure the order before month end. Instead, he checks the approval matrix, which requires legal approval for any liability above the contract value. Legal negotiates a cap equal to the contract value, and the order is accepted a week later.

## Common mistakes

- Signing contracts without authority.
- Accepting PO terms by email without review.
- Starting legal review too late, delaying the deal.

## Key takeaways

- Follow the approval matrix for both value and risk.
- Only authorised signatories may sign.
- Start approvals early and keep the record with the contract.
""",
    ],
    "questions": [
        q("SINGLE", "Which clause sets a pre-agreed compensation for delay?", ["Force majeure", "Liquidated damages", "Confidentiality", "Governing law"], ["Liquidated damages"],
          explanation="Liquidated damages are a pre-agreed amount for a specific breach, usually delay."),
        q("SINGLE", "Under which section of the Indian Contract Act do courts allow reasonable compensation up to a stated penalty amount?", ["Section 10", "Section 56", "Section 74", "Section 124"], ["Section 74"],
          explanation="Section 74 deals with compensation for breach where a sum is named in the contract."),
        q("TRUE_FALSE", "A customer requires a five-year warranty but the OEM gives three years. This gap should be identified and priced or negotiated before signing.", TF, ["True"],
          explanation="Back-to-back alignment with the OEM avoids carrying unplanned risk."),
        q("MULTIPLE", "Which items should be tracked after a contract is signed?", ["Delivery milestones", "Bank guarantee expiry dates", "Renewal notice dates", "The colour of the contract cover"], ["Delivery milestones", "Bank guarantee expiry dates", "Renewal notice dates"],
          explanation="Dates and obligations must be tracked to avoid breaches and missed opportunities."),
        q("SINGLE", "A customer's PO arrives with terms including unlimited liability. What should you do?", ["Accept it by email to secure the order", "Follow the approval matrix and involve legal", "Ignore the terms", "Sign it yourself"], ["Follow the approval matrix and involve legal"],
          explanation="Risky deviations need approval from the right authority."),
        q("TRUE_FALSE", "Customer-caused delays should be recorded in writing as they happen.", TF, ["True"],
          explanation="Written records protect the company against unfair delay penalties."),
        q("MATCHING", "Match each clause to its purpose.", ["Indemnity=Promise to cover certain losses", "Limitation of liability=Cap on damages", "Force majeure=Relief for events beyond control", "Acceptance=Confirms deliverables are complete"],
          explanation="These clauses carry much of the risk in IT contracts."),
    ],
    "sources": [INDIA_CODE, CVC, MEITY_DPDP],
}
