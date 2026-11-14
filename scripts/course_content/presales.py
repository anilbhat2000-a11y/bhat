"""Presales: solutions and requirements, RFP responses, demos, POCs and solution design."""
from . import q, TF, MS_LEARN, AWS_SKILL_BUILDER, CISCO_NETACAD

COURSES = {}

COURSES["Presales Basic: Understanding Solutions and Requirements"] = {
    "lessons": [
        """
Presales is the technical partner of sales. A presales engineer, also called a solution architect or solutions consultant, understands what the customer needs and designs a solution that works, can be delivered, and can be sold profitably. Sales owns the relationship and the commercial deal; presales owns the technical answer.

## What presales does

- Joins discovery meetings to understand technical requirements.
- Designs the solution and prepares the bill of materials (BOM).
- Writes the technical parts of proposals and RFP responses.
- Runs demonstrations and proofs of concept (POCs).
- Answers technical questions from the customer's team.
- Hands the design over to the delivery team after the order.

## Working well with sales

The best results come when sales and presales work as one team. Agree before each meeting who leads which part. Share notes in the CRM. Presales should tell sales early if a requirement cannot be met, rather than hoping the issue will go away. Sales should bring presales in early, not the night before a submission.

## Key terms

- **Solution:** a combination of products and services that solves a business problem.
- **Bill of materials (BOM):** the list of every product, licence and service, with quantities.
- **Proof of concept (POC):** a small test that proves the solution works in the customer's environment.
- **Deliverability:** whether our team can actually build and support what is proposed.

## Real-world example

A sales manager receives a request for "a video-conferencing solution for the boardroom". She brings in Anand from presales. In the meeting, Anand asks how many people sit in the room, how far the farthest seat is from the screen, which meeting platform the company uses, and whether the room echoes. He finds that the company uses Microsoft Teams, the room seats 18, and there is a glass wall. His design includes a certified Teams room kit, ceiling microphones suited to the room size and acoustic treatment. The customer sees a team that understands rooms, not just products.

## Common mistakes

- Presales designing without meeting the customer or seeing the site.
- Over-designing: adding features the customer did not ask for and will not pay for.
- Failing to check that the delivery team can implement and support the design.

## Key takeaways

- Presales owns the technical answer; sales owns the relationship and the deal.
- Bring presales in early and agree roles before each meeting.
- A good design is workable, deliverable and sized to the real need.
""",
        """
Requirement gathering is the most important presales activity. A good design built on the wrong requirements still fails. Your job is to find out what the customer really needs, including the things they did not think to mention.

## Types of requirements

- **Business requirements:** the outcome the organisation wants. "Branch staff must be able to bill customers even when the main link fails."
- **Functional requirements:** what the solution must do. "Automatic failover to a second internet link."
- **Non-functional requirements:** how well it must do it, such as performance, availability, security, scalability and manageability. "Failover in under one minute."
- **Constraints:** limits we must work within, such as budget, existing equipment, space, power, policies and deadlines.

## Techniques for gathering requirements

1. **Interviews:** talk to IT staff, users and business owners separately; they see different problems.
2. **Site survey:** visit the location to see space, power, cabling, cooling and access.
3. **Documentation review:** network diagrams, asset lists, previous audit reports.
4. **Questionnaires:** useful for many sites, such as a branch survey sheet.
5. **Confirm in writing:** send a requirement summary and ask the customer to confirm it.

## Key terms

- **Non-functional requirement:** a quality the solution must have, such as availability or response time.
- **Assumption:** something we believe to be true but have not confirmed.
- **Scope:** what is included in, and excluded from, our solution.

## Real-world example

A college asks for Wi-Fi "for the whole campus". Through interviews, presales finds that students mainly need coverage in hostels and the library, while staff need secure access in the administrative block. The site survey reveals that some hostel blocks have no network cabling. The confirmed requirement document includes cabling work, which the college had not mentioned. Without it, the project would have stalled after the order.

## Common mistakes

- Accepting the first description of the need without asking why.
- Forgetting non-functional requirements such as availability and security.
- Not writing down assumptions, which later become disputes.

## Key takeaways

- Separate business, functional and non-functional requirements and constraints.
- Use interviews, site surveys and documents; never rely on one source.
- Confirm requirements and assumptions in writing before designing.
""",
        """
Once the requirements are clear, presales turns them into a solution outline: a short description of the proposed design that the customer can understand and approve before a full proposal is written. An outline helps you check direction early and avoids rework.

## What a solution outline contains

- **Summary of requirements:** in the customer's words, so they recognise their problem.
- **Proposed approach:** the design in plain language, with a simple diagram.
- **Main components:** the categories of products and services, not yet every part number.
- **Options:** where it helps, such as a standard and a high-availability option.
- **Assumptions and exclusions:** what we have assumed and what is not included.
- **Next steps:** what we need from the customer to finalise the design and price.

## Good design principles

- **Fit for purpose:** meet the requirements without unnecessary extras.
- **Standard where possible:** use proven, supported designs and products from our OEM partners.
- **Room to grow:** allow for reasonable growth, such as 20 to 30% more users.
- **Supportable:** our team and the OEM can support it for its full life.
- **Secure by design:** include security from the start, not as an afterthought.

## Key terms

- **High-level design (HLD):** an overview of the architecture and main components.
- **Low-level design (LLD):** the detailed configuration, prepared later for implementation.
- **Option:** an alternative design that trades cost against capability.

## Real-world example

For a retail chain with 60 stores, presales prepares a two-page outline: each store gets a small firewall with two internet links, a managed switch and one Wi-Fi access point, all managed from a cloud dashboard. A diagram shows one typical store. Option B adds 4G backup for stores in areas with poor broadband. The customer's IT head approves Option B for 15 stores and the standard option for the rest, before any detailed pricing is done.

## Common mistakes

- Jumping straight to a 40-page proposal without agreeing direction.
- Using jargon and part numbers that the customer cannot follow.
- Hiding assumptions in small print.

## Key takeaways

- A short solution outline confirms direction before detailed work.
- Design to the requirements, with room to grow, using standard supported components.
- Make assumptions, exclusions and options visible.
""",
        """
Every presales engineer should know what the company has already built and delivered. Reusing proven designs saves time, reduces risk and gives customers confidence. This lesson explains how to use a solution library. Your administrator will add details of 3C's own library below.

> **[PLACEHOLDER]** Company solution library: where reference designs, past proposals, BOM templates, case studies and OEM certifications are stored, and who maintains them. The LMS administrator adds these details.

## What a solution library usually holds

- **Reference designs:** tested architectures for common needs, such as a branch network or a meeting room.
- **BOM templates:** standard parts lists that can be adjusted for quantity.
- **Past proposals:** winning documents that can be reused with care.
- **Case studies and references:** customers who have agreed to share their story or take a call.
- **Certifications:** the OEM partner levels and engineer certifications the company holds, often required in tenders.

## Using the library well

- Start each new design by checking if a reference design exists.
- Always adapt it to the customer's requirements; never copy blindly.
- Remove any other customer's name and data from reused documents.
- Add your new designs back to the library after a successful project.

## Key terms

- **Reference design:** a proven design that can be reused for similar requirements.
- **Case study:** a short story of a customer problem, our solution and the result.
- **Reference customer:** a customer willing to speak to prospects about their experience.

## Real-world example

Deepa is asked to design video conferencing for 25 meeting rooms at a new office. In the library she finds a reference design for small, medium and large rooms from an earlier project, with tested equipment lists and installation notes. She adapts the room counts, checks that the products are still current, and produces a design in a day instead of a week. She also finds that the earlier customer agreed to be a reference, which helps sales.

## Common mistakes

- Reusing a past proposal that still contains another customer's name.
- Using a reference design with products that have reached end of sale.
- Not sharing new designs with the rest of the team.

## Key takeaways

- Check the library before starting from a blank page.
- Adapt, verify and anonymise anything you reuse.
- Contribute your successful designs back to the library.
""",
    ],
    "questions": [
        q("SINGLE", "Who usually owns the technical solution in a sales opportunity?", ["Sales", "Presales", "Finance", "Logistics"], ["Presales"],
          explanation="Sales owns the relationship and commercial deal; presales owns the technical answer."),
        q("SINGLE", "'Failover in under one minute' is an example of which type of requirement?", ["Business requirement", "Non-functional requirement", "Constraint", "Assumption"], ["Non-functional requirement"],
          explanation="It describes how well the solution must perform, which is a non-functional requirement."),
        q("MULTIPLE", "Which are good ways to gather requirements?", ["Interviews with IT and users", "Site survey", "Reviewing existing network diagrams", "Guessing from the customer's website"], ["Interviews with IT and users", "Site survey", "Reviewing existing network diagrams"],
          explanation="Use several sources and confirm the result in writing."),
        q("TRUE_FALSE", "A solution outline should be agreed with the customer before writing a full proposal.", TF, ["True"],
          explanation="Agreeing direction early avoids rework and shows the customer you understood them."),
        q("SINGLE", "What does BOM stand for?", ["Bill of materials", "Board of management", "Base operating model", "Bundle of modules"], ["Bill of materials"],
          explanation="The BOM lists every product, licence and service with quantities."),
        q("TRUE_FALSE", "When reusing a past proposal, it is fine to leave the earlier customer's name in an appendix.", TF, ["False"],
          explanation="Always remove other customers' names and data. It is a confidentiality breach otherwise."),
        q("MATCHING", "Match each term to its meaning.", ["HLD=Overview of architecture and main components", "LLD=Detailed configuration for implementation", "POC=Small test that proves the solution works", "Assumption=Believed true but not yet confirmed"],
          explanation="These terms are used in every presales design and proposal."),
    ],
    "sources": [MS_LEARN, AWS_SKILL_BUILDER, CISCO_NETACAD],
}

COURSES["Presales Intermediate: RFP/RFQ Responses and Technical Proposals"] = {
    "lessons": [
        """
Many large customers, especially government bodies, banks and big enterprises, buy through a formal request. A Request for Proposal (RFP) asks vendors to propose a solution. A Request for Quotation (RFQ) usually asks for prices on a defined list. A Request for Information (RFI) is an early, information-gathering step. Reading these documents carefully is the first step to winning.

## How to read an RFP

1. **Read the whole document first,** including annexures and the draft contract.
2. **Note the key dates:** pre-bid meeting, query deadline, submission date and validity period.
3. **Find the eligibility criteria:** turnover, experience, certifications and OEM authorisations. If we do not qualify, raise it immediately.
4. **Understand the evaluation method:** lowest price (L1), quality and cost based selection (QCBS), or technical score.
5. **List the deliverables and service levels (SLAs),** including penalties.

## The compliance matrix

A compliance matrix is a table that lists every requirement in the RFP and shows our response: Complied, Not complied, or Complied with deviation, with a reference to where the proof is in our proposal. Evaluators use it to score quickly. A clear, honest matrix makes their work easy and builds trust.

## Key terms

- **RFP / RFQ / RFI:** request for proposal, quotation or information.
- **Compliance matrix:** a requirement-by-requirement table of our response.
- **Deviation:** a point where our offer differs from what was requested.
- **Bid validity:** how long our offer remains open for acceptance.

## Real-world example

A state university issues an RFP for campus networking. While building the compliance matrix, Farhan notices that the specification asks for a switch feature that only one manufacturer offers. He raises a pre-bid query asking the university to accept equivalent features. The university issues a corrigendum (an official change to the RFP) that broadens the specification. Without the careful reading, the team would have been non-compliant.

## Common mistakes

- Starting to write before reading the whole RFP.
- Missing the query deadline or the eligibility criteria.
- Marking "Complied" without checking that the product really meets the point.

## Key takeaways

- Read the full RFP, note dates, eligibility, evaluation and SLAs.
- Build an honest compliance matrix with references to proof.
- Use pre-bid queries to fix problems in the specification.
""",
        """
The technical proposal explains how we will meet the customer's requirements. Evaluators often read dozens of proposals, so yours must be clear, well organised and easy to score. Follow the structure the RFP asks for; if none is given, use a logical one.

## A typical structure

1. **Executive summary:** one or two pages on the customer's need, our solution and why we are the right partner. Many senior readers read only this.
2. **Understanding of requirements:** show that we understood the problem.
3. **Proposed solution:** architecture, diagrams, components and how they meet each requirement.
4. **Implementation plan:** phases, timeline, milestones and responsibilities.
5. **Support and SLAs:** how we will support the solution, response times and escalation.
6. **Project team and experience:** relevant references and certifications.
7. **Compliance matrix and annexures:** datasheets, OEM authorisation letters, certificates.

## Writing clearly

- Use short sentences and plain English. Avoid marketing language.
- Use headings and numbering that match the RFP sections.
- Use diagrams to explain architecture; a picture saves a page of text.
- Answer exactly what is asked, then stop.
- Proofread for errors and consistency: names, quantities and model numbers must match everywhere.

## Key terms

- **Executive summary:** a short overview for decision makers.
- **SLA (service level agreement):** the measurable service we commit to, such as response and resolution times.
- **Escalation matrix:** who the customer contacts at each level if an issue is not resolved.

## Real-world example

Two companies bid for a hospital's data-centre project. One submits a 200-page document full of copied datasheets. The other submits a 60-page proposal with a clear executive summary, a diagram for each requirement, a realistic implementation plan, and a compliance matrix with page references. The evaluators score the second proposal higher on every technical criterion because they can find everything quickly.

## Common mistakes

- Copying another proposal without checking names and quantities.
- Writing a long generic company introduction instead of addressing the need.
- Mismatches between the technical proposal and the price bid.

## Key takeaways

- Follow the RFP's structure and make evaluators' work easy.
- Lead with a strong executive summary and clear diagrams.
- Check consistency between every section and the price bid.
""",
        """
The bill of materials (BOM) turns the design into an orderable list. Errors in the BOM are expensive: a missing licence or cable can delay a project and wipe out the margin. Assumptions and exclusions protect both the customer and us by making the scope clear.

## Building an accurate BOM

- List every item: hardware, software licences, subscriptions, accessories, cables, rack kits, power cords and services.
- Use the correct part numbers from the OEM or distributor price list, and check that they are current (not end of sale).
- Check quantities against the design, such as one power cord per power supply.
- Include support and warranty, with the right duration and service level.
- Ask the OEM or distributor to validate complex configurations.

## Writing assumptions and exclusions

- **Assumptions** describe what we believe to be true, for example: "The customer will provide rack space, power and cooling" or "Existing cabling is Cat 6 and in working condition".
- **Exclusions** state what is not included, for example: "Civil and electrical work", or "Migration of data older than five years".
- **Customer responsibilities** list what the customer must provide, such as access, approvals and staff time.

Write them clearly, early in the commercial section, not in small print. Unclear scope is the most common source of disputes after the order.

## Key terms

- **End of sale (EoS):** the date after which an OEM no longer sells a product.
- **Configuration validation:** OEM or distributor checking that a complex configuration is complete and supported.
- **Scope creep:** unplanned additions to the work after the order.

## Real-world example

A proposal for 20 servers misses the rail kits and the second power supply for each server. The customer refuses to pay extra, saying the solution should have been complete. The company absorbs the cost, losing much of the margin. After this, the team adds a BOM checklist and asks the distributor to validate every server configuration before quoting.

## Common mistakes

- Forgetting accessories, licences or support.
- Quoting products that are about to reach end of sale.
- Leaving assumptions unwritten or hidden.

## Key takeaways

- Every item in the design must appear in the BOM with a current part number.
- Validate complex configurations with the OEM or distributor.
- Write assumptions, exclusions and customer responsibilities clearly.
""",
        """
Templates help teams produce consistent, high-quality proposals quickly. This lesson explains what proposal templates usually contain and how to use them. Your administrator will add 3C's own templates and where to find them.

> **[PLACEHOLDER]** Company proposal templates: the location of the latest proposal, compliance matrix, BOM and covering-letter templates, the brand guidelines and the review and approval steps before submission. The LMS administrator adds these details.

## What proposal templates usually include

- **Cover page and covering letter** in company branding.
- **Standard sections:** company profile, certifications, quality and security policies, support model.
- **Compliance matrix template** with columns for requirement, response, deviation and reference.
- **BOM template** with columns for part number, description, quantity and notes.
- **Standard terms:** warranty, payment, delivery and validity wording approved by finance and legal.

## Using templates well

- Always start from the latest version in the shared library, not an old copy on your laptop.
- Replace every placeholder and sample text; search for words like "XXX" or "Customer Name" before submitting.
- Keep standard legal and commercial wording unchanged unless approved.
- Follow the review process: technical review, commercial review and final approval.

## Key terms

- **Template:** a pre-formatted document with standard content and placeholders.
- **Version control:** keeping track of the latest approved version of a document.
- **Bid review:** an internal check of a proposal before submission.

## Real-world example

A team submits a proposal in which the covering letter is addressed to a different customer, copied from an old file. The evaluator notices, and the company loses credibility. The company then makes it mandatory to use the latest template from the shared library and to run a search for old customer names during the final review.

## Common mistakes

- Using an outdated template with old certifications or addresses.
- Leaving sample text or another customer's name in the document.
- Changing legal wording without approval.

## Key takeaways

- Use the latest approved templates from the shared library.
- Replace every placeholder and check for leftover text.
- Follow the internal review and approval steps before submission.
""",
    ],
    "questions": [
        q("SINGLE", "What is a compliance matrix?", ["A list of our past customers", "A requirement-by-requirement table of our response", "A price comparison", "A project timeline"], ["A requirement-by-requirement table of our response"],
          explanation="Evaluators use the compliance matrix to score each requirement quickly."),
        q("SINGLE", "An RFP specification seems to favour one manufacturer. What should you do?", ["Ignore it", "Raise a pre-bid query asking to accept equivalent specifications", "Quote that manufacturer only", "Withdraw immediately"], ["Raise a pre-bid query asking to accept equivalent specifications"],
          explanation="Pre-bid queries are the formal way to ask the buyer to clarify or change the specification."),
        q("TRUE_FALSE", "The executive summary may be the only part some senior evaluators read.", TF, ["True"],
          explanation="That is why it must explain the need, the solution and our strengths in one or two pages."),
        q("MULTIPLE", "Which items are commonly missed in a BOM?", ["Rail kits", "Power cords", "Software licences", "The customer's company name"], ["Rail kits", "Power cords", "Software licences"],
          explanation="Accessories, licences and support are the most common omissions."),
        q("SINGLE", "'The customer will provide rack space, power and cooling' is an example of:", ["An exclusion", "An assumption or customer responsibility", "A deviation", "An SLA"], ["An assumption or customer responsibility"],
          explanation="It states what we expect the customer to provide."),
        q("TRUE_FALSE", "It is acceptable to quote a product that has reached end of sale if it is cheaper.", TF, ["False"],
          explanation="End-of-sale products may not be orderable or supportable; always check part numbers are current."),
        q("FILL_BLANK", "An official change to an RFP issued by the buyer is called a ______.", ["corrigendum", "Corrigendum", "addendum", "Addendum"],
          explanation="Buyers issue a corrigendum or addendum to change dates, specifications or terms."),
    ],
    "sources": [("Central Public Procurement Portal (CPPP): tender documents and corrigenda", "https://eprocure.gov.in/"), MS_LEARN, AWS_SKILL_BUILDER],
}

COURSES["Presales Advanced: Demos, POCs and Solution Design"] = {
    "lessons": [
        """
A demonstration shows the customer how our solution solves their problem. A good demo is not a tour of every feature; it is a short, focused story built around the customer's own situation. Planning makes the difference between a demo that wins and one that confuses.

## Planning a demo

1. **Know the audience:** who will attend, what they care about, and what they already know.
2. **Agree the objectives:** what the customer wants to see and what decision the demo supports.
3. **Build a storyline:** start with the customer's problem, show how the solution solves it, and end with the result.
4. **Prepare the environment:** test the setup, the data and the network the day before and again an hour before.
5. **Plan for failure:** have screenshots or a recorded video ready in case of a technical problem.

## Delivering the demo

- Start by confirming the agenda and what the customer hopes to see.
- Show the most important outcome early; attention drops over time.
- Use the customer's terms, data and examples where possible.
- Pause to check understanding and invite questions.
- Finish with a summary and an agreed next step.

## Key terms

- **Demo script:** the planned sequence of what will be shown and said.
- **Storyline:** the problem-to-solution narrative behind the demo.
- **Demo environment:** the systems and data used for the demonstration.

## Real-world example

A logistics company wants to see a network monitoring tool. Instead of opening every menu, Kavya builds the demo around a scenario: a branch link fails at 9 a.m. She shows the alert arriving, the dashboard pinpointing the failed link, and the automatic ticket created for the service provider. The operations head immediately sees how outages would be found faster. The demo takes 20 minutes and leads to a POC.

## Common mistakes

- Showing every feature instead of the ones that matter.
- Not testing the environment, leading to a failed demo.
- Running past the agreed time.

## Key takeaways

- Build the demo around the customer's problem and audience.
- Test everything and have a backup plan.
- Keep it short, focused and end with a next step.
""",
        """
A proof of concept (POC) tests the solution in the customer's environment before they buy. POCs reduce the customer's risk, but they cost time and money for both sides. A POC without clear success criteria can drag on for months and end without a decision.

## Scoping a POC

- **Objective:** what question the POC will answer, such as "Can the backup software restore a 2 TB database within four hours?"
- **Scope:** which systems, users and features are included, and what is excluded.
- **Duration:** a fixed period, commonly two to six weeks.
- **Resources:** equipment, licences, engineers and customer staff time.
- **Responsibilities:** what we do, what the customer does and what the OEM provides.

## Success criteria

Success criteria are measurable tests agreed in writing before the POC starts. Good criteria are specific and testable:

- "Restore of a 2 TB database completes within four hours."
- "Wi-Fi signal of at least -67 dBm in all classrooms."
- "Alert reaches the operations team within two minutes of a link failure."

Agree in advance that if the criteria are met, the customer will move to the next step, such as a commercial discussion.

## Key terms

- **Success criteria:** measurable conditions that show the POC passed.
- **Pilot:** a small, real deployment used in production, often after a POC.
- **Exit plan:** how equipment is returned or the POC converted to an order.

## Real-world example

A manufacturing company asks for a POC of endpoint security. The presales team agrees three success criteria with the CISO: install on 100 endpoints within a week, detect a set of test attacks safely simulated by the OEM, and use less than 5% CPU on average. The results are presented in a short report. Because the criteria were agreed in advance, the customer signs an order two weeks later.

## Common mistakes

- Starting a POC without written success criteria.
- Letting the scope grow during the POC.
- Not agreeing what happens after a successful POC.

## Key takeaways

- Scope the POC tightly with an objective, duration and responsibilities.
- Agree measurable success criteria in writing before starting.
- Agree the next step that follows a successful POC.
""",
        """
Most real solutions combine products from several manufacturers, for example servers from one OEM, storage from another, a hypervisor from a third and a backup tool from a fourth. As a system integrator, our value lies in making these pieces work together reliably and in supporting the whole solution.

## Principles of multi-vendor design

- **Check compatibility:** use the manufacturers' compatibility and interoperability guides, such as hardware compatibility lists for hypervisors.
- **Use open standards:** standards such as Ethernet, SIP, SNMP and SAML make products from different vendors work together.
- **Design for supportability:** know who supports each part and how problems will be escalated across vendors.
- **Avoid single points of failure:** where availability matters, plan redundancy across components.
- **Document the design:** diagrams, IP plans, configurations and version numbers.

## Managing risk

- Prefer validated designs published by OEMs where possible.
- Test unusual combinations in a lab or POC before proposing them.
- Align support contracts so that every component has cover for the same period.
- Confirm firmware and software versions that are supported together.

## Key terms

- **Interoperability:** the ability of products from different vendors to work together.
- **Hardware compatibility list (HCL):** a vendor's list of tested and supported hardware.
- **Validated design:** a reference architecture tested and published by an OEM.
- **Single point of failure:** a component whose failure stops the whole service.

## Real-world example

A customer wants a virtualised server environment using existing storage from one vendor and new servers from another. Before quoting, presales checks the hypervisor's compatibility list and finds that the existing storage firmware is not supported with the latest hypervisor version. The design includes a firmware upgrade service for the storage. The project runs smoothly, while a competitor's design would have failed at installation.

## Common mistakes

- Assuming products will work together without checking compatibility lists.
- Leaving gaps in support between vendors.
- Not documenting versions and configurations.

## Key takeaways

- Check compatibility lists and use open standards and validated designs.
- Plan support and escalation across all vendors.
- Document the design so that it can be built and supported.
""",
        """
The final presentation of a solution often decides the deal. It brings together the customer's needs, the design, the plan, the price and our credibility. A strong presentation is short, clear and focused on the customer's outcomes.

## Structure of a solution presentation

1. **Their situation:** restate the business problem and goals in their words.
2. **Our solution:** the design in one clear diagram, explained simply.
3. **How it meets the requirements:** link each major requirement to part of the solution.
4. **Implementation and support:** the plan, timeline, team and support model.
5. **Why us:** relevant experience, references and certifications.
6. **Investment and value:** the cost, the benefits and, where useful, the return on investment.
7. **Next steps:** what we propose happens next.

## Presenting with confidence

- Rehearse with your sales colleague and agree who presents which section.
- Know your numbers and the assumptions behind them.
- Answer questions honestly; if you do not know, say so and commit to a follow-up.
- Use few words on slides; talk to the audience, not to the screen.

## Handling tough questions

- Listen to the full question before answering.
- Repeat or rephrase it to confirm understanding.
- Give a short, direct answer, then offer detail if needed.
- Never criticise a competitor; focus on our strengths.

## Key terms

- **Return on investment (ROI):** the benefit gained relative to the cost.
- **Architecture diagram:** a simple picture of how the solution's parts connect.
- **Reference:** a customer who can confirm our experience.

## Real-world example

At a final presentation for a hospital network upgrade, the panel asks why the solution costs more than another bid. Instead of attacking the competitor, Sameer explains that the design includes redundant core switches so that the operating theatres stay connected if one switch fails. He links this to the hospital's requirement for 99.9% availability. The panel accepts the reasoning and scores the solution highest on technical merit.

## Common mistakes

- Overloading slides with text and part numbers.
- Not rehearsing, leading to confusion between presenters.
- Guessing answers instead of admitting uncertainty.

## Key takeaways

- Structure the presentation around the customer's problem and outcomes.
- Rehearse, know your numbers and agree roles.
- Answer honestly and stay positive about competitors.
""",
    ],
    "questions": [
        q("SINGLE", "What should a demo be built around?", ["Every feature of the product", "The customer's problem and a storyline", "The OEM's marketing video", "The price list"], ["The customer's problem and a storyline"],
          explanation="A focused story around the customer's problem is more convincing than a feature tour."),
        q("SINGLE", "Which is a good POC success criterion?", ["The customer likes the product", "Restore of a 2 TB database completes within four hours", "The POC goes well", "The software is modern"], ["Restore of a 2 TB database completes within four hours"],
          explanation="Success criteria must be specific and measurable."),
        q("TRUE_FALSE", "POC success criteria should be agreed in writing before the POC starts.", TF, ["True"],
          explanation="Agreeing in advance prevents disputes about whether the POC passed."),
        q("SINGLE", "What is a hardware compatibility list (HCL)?", ["A price list", "A vendor's list of tested and supported hardware", "A list of competitors", "An asset register"], ["A vendor's list of tested and supported hardware"],
          explanation="Checking the HCL avoids unsupported combinations."),
        q("MULTIPLE", "Which practices reduce risk in a multi-vendor design?", ["Using OEM validated designs", "Aligning support contracts", "Testing unusual combinations first", "Assuming everything works together"], ["Using OEM validated designs", "Aligning support contracts", "Testing unusual combinations first"],
          explanation="Validated designs, aligned support and testing all reduce integration risk."),
        q("TRUE_FALSE", "If a panel asks a question you cannot answer, it is best to guess confidently.", TF, ["False"],
          explanation="Say you will confirm and follow up. Wrong answers damage credibility."),
        q("SHORT_ANSWER", "In two or three sentences, explain why a POC needs a fixed duration and a defined scope.",
          explanation="A fixed duration and scope control cost, keep the POC focused on the agreed question, and lead to a clear decision instead of an endless trial."),
    ],
    "sources": [MS_LEARN, AWS_SKILL_BUILDER, CISCO_NETACAD],
}
