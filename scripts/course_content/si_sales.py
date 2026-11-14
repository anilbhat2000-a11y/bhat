"""System Integration Sales: the SI business model, customer discovery, solution-based selling."""
from . import q, TF, TRAILHEAD, MS_LEARN, AWS_SKILL_BUILDER

COURSES = {}

ITIL = ("PeopleCert: ITIL 4 service management framework and certification", "https://www.peoplecert.org/")
NASSCOM = ("nasscom: Indian technology industry body and research", "https://nasscom.in/")

COURSES["SI Sales Basic: The System Integration Business Model"] = {
    "lessons": [
        """
A system integrator (SI) brings together products from many manufacturers, adds its own design, installation and support skills, and delivers a working solution. The customer is not buying boxes; it is buying an outcome, such as a secure network for 50 branches, a video-conferencing setup that works first time, or a data centre that stays up.

## How an SI earns money

- **Product resale:** margin on hardware and software bought from OEMs through distributors. Margins are often thin because customers can compare prices easily.
- **Professional services:** design, installation, configuration, migration and training. Margins are higher, but depend on skilled engineers and good project control.
- **Support and annual maintenance contracts (AMC):** fixing problems and maintaining equipment for a yearly fee. This is recurring revenue.
- **Managed services:** running part of the customer's IT, such as network monitoring or end-user support, for a monthly fee under service levels.

## Why the mix matters

A business built only on product resale is easy to undercut on price and has unpredictable revenue. Services and support raise margins, create recurring income and build long relationships that lead to future projects. Good SI salespeople look for ways to add services to every product deal.

## Key terms

- **System integrator (SI):** a company that combines products and services into a working solution.
- **AMC:** annual maintenance contract.
- **Recurring revenue:** income that repeats, such as monthly managed service fees.
- **Attach rate:** the share of product deals that include services or support.

## Real-world example

Two SIs sell the same firewall to a hospital at similar prices. The first only supplies the box. The second includes configuration to best practice, staff training and a three-year support contract with monthly health checks. A year later, the hospital needs a network upgrade; it calls the second SI, which already knows its environment and has earned its trust.

## Common mistakes

- Selling only products and competing on price alone.
- Treating services as a free add-on instead of pricing them properly.
- Forgetting support renewals, which are the easiest revenue to keep.

## Key takeaways

- An SI sells outcomes by combining products with its own skills.
- Revenue comes from products, services, support and managed services.
- Services and support improve margins and relationships.
""",
        """
Every IT solution goes through a lifecycle, from the first idea to replacement years later. An SI can add value at every stage. Knowing where a customer is in the lifecycle tells you what conversation to have.

## The solution lifecycle

1. **Assess and plan:** understand the current environment and business goals; identify gaps and risks.
2. **Design:** create the architecture, bill of materials and implementation plan.
3. **Build:** supply, install, configure, test and migrate.
4. **Operate:** support, monitor and maintain the solution day to day.
5. **Optimise:** improve performance, security and cost based on what is learned in operation.
6. **Refresh:** replace the solution at end of life, which starts the cycle again.

## Using the lifecycle in sales

- **Track install dates and end-of-support dates** for each customer's equipment. OEMs announce end-of-sale and end-of-support dates; once support ends, the customer gets no security fixes.
- **Start refresh conversations early,** typically 12 to 18 months before end of support, so that budgets can be planned.
- **Use the operate stage** to understand the customer's pain points and spot new needs.

## Key terms

- **End of sale (EoS):** the date after which a product can no longer be bought.
- **End of support (EoSL or LDoS):** the date after which the OEM no longer provides support or security fixes.
- **Refresh:** replacing ageing equipment with current technology.
- **Installed base:** equipment a customer already owns.

## Real-world example

A sales manager reviews an installed-base report and sees that a manufacturer's switches at a large school group reach end of support in 15 months. She meets the IT head, explains the security risk of unsupported switches, and offers a network assessment. The assessment leads to a phased refresh plan that the school group includes in its next annual budget. A competitor who arrives six months later finds the decision already made.

## Common mistakes

- Waiting for the customer to ask about a refresh.
- Not keeping records of what each customer has and when it was installed.
- Ignoring the operate stage, where trust and insight are built.

## Key takeaways

- The lifecycle runs from assess and design through build, operate, optimise and refresh.
- Track install and end-of-support dates to time conversations.
- Each stage is an opportunity to add value and revenue.
""",
        """
Services turn a product sale into a solution and set an SI apart from a box seller. They reduce the customer's risk and build the SI's long-term relationship with the customer.

## Services an SI typically offers

- **Site survey and design:** checking space, power, cabling and requirements before ordering.
- **Installation and configuration:** to manufacturer best practice, with documentation.
- **Migration:** moving data, users and services from old systems with minimal disruption.
- **Testing and acceptance:** proving that the solution meets the agreed requirements.
- **Training and hand-over:** making sure the customer's team can operate the solution.
- **Support and AMC:** fixing faults and keeping equipment healthy, with defined response times.
- **Managed services:** ongoing operation and monitoring under service levels.

## Selling services well

- Explain the risk each service removes: downtime, failed migrations, security gaps or unhappy users.
- Define scope, deliverables and assumptions clearly in a statement of work.
- Price services based on effort and skills, not as a percentage thrown in for free.
- Include services in the first proposal, not as an afterthought.

## Key terms

- **Statement of work (SOW):** a document describing the services, deliverables, timeline and responsibilities.
- **Service level agreement (SLA):** measurable commitments, such as response and resolution times.
- **Response time:** how quickly support starts working on a problem.
- **Resolution time:** how quickly the problem is fixed.

## Real-world example

A customer buys servers and virtualisation software and plans to install them itself. Halfway through, its team struggles with the storage configuration and the project is delayed by two months. For its next site, the customer asks the SI for a fixed-price installation and migration service with a clear SOW. The project finishes in three weeks, and the customer signs a support contract.

## Common mistakes

- Giving services away free to win the product deal.
- Vague scope, leading to disputes about what was included.
- Promising support levels the delivery team cannot meet.

## Key takeaways

- Services reduce customer risk and differentiate the SI.
- Define scope in a statement of work and price services properly.
- Promise only service levels the delivery team can deliver.
""",
        """
Each SI focuses on certain practice areas: groups of solutions where it has skills, OEM partnerships and references. Knowing the company's practice areas helps you spot opportunities and bring in the right specialists. Your administrator will add 3C's practice areas below.

> **[PLACEHOLDER]** Company practice areas: the solution areas 3C offers, the OEM partners and certifications for each, the practice heads and reference customers. The LMS administrator adds these details.

## Typical SI practice areas

- **Networking:** LAN, Wi-Fi, WAN, SD-WAN and structured cabling.
- **Data centre:** servers, storage, virtualisation, backup and disaster recovery.
- **Security:** firewalls, endpoint protection, identity and security operations.
- **Collaboration and audio-visual:** video conferencing, meeting rooms and displays.
- **Power and infrastructure:** UPS, batteries, precision cooling and racks.
- **Cloud:** migration, hybrid cloud and managed cloud services.
- **End-user computing and print:** laptops, desktops, printers and managed print.
- **HPC and AI:** high-performance and GPU computing.

## Cross-selling across practices

Customers rarely need only one thing. A customer refreshing its servers may also need backup, a UPS upgrade and network changes. A good SI salesperson understands every practice well enough to spot needs and introduce the right specialist.

## Key terms

- **Practice area:** a group of related solutions with dedicated skills and partners.
- **Practice head:** the leader responsible for a practice's skills and offerings.
- **Cross-selling:** selling additional solutions from other practices to an existing customer.

## Real-world example

During a video-conferencing project, a salesperson notices that the customer's meeting rooms frequently lose network connectivity. She brings in the networking practice, which finds ageing access switches and poor Wi-Fi coverage. The customer approves a network upgrade that makes the video rooms reliable. The relationship grows from one practice to two.

## Common mistakes

- Knowing only one practice area and missing other needs.
- Promising capabilities the company does not have.
- Not involving practice specialists early enough.

## Key takeaways

- Learn the company's practice areas, partners and references.
- Look for needs across practices in every account.
- Bring in practice specialists early.
""",
    ],
    "questions": [
        q("MULTIPLE", "Which are revenue streams for a system integrator?", ["Product resale", "Professional services", "Support and AMC", "Managed services"], ["Product resale", "Professional services", "Support and AMC", "Managed services"],
          explanation="An SI earns from all four; services and support bring higher margins and recurring revenue."),
        q("SINGLE", "When should a refresh conversation usually start?", ["After support has ended", "12 to 18 months before end of support", "Only when the customer asks", "On the day of failure"], ["12 to 18 months before end of support"],
          explanation="Starting early lets the customer plan budget and avoids running unsupported equipment."),
        q("TRUE_FALSE", "After an OEM's end-of-support date, the product no longer receives security fixes.", TF, ["True"],
          explanation="Unsupported equipment is a security and reliability risk."),
        q("SINGLE", "What document describes services, deliverables and responsibilities?", ["Purchase order", "Statement of work", "Delivery challan", "Packing list"], ["Statement of work"],
          explanation="A statement of work (SOW) defines the scope of services."),
        q("SINGLE", "Why do services matter to an SI?", ["They are always free", "They raise margins and build long-term relationships", "They replace the need for products", "They avoid GST"], ["They raise margins and build long-term relationships"],
          explanation="Services differentiate the SI and generate repeat business."),
        q("TRUE_FALSE", "Giving installation free to win a product deal is good practice because services are not valuable.", TF, ["False"],
          explanation="Services carry cost and value; price them properly with a clear scope."),
        q("MATCHING", "Match each lifecycle stage to its activity.", ["Design=Architecture and bill of materials", "Build=Install, configure and migrate", "Operate=Support and monitoring", "Refresh=Replace at end of life"],
          explanation="Knowing the stage tells you what conversation to have."),
    ],
    "sources": [ITIL, NASSCOM, MS_LEARN],
}

COURSES["SI Sales Intermediate: Customer Discovery"] = {
    "lessons": [
        """
In system-integration deals, many people influence the decision. The IT team cares about technology and support, finance about cost and cash flow, business heads about outcomes, users about ease of use, and procurement about process and price. Discovery must cover all of them.

## Who to talk to

- **Economic buyer:** the person who controls the budget and gives final approval, often the CFO, CEO or a business head.
- **Technical evaluators:** IT heads, architects and engineers who judge whether the solution works.
- **Users:** the people who will use the solution every day.
- **Procurement:** the team that manages vendor selection, negotiation and contracts.
- **Champion:** someone inside who wants the project to succeed and helps you understand the organisation.

## Running multi-stakeholder discovery

1. Map the stakeholders and their roles early.
2. Prepare different questions for each group, focusing on what they care about.
3. Meet groups separately when possible; people speak more openly.
4. Look for conflicting priorities, such as IT wanting the best technology and finance wanting the lowest cost.
5. Summarise what you learned and confirm it with your champion.

## Key terms

- **Stakeholder:** anyone who affects or is affected by the decision.
- **Economic buyer:** the person with final budget authority.
- **Buying committee:** the group of people involved in a purchase decision.

## Real-world example

A salesperson meets only the IT manager of a manufacturing company and designs a high-end Wi-Fi solution for the plant. The proposal is rejected by the plant head, who wanted rugged handheld scanners to work on the shop floor, and by finance, whose budget was half the quoted amount. In the next attempt, the salesperson meets all three groups and proposes a design focused on the shop-floor scanners, phased to fit the budget. It is approved.

## Common mistakes

- Relying on a single contact.
- Asking everyone the same questions.
- Ignoring procurement until the end.

## Key takeaways

- Identify the economic buyer, evaluators, users, procurement and a champion.
- Tailor questions to each group and meet them separately where possible.
- Uncover and reconcile conflicting priorities.
""",
        """
Customers usually describe symptoms, not root causes. "The network is slow" might be caused by an overloaded internet link, poor Wi-Fi, an old server or a misconfigured application. Problem-to-solution mapping makes sure we solve the real problem.

## A step-by-step approach

1. **Capture the symptom** in the customer's words.
2. **Ask for evidence:** when does it happen, where, for whom and how often?
3. **Find the business impact:** lost time, lost sales, compliance risk or unhappy customers.
4. **Investigate causes** with presales, using monitoring data, site visits and tests.
5. **Map each cause to a solution option,** with cost and benefit.
6. **Prioritise** with the customer: quick wins first, larger changes planned.

## Building a problem map

A simple table helps: one column for each problem, its impact, the likely cause, the proposed solution and the expected result. It keeps everyone focused on outcomes and makes the proposal easy to understand.

## Key terms

- **Symptom:** what the user notices.
- **Root cause:** the underlying reason for the problem.
- **Quick win:** a low-cost change that delivers visible improvement quickly.
- **Problem map:** a table linking problems to impact, cause and solution.

## Real-world example

A retail chain complains that billing counters freeze at peak hours. The customer asks for new billing PCs. Discovery and a short monitoring exercise show that the PCs are fine; the store internet link is saturated by video streaming on the guest Wi-Fi. The SI proposes separating guest traffic and adding bandwidth limits. The fix costs a fraction of new PCs and solves the problem. The customer's trust leads to a larger store-network project later.

## Common mistakes

- Quoting exactly what the customer asked for without checking the cause.
- Proposing large projects when a quick win would solve the immediate pain.
- Not measuring the problem before and after.

## Key takeaways

- Separate symptoms from root causes.
- Map each problem to impact, cause, solution and expected result.
- Prioritise quick wins and plan larger changes.
""",
        """
Cross-selling means offering additional solutions to an existing customer. Done well, it solves more of the customer's problems and grows the account. Done badly, it feels like pushing products.

## Natural cross-sell paths in IT

- **Servers → backup, storage and UPS:** new servers need protection and power.
- **Network → security and Wi-Fi:** new switches and links need firewalls and secure wireless.
- **Laptops → endpoint security, device management and print:** every device needs protection and management.
- **Video conferencing → network upgrades and room audio:** good meetings need reliable networks and acoustics.
- **Any project → support and managed services:** every solution needs looking after.

## How to cross-sell well

- Start from the customer's goals and problems, not your target.
- Use the installed base: what they have tells you what they will need.
- Introduce practice specialists so that the customer gets expert advice.
- Time it well: raise the topic when it is relevant, such as during a refresh or after an incident.
- Show the benefit of one integrated solution and one point of accountability.

## Key terms

- **Cross-sell:** selling a different, related solution to an existing customer.
- **Upsell:** selling a higher-value version of the same solution.
- **Account penetration:** how much of the customer's IT spending we capture.

## Real-world example

After delivering 300 laptops to a consulting firm, the account manager asks how the firm handles lost devices and software updates. The IT head admits that updates are done manually and two lost laptops last year had no encryption. The account manager introduces the security practice, which proposes endpoint protection, disk encryption and device management. The firm signs a three-year subscription.

## Common mistakes

- Pitching unrelated products that do not match any need.
- Cross-selling before the first project is delivered well.
- Not involving the right specialists.

## Key takeaways

- Cross-sell from customer needs and the installed base.
- Deliver the first project well before offering more.
- Involve specialists and show the value of one integrated partner.
""",
        """
When discovery is complete, sales hands the opportunity to presales for solution design. A good hand-over saves time, avoids repeated questions to the customer and leads to a better solution.

## What to include in the hand-over

- **Customer background:** business, size, locations and strategy.
- **Stakeholders:** names, roles, priorities and our relationship with each.
- **Business problem and impact:** in the customer's words, with numbers where possible.
- **Requirements:** functional and non-functional, as far as known.
- **Current environment:** existing equipment, vendors and contracts.
- **Constraints:** budget range, timeline, policies and preferred brands.
- **Competition:** who else is involved, if known.
- **Next steps:** what the customer expects and by when.

## Making the hand-over work

- Use a standard hand-over template so nothing is missed.
- Hold a short call to walk through it and answer questions.
- Agree who will contact the customer for further technical discovery.
- Keep the CRM opportunity updated with the same information.

## Key terms

- **Hand-over:** passing an opportunity's information from one team to another.
- **Discovery notes:** the record of what was learned from the customer.
- **Technical discovery:** detailed questions about the environment, led by presales.

## Real-world example

A salesperson passes an opportunity to presales with a one-line email: "Customer needs a firewall, please quote." Presales calls the customer and asks questions the customer has already answered twice. The customer is annoyed. Next time, the salesperson uses the hand-over template, including the number of sites, internet links, users and the security incident that triggered the request. Presales designs a solution in two days without repeating questions.

## Common mistakes

- Handing over with too little information.
- Presales and sales both contacting the customer with the same questions.
- Not recording the hand-over in the CRM.

## Key takeaways

- Use a standard hand-over template covering business, stakeholders, problem, requirements and constraints.
- Walk through it together and agree who contacts the customer.
- Keep the CRM updated.
""",
    ],
    "questions": [
        q("SINGLE", "Who is the economic buyer in a deal?", ["The person who will use the solution", "The person with final budget authority", "The procurement clerk", "Our presales engineer"], ["The person with final budget authority"],
          explanation="The economic buyer controls the budget and gives final approval."),
        q("SINGLE", "A customer says 'the network is slow'. What is this?", ["A root cause", "A symptom", "A solution", "A requirement"], ["A symptom"],
          explanation="Discovery must find the root cause behind the symptom."),
        q("TRUE_FALSE", "It is better to meet stakeholder groups separately where possible, because people speak more openly.", TF, ["True"],
          explanation="Separate meetings often reveal different priorities and concerns."),
        q("SINGLE", "Which is the best example of cross-selling?", ["Selling the same laptop at a higher price", "Offering endpoint security and device management to a customer who bought laptops", "Selling a customer's old servers", "Reducing price to win a deal"], ["Offering endpoint security and device management to a customer who bought laptops"],
          explanation="Cross-selling offers related solutions that meet real needs."),
        q("MULTIPLE", "What should a sales-to-presales hand-over include?", ["Stakeholders and their priorities", "The business problem and impact", "Constraints such as budget and timeline", "Only the customer's name"], ["Stakeholders and their priorities", "The business problem and impact", "Constraints such as budget and timeline"],
          explanation="A complete hand-over avoids repeated questions and leads to a better design."),
        q("TRUE_FALSE", "Quoting exactly what the customer asked for is always the best approach.", TF, ["False"],
          explanation="The request may address a symptom. Check the root cause first."),
        q("MATCHING", "Match each term to its meaning.", ["Upsell=Higher-value version of the same solution", "Cross-sell=Related solution from another area", "Quick win=Low-cost change with fast visible benefit", "Champion=Insider who supports our solution"],
          explanation="These terms describe common account growth tactics."),
    ],
    "sources": [TRAILHEAD, NASSCOM, MS_LEARN],
}

COURSES["SI Sales Advanced: Solution-based Selling"] = {
    "lessons": [
        """
Senior decision makers approve investments, not purchases. A business case explains why an investment is worth making, using numbers the customer trusts. Return on investment (ROI) and total cost of ownership (TCO) are the two most common tools.

## Total cost of ownership

TCO is the full cost of a solution over its life, not just the purchase price. It usually includes:

- Hardware, software and licences.
- Installation, migration and training.
- Support, maintenance and subscriptions.
- Power, cooling and space.
- Staff time to operate it.
- Downtime and risk costs.
- Disposal or refresh at end of life.

Comparing TCO over three to five years often shows that a cheaper purchase price leads to a higher overall cost.

## Return on investment

ROI compares the benefit of an investment with its cost:

ROI % = (total benefit − total cost) ÷ total cost × 100.

The **payback period** is the time it takes for benefits to repay the investment.

## Building a credible business case

- Use the customer's own numbers wherever possible, such as downtime hours, staff costs and revenue per hour.
- State assumptions clearly and keep them conservative.
- Show a range: expected, best and worst case.
- Include non-financial benefits, such as compliance and customer experience.

## Key terms

- **TCO:** total cost of ownership over the life of a solution.
- **ROI:** return on investment.
- **Payback period:** time to recover the investment from benefits.
- **Opex / capex:** operating expenditure versus capital expenditure.

## Real-world example

A logistics company's billing stops for about four hours a month because of branch link failures. With 120 branches and an agreed estimate of lost collections and staff time, the downtime costs the customer around ₹30 lakh a year. An SD-WAN solution with dual links costs ₹45 lakh over three years, including support. The business case shows a payback of about 18 months, using the customer's own figures. The CFO approves.

## Common mistakes

- Using inflated benefits the customer does not believe.
- Comparing purchase prices instead of TCO.
- Hiding assumptions.

## Key takeaways

- TCO includes every cost over the solution's life.
- ROI and payback show whether the investment is worth it.
- Use the customer's numbers, conservative assumptions and clear ranges.
""",
        """
Managed services mean the SI takes responsibility for running part of the customer's IT, under agreed service levels, for a regular fee. They create recurring revenue for the SI and predictable outcomes for the customer.

## Common managed services

- **Network operations:** 24x7 monitoring of links, switches, firewalls and Wi-Fi.
- **Security operations:** monitoring alerts, managing firewalls and responding to incidents.
- **Infrastructure management:** servers, storage, backup and patching.
- **End-user support:** service desk and desktop support.
- **Managed print and AV:** devices monitored, supplied and maintained.

## Why customers buy managed services

- Lack of skilled staff or the need for 24x7 coverage.
- Predictable monthly costs instead of large upfront spending.
- Clear service levels and accountability.
- Access to tools and expertise they could not afford alone.

## Designing a managed service offer

- Define scope precisely: which devices, sites and tasks are included.
- Set measurable SLAs, such as availability, response and resolution times.
- Agree reporting and review meetings.
- Price based on the number of devices or users, the service hours and the SLA level.
- Plan the transition from the current way of working, including knowledge transfer.

Many SIs follow service management practices such as ITIL 4 for incident, problem, change and service-level management.

## Key terms

- **Managed service provider (MSP):** a company that runs IT services for customers under contract.
- **NOC / SOC:** network operations centre / security operations centre.
- **Service credit:** a fee reduction when SLAs are missed.
- **Transition:** moving the service from the customer or previous provider to the MSP.

## Real-world example

A chain of 40 clinics has one IT person and frequent network problems in the evenings and on weekends. The SI proposes 24x7 network monitoring and management for a fixed monthly fee per site, with a four-hour response SLA. Problems are now detected and fixed before clinics open, and the IT person focuses on clinical systems.

## Common mistakes

- Vague scope, leading to disputes.
- SLAs that the delivery team cannot meet.
- No transition plan or knowledge transfer.

## Key takeaways

- Managed services provide recurring revenue and predictable outcomes.
- Define scope, SLAs, reporting and pricing precisely.
- Plan the transition carefully.
""",
        """
No SI does everything alone. OEMs, distributors and specialist partners all contribute to a solution. Managing these partners well gives better pricing, stronger technical support and access to opportunities.

## Types of partners

- **OEMs:** provide products, technical support, special pricing and sometimes leads.
- **Distributors:** provide stock, credit, logistics and configuration support.
- **Specialist partners:** firms with niche skills, such as acoustic design or specialised cabling.
- **Subcontractors:** extra field engineers or installers for large rollouts.

## Working with OEMs in deals

- Register deals early to get protection and special pricing.
- Involve OEM account managers and presales in strategic opportunities.
- Use OEM references and validated designs to support proposals.
- Keep OEMs informed of progress; they can help with executive access.

## Managing subcontractors

- Choose qualified partners and check their past work.
- Agree scope, quality standards, timelines and payment in a written contract.
- Align their obligations back-to-back with our customer commitments, including SLAs and penalties.
- Supervise quality and safety at customer sites; the customer holds us responsible.

## Key terms

- **Deal registration:** formal notice of an opportunity to an OEM.
- **Back-to-back contract:** a subcontract that mirrors our obligations to the customer.
- **Partner ecosystem:** the network of OEMs, distributors and specialists we work with.

## Real-world example

An SI wins a project to install video conferencing in 60 rooms across five cities within eight weeks. It does not have enough installers in two cities, so it engages local subcontractors under a back-to-back contract with the same quality checklist and timeline. The SI's project manager reviews photos and test reports from every room. The project finishes on time with consistent quality.

## Common mistakes

- Registering deals late or not at all.
- Using subcontractors without written contracts.
- Not supervising partner work at customer sites.

## Key takeaways

- OEMs, distributors and specialists strengthen our solutions.
- Register deals and involve OEMs in strategic opportunities.
- Use back-to-back contracts and supervise subcontractor quality.
""",
        """
Executive presentations are short, high-stakes meetings where senior leaders decide whether to proceed. They want to understand the business value, the risks and the plan, quickly and clearly.

## What executives want to hear

- **The problem and its cost** to the business.
- **The proposed outcome** and how it supports their strategy.
- **The investment** and the return, with a clear payback.
- **The risks** and how they will be managed.
- **Why us:** relevant experience and references.
- **The decision needed** and the next steps.

## Structuring the presentation

1. Start with a one-slide summary: problem, solution, value and ask.
2. Support it with a few slides of evidence, such as the business case and a simple plan.
3. Keep technical detail in an appendix for follow-up questions.
4. Aim to finish early and leave time for discussion.

## Delivering with impact

- Rehearse with your team and agree who speaks when.
- Use the customer's language and numbers.
- Be honest about risks; executives trust people who acknowledge them.
- End with a clear request, such as approval to proceed with phase one.

## Key terms

- **Executive summary slide:** one slide capturing the whole proposal.
- **The ask:** the specific decision you want from the meeting.
- **Appendix:** supporting detail kept out of the main presentation.

## Real-world example

An SI has 20 minutes with a bank's executive committee to present a branch network modernisation. The team opens with one slide: branch outages cost the bank customer complaints and lost transactions; the proposal reduces outages using dual links and SD-WAN; payback in two years; the ask is approval for a 30-branch pilot. The committee approves the pilot in the meeting. The 40 technical slides stay in the appendix.

## Common mistakes

- Opening with company history or technical detail.
- Running over time.
- Ending without a clear ask.

## Key takeaways

- Executives want the problem, value, risks, plan and decision needed.
- Lead with a one-slide summary; keep detail in the appendix.
- Rehearse, be honest about risks and end with a clear ask.
""",
    ],
    "questions": [
        q("SINGLE", "What does TCO include?", ["Only the purchase price", "All costs over the solution's life", "Only support costs", "Only the first year's costs"], ["All costs over the solution's life"],
          explanation="TCO covers purchase, implementation, operation, support, risk and disposal."),
        q("SINGLE", "A solution costs ₹40 lakh and delivers ₹60 lakh of benefit over its life. What is the ROI?", ["20%", "50%", "150%", "66%"], ["50%"],
          explanation="ROI = (60 − 40) ÷ 40 × 100 = 50%."),
        q("TRUE_FALSE", "A credible business case uses the customer's own numbers and states its assumptions.", TF, ["True"],
          explanation="Customers trust figures they recognise and assumptions they can check."),
        q("MULTIPLE", "Why do customers buy managed services?", ["Lack of skilled staff", "Need for 24x7 coverage", "Predictable monthly costs", "To avoid having any IT"], ["Lack of skilled staff", "Need for 24x7 coverage", "Predictable monthly costs"],
          explanation="Skills, coverage and predictable costs are the main drivers."),
        q("SINGLE", "What is a back-to-back contract?", ["A contract signed twice", "A subcontract that mirrors our obligations to the customer", "A contract with no end date", "A contract only for OEMs"], ["A subcontract that mirrors our obligations to the customer"],
          explanation="It passes matching obligations and standards to the subcontractor."),
        q("SINGLE", "What should end an executive presentation?", ["Company history", "A clear ask, such as approval for a pilot", "A product datasheet", "Nothing"], ["A clear ask, such as approval for a pilot"],
          explanation="Executives need to know the decision you want."),
        q("SHORT_ANSWER", "In two or three sentences, explain why comparing TCO can matter more than comparing purchase price.",
          explanation="A lower purchase price can hide higher support, power, staff, downtime or refresh costs. TCO over three to five years shows the real cost and often favours the better-designed solution."),
    ],
    "sources": [ITIL, AWS_SKILL_BUILDER, TRAILHEAD],
}
