"""Extra sales courses outside the catalogue: CXO engagement, negotiation skills, objection handling."""
from . import q, TF, TRAILHEAD, HUBSPOT_ACADEMY

EXTRA = {}

PON = ("Harvard Program on Negotiation: negotiation skills articles", "https://www.pon.harvard.edu/")
MCA = ("Ministry of Corporate Affairs: company filings and annual reports", "https://www.mca.gov.in/")

EXTRA["CXO Engagement"] = {
    "lessons": [
        """
CXO is a common short form for senior executives: the CEO (chief executive officer), CFO (chief financial officer), CIO (chief information officer), COO (chief operating officer), CISO (chief information security officer) and others. They approve the largest IT investments, so understanding what each of them cares about helps you speak to their priorities.

## What each executive usually cares about

- **CEO:** growth, competitive position, customers, reputation and the long-term strategy.
- **CFO:** cost, cash flow, return on investment, risk and predictable spending.
- **CIO:** reliability, security, simplicity, skills and how IT supports the business strategy.
- **COO:** efficiency, uptime of operations, productivity and quality.
- **CISO:** cyber risk, regulatory compliance and incident readiness.

## Common concerns across executives

- "Why now?" What happens if we do nothing?
- "What is the risk?" Of acting and of not acting.
- "How will we know it worked?" Measurable outcomes.
- "Can we trust this partner?" Experience, references and follow-through.

## Key terms

- **CXO:** a senior executive such as CEO, CFO or CIO.
- **Business priority:** a goal the organisation has committed to, such as expansion or cost reduction.
- **Annual report:** a company's yearly publication of results and strategy; listed companies publish them, and filings are available through the Ministry of Corporate Affairs.

## Real-world example

Before meeting a manufacturer's CFO, an account manager reads the annual report and finds that the company plans to cut operating costs by a set percentage over two years. Instead of presenting a server catalogue, she explains how consolidating three ageing server rooms could reduce power and support costs, with a clear payback. The CFO asks for a detailed proposal.

## Common mistakes

- Using the same message for every executive.
- Talking about technical features to business leaders.
- Not researching the company before the meeting.

## Key takeaways

- Each executive has different priorities; tailor your message.
- All executives ask why now, what the risk is and how success will be measured.
- Research the business before you meet.
""",
        """
Senior executives have very little time. To earn a meeting, you need a reason that matters to them, an introduction they trust and a clear idea of what you will offer in return for their time.

## Ways to earn executive time

- **Through your champion:** ask the person who supports you inside the account to introduce you, explaining why the meeting is worth the executive's time.
- **Through peer relationships:** your own senior leaders or OEM executives can request meetings with their counterparts.
- **Through insight:** offer something valuable, such as a benchmark from similar organisations, an assessment result or an industry trend.
- **Through events:** executive round tables, OEM briefings and industry forums.

## Asking for the meeting

- Keep the request short: who you are, why it matters to them, what you will cover and how long it will take.
- Link it to a known priority: "You mentioned expanding to ten new branches this year; we have helped similar banks open branches faster with a standard IT design."
- Ask for a specific, short slot, such as 20 or 30 minutes.

## Key terms

- **Champion:** a person inside the customer who supports your solution and helps you navigate.
- **Executive sponsor:** a senior leader on our side who builds a peer relationship with the customer's executive.
- **Insight:** a useful, evidence-based observation the customer did not have before.

## Real-world example

A salesperson has tried for months to meet a hospital group's CEO without success. After completing a network assessment, the salesperson shares a one-page summary with the CIO showing that outages had affected patient billing. The CIO invites the CEO to a 30-minute briefing on the findings. Insight, delivered through a trusted internal contact, opened the door.

## Common mistakes

- Asking for "an introductory meeting" with no clear value.
- Going around your contacts in a way that damages trust.
- Asking for an hour when 20 minutes would do.

## Key takeaways

- Earn executive time through champions, peer relationships, insight and events.
- Link every request to a known business priority.
- Keep requests short and specific.
""",
        """
An executive briefing is a short, focused meeting where you present a business case to senior leaders. It must be clear, credible and end with a decision or next step.

## Structure of an executive briefing

1. **The situation:** a short summary of the business issue, in the executive's words.
2. **The impact:** what the issue costs today in money, risk or lost opportunity.
3. **The recommendation:** the outcome you propose, in one or two sentences.
4. **The business case:** investment, expected benefits, payback period and key assumptions.
5. **Risks and how they will be managed.**
6. **The ask:** the specific decision you want.

## Building the business case

- Use the customer's own figures wherever possible, such as downtime hours or staff costs.
- Show total cost of ownership over several years, not just purchase price.
- Calculate return on investment (ROI) and payback period clearly.
- Keep assumptions conservative and visible.

## Presenting

- Lead with a one-page summary; keep technical detail in an appendix.
- Rehearse and agree who speaks when.
- Answer questions directly and honestly.

## Key terms

- **Business case:** the financial and strategic justification for an investment.
- **ROI:** return on investment.
- **Payback period:** time for benefits to repay the investment.
- **The ask:** the decision you request.

## Real-world example

A team presents a branch connectivity upgrade to a bank's executive committee. Their first slide shows that link failures stopped transactions at branches for a total of many hours last year, the proposed solution, a payback period of under two years using the bank's own figures, and the request: approve a pilot in 30 branches. The committee approves in the meeting.

## Common mistakes

- Opening with company history.
- Business cases built on numbers the customer does not recognise.
- No clear request at the end.

## Key takeaways

- Structure: situation, impact, recommendation, business case, risks and ask.
- Use the customer's numbers and conservative assumptions.
- Keep it short and end with a clear decision request.
""",
        """
An executive meeting is only valuable if you follow through. Executives remember who delivered what they promised. Strong follow-through turns one meeting into a long-term relationship.

## After the meeting

- **Send a short summary within a day:** what was discussed, decisions made, actions with owners and dates.
- **Deliver every promised item on time,** such as a proposal, a reference call or a workshop.
- **Keep your internal contacts informed;** never surprise the people who introduced you.

## Building the relationship

- **Regular, valuable contact:** share relevant insights, industry news or results, not just sales updates.
- **Executive business reviews:** for key accounts, hold quarterly or half-yearly reviews covering delivered value, issues and plans.
- **Peer relationships:** your company's leaders meet the customer's leaders regularly.
- **Honesty when things go wrong:** inform the executive early about major problems, with a plan to fix them.

## Measuring success

Track whether executive relationships lead to faster decisions, larger strategic projects and long-term renewals.

## Key terms

- **Executive business review:** a periodic meeting with senior customer leaders to review value and plans.
- **Follow-through:** completing the actions you committed to.
- **Relationship map:** a record of stakeholders and the strength of each relationship.

## Real-world example

After a CIO meeting, an account manager sends a summary the next morning and delivers the promised reference contact within two days. Three months later, during a project delay caused by a supplier, he calls the CIO before the CIO hears about it elsewhere, explains the recovery plan and keeps her updated weekly. The CIO later tells colleagues that this transparency is why the company won the next large project.

## Common mistakes

- No written summary after the meeting.
- Contacting executives only when you want an order.
- Hiding problems until they become serious.

## Key takeaways

- Send a summary within a day and deliver every promise on time.
- Build the relationship with valuable, regular contact and executive reviews.
- Share bad news early with a plan.
""",
    ],
    "questions": [
        q("SINGLE", "Which executive is most focused on cost, cash flow and return on investment?", ["CEO", "CFO", "CISO", "COO"], ["CFO"],
          explanation="The chief financial officer focuses on financial outcomes and risk."),
        q("MULTIPLE", "Which questions do executives commonly ask?", ["Why now?", "What is the risk?", "How will we know it worked?", "Which cable category do you use?"], ["Why now?", "What is the risk?", "How will we know it worked?"],
          explanation="Executives focus on timing, risk and measurable outcomes."),
        q("SINGLE", "What is the best way to earn time with a CEO?", ["Send a product catalogue", "Offer a valuable insight linked to a known priority, through a trusted contact", "Call repeatedly", "Ask for a two-hour introduction"], ["Offer a valuable insight linked to a known priority, through a trusted contact"],
          explanation="Insight and trusted introductions open executive doors."),
        q("TRUE_FALSE", "An executive briefing should end with a clear, specific request.", TF, ["True"],
          explanation="Executives need to know the decision you want."),
        q("SINGLE", "When should you send a summary after an executive meeting?", ["Within a day", "After a month", "Only if asked", "Never"], ["Within a day"],
          explanation="A prompt summary confirms decisions and actions."),
        q("TRUE_FALSE", "Problems in a project should be hidden from the executive until they are fixed.", TF, ["False"],
          explanation="Sharing bad news early, with a plan, builds trust."),
        q("MATCHING", "Match each executive to a typical priority.", ["CEO=Growth and strategy", "CIO=Reliable, secure IT that supports the business", "COO=Operational efficiency and uptime", "CISO=Cyber risk and compliance"],
          explanation="Tailor your message to each executive's priorities."),
    ],
    "sources": [MCA, TRAILHEAD, HUBSPOT_ACADEMY],
}

EXTRA["Negotiation Skills"] = {
    "lessons": [
        """
Most negotiations are won or lost before the meeting starts. Preparation gives you clear goals, firm limits and options, so you stay calm and confident under pressure.

## What to prepare

- **Target:** the outcome you aim for on price, scope, payment terms, delivery and support.
- **Walk-away point:** the least favourable deal you can accept, based on approved discounts, margin floors and credit limits. Below this, you say no.
- **BATNA:** your Best Alternative To a Negotiated Agreement, a term from *Getting to Yes* by Roger Fisher and William Ury. A strong BATNA gives you confidence; a weak one means you must work harder for agreement.
- **The other side's position:** their budget, deadline, alternatives and pressures.
- **Tradeables:** things you can offer that cost you little but matter to them, and things you want in return.
- **Approvals:** know what you can agree yourself and what needs approval.

## A preparation checklist

1. Write down your target and walk-away point for each term.
2. Estimate the customer's priorities and likely walk-away point.
3. List at least three tradeables.
4. Plan your opening position and reasons for it.
5. Agree roles if more than one person attends.

## Key terms

- **Target:** the best realistic outcome you aim for.
- **Walk-away point:** the limit beyond which you will not agree.
- **BATNA:** your best option if no agreement is reached.
- **ZOPA:** zone of possible agreement, the overlap between both sides' acceptable ranges.

## Real-world example

Before negotiating a three-year support renewal, an account manager confirms that the lowest approved price is 8% below list and that the customer's budget has been cut. She prepares tradeables: a longer five-year term, annual advance payment and moving some sites to next-business-day support. In the meeting, she reaches a price within her limit by trading term length and payment timing.

## Common mistakes

- Entering a negotiation without a walk-away point.
- Not knowing your own approval limits.
- Preparing only on price and ignoring other terms.

## Key takeaways

- Prepare targets, walk-away points, your BATNA and tradeables for every term.
- Understand the other side's priorities and pressures.
- Know your approval limits before you meet.
""",
        """
A **position** is what someone says they want. An **interest** is why they want it. Focusing on interests, a key idea from *Getting to Yes*, often reveals solutions that satisfy both sides better than arguing over positions.

## Positions versus interests

- **Position:** "We need a 20% discount."
- **Possible interests:** the budget is fixed this year; the CFO wants to show savings; a competitor offered a lower price; cash flow is tight this quarter.

Each interest suggests a different solution: phased delivery, a multi-year price commitment, a scope change, or payment terms that match their cash flow.

## How to uncover interests

- Ask open questions: "What makes that figure important?" "What would a good outcome look like for you?"
- Listen carefully and summarise what you heard.
- Share your own interests honestly where it helps, such as margin requirements or delivery timelines.

## Creating options

Once interests are clear, brainstorm several options before deciding. For example:

- Spread costs over a longer contract.
- Reduce or phase scope.
- Adjust service levels.
- Bundle services to increase value without lowering price.

## Key terms

- **Position:** a stated demand.
- **Interest:** the underlying need or concern behind a position.
- **Option:** a possible solution that meets interests.
- **Win-win outcome:** an agreement in which both sides gain.

## Real-world example

A university insists on a lower price for a Wi-Fi project. By asking why, the salesperson learns that the university must spend its grant before the financial year ends but cannot exceed the grant amount. The solution is to deliver the core campus in this financial year within the grant, and to quote hostels as a second phase next year. The university meets its grant rules, and the company keeps its margin.

## Common mistakes

- Arguing over positions without asking why.
- Offering a discount before understanding the real concern.
- Deciding on the first option without exploring others.

## Key takeaways

- Positions are what people ask for; interests are why.
- Ask open questions to uncover interests.
- Create several options that meet both sides' interests.
""",
        """
Negotiation involves give and take. Skilled negotiators trade concessions carefully and understand how the first number mentioned shapes the discussion.

## Trading concessions

- **Never give without getting:** link each concession to something in return. "If you can commit to a three-year term, we can reduce the annual price."
- **Make concessions smaller over time:** this signals that you are approaching your limit.
- **Concede on what is cheap for you and valuable to them,** such as training sessions, extended payment by a few days or a faster delivery date.
- **Keep a record** of what has been offered and agreed.
- **Bundle issues:** discuss several terms together rather than one at a time, so you can trade between them.

## Anchoring

The first number mentioned, the **anchor,** strongly influences the final outcome. Research in negotiation consistently shows this effect.

- If you make the first offer, anchor at an ambitious but justifiable level, with reasons.
- If the other side anchors first with an extreme number, do not accept it as the starting point; restate your position with your reasons.

## Key terms

- **Concession:** something given up during a negotiation.
- **Anchor:** the first number mentioned, which influences the outcome.
- **Bundling:** negotiating several issues together.
- **Conditional offer:** an offer that depends on something in return ("if... then...").

## Real-world example

A customer asks for a 10% discount on a server deal. The salesperson responds: "If you can place the order this month and include the three-year support package, we can offer 5%." The customer counters with 7%. The salesperson agrees to 6% if the customer also provides a case study after go-live. Each step traded value for value.

## Common mistakes

- Giving large concessions early.
- Accepting the other side's extreme anchor as the starting point.
- Negotiating one term at a time and losing room to trade.

## Key takeaways

- Trade concessions using "if... then..." offers, getting something for everything.
- Make concessions smaller as you approach your limit.
- Use anchoring wisely and do not accept extreme anchors.
""",
        """
IT deals often have thin product margins. Protecting margin while handling customer pressure is an essential negotiation skill.

## Protecting margin

- **Know your numbers:** cost, target margin, margin floor and how services and support affect total margin.
- **Sell value, not price:** explain the outcomes and risks your solution addresses.
- **Use services to add value** rather than cutting product price.
- **Compare like with like:** if a competitor is cheaper, check what they included.
- **Watch hidden costs:** long payment terms, penalty clauses and free extras reduce real margin.

## Handling pressure tactics

- **Deadline pressure:** "We need your best price in one hour." Ask what drives the deadline and do not concede in a panic.
- **"Your competitor is cheaper":** ask to compare scope and terms.
- **Good cop, bad cop:** one person is friendly, another demanding. Focus on the issues, not the act.
- **Last-minute demands (the "nibble"):** small extra requests after agreement. Trade them or politely decline.
- **Silence:** do not rush to fill silence with a concession.

## Staying professional

Stay calm, polite and fact-based. Take a break if needed to consult your team or approvals. Never agree to anything outside your authority or put promises outside the written contract.

## Key terms

- **Margin floor:** the minimum acceptable margin.
- **Nibble:** a small extra demand after the main agreement.
- **Total deal margin:** the combined margin on products, services and support.

## Real-world example

At the final meeting, a procurement manager says a competitor is 12% cheaper and demands a match within the hour. The salesperson asks to see the competitor's scope and discovers it excludes installation and offers one year of support instead of three. She explains the difference, offers a small price adjustment linked to faster payment and holds her margin. The customer chooses her offer.

## Common mistakes

- Matching a competitor's price without comparing scope.
- Conceding under artificial deadlines.
- Agreeing to small "nibbles" for free.

## Key takeaways

- Know your margin floor and total deal margin.
- Recognise pressure tactics and respond calmly with facts.
- Never agree beyond your authority or outside the contract.
""",
    ],
    "questions": [
        q("SINGLE", "What is a walk-away point?", ["The first price you offer", "The least favourable deal you will accept", "The customer's budget", "The list price"], ["The least favourable deal you will accept"],
          explanation="Below the walk-away point, you say no."),
        q("SINGLE", "'We need a 20% discount' is an example of:", ["An interest", "A position", "A BATNA", "A tradeable"], ["A position"],
          explanation="A position is a stated demand; interests explain why."),
        q("TRUE_FALSE", "The first number mentioned in a negotiation can strongly influence the outcome.", TF, ["True"],
          explanation="This is the anchoring effect."),
        q("SINGLE", "Which is the best way to make a concession?", ["Give it immediately to build goodwill", "Use an 'if... then...' offer that gets something in return", "Offer the biggest discount first", "Concede on everything at once"], ["Use an 'if... then...' offer that gets something in return"],
          explanation="Conditional offers trade value for value."),
        q("MULTIPLE", "Which are common pressure tactics?", ["Artificial deadlines", "Last-minute nibbles", "Good cop, bad cop", "Sharing accurate scope documents"], ["Artificial deadlines", "Last-minute nibbles", "Good cop, bad cop"],
          explanation="Recognising tactics helps you stay calm."),
        q("TRUE_FALSE", "If a competitor is cheaper, you should match the price immediately.", TF, ["False"],
          explanation="Compare scope and terms first; the offers are often not equivalent."),
        q("MATCHING", "Match each term to its meaning.", ["BATNA=Best alternative if no agreement", "ZOPA=Overlap of acceptable ranges", "Anchor=First number that influences the outcome", "Nibble=Small extra demand after agreement"],
          explanation="These are core negotiation terms."),
    ],
    "sources": [PON, TRAILHEAD, HUBSPOT_ACADEMY],
}

EXTRA["Objection Handling"] = {
    "lessons": [
        """
An objection is a concern a customer raises about moving forward. It is not a rejection. Often it means the customer is interested but needs more information, reassurance or a better fit.

## Types of objections

- **Price:** "It is too expensive." Often means the value is unclear, or the comparison is unfair.
- **Need:** "We do not need this." The problem or its cost may not be clear yet.
- **Timing:** "Not now." There may be budget cycles, other priorities or a project freeze.
- **Trust:** "We have never worked with you." The customer needs proof and reassurance.
- **Status quo:** "Our current vendor is fine." Change feels risky.
- **Authority:** "I need to check with my boss." Other people are involved in the decision.

## Finding the real concern

The first objection is not always the real one. A customer who says "it is too expensive" may actually be worried about implementation risk or may not have the budget this quarter. Asking gentle, open questions helps uncover what is really stopping them.

## Key terms

- **Objection:** a concern raised about moving forward.
- **Real objection:** the underlying concern behind what is said.
- **Status quo bias:** the tendency to prefer the current situation.

## Real-world example

A customer says a proposed backup solution is too expensive. The salesperson asks what they are comparing it with. The customer admits that the real concern is that their previous backup project failed and they fear another failure. The salesperson offers a reference visit to a similar customer and a phased rollout with a pilot. The price objection disappears.

## Common mistakes

- Treating every objection as a price problem.
- Arguing instead of asking questions.
- Giving up after the first objection.

## Key takeaways

- Objections are concerns, not rejections.
- Know the common types: price, need, timing, trust, status quo and authority.
- Ask questions to find the real concern.
""",
        """
LAER is a simple, widely taught method for handling objections: **Listen, Acknowledge, Explore, Respond.** It keeps the conversation calm and focused on the customer's real concern.

## The four steps

1. **Listen:** let the customer finish without interrupting. Take notes. Show you are paying attention.
2. **Acknowledge:** show that you understand and that the concern is reasonable. "That is a fair concern; many customers ask the same." Acknowledging is not agreeing.
3. **Explore:** ask open questions to understand the real issue. "Can you tell me more about what worries you?" "What are you comparing this with?"
4. **Respond:** answer the real concern with facts, options or proof, then check that it is resolved. "Does that address your concern?"

## Why it works

- Listening and acknowledging reduce tension and show respect.
- Exploring prevents you from answering the wrong question.
- Checking at the end confirms whether the concern is really resolved or whether there is another one.

## Key terms

- **LAER:** Listen, Acknowledge, Explore, Respond.
- **Open question:** a question that cannot be answered with yes or no.
- **Confirmation question:** a question that checks the concern is resolved.

## Real-world example

An IT head says: "Your support response time is too slow." The salesperson listens fully, acknowledges that response time matters for critical systems, and explores which systems are most critical and what response time they need. It turns out only the core switches need a four-hour response; other equipment is fine with next-business-day support. The salesperson responds with a mixed support plan that meets the need at a reasonable cost, and confirms the IT head is satisfied.

## Common mistakes

- Interrupting to defend immediately.
- Skipping the explore step and answering the wrong concern.
- Not checking whether the concern is resolved.

## Key takeaways

- Use LAER: Listen, Acknowledge, Explore, Respond.
- Acknowledging shows understanding without agreeing.
- Always check that the concern is resolved.
""",
        """
Once you understand the real concern, you need a strong response. The best responses use evidence or reframe the concern in a way that helps the customer see the bigger picture.

## Responding with evidence

- **References and case studies:** customers similar to them who succeeded with our solution.
- **Data:** performance test results, uptime statistics or total cost of ownership comparisons.
- **Demonstrations and pilots:** let the customer see the solution working.
- **Certifications and partnerships:** OEM partner levels, engineer certifications and quality standards.
- **Guarantees within policy:** service level commitments written into the contract.

## Reframing

Reframing helps the customer look at the concern from a different angle:

- **Price to cost of ownership:** "The purchase price is higher, but over five years, including support and downtime, the total cost is lower."
- **Cost to risk:** "What would one day of downtime cost compared with the investment?"
- **Change to opportunity:** "Staying with the current setup means continuing with the outages we discussed."

## Key terms

- **Evidence:** facts that support your response.
- **Reframing:** presenting a concern from a different perspective.
- **Total cost of ownership (TCO):** all costs over the life of a solution.

## Real-world example

A CFO objects that a proposed firewall is more expensive than the current vendor's renewal. The salesperson shares a TCO comparison: the new firewall includes features that replace two other subscriptions, and the support covers all branches. Over three years, the total cost is lower. She adds a reference from a similar company. The CFO approves.

## Common mistakes

- Responding with opinions instead of evidence.
- Reframing in a way that dismisses the customer's concern.
- Overloading the customer with too much data.

## Key takeaways

- Use references, data, demos, certifications and contract commitments as evidence.
- Reframe price as total cost, cost as risk and change as opportunity.
- Keep responses clear and respectful.
""",
        """
Not every objection can or should be overcome. Sometimes conceding a point builds trust and leads to a better long-term relationship. Recording objections helps the whole team improve.

## When to concede

- **The objection is valid:** our solution genuinely does not meet a requirement. Say so honestly and suggest alternatives if possible.
- **The cost of winning is too high:** meeting the demand would push the deal below our margin floor or add unacceptable risk.
- **A small concession unlocks a big agreement:** for example, adding a training session to close a large deal.

When you concede, do so clearly and, where possible, get something in return.

## When to walk away

If the customer's requirements, price or terms fall outside what we can deliver profitably and safely, it is better to decline politely than to win a deal that loses money or damages our reputation.

## Recording objections

- Record significant objections and how they were handled in the CRM.
- Share common objections with sales, presales and marketing teams.
- Build a shared library of proven responses, references and evidence.
- Review lost deals to learn which objections were not resolved.

## Key terms

- **Concession:** giving something up to reach agreement.
- **Margin floor:** the minimum acceptable margin.
- **Objection library:** a shared collection of common objections and good responses.

## Real-world example

A customer insists on a feature our proposed product does not have. Instead of claiming it does, the salesperson admits the gap and suggests a third-party add-on that meets the need. The customer appreciates the honesty. Months later, when a larger project comes up, the customer invites the company first because "they told us the truth."

## Common mistakes

- Claiming capabilities the solution does not have.
- Winning deals below margin to avoid losing.
- Not recording objections, so the team keeps facing the same ones unprepared.

## Key takeaways

- Concede honestly when objections are valid or the cost of winning is too high.
- Walk away from deals that cannot be delivered profitably and safely.
- Record objections and build a shared library of responses.
""",
    ],
    "questions": [
        q("SINGLE", "What does an objection usually mean?", ["The customer has rejected you", "The customer has a concern that needs to be understood", "The deal is lost", "The price must be cut"], ["The customer has a concern that needs to be understood"],
          explanation="Objections are concerns, often from interested customers."),
        q("SINGLE", "What does LAER stand for?", ["Listen, Acknowledge, Explore, Respond", "Learn, Ask, Explain, Repeat", "Lower, Agree, Exit, Return", "Listen, Argue, Explain, Resolve"], ["Listen, Acknowledge, Explore, Respond"],
          explanation="LAER is a structured method for handling objections."),
        q("TRUE_FALSE", "Acknowledging a concern means agreeing with it.", TF, ["False"],
          explanation="Acknowledging shows understanding, not agreement."),
        q("SINGLE", "Which is an example of reframing?", ["'Our price is final'", "'Over five years, including support and downtime, the total cost is lower'", "'Everyone buys from us'", "'You are wrong'"], ["'Over five years, including support and downtime, the total cost is lower'"],
          explanation="Reframing moves the focus from purchase price to total cost."),
        q("MULTIPLE", "Which are good forms of evidence?", ["Reference customers", "TCO comparisons", "Pilot results", "Personal opinions"], ["Reference customers", "TCO comparisons", "Pilot results"],
          explanation="Evidence must be factual and verifiable."),
        q("TRUE_FALSE", "If a solution lacks a required feature, you should admit it honestly.", TF, ["True"],
          explanation="Honesty builds long-term trust."),
        q("MATCHING", "Match each objection type to an example.", ["Price=It is too expensive", "Timing=Not this quarter", "Trust=We have never worked with you", "Status quo=Our current vendor is fine"],
          explanation="Recognising the type helps choose a response."),
    ],
    "sources": [TRAILHEAD, HUBSPOT_ACADEMY, PON],
}
