"""Sales: the B2B sales process, consultative selling and negotiation, strategic accounts."""
from . import q, TF, TRAILHEAD, HUBSPOT_ACADEMY, MS_LEARN

COURSES = {}

COURSES["Sales Basic: The B2B Sales Process"] = {
    "lessons": [
        """
Business-to-business (B2B) selling is different from selling to a consumer. A company rarely buys IT on impulse. Several people are involved, there is a budget to approve, and the decision can take weeks or months. A clear, repeatable sales process helps you move each opportunity forward step by step, and helps your manager see what is really in the pipeline.

## The stages of a B2B sale

Most IT companies use a version of these stages. The names differ between CRMs, but the logic is the same.

1. **Prospecting:** finding organisations that may need what we sell.
2. **Qualification:** checking that there is a real need, budget, authority and timeline.
3. **Discovery:** understanding the customer's business problem in detail.
4. **Solution and proposal:** working with presales to design an answer and price it.
5. **Negotiation:** agreeing scope, price and terms.
6. **Closure:** receiving the purchase order (PO) or contract.
7. **Delivery and hand-over:** making sure what we sold is delivered, so the customer buys again.

## Why every stage needs an exit criterion

An exit criterion is a fact that must be true before an opportunity moves to the next stage. For example, an opportunity should not move to "Proposal" until you know who signs the PO and when the budget is available. Exit criteria stop the pipeline from filling up with hopeful guesses.

## Key terms

- **Opportunity:** a specific, qualified chance to sell to a customer, with a value and an expected close date.
- **Pipeline:** all open opportunities, grouped by stage.
- **Sales cycle:** the time from first contact to the signed order.
- **Win rate:** the share of closed opportunities that we won.

## Real-world example

Priya, an account manager, meets the IT head of a mid-sized logistics company in Pune. He mentions that branch internet keeps failing. Instead of sending a quotation for routers the same day, Priya qualifies the need: 40 branches are affected, the finance team has set aside money in the next quarter, and the COO approves anything above a set value. She records this in the CRM, moves the opportunity to "Discovery", and books a session with presales to study the branch network. Because each stage has facts behind it, her manager can forecast the deal with confidence.

## Common mistakes

- Jumping from the first meeting straight to a quotation.
- Moving opportunities forward on hope rather than evidence.
- Forgetting the hand-over stage, which decides whether the customer buys again.

## Key takeaways

- A B2B sale has several stages, and each stage needs evidence before you move on.
- Qualification and discovery save time for you, presales and the customer.
- A disciplined process makes your forecast believable.
""",
        """
Prospecting fills the top of the pipeline. Qualification decides which prospects deserve your time. Good salespeople spend as much effort deciding where *not* to invest as they do chasing new leads.

## Where prospects come from

- **Existing customers:** the easiest new business. A customer who bought servers last year may now need backup or security.
- **Referrals:** satisfied customers and OEM partners can introduce you to similar organisations.
- **OEM and distributor leads:** manufacturers often pass leads to registered partners.
- **Events and webinars:** industry events, OEM launches and associations.
- **Targeted outreach:** research a sector, such as private hospitals or engineering colleges, and contact the right roles with a relevant message.

## Qualifying with BANT

BANT is a simple checklist, popularised by IBM, that many sales teams still use:

- **Budget:** is money available or can it be made available?
- **Authority:** who decides, and who signs?
- **Need:** is there a real business problem we can solve?
- **Timeline:** when must the solution be in place, and why then?

For larger, complex deals, many teams use a deeper framework such as MEDDIC (Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion). Use whichever your company has chosen, consistently.

## Key terms

- **Lead:** a contact or company that has shown some interest but is not yet qualified.
- **Ideal customer profile (ICP):** the type of organisation most likely to buy and succeed with our solutions.
- **Champion:** a person inside the customer who wants our solution to win and helps us navigate.

## Real-world example

Rahul receives a lead from an OEM: a school group asking about interactive panels. A quick qualification call shows the group has 12 campuses, a board meeting next month that approves the annual budget, and a principal who is pushing for digital classrooms. That is a qualified opportunity. A second lead, a single coaching centre "just looking at prices", is logged as a lead for later. Rahul spends his week on the first.

## Common mistakes

- Treating every enquiry as an opportunity.
- Asking about budget too late, after weeks of design work.
- Talking only to the person who called, without finding out who decides.

## Key takeaways

- Build a steady flow of prospects from customers, referrals, partners and targeted outreach.
- Qualify early with a consistent checklist such as BANT.
- Invest your time where the need, budget and decision maker are clear.
""",
        """
A CRM (customer relationship management) system is where the company's sales knowledge lives. If an opportunity is not in the CRM, or the record is out of date, managers cannot forecast, presales cannot plan, and a colleague cannot help when you are on leave. CRM hygiene means keeping records complete, accurate and current.

## What a good opportunity record contains

- The customer, the contacts and their roles in the decision.
- The business problem in one or two sentences.
- The products and services involved, and an estimated value.
- The current stage, the expected close date and the next step with a date.
- Competitors, if known, and any OEM deal registration.

## Habits that keep the pipeline healthy

- **Update after every meaningful interaction:** a meeting, a call or a proposal sent.
- **Always have a next step:** "Follow up" is not a next step; "Demo for the IT head on 12 March" is.
- **Be honest about close dates:** push a date out when the customer's plan changes, rather than letting it pass.
- **Close lost deals properly:** record why the deal was lost. This is how the company learns.
- **Review weekly:** spend 20 minutes each week checking stale opportunities.

## Key terms

- **Stale opportunity:** one with no activity for a long time or a close date in the past.
- **Weighted pipeline:** opportunity value multiplied by the probability linked to its stage.
- **Commit:** deals the salesperson is confident will close in the period.

## Real-world example

At a quarterly review, a sales manager finds that a ₹40 lakh opportunity has had a close date in the past for two months. The salesperson explains that the customer postponed the project to the next financial year, but the CRM was never updated. The forecast had counted the deal, and the purchase team had already asked a distributor to hold stock. One honest update would have avoided both problems.

## Common mistakes

- Updating the CRM only before review meetings.
- Keeping lost deals open "just in case".
- Leaving out contact roles, so nobody knows who the decision maker is.

## Key takeaways

- The CRM is a shared tool: other teams plan based on what you record.
- Every open opportunity needs a dated next step and an honest close date.
- Recording why deals are lost is as valuable as recording wins.
""",
        """
Every company sets rules for pricing, discounts, credit and approvals. These rules protect margins, cash flow and the company's reputation. This lesson explains the common types of sales policy found in IT companies. Your administrator will add 3C's own policy and approval levels below.

> **[PLACEHOLDER]** Company sales policy: discount limits by role, approval matrix, credit terms, and the documents required before a sales order is booked. The LMS administrator adds these details.

## Typical areas covered by a sales policy

- **Pricing and discounts:** the maximum discount each role can give without approval.
- **Margin floors:** the minimum gross margin allowed on a deal, often different for products and services.
- **Credit terms:** standard payment terms, and who can approve longer terms or credit limits.
- **Special pricing:** how to request OEM special pricing or deal registration.
- **Order booking:** documents needed, such as the customer PO, signed quotation and tax details.
- **Ethics:** no unapproved gifts, no side agreements, no promises outside the written proposal.

## Why approvals matter

Approvals are not a lack of trust. They make sure that someone checks the risk on large or unusual deals: a long credit period, a penalty clause, or a price below cost. A deal that looks good today can lose money if the payment arrives a year late.

## Key terms

- **Approval matrix:** a table that shows who can approve what, usually by value or discount level.
- **Gross margin:** selling price minus the direct cost of goods and services, often shown as a percentage of the selling price.
- **Side letter:** an informal promise outside the contract. Most companies forbid these.

## Real-world example

A customer asks Neha for 90-day payment terms on a large order. The standard term is 30 days. Instead of agreeing on the call, Neha explains that she will check, and raises the request with the finance team, attaching the customer's payment history. Finance approves 60 days with a part payment in advance. The deal closes, and the company's cash flow is protected.

## Common mistakes

- Promising a price or term to the customer before it is approved.
- Splitting one large order into small ones to avoid an approval level.
- Booking an order without the customer's PO or with mismatched details.

## Key takeaways

- Learn your company's discount limits, margin floors and credit terms.
- Ask for approval before you commit, not after.
- Keep every promise in writing, inside the proposal or contract.
""",
    ],
    "questions": [
        q("SINGLE", "Which stage should come before you prepare a proposal?", ["Qualification and discovery", "Negotiation", "Closure", "Hand-over"], ["Qualification and discovery"],
          explanation="You need to know the need, budget, decision maker and problem before a proposal can answer it."),
        q("MULTIPLE", "Which items are part of BANT qualification?", ["Budget", "Authority", "Need", "Timeline", "Brand preference"], ["Budget", "Authority", "Need", "Timeline"],
          explanation="BANT stands for Budget, Authority, Need and Timeline."),
        q("TRUE_FALSE", "An exit criterion is a fact that must be true before an opportunity moves to the next stage.", TF, ["True"],
          explanation="Exit criteria keep opportunities moving on evidence rather than hope."),
        q("SINGLE", "Which of these is a good next step in a CRM record?", ["Follow up", "Call sometime", "Demo for the IT head on 12 March", "Waiting for customer"], ["Demo for the IT head on 12 March"],
          explanation="A good next step is specific: an action, a person and a date."),
        q("SINGLE", "A customer postpones a project to next year. What should you do with the opportunity?", ["Leave it as it is", "Update the close date and record the reason", "Delete it", "Mark it won"], ["Update the close date and record the reason"],
          scenario="Your opportunity is in 'Proposal' stage with a close date this month.",
          explanation="Honest close dates keep the forecast and stock planning accurate."),
        q("TRUE_FALSE", "Splitting one large order into several small ones to avoid an approval level is acceptable if the customer agrees.", TF, ["False"],
          explanation="Splitting orders to avoid approvals bypasses the company's risk controls and is not allowed."),
        q("MATCHING", "Match each term to its meaning.", ["Lead=Interest shown, not yet qualified", "Opportunity=Qualified chance to sell with a value and date", "Champion=Person inside the customer who supports our solution", "Win rate=Share of closed deals that we won"],
          explanation="These are the basic words used in every pipeline review."),
    ],
    "sources": [TRAILHEAD, HUBSPOT_ACADEMY, ("Microsoft Learn: Dynamics 365 Sales documentation (opportunity and pipeline management)", "https://learn.microsoft.com/en-us/dynamics365/sales/")],
}

COURSES["Sales Intermediate: Consultative Selling and Negotiation"] = {
    "lessons": [
        """
Consultative selling starts with the customer's business, not with our product list. The salesperson acts like a trusted adviser: they ask questions, listen carefully, and only then suggest a solution. Discovery is the stage where this happens, and the quality of your questions decides the quality of your proposal.

## Types of discovery questions

- **Situation questions:** facts about the current state. "How many users and sites do you support?"
- **Problem questions:** difficulties and dissatisfaction. "Where do outages hurt you most?"
- **Implication questions:** the cost of the problem. "What happens to billing when the branch link is down for a day?"
- **Need-payoff questions:** the value of solving it. "If outages stopped, what would that mean for your branch staff?"

These four types come from SPIN Selling, a research-based method published by Neil Rackham in 1988. The key lesson from that research is that in large sales, implication and need-payoff questions matter most, because they help the customer see the value for themselves.

## How to run a discovery meeting

1. Prepare: read the customer's website, annual report or news, and your CRM history.
2. Agree the agenda and the time available at the start.
3. Ask open questions and let the customer talk most of the time.
4. Summarise what you heard and check that it is right.
5. Agree a clear next step before you leave.

## Key terms

- **Open question:** a question that cannot be answered with yes or no.
- **Active listening:** paying full attention, taking notes and confirming what you heard.
- **Pain point:** a problem that costs the customer time, money or risk.

## Real-world example

A hospital's IT manager asks Arjun for a quote for 50 new desktops. Arjun asks why now. The manager explains that doctors wait several minutes to open patient records. Further questions reveal that the real cause is a slow, ageing server and a congested network, not the desktops. Arjun's proposal covers a server upgrade and network changes, at a lower cost than 50 desktops, and solves the real problem. The customer now sees Arjun as an adviser.

## Common mistakes

- Pitching the product in the first ten minutes.
- Asking a list of questions without listening to the answers.
- Leaving without summarising and agreeing a next step.

## Key takeaways

- Discovery is about understanding the business problem and its cost.
- Implication and need-payoff questions help the customer see the value.
- Listen more than you talk, and confirm what you heard.
""",
        """
A value proposition explains why the customer should choose our solution, in terms that matter to them. Features describe what a product does. Benefits describe what the customer gains. Value connects that gain to a business result the customer cares about, such as revenue, cost, risk or compliance.

## From feature to value

- **Feature:** "This firewall has built-in SD-WAN."
- **Benefit:** "Your branches can use two internet links and switch automatically if one fails."
- **Value:** "Billing at your 40 branches keeps running during link failures, which protects daily collections."

Always finish the chain. Customers rarely buy features; they buy outcomes.

## Building a value proposition

1. Start with the pain point and its cost from discovery.
2. Describe the outcome the customer wants.
3. Explain how our solution achieves it, in plain language.
4. Add proof: a reference customer, a case study or a pilot result.
5. Keep it short enough to say in under a minute.

## Tailoring to each stakeholder

Different people care about different things. The IT head may care about manageability, the CFO about total cost and cash flow, and the business head about uptime and user experience. One solution can have several value statements, each in the stakeholder's language.

## Key terms

- **Value proposition:** a clear statement of the business result the customer gets from our solution.
- **Differentiator:** something we offer that competitors do not, which matters to this customer.
- **Proof point:** evidence that the value is real, such as a reference site.

## Real-world example

Two partners bid to replace a manufacturer's ageing UPS units. One sends a datasheet comparison. The other shows that the plant lost about six production hours last year due to power dips, estimates what those hours cost, and explains how the new UPS design with battery monitoring prevents this. The second partner wins, even though its price is slightly higher.

## Common mistakes

- Listing features and hoping the customer works out the value.
- Using the same message for the CFO and the network engineer.
- Making claims without proof.

## Key takeaways

- Move from feature to benefit to business value every time.
- Tailor the message to each stakeholder's priorities.
- Support every claim with evidence.
""",
        """
Objections are a normal part of selling. An objection usually means the customer is engaged but has a concern. Handled well, it builds trust; handled badly, it ends the conversation. The best preparation is to know the common objections in advance and practise your responses.

## A simple method for handling objections

1. **Listen fully.** Do not interrupt or defend yourself immediately.
2. **Acknowledge.** Show that the concern is reasonable: "I understand why that matters."
3. **Clarify.** Ask a question to find the real issue: "When you say it is expensive, compared with what?"
4. **Respond.** Answer the real concern with facts, options or proof.
5. **Confirm.** Check that the answer resolved it: "Does that address your concern?"

## Common objections in IT sales

- **"Your price is too high."** Often means the value is not clear, or they are comparing different scopes. Compare like with like, and show total cost over the life of the solution.
- **"We are happy with our current vendor."** Ask what they value in that vendor, and look for gaps you can fill.
- **"Now is not the right time."** Find out what drives the timing, such as budget cycles or a project freeze.
- **"We need to think about it."** Ask what is still unclear, and offer to answer it.

## Practising with role-plays

Role-plays feel awkward, but they work. Pair with a colleague: one plays a tough customer, the other responds, and a third person observes and gives feedback. Practise the five steps until they feel natural.

## Key terms

- **Objection:** a concern or reason the customer gives for not moving forward.
- **Total cost of ownership (TCO):** purchase price plus running, support and replacement costs over the life of the solution.

## Real-world example

A CFO tells Sneha that a competitor's storage quote is 15% cheaper. Sneha asks to see what is included. The competitor quoted one year of support and no installation, while Sneha quoted five years of support with on-site installation and data migration. When the CFO compares five-year costs, Sneha's offer is lower. The objection becomes the reason she wins.

## Common mistakes

- Arguing with the customer or dismissing the concern.
- Dropping the price immediately without understanding the comparison.
- Answering a different question from the one asked.

## Key takeaways

- Treat objections as questions to be understood, not attacks.
- Listen, acknowledge, clarify, respond and confirm.
- Practise common objections in role-plays before you meet customers.
""",
        """
Negotiation is where scope, price and terms are agreed. Good negotiators prepare carefully, know their limits, and look for agreements where both sides gain. The aim is a deal that the customer is happy with and that is profitable for us, so the relationship continues.

## Plan before you negotiate

- **Your objectives:** the outcome you want on price, scope, payment terms and timelines.
- **Your walk-away point:** the least favourable deal you can accept, based on approvals and margin floors.
- **Your BATNA:** your Best Alternative To a Negotiated Agreement, what you will do if there is no deal. The idea comes from the Harvard book *Getting to Yes* by Roger Fisher and William Ury (1981).
- **The customer's likely position:** their budget, priorities, alternatives and deadline.
- **Tradeables:** items you can offer that cost you little but are valuable to them.

## Trading, not conceding

Never give something away without getting something back. If the customer asks for a lower price, ask for something in return: a larger order, a longer contract, faster payment, or a reference visit. Common tradeables include:

- Payment terms, such as advance payment for a better price.
- Contract length, such as a three-year support agreement.
- Scope, such as removing an optional item to meet a budget.
- Timing, such as an order before quarter end.

## Key terms

- **BATNA:** your best option if this negotiation fails.
- **Walk-away point:** the limit beyond which you will not agree.
- **Concession:** something you give up during a negotiation.
- **Anchoring:** the effect of the first number mentioned on the rest of the discussion.

## Real-world example

A university asks for a 12% discount on a campus Wi-Fi project. Karan's approved limit is 7%. He offers 6% if the university places a three-year managed Wi-Fi support contract and pays 30% in advance. The university gets a lower price, Karan protects his margin and gains recurring revenue, and both sides leave satisfied.

## Common mistakes

- Starting a negotiation without knowing your walk-away point.
- Giving discounts without asking for anything in return.
- Agreeing to terms you are not authorised to approve.

## Key takeaways

- Prepare objectives, limits, your BATNA and tradeables before the meeting.
- Trade concessions; do not give them away.
- Aim for an agreement both sides are happy to keep.
""",
    ],
    "questions": [
        q("SINGLE", "In SPIN Selling, which question type explores the cost or consequence of a problem?", ["Situation", "Problem", "Implication", "Need-payoff"], ["Implication"],
          explanation="Implication questions explore what the problem costs, which helps the customer see why it matters."),
        q("SINGLE", "Which statement is a value statement rather than a feature?", ["The firewall has built-in SD-WAN", "The switch has 48 ports", "Billing at your branches keeps running during link failures", "The UPS is 10 kVA"], ["Billing at your branches keeps running during link failures"],
          explanation="Value links the solution to a business result the customer cares about."),
        q("TRUE_FALSE", "BATNA stands for Best Alternative To a Negotiated Agreement.", TF, ["True"],
          explanation="The term comes from the book Getting to Yes by Fisher and Ury."),
        q("SINGLE", "A customer says your price is too high. What is the best first step?", ["Offer a discount", "Ask what they are comparing it with", "End the meeting", "Remove the support from the quote"], ["Ask what they are comparing it with"],
          explanation="Clarify the real concern first. Often the competitor's scope is different."),
        q("MULTIPLE", "Which of these are good tradeables in a negotiation?", ["Advance payment", "A longer support contract", "A reference visit", "A promise not written in the contract"], ["Advance payment", "A longer support contract", "A reference visit"],
          explanation="Tradeables are written, valuable exchanges. Side promises outside the contract are not allowed."),
        q("SINGLE", "What should you do before a negotiation meeting?", ["Decide your walk-away point and tradeables", "Ask for the customer's budget only", "Prepare the largest discount you can offer", "Nothing; react in the meeting"], ["Decide your walk-away point and tradeables"],
          explanation="Preparation sets your limits and options, so you do not concede under pressure."),
        q("MATCHING", "Match each objection-handling step to its action.", ["Acknowledge=Show the concern is reasonable", "Clarify=Ask a question to find the real issue", "Respond=Answer with facts, options or proof", "Confirm=Check the concern is resolved"],
          explanation="Listening comes first, then these four steps in order."),
    ],
    "sources": [("Harvard Program on Negotiation: negotiation skills articles", "https://www.pon.harvard.edu/"), TRAILHEAD, HUBSPOT_ACADEMY],
}

COURSES["Sales Advanced: Strategic Accounts and Closure"] = {
    "lessons": [
        """
A strategic (key) account is a customer that matters to our business over many years, because of its size, growth or influence. Key account management treats such a customer as a long-term partnership, with a written plan, rather than a series of separate deals.

## What goes into an account plan

- **Account overview:** the customer's business, strategy, financial year and major initiatives.
- **Installed base:** what they have bought from us and from competitors, with end-of-support dates.
- **Relationship map:** the people who influence decisions and how strong our relationship is with each.
- **Whitespace:** products and services they could buy from us but currently buy elsewhere or not at all.
- **Goals and actions:** revenue targets, key opportunities, and named actions with owners and dates.
- **Risks:** competitor threats, unhappy users, or upcoming leadership changes.

## Mapping stakeholders

For each important person, record their role in decisions (decision maker, influencer, user, gatekeeper), their attitude to us (supporter, neutral, sceptic), and what they personally care about. A simple map shows where you are strong and where you need new relationships.

## Key terms

- **Key account:** a customer of long-term strategic importance.
- **Whitespace analysis:** a review of what else a customer could buy from us.
- **Installed base:** the products a customer already owns and uses.
- **Relationship map:** a chart of stakeholders, their influence and their view of us.

## Real-world example

A bank has bought networking from us for five years. Ritu, the key account manager, builds an account plan. The installed-base review shows that the bank's branch firewalls reach end of support in 14 months, and that its video-conferencing rooms are supported by another partner. The relationship map shows a strong link with the network team but none with the new CISO. Ritu's plan includes a security workshop for the CISO and an early refresh proposal for the firewalls, a year ahead of competitors.

## Common mistakes

- Writing the plan once and never updating it.
- Knowing only one contact in the account.
- Focusing only on the next deal rather than the customer's strategy.

## Key takeaways

- Treat key accounts as long-term partnerships with a written plan.
- Track the installed base, stakeholders, whitespace and risks.
- Review and update the plan at least every quarter.
""",
        """
Senior executives, such as the CIO, CFO, CEO or business heads, make or approve the largest decisions. They have little time and think in business terms. To engage them, you must speak their language: growth, cost, risk, customers and compliance.

## How executives think

- They focus on business outcomes, not technical detail.
- They ask "Why now?" and "What happens if we do nothing?"
- They want to know the risk, the cost and the return.
- They trust people who understand their industry and are well prepared.

## Preparing for an executive meeting

1. Research the organisation: annual report, investor presentations, news and leadership interviews.
2. Identify one or two business priorities you can genuinely help with.
3. Prepare a short point of view: what you have seen work at similar organisations.
4. Plan to ask insightful questions, not to present slides for 45 minutes.
5. Agree the outcome you want from the meeting, such as permission for a workshop.

## During the meeting

- Start with their priorities, not our company history.
- Keep it short and specific. Respect the time agreed.
- Use numbers carefully and be ready to explain where they came from.
- Close by agreeing a clear next step and who will own it on their side.

## Key terms

- **CXO:** a common term for senior executives such as CEO, CFO, CIO and COO.
- **Point of view:** a short, evidence-based opinion on how the customer could improve.
- **Executive sponsor:** a senior person on our side who builds a peer relationship with the customer's executive.

## Real-world example

Before meeting the CFO of a pharmaceutical company, Vikram reads the annual report and notices plans to open two new plants. He asks how quickly IT for a new plant can be ready, and shares how a similar manufacturer used a standard, pre-tested design to cut set-up time. The CFO asks for a workshop with the plant planning team. Vikram never showed a product slide.

## Common mistakes

- Using technical jargon with business leaders.
- Arriving without having read about the customer's business.
- Leaving without a next step.

## Key takeaways

- Executives buy outcomes: growth, cost, risk and compliance.
- Preparation and a clear point of view earn their time.
- Ask good questions and agree a concrete next step.
""",
        """
Large IT deals involve many people, several approval steps and formal procurement. Closing them takes careful planning. A mutual close plan, agreed with the customer, lists every step from today until the order and the start of delivery.

## Understanding the decision process

Find out early:

- Who evaluates the technical solution and who evaluates the commercial offer.
- Which committees or approvals are needed, such as an IT steering committee or the board.
- What procurement steps are required, such as vendor registration, a negotiation meeting or a reverse auction.
- What legal review the contract needs.
- When the budget is released and when the financial year ends.

## Building a mutual close plan

A mutual close plan is a shared timeline that both sides agree. For each step it shows the action, the owner (ours or theirs) and the date. For example: technical sign-off, commercial negotiation, legal review, purchase approval, PO issue, and project kick-off. Sharing it with your champion helps them steer the deal internally and shows you where delays may come from.

## Managing risk near the close

- Confirm that all decision makers have seen and support the proposal.
- Check that the scope, assumptions and exclusions are clear and written.
- Watch for silence; a deal that goes quiet is usually at risk.
- Avoid last-minute discounts that were not planned and approved.

## Key terms

- **Mutual close plan:** a shared timeline of steps to a signed order.
- **Decision process:** the steps and approvals the customer follows to buy.
- **Paper process:** the procurement, legal and finance steps that turn a decision into an order.

## Real-world example

Meera's customer agrees verbally to a ₹2 crore data-centre refresh in January. She builds a close plan with the customer's IT head and discovers that the legal review takes three weeks and the board meets only in March. Instead of forecasting the deal for February, she forecasts March, prepares the contract early, and the order arrives on time. Without the plan, the deal would have "slipped" in the forecast twice.

## Common mistakes

- Assuming a verbal "yes" means the order is near.
- Ignoring procurement and legal timelines.
- Discovering a new decision maker at the last minute.

## Key takeaways

- Map the full decision and paper process early.
- Agree a mutual close plan with owners and dates.
- Watch for silence and new stakeholders as warning signs.
""",
        """
A forecast is the sales team's prediction of the orders it will close in a period. The company uses the forecast to plan purchasing, staffing and cash. An accurate forecast is a sign of a professional sales team; a forecast that keeps changing damages trust.

## Forecast categories

Many companies use three or four categories:

- **Commit:** deals you are confident will close in the period, with evidence such as an approved budget and an agreed close plan.
- **Best case:** deals that could close if everything goes well.
- **Pipeline:** qualified opportunities that are unlikely to close this period.
- **Omitted or closed lost:** deals that will not happen.

## How to forecast accurately

- Base each deal's category on evidence, not optimism.
- Check the customer's buying steps against the time left in the period.
- Look at your own history: what share of your "commit" deals actually closed?
- Update the forecast as soon as something changes, and explain why.
- Separate the order date from the invoice date, which may depend on delivery.

## Inspecting a deal

When reviewing a deal for the forecast, managers often ask:

- Who signs, and have we spoken to them?
- What happens next, and on which date?
- What could stop this deal, and what are we doing about it?
- Is the PO value agreed, including taxes and services?

## Key terms

- **Forecast accuracy:** how close the forecast was to the actual result.
- **Slippage:** a deal moving to a later period than forecast.
- **Sandbagging:** deliberately under-forecasting to look good later; it harms planning as much as over-forecasting.

## Real-world example

At the start of the quarter, a sales team forecasts ₹10 crore in commit. By the last week, three deals have slipped because customer approvals were delayed. The team closes ₹7 crore. In the review, the manager finds that all three deals lacked a confirmed approval date. The next quarter, the team adds "approval date confirmed by the customer" as a requirement for commit, and accuracy improves.

## Common mistakes

- Putting deals in commit because the customer was friendly.
- Hiding bad news until the end of the quarter.
- Ignoring past accuracy when judging new deals.

## Key takeaways

- Forecast on evidence, using clear category rules.
- Update early and explain changes.
- Measure your accuracy and learn from slippage.
""",
    ],
    "questions": [
        q("MULTIPLE", "Which items belong in a key account plan?", ["Installed base and end-of-support dates", "Relationship map", "Whitespace", "Personal opinions about competitors' staff"], ["Installed base and end-of-support dates", "Relationship map", "Whitespace"],
          explanation="An account plan covers the business, installed base, stakeholders, whitespace, goals, actions and risks."),
        q("SINGLE", "What do executives care about most in a first meeting?", ["Technical specifications", "Our company history", "Business outcomes such as growth, cost and risk", "Product roadmaps"], ["Business outcomes such as growth, cost and risk"],
          explanation="Senior leaders think in business terms; technical detail comes later with their teams."),
        q("TRUE_FALSE", "A mutual close plan lists the steps to the order with owners on both sides and dates.", TF, ["True"],
          explanation="It is shared with the customer so both sides can see and manage the path to the order."),
        q("SINGLE", "A customer gives a verbal 'yes', but the board approves purchases only next quarter. How should you forecast the deal?", ["Commit this quarter", "Best case next quarter, moving to commit when approval is confirmed", "Closed won", "Remove it from the pipeline"], ["Best case next quarter, moving to commit when approval is confirmed"],
          explanation="Forecast based on the customer's real approval timeline, not on the verbal agreement."),
        q("SINGLE", "What is 'slippage' in a forecast?", ["A deal lost to a competitor", "A deal moving to a later period than forecast", "A price reduction", "A deal closing early"], ["A deal moving to a later period than forecast"],
          explanation="Slippage happens when the close date moves out, often because a step in the customer's process was missed."),
        q("TRUE_FALSE", "Sandbagging (deliberately under-forecasting) is harmless because the result is better than expected.", TF, ["False"],
          explanation="Under-forecasting misleads purchasing, staffing and cash planning, just as over-forecasting does."),
        q("MATCHING", "Match each forecast category to its meaning.", ["Commit=Confident, with evidence, this period", "Best case=Could close if everything goes well", "Pipeline=Qualified but unlikely this period", "Closed lost=Will not happen"],
          explanation="Clear category rules make forecasts comparable across the team."),
    ],
    "sources": [TRAILHEAD, HUBSPOT_ACADEMY, MS_LEARN],
}
