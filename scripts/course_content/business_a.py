"""Presales, Purchase and Accounts."""
from . import q, TF

COURSES = {}

# ---------------------------------------------------------------- Presales

COURSES["Presales Basic: Understanding Solutions and Requirements"] = {
    "lessons": [
        """
Presales is the technical half of the sales team. The account manager owns the relationship and the commercial deal; the presales engineer makes sure that what we propose actually solves the customer's problem and can be delivered.

## What presales does in a deal

- Joins discovery meetings to understand the customer's environment and pain points.
- Turns what the customer says into clear, written requirements.
- Designs a solution and prepares the bill of materials (BoM).
- Writes the technical parts of proposals and tender responses.
- Runs demos and proofs of concept (POCs).
- Hands the won deal over to the delivery team with everything they need.

## Where presales joins the sales cycle

1. **Qualification:** the account manager confirms there is a real opportunity.
2. **Discovery:** presales joins to understand the technical situation.
3. **Solution design and proposal:** presales leads.
4. **Negotiation and closure:** presales supports with clarifications.
5. **Handover:** presales briefs the project team.

> A good presales engineer is trusted by the customer because they are honest about what a product can and cannot do.
""",
        """
A requirement is a statement of what the customer needs. Capture requirements in writing, in the customer's words where possible, and confirm them back.

## Two kinds of requirement

- **Functional:** what the solution must do. Example: "Staff on all three floors must have Wi-Fi."
- **Non-functional:** how well it must do it. Examples: availability ("no single point of failure"), performance ("support 200 video calls"), security, compliance, budget and timeline.

## Questions that uncover requirements

- What problem are you trying to solve, and why now?
- What do you have today, and what is not working?
- How many users, sites and devices? How will that grow in three years?
- What must the solution connect to?
- Who will run it after installation?
- What does success look like, and how will you measure it?

## Write it down

Keep a simple requirement log: number, requirement, source (who said it), priority (must, should, could) and status. Send it to the customer to confirm. Many disputes later in a project come from requirements that were assumed but never written.
""",
        """
Once requirements are clear, sketch a solution outline before choosing exact products.

## Steps

1. **Group the requirements** by area: network, compute, storage, security, end-user devices, services.
2. **Choose an architecture** for each area. Example: "two core switches in a redundant pair, access switches on each floor, wireless controller in the cloud".
3. **Map each requirement to a part of the design.** Every must-have requirement should be covered by something in the design.
4. **List assumptions and exclusions.** Example: "civil work and power cabling by the customer".
5. **Pick products** that fit, from approved OEMs (see the next lesson).
6. **Add services:** installation, configuration, training, support.

## Traceability

A simple table with columns "Requirement" and "How the solution meets it" makes reviews quick and is often asked for in tenders. If a requirement is not met, say so and explain the alternative.

> Never hide a gap. A gap found by the customer after the order costs far more trust and money than one explained in the proposal.
""",
        """
[PLACEHOLDER: The company will supply a tour of its solution library.]

This lesson will show where presales finds approved material. Until the company supplies it, ask your manager for:

- the list of OEMs and distributors the company is authorised to sell;
- approved datasheets, reference architectures and past proposals that can be reused;
- the BoM and pricing tools used by the team;
- the approval process for discounts and non-standard configurations.

## Good habits with reference material

- Always use the latest datasheet from the OEM. Specifications change between product versions.
- Do not copy claims from old proposals without checking they are still true.
- Keep customer names and prices out of reusable templates.
""",
    ],
    "questions": [
        q("SINGLE", "What is the main job of presales in a deal?", ["Collecting payment", "Making sure the proposed solution solves the customer's problem and can be delivered", "Negotiating the final discount", "Raising purchase orders"], ["Making sure the proposed solution solves the customer's problem and can be delivered"]),
        q("MATCHING", "Match each requirement to its type.", ["Wi-Fi on all floors=Functional", "No single point of failure=Non-functional (availability)", "Project finished by March=Non-functional (timeline)"], points=2),
        q("TRUE_FALSE", "Requirements should be confirmed back to the customer in writing.", TF, ["True"], explanation="Written, confirmed requirements prevent disputes later in the project."),
        q("MULTIPLE", "Which belong in a solution outline? Select all that apply.", ["Assumptions and exclusions", "Mapping of each requirement to the design", "The salesperson's commission", "Services such as installation and training"], ["Assumptions and exclusions", "Mapping of each requirement to the design", "Services such as installation and training"], points=2),
        q("SINGLE", "A must-have requirement cannot be met by any approved product. What should presales do?", ["Leave it out and hope it is not noticed", "State the gap in the proposal and explain the alternative", "Promise it will be added later", "Withdraw from the deal immediately"], ["State the gap in the proposal and explain the alternative"]),
        q("FILL_BLANK", "The list of all items, quantities and part numbers in a proposal is called the bill of ____.", ["materials", "material"]),
    ],
}

COURSES["Presales Intermediate: RFP/RFQ Responses and Technical Proposals"] = {
    "lessons": [
        """
An RFP (request for proposal) asks vendors how they would solve a problem. An RFQ (request for quotation) asks for prices for something already specified. Both have strict rules: miss one and the response can be rejected without being read.

## Read the whole document first

- Note the **deadline**, the submission method and the format (page limits, file types, signed copies).
- Find the **eligibility criteria** (turnover, certifications, past orders). If we do not meet them, raise it with your manager at once.
- Note the **evaluation method**: lowest price, technical score, or a mix.
- List every **pre-bid query** you want to raise, and the date they are due.

## The compliance matrix

A compliance matrix is a table with one row per requirement in the RFP:

- the RFP clause number and text;
- our response: **Complied**, **Partially complied** or **Not complied**;
- a remark explaining how, or why not;
- a reference to the page or datasheet that proves it.

Fill it honestly. Evaluators check claims against datasheets, and a false "Complied" can disqualify the bid or cause penalties later.
""",
        """
The technical proposal explains our solution so that an evaluator who has never met us can score it highly.

## A clear structure

1. **Executive summary:** the customer's goal, our approach, and why it is the right choice, in one page.
2. **Understanding of requirements:** show we have read and understood the RFP.
3. **Proposed solution:** architecture diagram, then each component and why it was chosen.
4. **Implementation plan:** phases, timeline, responsibilities.
5. **Support and service levels.**
6. **Compliance matrix and datasheets** (often as annexures).

## Writing tips

- Follow the order of the RFP so evaluators find answers quickly.
- Use the customer's terms, not internal jargon.
- One idea per paragraph; use tables for comparisons.
- Every claim about a product should be backed by a datasheet.
- Get a colleague to review it with fresh eyes.
""",
        """
The bill of materials (BoM) lists every item we will supply: part number, description, quantity, and often unit price. Errors in the BoM become losses or disputes after the order.

## Building a correct BoM

- Start from the design, not from an old BoM.
- Include everything needed for the solution to work: licences, power cords, rack kits, transceivers, cables, support contracts.
- Check licence terms (per user, per device, per year) and support duration.
- Confirm part numbers with the OEM or distributor configuration tool.
- Note lead times for items that take long to arrive.

## Assumptions

Write down what the price assumes, for example:

- the customer provides rack space, power and cooling;
- the site is ready on the agreed date;
- civil and electrical work are excluded;
- prices are valid for a stated number of days.

> Clear assumptions protect both the customer and the company. Unstated assumptions become arguments.
""",
        """
[PLACEHOLDER: The company will supply its proposal templates.]

Until the templates are available, use this checklist before any submission:

- Every RFP requirement appears in the compliance matrix.
- All mandatory forms are filled, signed and stamped as required.
- Eligibility documents are attached and current.
- The BoM matches the proposal text and the price schedule.
- File names, formats and sizes match the instructions.
- A second person has reviewed the whole response.
- It is submitted before the deadline, with time to spare for upload problems.
""",
    ],
    "questions": [
        q("SINGLE", "What is the difference between an RFP and an RFQ?", ["An RFP asks how you would solve a problem; an RFQ asks for prices for something already specified", "They are the same", "An RFQ is only for government buyers", "An RFP never includes prices"], ["An RFP asks how you would solve a problem; an RFQ asks for prices for something already specified"]),
        q("MULTIPLE", "What does a compliance matrix row contain? Select all that apply.", ["The RFP clause", "Complied, partially complied or not complied", "A remark and a reference to proof", "The competitor's price"], ["The RFP clause", "Complied, partially complied or not complied", "A remark and a reference to proof"], points=2),
        q("TRUE_FALSE", "It is acceptable to mark a clause 'Complied' if the product nearly meets it.", TF, ["False"], explanation="Evaluators check claims against datasheets. Use 'Partially complied' with a remark."),
        q("SINGLE", "Which item is most often forgotten in a BoM?", ["The main switch", "Licences, transceivers and support contracts", "The customer's name", "The proposal title"], ["Licences, transceivers and support contracts"]),
        q("SINGLE", "Why should the technical proposal follow the order of the RFP?", ["It looks longer", "Evaluators can find each answer quickly", "It is required by law", "It hides weak areas"], ["Evaluators can find each answer quickly"]),
        q("FILL_BLANK", "A statement such as 'the customer provides rack space and power' is called an ____ in the proposal.", ["assumption"]),
    ],
}

COURSES["Presales Advanced: Demos, POCs and Solution Design"] = {
    "lessons": [
        """
A demo shows a customer that the solution does what they need. A generic feature tour rarely wins; a demo built around the customer's own success criteria does.

## Plan the demo

1. Ask the customer what they must see to be convinced. Write down three to five success criteria.
2. Build a short story: "Here is your problem today; here is how it looks with our solution."
3. Prepare realistic data and test the full flow beforehand on the same network and equipment.
4. Prepare a backup (screenshots or a recording) in case the network fails.

## During the demo

- Restate the success criteria at the start.
- Show each one, then pause and ask "Does this meet your need?"
- Do not show features nobody asked for.
- Note every question you cannot answer and promise a written reply.

## After the demo

Send a short summary: criteria shown, questions raised, answers, and the agreed next step.
""",
        """
A proof of concept (POC) tests the solution in the customer's environment before they buy. POCs cost time and equipment, so scope them carefully.

## Agree before you start

- **Objective:** the business question the POC must answer.
- **Scope:** what is in and out (sites, users, features).
- **Entry criteria:** what must be ready before we start (rack space, network access, test users).
- **Success (exit) criteria:** measurable results, for example "roaming between access points without dropping a video call".
- **Duration:** a fixed start and end date.
- **Responsibilities:** who provides what, from both sides.
- **What happens next** if the criteria are met (usually a purchase decision).

## Run and close

Track results against each criterion. Close with a written report signed off by the customer. A POC with no agreed end often drifts on for months and ends without a decision.
""",
        """
Real customer solutions often combine products from several OEMs. The design must make them work together and be supportable.

## Integration points

For every place where two products meet, check:

- **Compatibility:** supported versions, protocols and interfaces.
- **Performance:** will one part become the bottleneck?
- **Management:** can the customer monitor everything from one place?
- **Support:** which vendor is responsible when something fails at the boundary?

## Design for operations

- Avoid single points of failure for critical services.
- Plan capacity for growth (often three to five years).
- Document IP plans, VLANs, rack layouts and cable schedules.
- Include monitoring, backup and a clear escalation path.

## Lab work

Where possible, build the critical integration in a lab before proposing it. Record configurations, versions and results so the delivery team can repeat them.
""",
        """
The best design is wasted if the audience does not understand it. Technical and business audiences need different stories.

## For business leaders

- Start with the business outcome: cost, risk, growth, compliance.
- Use one simple diagram.
- Give the total cost and the payback, not the part numbers.
- Close with a clear decision you need from them.

## For technical teams

- Show the detailed architecture and data flows.
- Explain the design choices and the alternatives you rejected.
- Be ready for deep questions on integration, security and operations.

## Handling questions

- Listen to the full question before answering.
- If you do not know, say so and commit to a written answer by a date.
- Never contradict a colleague in front of the customer; clarify afterwards.

> This module includes a live session where you present a design to a panel and receive feedback.
""",
    ],
    "questions": [
        q("SINGLE", "What makes a demo convincing?", ["Showing every feature", "Building it around the customer's own success criteria", "Making it as long as possible", "Using the vendor's default slides only"], ["Building it around the customer's own success criteria"]),
        q("MULTIPLE", "Which should be agreed before a POC starts? Select all that apply.", ["Measurable success criteria", "Fixed start and end dates", "Entry criteria and responsibilities", "The final discount"], ["Measurable success criteria", "Fixed start and end dates", "Entry criteria and responsibilities"], points=2),
        q("TRUE_FALSE", "A POC without an agreed end date usually leads to a quick decision.", TF, ["False"]),
        q("SINGLE", "In a multi-vendor design, what must be clear at every integration point?", ["Which vendor supports the boundary when it fails", "Which vendor has the larger logo", "Which product is cheapest", "Nothing beyond the price"], ["Which vendor supports the boundary when it fails"]),
        q("SINGLE", "What should a presentation to business leaders start with?", ["Part numbers", "The business outcome", "Cable schedules", "The VLAN plan"], ["The business outcome"]),
        q("SHORT_ANSWER", "A customer asks in a demo whether the product supports a feature you are not sure about. Describe how you would respond.", points=4, explanation="Model answer: do not guess; say you will confirm in writing, note the question, check with the OEM, and reply by an agreed date in the demo summary."),
    ],
}

# ---------------------------------------------------------------- Purchase

COURSES["Purchase Basic: The Procurement Process"] = {
    "lessons": [
        """
Procure-to-pay (P2P) is the chain of steps from needing something to paying for it. In an IT solutions company, most purchases are made against a customer order, so mistakes affect delivery dates and margins directly.

## The steps

1. **Requirement:** sales or projects confirm what is needed (usually from the customer order and BoM).
2. **Sourcing:** quotes from the OEM's authorised distributors or vendors.
3. **Approval:** the purchase is approved at the right level.
4. **Purchase order (PO):** a formal order sent to the vendor.
5. **Order follow-up:** confirm price, quantity and delivery date.
6. **Goods receipt:** goods are received and checked.
7. **Invoice:** the vendor's invoice is checked.
8. **Payment:** paid as per the agreed terms.

> Buying before a customer order is confirmed (stock purchase) carries risk and usually needs extra approval.
""",
        """
A purchase order is a legal document. Once the vendor accepts it, both sides are bound by its terms.

## What a PO must contain

- PO number and date.
- Vendor name, address and GSTIN.
- Our billing and delivery addresses, and GSTIN.
- Item description, part number, quantity, unit price and tax.
- Delivery date and place.
- Payment terms (for example, 30 days from invoice).
- Reference to the customer order or project, for tracking.
- Any special terms: warranty start, installation, packing.

## Common errors

- Wrong or old part numbers.
- Delivery address left as head office instead of the customer site.
- Missing licence or support duration.
- Price not matching the vendor's quote or the approved cost sheet.

Check the PO against the BoM and the quote before sending.
""",
        """
Three-way matching protects the company from paying for goods it did not receive or at a price it did not agree.

## The three documents

1. **Purchase order:** what we ordered and at what price.
2. **Goods receipt note (GRN):** what we actually received, recorded when goods arrive.
3. **Vendor invoice:** what the vendor is charging.

The invoice is approved for payment only when quantity and price agree across all three.

## When they do not match

- **Short supply:** pay only for what was received; ask for the balance or a credit note.
- **Price difference:** do not pay until the vendor corrects the invoice or an approved PO amendment exists.
- **Wrong item:** reject and return; do not record it as received.

Record every mismatch and how it was resolved.
""",
        """
[PLACEHOLDER: The company will supply its purchase policy and approval levels.]

This lesson will cover the company's own rules. Ask Purchase or Finance for:

- who can approve purchases of different values;
- when more than one quote is required;
- which vendors are on the approved list, and how a new vendor is added;
- rules for stock purchases and advances to vendors.

Until then, never commit to a vendor verbally, and never split one purchase into smaller orders to avoid an approval level.
""",
    ],
    "questions": [
        q("SINGLE", "What does 'procure-to-pay' describe?", ["The steps from needing something to paying for it", "The sales pipeline", "The payroll process", "A type of discount"], ["The steps from needing something to paying for it"]),
        q("MATCHING", "Match each document to its purpose in three-way matching.", ["Purchase order=What we ordered and at what price", "Goods receipt note=What we actually received", "Vendor invoice=What the vendor is charging"], points=2),
        q("TRUE_FALSE", "A PO becomes binding on both sides once the vendor accepts it.", TF, ["True"]),
        q("MULTIPLE", "Which must a PO include? Select all that apply.", ["Part number, quantity and price", "Delivery address and date", "Payment terms", "The customer's personal phone number"], ["Part number, quantity and price", "Delivery address and date", "Payment terms"], points=2),
        q("SINGLE", "The vendor invoices for 10 units but only 8 were received. What should happen?", ["Pay for 10 to keep the vendor happy", "Pay for 8 and ask for the balance or a credit note", "Pay nothing ever", "Record 10 as received"], ["Pay for 8 and ask for the balance or a credit note"]),
        q("TRUE_FALSE", "Splitting one purchase into smaller orders to avoid an approval level is acceptable if delivery is urgent.", TF, ["False"]),
    ],
}

COURSES["Purchase Intermediate: Vendor Management and the PO Lifecycle"] = {
    "lessons": [
        """
Choosing the right vendor is about more than the lowest price. A cheap vendor who delivers late can cost a project penalty.

## Evaluate on several factors

- **Price:** total landed cost, including freight and taxes.
- **Lead time:** how soon they can deliver, and how reliably.
- **Authorisation:** are they an authorised distributor or partner of the OEM? Unauthorised sources can mean no warranty.
- **Quality and track record:** past delivery performance, damage and return rates.
- **Commercial terms:** credit period, payment terms, return policy.
- **Compliance:** valid GSTIN, filing record, required documents.

## A simple scorecard

Score each factor (for example 1 to 5) and weight the factors that matter for the purchase. Keep the scorecard with the purchase record so the decision can be explained later.
""",
        """
After a PO is released, follow it until it is closed.

## Stages

1. **Released:** sent to the vendor.
2. **Acknowledged:** vendor confirms price, quantity and delivery date in writing.
3. **In transit:** shipped; get the tracking details and documents.
4. **Received:** goods checked and a GRN recorded.
5. **Invoiced and matched:** invoice checked against PO and GRN.
6. **Closed:** fully received, invoiced and paid.

## Follow-up habits

- Chase acknowledgement within a day or two.
- Track committed delivery dates and warn the project team early about delays.
- Keep all communication on email so there is a record.
- Review open POs every week; old open POs hide problems.
""",
        """
Orders change: customers change quantities, OEMs change part numbers, projects get delayed.

## Amendments

- Raise a formal PO amendment for any change in item, quantity, price or delivery terms.
- Get it approved at the same level as the original PO (or higher if the value rises).
- Send the amended PO to the vendor and get acknowledgement.

## Cancellations

- Check the vendor's cancellation terms first; some items (custom builds, licences) cannot be cancelled.
- Cancel in writing and get written acceptance.
- Record the reason and any charges.

> Never agree a change only by phone. If it is not in writing, it did not happen.
""",
        """
Vendor records must be accurate, or payments and tax credits go wrong.

## What to keep for each vendor

- Legal name, address and GSTIN as on the GST registration.
- PAN and bank details, verified (for example with a cancelled cheque).
- Contact persons for sales, logistics and accounts.
- Authorisation certificates from OEMs, with expiry dates.
- Agreements, credit terms and performance notes.

## Keep it current

- Verify bank detail changes by phone with a known contact before updating; fake "change of bank account" emails are a common fraud.
- Review authorisations and documents at least once a year.
- Deactivate vendors you no longer use.
""",
    ],
    "questions": [
        q("MULTIPLE", "Which factors should be used to evaluate a vendor? Select all that apply.", ["Lead time and reliability", "OEM authorisation", "Total landed cost", "Whether they are a friend of the buyer"], ["Lead time and reliability", "OEM authorisation", "Total landed cost"], points=2),
        q("SINGLE", "Why does OEM authorisation matter?", ["Unauthorised sources may mean no warranty or support", "It makes the price higher", "It is only needed for government orders", "It does not matter"], ["Unauthorised sources may mean no warranty or support"]),
        q("MATCHING", "Match each PO stage to what happens.", ["Acknowledged=Vendor confirms price, quantity and date", "Received=Goods are checked and a GRN is recorded", "Closed=Fully received, invoiced and paid"], points=2),
        q("TRUE_FALSE", "A change to a PO agreed on the phone does not need a written amendment.", TF, ["False"]),
        q("SINGLE", "A vendor emails asking to change their bank account. What should you do first?", ["Update it immediately", "Verify by phone with a known contact before updating", "Ignore all emails", "Pay into both accounts"], ["Verify by phone with a known contact before updating"]),
        q("FILL_BLANK", "The vendor's 15-character GST registration number is called the ____.", ["GSTIN"]),
    ],
}

COURSES["Purchase Advanced: OEM and Channel Compliance"] = {
    "lessons": [
        """
Most IT products reach us through a channel: the OEM (manufacturer) sells through authorised distributors to partners like us, who sell to end customers. Each OEM runs a partner programme with rules we must follow.

## Typical programme elements

- **Partner levels** based on certifications and sales volume.
- **Authorised product lines:** we may resell only the lines we are authorised for.
- **Distributor of record:** many OEMs require purchase through specific distributors.
- **Certification requirements:** trained engineers and salespeople.
- **Rebates and incentives** linked to targets and correct reporting.

> Breaking programme rules can cost the company its partner status, rebates and future pricing.
""",
        """
Two common channel processes affect purchase directly.

## Deal registration

The partner registers an opportunity with the OEM early in the sales cycle. If approved, it can give us protected pricing for that customer. Rules usually include:

- registration before the deal is far advanced;
- accurate end-customer details;
- an expiry date, after which it must be renewed.

## Special pricing (bid pricing)

For competitive deals the OEM may approve a special price for a named end customer and project. Conditions usually include:

- the product must be delivered to that end customer only;
- the price is valid for a limited time and quantity;
- the OEM may ask for proof of delivery and invoice to the end customer.

Selling specially priced stock to another customer is a serious breach.
""",
        """
OEMs and distributors can audit how special pricing and programmes were used. Keep evidence for every deal that used them.

## Evidence to keep

- Deal registration and special pricing approvals.
- Our PO to the distributor, referencing the approval number.
- Our invoice to the named end customer.
- Proof of delivery to the end customer's address.
- Serial numbers supplied, matched to the end customer.

## Good practice

- Store the evidence in one folder per deal, named consistently.
- Keep it for the period the OEM agreement requires.
- Make sure the end customer on our invoice matches the approval exactly.
""",
        """
[PLACEHOLDER: The company will supply its OEM and channel terms.]

This lesson will summarise the programmes the company belongs to. Until then, before ordering under a special price or registration:

- Confirm the approval is current and covers the exact part numbers and quantity.
- Confirm the end customer and delivery address match the approval.
- If anything does not match, stop and ask your manager or the OEM channel manager before ordering.
""",
    ],
    "questions": [
        q("SINGLE", "What is a 'distributor of record'?", ["The distributor through which the OEM requires a partner to buy", "Any shop that sells the product", "The end customer", "A logistics company"], ["The distributor through which the OEM requires a partner to buy"]),
        q("SINGLE", "What does approved deal registration usually give the partner?", ["Protected pricing for that customer", "Free products", "A permanent discount on everything", "Exemption from GST"], ["Protected pricing for that customer"]),
        q("TRUE_FALSE", "Stock bought under special pricing for one end customer may be sold to another customer if it is still unused.", TF, ["False"], explanation="Special pricing is tied to the named end customer and project."),
        q("MULTIPLE", "Which evidence should be kept for a special-pricing deal? Select all that apply.", ["The approval and our PO referencing it", "Our invoice to the named end customer", "Proof of delivery and serial numbers", "The salesperson's travel bills"], ["The approval and our PO referencing it", "Our invoice to the named end customer", "Proof of delivery and serial numbers"], points=2),
        q("SINGLE", "The end customer name on our invoice differs from the special-price approval. What should you do?", ["Order anyway", "Stop and resolve it with the manager or OEM before ordering", "Change the invoice later", "Use a different distributor"], ["Stop and resolve it with the manager or OEM before ordering"]),
        q("FILL_BLANK", "The manufacturer of a product, such as a switch or server brand, is called the ____.", ["OEM", "original equipment manufacturer"]),
    ],
}

# ---------------------------------------------------------------- Accounts

COURSES["Accounts Basic: Billing, Invoicing and GST"] = {
    "lessons": [
        """
An invoice is both a request for payment and a tax document. An incorrect invoice can delay payment and can deny the customer their GST input tax credit.

## Fields on a GST tax invoice

- Supplier's name, address and GSTIN.
- A unique, consecutive invoice number and the invoice date.
- Customer's name, address and GSTIN (for registered customers).
- Place of supply.
- Description of goods or services, with HSN or SAC code.
- Quantity, unit and taxable value.
- GST rate and tax amount, shown as CGST and SGST, or IGST.
- Total invoice value.
- Signature (or digital signature) of the supplier.

## Before an invoice goes out

- Match it to the customer's PO: items, quantities, prices, PO number.
- Check the customer's GSTIN and billing address.
- Attach the documents the customer asks for (delivery proof, installation report).
""",
        """
GST (Goods and Services Tax) is charged on most supplies in India. Which type of GST applies depends on where the supply is made.

## Three components

- **CGST** (Central GST) and **SGST** (State GST): both charged, in equal halves, when the supplier and the place of supply are in the **same state**.
- **IGST** (Integrated GST): charged when the supply is **between states** (or an import).

Example: a supplier in Maharashtra sells to a customer in Maharashtra: CGST plus SGST. To a customer in Karnataka: IGST.

## Input tax credit

A registered business can usually reduce the GST it pays by the GST it was charged on its purchases. This only works if the supplier's invoice is correct and the supplier files its returns. That is why our own invoices must be accurate: our customers depend on them.

> GST rates and rules change through official notifications. Always confirm the current rate for a product with the Accounts team.
""",
        """
Every item on a GST invoice carries a classification code.

- **HSN** (Harmonised System of Nomenclature) codes classify **goods**, such as servers, switches and cables.
- **SAC** (Services Accounting Code) codes classify **services**, such as installation, maintenance and support.

## Why codes matter

- The GST rate depends on the code.
- A wrong code can mean the wrong tax, interest and penalties.
- Customers and auditors check them.

## In practice

- Use the codes maintained by Accounts for each product family; do not guess.
- When a quote combines goods and services, show them as separate lines with their own codes.
- Ask Accounts before using a code for a new type of product or service.
""",
        """
Two electronic documents are linked to invoicing and moving goods.

## E-invoice

Businesses above a turnover limit set by the government must report B2B invoices to the Invoice Registration Portal (IRP). The portal returns an **IRN** (invoice reference number) and a **QR code** that must appear on the invoice. An invoice that must be an e-invoice but is not reported is not valid for the customer's input tax credit. The turnover limit has been lowered several times; confirm the current rule with Accounts.

## E-way bill

An e-way bill is generated on the GST portal before goods above a set value are moved, for example from our warehouse to a customer site. It records the consignor, consignee, goods, value and vehicle. The vehicle carries it during transport. The value limit and validity rules are set by notification; Accounts and Logistics keep the current figures.

> Raising these documents with wrong details is as serious as raising a wrong invoice. If in doubt, ask before generating.
""",
    ],
    "questions": [
        q("MULTIPLE", "Which must appear on a GST tax invoice? Select all that apply.", ["Supplier's GSTIN", "HSN or SAC code", "Place of supply", "The salesperson's mobile number"], ["Supplier's GSTIN", "HSN or SAC code", "Place of supply"], points=2),
        q("SINGLE", "A Maharashtra supplier sells to a customer in Karnataka. Which GST applies?", ["CGST and SGST", "IGST", "No GST", "Only SGST"], ["IGST"]),
        q("SINGLE", "A Maharashtra supplier sells to a customer in Maharashtra. Which GST applies?", ["CGST and SGST", "IGST", "Customs duty", "Only CGST"], ["CGST and SGST"]),
        q("MATCHING", "Match each code to what it classifies.", ["HSN=Goods", "SAC=Services"], points=2),
        q("TRUE_FALSE", "A customer may lose input tax credit if our invoice is incorrect.", TF, ["True"]),
        q("FILL_BLANK", "The reference number returned by the Invoice Registration Portal for an e-invoice is the ____.", ["IRN", "invoice reference number"]),
    ],
}

COURSES["Accounts Intermediate: Receivables, Payables and Reconciliation"] = {
    "lessons": [
        """
Receivables are amounts customers owe us. Unpaid invoices tie up cash that the company needs to pay vendors and salaries.

## The ageing report

An ageing report groups unpaid invoices by how long they are overdue: not yet due, 1 to 30 days, 31 to 60, 61 to 90, and over 90 days. The older the debt, the harder it is to collect.

## A collection routine

1. Before the due date: confirm the customer has the invoice and all supporting documents.
2. On the due date: a polite reminder with a copy of the invoice.
3. After the due date: a call to the accounts contact; find out what is blocking payment.
4. Escalate: involve the account manager, then senior management, following company policy.

## Common blockers

- Missing delivery proof or installation sign-off.
- Invoice not matching the customer's PO.
- GSTIN or address errors.
- Partial delivery disputes.

Fix the blocker; a reminder alone does not.
""",
        """
Payables are amounts we owe vendors. Paying too early hurts our cash; paying late hurts our relationships and can stop supplies.

## Managing payables

- Record each approved invoice with its due date from the payment terms.
- Plan payments weekly against cash available.
- Pay only invoices that pass three-way matching (PO, GRN and invoice).
- Take early-payment discounts only when they are worth more than the cash cost.

## Controls

- Separate duties: the person who approves an invoice should not be the one who releases payment.
- Verify any change in vendor bank details independently.
- Keep a record of every payment against its invoice.
""",
        """
Reconciliation proves that two records agree, and finds errors early.

## Bank reconciliation

Compare the company's cash book with the bank statement for the same period. Differences usually come from:

- cheques issued but not yet presented;
- deposits recorded but not yet credited by the bank;
- bank charges and interest not yet recorded;
- errors in either record.

List each difference and explain it. Unexplained differences must be investigated.

## Ledger reconciliations

- **Customer accounts:** match our ledger with the customer's statement.
- **Vendor accounts:** match our ledger with the vendor's statement.
- **GST:** match tax on our books with the returns and with what suppliers have reported.

Do reconciliations every month, not only at year end.

> This module includes a practice lab: reconcile a sample cash book with a bank statement.
""",
        """
Not every invoice is final. Credit and debit notes adjust invoices that have already been issued.

## Credit note

Issued by the supplier to reduce the amount owed, for example when:

- goods are returned;
- the price was charged too high;
- a discount is given after invoicing.

## Debit note

Issued to increase the amount owed, for example when the price was charged too low or extra quantity was supplied.

## Rules of thumb

- Always reference the original invoice.
- Show the GST adjustment correctly.
- GST law sets time limits for issuing credit notes that adjust tax; check with Accounts before issuing one for an old invoice.
- Never "fix" an invoice by editing or deleting it after it has been issued.
""",
    ],
    "questions": [
        q("SINGLE", "What does an ageing report show?", ["Unpaid invoices grouped by how long they are overdue", "Employee ages", "Stock expiry dates", "Vendor ratings"], ["Unpaid invoices grouped by how long they are overdue"]),
        q("SINGLE", "A customer has not paid because the installation sign-off is missing. What should you do?", ["Send more reminders", "Get the sign-off to the customer", "Write off the invoice", "Stop supplying all customers"], ["Get the sign-off to the customer"]),
        q("TRUE_FALSE", "The person who approves a vendor invoice should also be the person who releases its payment.", TF, ["False"], explanation="Separating these duties reduces the risk of fraud and error."),
        q("MULTIPLE", "Which commonly cause differences in a bank reconciliation? Select all that apply.", ["Cheques issued but not yet presented", "Bank charges not yet recorded", "Deposits not yet credited", "The office being closed on Sunday"], ["Cheques issued but not yet presented", "Bank charges not yet recorded", "Deposits not yet credited"], points=2),
        q("MATCHING", "Match each note to when it is used.", ["Credit note=Reduce the amount owed, e.g. goods returned", "Debit note=Increase the amount owed, e.g. price charged too low"], points=2),
        q("TRUE_FALSE", "An issued invoice with an error should be corrected by editing it in place.", TF, ["False"]),
    ],
}

COURSES["Accounts Advanced: Financial Reporting Basics"] = {
    "lessons": [
        """
Two statements describe a company's finances.

## Profit and loss statement (P&L)

Shows performance over a period, such as a month or a year:

- **Revenue:** sales.
- **Cost of goods sold:** what the products and services we sold cost us.
- **Gross profit:** revenue minus cost of goods sold.
- **Operating expenses:** salaries, rent, travel, marketing.
- **Operating profit,** then interest and tax, then **net profit**.

## Balance sheet

Shows the position on one date:

- **Assets:** what the company owns or is owed (cash, receivables, stock, equipment).
- **Liabilities:** what it owes (payables, loans, taxes due).
- **Equity:** what belongs to the owners.

Assets always equal liabilities plus equity.
""",
        """
Two measures matter a lot in an IT solutions business.

## Gross margin

Gross margin percentage = (revenue minus cost) ÷ revenue × 100.

Example: we sell a solution for ₹10,00,000 that cost us ₹8,50,000. Gross profit is ₹1,50,000, and the gross margin is 15%.

Hardware resale often has thin margins; services and support usually carry higher margins. That is why services matter to profitability.

## Working capital

Working capital = current assets minus current liabilities.

In practice it is driven by:

- how quickly customers pay us (receivables);
- how long stock sits before it is sold;
- how long we take to pay vendors (payables).

A company can be profitable and still run out of cash if customers pay slowly while vendors must be paid quickly.
""",
        """
Month-end close is the routine that makes the month's numbers reliable.

## A typical checklist

1. All sales invoices for the month are raised.
2. All vendor invoices received are recorded; accruals made for goods received but not yet invoiced.
3. Bank and key ledger reconciliations are complete.
4. Stock is counted or checked against records.
5. GST and TDS entries are checked against the returns to be filed.
6. Unusual items are reviewed and explained.
7. Management reports are prepared and reviewed.

## Supporting audits

Auditors test whether the accounts are true and fair. Help them by keeping:

- signed POs, invoices, GRNs and delivery proofs filed by period;
- reconciliations with explanations;
- approvals for discounts, write-offs and unusual payments.
""",
        """
[PLACEHOLDER: The company will supply its reporting calendar.]

This lesson will list the company's monthly, quarterly and annual deadlines: management reports, GST returns, TDS returns, board meetings and audits. Until it is available, ask the Finance team for:

- the monthly close date and who signs off;
- statutory filing due dates the team tracks;
- the format of management reports.
""",
    ],
    "questions": [
        q("SINGLE", "What does a profit and loss statement show?", ["Performance over a period", "The position on one date", "Only cash in the bank", "Employee details"], ["Performance over a period"]),
        q("SINGLE", "What is always true of a balance sheet?", ["Assets equal liabilities plus equity", "Revenue equals profit", "Cash equals equity", "Liabilities are always zero"], ["Assets equal liabilities plus equity"]),
        q("SINGLE", "A solution sells for ₹10,00,000 and costs ₹8,50,000. What is the gross margin?", ["8.5%", "15%", "85%", "1.5%"], ["15%"], explanation="(10,00,000 − 8,50,000) ÷ 10,00,000 × 100 = 15%."),
        q("TRUE_FALSE", "A profitable company can still run out of cash.", TF, ["True"], explanation="If customers pay slowly while vendors must be paid quickly, cash runs short."),
        q("MULTIPLE", "Which belong on a month-end close checklist? Select all that apply.", ["All sales invoices raised", "Bank reconciliation done", "Accruals for goods received but not invoiced", "Planning the office party"], ["All sales invoices raised", "Bank reconciliation done", "Accruals for goods received but not invoiced"], points=2),
        q("FILL_BLANK", "Current assets minus current liabilities is called working ____.", ["capital"]),
    ],
}
