"""Extra certification-preparation courses outside the catalogue (vendor-neutral)."""
from . import q, TF, MS_LEARN, AWS_SKILL_BUILDER

EXTRA = {}

AWS_CERT = ("AWS Certification: exam guides and domains", "https://aws.amazon.com/certification/")
MS_CERT = ("Microsoft Learn: Microsoft Credentials and exam study guides", "https://learn.microsoft.com/en-us/credentials/")
GCP_CERT = ("Google Cloud: certification exam guides", "https://cloud.google.com/learn/certification")
COMPTIA = ("CompTIA: Security+ and other certification objectives", "https://www.comptia.org/")
ISC2 = ("ISC2: CC, CISSP and other security certifications", "https://www.isc2.org/")
ISACA = ("ISACA: CISA, CISM and other certifications", "https://www.isaca.org/")
CISCO_NETACAD = ("Cisco Networking Academy: cybersecurity courses", "https://www.netacad.com/")
NICE = ("NIST NICE Framework: cybersecurity work roles and skills", "https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center")

EXTRA["Cloud Certification Preparation"] = {
    "lessons": [
        """
Every major cloud certification, from AWS, Microsoft Azure and Google Cloud, publishes an official exam guide (sometimes called a study guide or skills outline). It lists the domains tested, how much each domain counts and the specific skills expected. Reading it carefully is the first and most important step in preparation.

## What an exam guide contains

- **Target candidate:** the experience and role the exam is designed for.
- **Domains and weightings:** the main topic areas and the percentage of questions from each.
- **Skills measured:** specific tasks within each domain.
- **Exam details:** number and type of questions, duration, passing score and languages.
- **Recommended training and documentation.**

## Common certification levels

- **Foundational:** cloud concepts and business value, such as AWS Certified Cloud Practitioner, Microsoft Azure Fundamentals (AZ-900) and Google Cloud Digital Leader.
- **Associate:** hands-on administration, development or architecture, such as AWS Solutions Architect – Associate, Azure Administrator (AZ-104) and Google Associate Cloud Engineer.
- **Professional and specialty:** advanced architecture, security, networking or data.

Exam codes and content change over time; always use the latest official guide.

## Using the guide to plan

1. Copy the domains and skills into a checklist.
2. Rate your confidence in each skill: strong, partial or new.
3. Spend most time on high-weight domains where you are weakest.
4. Link each skill to official documentation, training and hands-on labs.

## Key terms

- **Exam guide / blueprint:** the official outline of an exam.
- **Domain:** a major topic area in the exam.
- **Weighting:** the share of questions from a domain.

## Real-world example

An engineer studies for an associate cloud exam by reading random blog posts and fails narrowly. For the retake, he downloads the official exam guide, builds a checklist, notices that one domain he skipped carries a large weighting, and focuses his study there. He passes comfortably.

## Common mistakes

- Studying without the official guide.
- Spending equal time on all topics regardless of weighting.
- Using outdated material after an exam version change.

## Key takeaways

- Start with the latest official exam guide.
- Build a checklist and rate your confidence in each skill.
- Focus on high-weight, weak areas.
""",
        """
Cloud certifications test practical understanding. Reading alone is not enough; hands-on practice in a real cloud account builds the knowledge that exams, and customers, expect.

## Setting up a safe sandbox

- Use a **personal or company-provided practice account,** separate from production.
- Many providers offer **free tiers or trial credits,** and some training platforms provide temporary lab environments.
- **Set budget alerts immediately** so unexpected charges are caught early.
- **Enable MFA** on the account and avoid using the root or global administrator for daily work.
- **Tag and delete resources** after each practice session.

## What to practise

- Create and secure identities and roles.
- Build networks: virtual networks, subnets, routing and security groups.
- Launch, resize and back up virtual machines.
- Configure storage with access policies and lifecycle rules.
- Deploy a managed database.
- Set up monitoring, logging and alerts.
- Use infrastructure as code templates for repeatable builds.

## Practising effectively

- Follow official labs and tutorials linked from the exam guide.
- Then build small projects on your own, such as a highly available website.
- Break things deliberately and troubleshoot.
- Write short notes on what you learned.

## Key terms

- **Sandbox:** a safe environment for practice.
- **Free tier:** limited free usage offered by cloud providers.
- **Budget alert:** a notification when spending reaches a set level.

## Real-world example

A presales consultant practises in a trial account but forgets to delete a large virtual machine and a managed database, receiving an unexpected bill. Next time, she sets a small budget alert on day one, tags all resources with "practice" and uses a script to delete them at the end of each session.

## Common mistakes

- No budget alerts.
- Practising in production accounts.
- Leaving resources running after practice.

## Key takeaways

- Practise hands-on in a separate, secured sandbox with budget alerts.
- Cover identity, networking, compute, storage, databases and monitoring.
- Clean up after every session.
""",
        """
Higher-level cloud exams often use scenario questions: a business situation with requirements, where you must choose the best design. They test judgement, not just memory. This skill is also exactly what customers need from presales and architects.

## How scenario questions work

- A scenario describes a business need, constraints and priorities, such as lowest cost, highest availability or least operational effort.
- Several answers may work technically; the correct one best matches the stated priorities.

## A method for answering

1. **Read the question at the end first:** what exactly is asked?
2. **Underline key requirements and constraints:** "most cost-effective", "minimal downtime", "without managing servers".
3. **Eliminate answers that break a requirement.**
4. **Compare the remaining answers against the priority.**
5. **Choose managed services when "least operational effort" is required,** and resilient multi-zone designs when "high availability" is required.

## Linking to real design frameworks

Provider frameworks, such as the AWS Well-Architected Framework and the Azure Well-Architected Framework, describe pillars such as reliability, security, cost optimisation, operational excellence and performance efficiency. Thinking in these pillars helps you weigh trade-offs in both exams and real projects.

## Key terms

- **Scenario question:** a question based on a business situation.
- **Trade-off:** gaining one benefit at the cost of another.
- **Managed service:** a service where the provider handles operations.
- **Availability zone:** an isolated location within a cloud region.

## Real-world example

A practice question asks for the most cost-effective way to store infrequently accessed backups for seven years. A candidate picks high-performance storage because it is familiar. Reviewing the scenario method, she notices "most cost-effective" and "infrequently accessed", and chooses an archive storage tier. She applies the same thinking later when designing a customer's backup retention.

## Common mistakes

- Choosing the most powerful option instead of the one that fits the priority.
- Missing key words such as "least effort" or "lowest cost".
- Memorising answers without understanding trade-offs.

## Key takeaways

- Scenario questions test judgement against stated priorities.
- Read the question, mark requirements, eliminate and compare.
- Use well-architected pillars to weigh trade-offs.
""",
        """
Practice exams show whether you are ready, highlight weak areas and build familiarity with the exam format. Used well, they are among the most effective study tools.

## Using practice exams well

- **Take a baseline test early** to find weak domains.
- **Review every question,** including ones you got right, to confirm your reasoning.
- **Understand why wrong answers are wrong,** not just why the right answer is right.
- **Return to documentation and labs** for weak areas.
- **Take a full timed test** close to exam day to practise timing.
- Use official or reputable practice questions; avoid "brain dump" sites that share real exam questions, which breach certification agreements and can lead to bans.

## Study techniques that work

Research on learning supports:

- **Active recall:** testing yourself rather than re-reading.
- **Spaced repetition:** reviewing material over increasing intervals.
- **Interleaving:** mixing topics in practice sessions.

## Exam day

- Check the exam rules: ID requirements, online proctoring requirements such as a clear desk and webcam, and timing.
- Manage time: flag difficult questions and return to them.
- Read each question carefully for key words.
- After the exam, note areas to strengthen, and plan for recertification, as many cloud certifications must be renewed periodically.

## Key terms

- **Practice exam:** a test that simulates the real exam.
- **Active recall:** retrieving information from memory to strengthen learning.
- **Spaced repetition:** reviewing at increasing intervals.
- **Recertification:** renewing a certification before it expires.

## Real-world example

An engineer scores 60% on a baseline practice test. She tracks results by domain, focuses on weak areas with labs and documentation, and uses flashcards with spaced repetition. Two weeks later she scores 85% on a timed practice test and passes the real exam the following week.

## Common mistakes

- Memorising practice answers without understanding.
- Using brain dumps.
- Taking the exam without a timed rehearsal.

## Key takeaways

- Use practice exams to find gaps and review every answer.
- Study with active recall, spaced repetition and interleaving.
- Prepare for exam rules and timing, and plan recertification.
""",
    ],
    "questions": [
        q("SINGLE", "What is the first step in preparing for a cloud certification?", ["Book the exam", "Read the latest official exam guide", "Buy a laptop", "Memorise brain dumps"], ["Read the latest official exam guide"],
          explanation="The exam guide defines the domains and skills tested."),
        q("SINGLE", "Which should you set up first in a practice cloud account?", ["A large database", "Budget alerts and MFA", "Public storage", "Production workloads"], ["Budget alerts and MFA"],
          explanation="Protect against unexpected charges and account compromise."),
        q("TRUE_FALSE", "In scenario questions, the most powerful option is always the correct answer.", TF, ["False"],
          explanation="The best answer matches the stated priorities, such as cost or effort."),
        q("MULTIPLE", "Which study techniques are supported by learning research?", ["Active recall", "Spaced repetition", "Interleaving", "Re-reading only"], ["Active recall", "Spaced repetition", "Interleaving"],
          explanation="Testing yourself works better than re-reading."),
        q("SINGLE", "Why avoid 'brain dump' sites?", ["They are slow", "They share real exam questions, breaching certification agreements", "They are too expensive", "They have no ads"], ["They share real exam questions, breaching certification agreements"],
          explanation="Using them can lead to bans and does not build real skill."),
        q("SINGLE", "A question asks for the most cost-effective storage for rarely accessed backups kept for years. What should guide your choice?", ["Highest performance", "An archive or cold storage tier", "The newest service", "The most familiar option"], ["An archive or cold storage tier"],
          explanation="Match the answer to 'cost-effective' and 'infrequently accessed'."),
        q("MATCHING", "Match each term to its meaning.", ["Domain=Major topic area in the exam", "Weighting=Share of questions from a domain", "Sandbox=Safe environment for practice", "Recertification=Renewing before expiry"],
          explanation="These terms appear throughout certification preparation."),
    ],
    "sources": [AWS_CERT, MS_CERT, GCP_CERT, AWS_SKILL_BUILDER, MS_LEARN],
}

EXTRA["Security Certification Preparation"] = {
    "lessons": [
        """
Security certifications help you build structured knowledge and prove it to employers and customers. Choosing the right certification for your role and experience, and planning your study, sets you up for success.

## Common security certification paths

- **Entry level:** for example ISC2 Certified in Cybersecurity (CC) and CompTIA Security+, covering core security concepts.
- **Practitioner and specialist:** vendor certifications for firewalls, endpoint security, cloud security or SOC tools, and certifications in areas such as ethical hacking or incident handling.
- **Advanced and management:** for example ISC2 CISSP, which requires several years of relevant work experience, and ISACA's CISM (security management) and CISA (audit).
- **Cloud security:** security certifications from cloud providers and industry bodies.

Requirements, exam versions and experience rules change; check the certifying body's official pages.

## Choosing a certification

- Match it to your current role and next career step, for example SOC analyst, security engineer or presales.
- Consider what customers and employers value; OEM certifications may also matter for partner programmes.
- Frameworks such as the NIST NICE Framework describe cybersecurity work roles and skills, which can help you plan a path.

## Planning your study

1. Download the official exam objectives.
2. Estimate study time based on your experience.
3. Set a target exam date and a weekly study schedule.
4. Combine reading, video, labs and practice questions.
5. Review progress every week.

## Key terms

- **Exam objectives:** the official list of topics tested.
- **Experience requirement:** work experience needed for some certifications.
- **CPE:** continuing professional education credits needed to maintain many certifications.

## Real-world example

A support engineer wants to move into the company's SOC. Instead of attempting an advanced management certification, she chooses an entry-level security certification, then a SOC tool vendor certification. Each step is achievable and directly useful in her new role.

## Common mistakes

- Choosing a certification for prestige rather than fit.
- Ignoring experience requirements.
- No schedule or exam date.

## Key takeaways

- Choose certifications that fit your role, experience and career path.
- Use official objectives and plan a realistic schedule.
- Check requirements and maintenance rules on official sites.
""",
        """
Security exams cover a wide range of topics. Effective study methods help you learn and remember more in less time.

## Methods that work

- **Active recall:** close the book and test yourself. Flashcards and practice questions are powerful tools.
- **Spaced repetition:** review topics at increasing intervals, such as one day, three days, one week and two weeks later.
- **Interleaving:** mix topics in a session rather than studying one topic for hours.
- **Teach others:** explaining a concept to a colleague reveals gaps in your understanding.
- **Connect to real work:** link concepts to incidents, policies and systems you have seen.

## Organising study

- Break the objectives into small topics.
- Study in focused sessions of 30 to 50 minutes with short breaks.
- Keep a list of difficult topics and revisit them regularly.
- Join a study group or learning circle with colleagues.

## Using practice questions

- Use reputable practice questions from official or trusted sources.
- Review explanations for every question.
- Track scores by domain to guide study.
- Avoid "brain dumps" of real exam questions; they breach certification agreements and can lead to revocation.

## Key terms

- **Active recall:** retrieving information from memory.
- **Spaced repetition:** reviewing at increasing intervals.
- **Interleaving:** mixing different topics during practice.

## Real-world example

Two colleagues prepare for the same security exam. One re-reads a textbook three times. The other uses flashcards with spaced repetition, explains topics in a weekly study group and takes practice questions by domain. The second colleague retains more, scores higher on practice tests and passes first time.

## Common mistakes

- Re-reading instead of testing yourself.
- Cramming everything in the last week.
- Using brain dumps.

## Key takeaways

- Use active recall, spaced repetition, interleaving and teaching others.
- Study in focused sessions and track weak areas.
- Use reputable practice questions and avoid brain dumps.
""",
        """
Security is a practical field. Hands-on skills make exam concepts real, help with performance-based questions and prepare you for actual security work.

## Building a safe lab

- Use **virtual machines** on a laptop or a cloud sandbox to build small networks.
- Include a few systems, such as a Windows machine, a Linux machine and a firewall.
- Keep the lab **isolated** from company and customer networks.
- Use only deliberately vulnerable practice systems and legal training platforms.
- **Never test tools or techniques on systems you do not own or have written permission to test.** Unauthorised access is an offence under India's Information Technology Act, 2000.

## Skills to practise

- Configure firewall rules and test what traffic passes.
- Harden an operating system: disable unnecessary services, apply updates and set strong policies.
- Read logs: find failed logins and suspicious activity.
- Use network tools to see traffic and open ports.
- Configure MFA and access controls.
- Practise incident response steps on a simulated incident.

## Learning resources

- Official labs from certification bodies and vendors.
- Capture-the-flag (CTF) challenges designed for legal practice.
- Free courses from academies such as Cisco Networking Academy.

## Key terms

- **Lab:** an isolated practice environment.
- **Hardening:** reducing a system's attack surface.
- **Capture the flag (CTF):** legal security challenges for practice.
- **Authorisation:** written permission to test a system.

## Real-world example

A junior engineer builds a small lab with a firewall, a Windows server and a Linux server. He practises reading Windows security logs and spots failed logins he generated himself. When a real brute-force attempt appears at work months later, he recognises the pattern immediately and escalates it.

## Common mistakes

- Practising on company or public systems without permission.
- Connecting a vulnerable lab to the office network.
- Studying theory only.

## Key takeaways

- Build an isolated lab with virtual machines or a cloud sandbox.
- Practise firewalls, hardening, log reading, MFA and incident response.
- Test only systems you own or have written permission to test.
""",
        """
Good preparation can be undone by a poor exam day. Planning the practical details reduces stress, and maintaining your certification keeps it valuable after you pass.

## Before the exam

- **Check the rules:** accepted ID documents, arrival time for test centres, and requirements for online proctoring, such as a clear desk, a working webcam and a private room.
- **Test your setup** if taking the exam online.
- **Rest well** the night before; last-minute cramming adds little.

## During the exam

- **Read each question carefully,** looking for words such as "best", "first" and "most likely".
- **Manage time:** know the number of questions and minutes; flag difficult questions and return to them.
- **Use elimination:** remove clearly wrong answers first.
- **Performance-based questions:** some exams include simulations; if they take long, consider whether you can return to them later, if the exam allows it.

## After the exam

- **If you pass:** update your profile, inform your manager and add the certification to the company's records, as it may count towards OEM partner requirements.
- **If you do not pass:** review the score report by domain, adjust your plan and check the retake policy.
- **Maintain the certification:** many security certifications require continuing professional education (CPE) credits, annual fees or renewal exams.
- **Keep learning:** the threat landscape changes constantly.

## Key terms

- **Online proctoring:** remote supervision of an exam by webcam.
- **Score report:** results, often by domain.
- **Retake policy:** rules on waiting periods and fees for retakes.
- **CPE credits:** continuing education required to maintain a certification.

## Real-world example

A candidate taking an online exam is stopped at the start because there are papers and a second monitor on her desk. She reschedules, clears the room and passes the following week. She now shares a short exam-day checklist with colleagues.

## Common mistakes

- Not reading online proctoring rules.
- Spending too long on one hard question.
- Forgetting CPE requirements and letting a certification lapse.

## Key takeaways

- Check exam rules and test your setup.
- Read carefully, manage time and use elimination.
- After passing, record the certification and plan maintenance.
""",
    ],
    "questions": [
        q("SINGLE", "What is the best basis for choosing a security certification?", ["Its prestige", "Fit with your role, experience and career path", "The cheapest exam", "What a friend took"], ["Fit with your role, experience and career path"],
          explanation="The right certification supports your next career step."),
        q("TRUE_FALSE", "Some advanced security certifications, such as CISSP, require several years of relevant work experience.", TF, ["True"],
          explanation="Check experience requirements on the certifying body's site."),
        q("MULTIPLE", "Which are effective study methods?", ["Active recall", "Spaced repetition", "Teaching others", "Cramming the night before"], ["Active recall", "Spaced repetition", "Teaching others"],
          explanation="Cramming is less effective than spaced study."),
        q("SINGLE", "Which systems may you test security tools on?", ["Any website", "Your company's production network without asking", "Systems you own or have written permission to test", "A customer's servers to show your skill"], ["Systems you own or have written permission to test"],
          explanation="Unauthorised testing is illegal under the IT Act, 2000."),
        q("SINGLE", "What are CPE credits?", ["Exam discount codes", "Continuing education needed to maintain many certifications", "Cloud credits", "Practice exam scores"], ["Continuing education needed to maintain many certifications"],
          explanation="Many certifications require CPE to stay active."),
        q("TRUE_FALSE", "A practice lab should be connected to the office network so it feels realistic.", TF, ["False"],
          explanation="Keep labs isolated from company and customer networks."),
        q("MATCHING", "Match each term to its meaning.", ["Hardening=Reducing a system's attack surface", "CTF=Legal security challenges for practice", "Online proctoring=Remote exam supervision by webcam", "Score report=Exam results by domain"],
          explanation="These terms appear in security exam preparation."),
    ],
    "sources": [COMPTIA, ISC2, ISACA, NICE, CISCO_NETACAD],
}
