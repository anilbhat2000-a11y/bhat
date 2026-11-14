"""Logistics, Compliance and Government Sales."""
from . import q, TF

COURSES = {}

# ---------------------------------------------------------------- Logistics

COURSES["Logistics Basic: Dispatch and Documentation"] = {
    "lessons": [
        """
Goods moving on the road without the right documents can be stopped, fined or delayed. Every dispatch needs a document set, checked before the vehicle leaves.

## The usual document set

- **Tax invoice** (for a sale) or **delivery challan** (for movements that are not sales, such as goods sent for demo, repair or on approval).
- **E-way bill**, when the value and type of movement require it. Logistics and Accounts keep the current rules.
- **Packing list:** what is in each box, with serial numbers.
- **Lorry receipt (LR) or consignment note** from the transporter.
- Any documents the customer asked for, such as a copy of their PO.

## Before the vehicle leaves

- Quantities and serial numbers on the packing list match the boxes.
- Invoice, e-way bill and packing list show the same items, values and addresses.
- The vehicle number on the e-way bill matches the vehicle.
""",
        """
IT equipment is valuable and easily damaged. Good packing prevents claims and returns.

## Packing

- Use the original OEM cartons where possible; they are designed for the product.
- Pack heavy items at the bottom; never stack on top of server cartons that say not to.
- Fill empty space so items cannot move.
- Seal boxes with company tape so tampering is visible.

## Labelling

Each box should show:

- customer name, delivery address, contact person and phone;
- our invoice or challan number;
- box number, for example "Box 3 of 7";
- handling marks: fragile, this way up, keep dry.

> A photo of the packed and labelled boxes before dispatch is cheap insurance if a damage claim arises.
""",
        """
Proof of delivery (POD) shows that the customer received the goods. Without it, collecting payment can be difficult.

## A good POD records

- the customer's name and address;
- our invoice or challan number;
- the number of boxes received, and their condition;
- date and time of receipt;
- name, signature and, where possible, the stamp of the person receiving.

## In practice

- The receiver should count the boxes and note any visible damage before signing.
- If a box is damaged, write "received damaged" on the POD and take photos.
- Send a scanned copy of the POD to Accounts the same day; many customers will not pay without it.
""",
        """
Problems found at delivery must be reported quickly, or the transporter and insurer may refuse the claim.

## What to do

1. **Record it on the POD:** "1 box damaged", "2 boxes short".
2. **Take photos** of the outer box, the packing and the product.
3. **Do not open or install** a damaged unit without instructions.
4. **Inform** Logistics and the account manager the same day.
5. **Notify** the transporter in writing, within the time stated in their terms.
6. **Raise an insurance claim** if the goods were insured, with the photos, POD and invoice.

## Afterwards

Arrange a replacement with Purchase and agree the new delivery date with the customer. Track the claim until it is settled.
""",
    ],
    "questions": [
        q("SINGLE", "Goods are being sent to a customer for a demo, not sold. Which document usually goes with them instead of a tax invoice?", ["Delivery challan", "Credit note", "Purchase order", "Offer letter"], ["Delivery challan"]),
        q("MULTIPLE", "Which should match before a vehicle leaves? Select all that apply.", ["Items and values on the invoice and e-way bill", "Serial numbers on the packing list and the boxes", "The vehicle number on the e-way bill and the vehicle", "The driver's favourite route"], ["Items and values on the invoice and e-way bill", "Serial numbers on the packing list and the boxes", "The vehicle number on the e-way bill and the vehicle"], points=2),
        q("SINGLE", "What is the main purpose of a proof of delivery?", ["To show the customer received the goods", "To order more stock", "To calculate GST", "To book a vehicle"], ["To show the customer received the goods"]),
        q("TRUE_FALSE", "If a box arrives damaged, the receiver should sign the POD as normal and report it later.", TF, ["False"], explanation="Write 'received damaged' on the POD and take photos at once."),
        q("FILL_BLANK", "A label such as 'Box 3 of ____' helps the receiver check nothing is missing when 7 boxes are sent.", ["7", "seven"]),
        q("SINGLE", "Which is the best practice when packing a server?", ["Use the original OEM carton where possible", "Use any box and no filling", "Stack other boxes on top regardless of markings", "Leave it unsealed"], ["Use the original OEM carton where possible"]),
    ],
}

COURSES["Logistics Intermediate: Warehousing and Inventory Movement"] = {
    "lessons": [
        """
Goods receipt is the first control point for stock. What is recorded here drives payment to the vendor and delivery to the customer.

## Steps

1. **Check documents:** the vendor's invoice or challan and our PO number.
2. **Count boxes** against the transporter's documents before signing.
3. **Inspect** for damage; photograph any.
4. **Open and verify** contents: part numbers, quantities, serial numbers.
5. **Record the goods receipt note (GRN)** in the system against the PO.
6. **Label and store** the goods in the right location.

## Mismatches

- Record only what was actually received.
- Inform Purchase at once about shortages, wrong items or damage, so the vendor can be held to the terms.
""",
        """
Stock records are only useful if they match what is on the shelf.

## Every movement is recorded

- **In:** goods receipt from vendors, returns from customers, transfers from other branches.
- **Out:** dispatches to customers, transfers to other branches, items sent for repair or demo.
- **Internal:** moving items between locations in the warehouse.

## Good practice

- Record the movement when it happens, not at the end of the day.
- Use location codes (rack, shelf, bin) so items can be found.
- Issue stock on a **first in, first out** basis unless a specific serial number is needed.
- Keep demo and repair stock separate from saleable stock.

> Under GST, moving stock between branches with different GSTINs (for example in different states) is generally treated as a supply and needs proper documents. Check with Accounts before any inter-state transfer.
""",
        """
A cycle count checks part of the stock every week or month, instead of counting everything once a year.

## How to run one

1. Choose the items to count: high-value items more often, slow movers less often.
2. Count without looking at the system quantity, so the count is not influenced.
3. Compare the count with the system.
4. Investigate differences: unrecorded dispatches, receipts posted to the wrong item, damage, theft.
5. Adjust the system only after investigation and approval.

## Why it matters

Regular counts find errors while they are small and the cause can still be traced. A difference found a year later is usually impossible to explain.

> This module includes a practice lab: run a cycle count on a sample stock list and explain the differences.
""",
        """
Most IT equipment carries a unique serial number. Tracking serials links each unit to its customer, warranty and support.

## Why serials matter

- Warranty and OEM support are tied to the serial number.
- OEM special pricing often requires proof of which serials went to which customer.
- Returns and replacements must be matched to the original unit.

## Practice

- Scan or record serials at goods receipt.
- Record serials again at dispatch, against the customer invoice.
- Note serials on the packing list and the POD.
- When a faulty unit is replaced, record both the old and new serial numbers.
""",
    ],
    "questions": [
        q("SINGLE", "When recording a goods receipt, what quantity should be entered?", ["What was actually received", "What was ordered", "What the vendor invoiced", "A rounded figure"], ["What was actually received"]),
        q("SINGLE", "What does 'first in, first out' mean?", ["The oldest stock is issued first", "The newest stock is issued first", "Stock is never issued", "The cheapest stock is issued first"], ["The oldest stock is issued first"]),
        q("TRUE_FALSE", "In a cycle count, the counter should look at the system quantity first so they know what to expect.", TF, ["False"], explanation="Counting blind keeps the count independent."),
        q("MULTIPLE", "Why track serial numbers? Select all that apply.", ["Warranty and support are tied to them", "OEM special pricing may need proof of which serials went to which customer", "Returns must match the original unit", "They make boxes lighter"], ["Warranty and support are tied to them", "OEM special pricing may need proof of which serials went to which customer", "Returns must match the original unit"], points=2),
        q("SINGLE", "A cycle count shows 2 fewer switches than the system. What should happen next?", ["Adjust the system immediately", "Investigate the difference before any approved adjustment", "Ignore it", "Order 2 more switches"], ["Investigate the difference before any approved adjustment"]),
        q("FILL_BLANK", "The document recorded when goods arrive at the warehouse is the goods receipt ____.", ["note", "GRN"]),
    ],
}

COURSES["Logistics Advanced: Shipping, Transport and Multi-site Delivery"] = {
    "lessons": [
        """
Large projects, such as rolling out equipment to 50 branches, succeed or fail on logistics planning.

## Build a delivery plan

- List every site with address, contact, access times and any restrictions (lifts, loading bay, security passes).
- Group sites by route or region.
- Agree the delivery sequence with the project team, so installation engineers arrive after the goods.
- Decide whether to ship directly from the distributor or through our warehouse (staging), for example to pre-configure devices.
- Build a tracker: site, items, dispatch date, expected delivery, delivered, POD received.

## Communicate

Confirm each delivery with the site contact a day or two before. A delivery that arrives to a locked office is a wasted trip.
""",
        """
The right transport and insurance protect high-value equipment.

## Choosing transport

- **Courier or express:** small, urgent, high-value items; door to door.
- **Part load:** medium consignments sharing a truck; cheaper, slower, more handling.
- **Full truck load:** large consignments; fewer handling points, safer for big items.

Consider value, fragility, distance, deadline and the site's ability to receive a large vehicle.

## Transit insurance

- Check whether goods are covered under the company's transit policy or the transporter's.
- Make sure the declared value matches the invoice.
- Know the claim procedure and time limits before something goes wrong.
""",
        """
Moving goods between states adds tax and document requirements.

## Points to check

- The **e-way bill** must be generated before movement, with correct consignor and consignee GSTINs, value and vehicle details. Validity depends on distance; if a delay means it will expire, it must be extended in time.
- **Sales to another state** carry IGST on the invoice.
- **Transfers between our own branches in different states** are generally treated as supplies under GST and need a tax invoice and e-way bill.
- Goods may be checked on the way; documents must be with the vehicle.

> Rules on values, distances and validity are set by notification and can change. Logistics and Accounts maintain the current checklist.
""",
        """
Measure delivery performance so it can improve.

## Useful measures

- **On-time delivery:** deliveries made by the promised date ÷ total deliveries.
- **Delivered complete:** deliveries with no shortage ÷ total.
- **Damage rate:** deliveries with damage ÷ total.
- **POD turnaround:** days from delivery to POD received by Accounts.
- **Cost per delivery** by transport type and region.

## Using the numbers

Review monthly with transporters. Share the scores; move volume to the transporters who perform well; agree improvement plans with those who do not.
""",
    ],
    "questions": [
        q("MULTIPLE", "What should a multi-site delivery plan record for each site? Select all that apply.", ["Contact person and access times", "Restrictions such as lifts or security passes", "Expected delivery and POD status", "The site's favourite colour"], ["Contact person and access times", "Restrictions such as lifts or security passes", "Expected delivery and POD status"], points=2),
        q("SINGLE", "Which transport mode is usually best for small, urgent, high-value items?", ["Courier or express", "Full truck load", "Part load by rail", "Postal parcel without tracking"], ["Courier or express"]),
        q("TRUE_FALSE", "Transfers between our own branches in different states generally need a tax invoice and e-way bill.", TF, ["True"]),
        q("SINGLE", "An e-way bill will expire before the delayed vehicle arrives. What should happen?", ["Extend it in time as the rules allow", "Ignore it", "Tear it up", "Create a new invoice"], ["Extend it in time as the rules allow"]),
        q("FILL_BLANK", "Deliveries made by the promised date divided by total deliveries is the on-____ delivery rate.", ["time"]),
        q("SINGLE", "Why should the declared value for transit insurance match the invoice?", ["So a claim is paid at the right value", "To reduce GST", "To speed up the truck", "It does not matter"], ["So a claim is paid at the right value"]),
    ],
}

# ---------------------------------------------------------------- Compliance

COURSES["Compliance Basic: Code of Conduct and Company Policies"] = {
    "lessons": [
        """
[PLACEHOLDER: The company will supply its Code of Conduct document.]

Until the company's own Code is uploaded, this lesson covers the principles almost every code shares:

- **Act honestly and lawfully** in every dealing with customers, vendors, colleagues and government.
- **Treat people with respect.** No harassment or discrimination.
- **Protect company assets and information,** including customer data.
- **Avoid conflicts of interest,** and declare any you have.
- **Keep accurate records.** Never falsify documents, timesheets or reports.
- **Speak up** if you see something wrong.

> When the Code is supplied, read it in full and acknowledge it when asked. If a situation is not covered, ask: would I be comfortable if this appeared in the newspaper?
""",
        """
Sales and purchase roles face pressure from gifts, hospitality and conflicts of interest. Clear habits protect you and the company.

## Conflicts of interest

A conflict exists when your personal interest could affect, or look as though it affects, your work decisions. Examples:

- a relative owns a vendor you select;
- you hold shares in a competitor or supplier;
- you do paid work for a customer outside your job.

Declare it to your manager in writing and step back from the decision.

## Gifts and hospitality

- Small, occasional, openly given courtesies may be acceptable within company limits [PLACEHOLDER: company gift limit].
- Never accept cash, or anything given to influence a decision.
- Never offer anything to a government official to win or speed up business.

## Bribery

Offering, giving, asking for or accepting a bribe is a crime in India, including through an agent. If anyone asks for a payment to "help" a deal, refuse and report it.
""",
        """
Everyone handles information that must be protected.

## Simple rules

- Use strong passwords and multi-factor authentication; never share them.
- Lock your screen when you step away.
- Do not send customer or company data to personal email or messaging apps.
- Be suspicious of unexpected links and attachments, even from known names.
- Report a lost laptop or phone immediately.
- Share documents only with people who need them.

> Personal data about customers and employees also falls under data protection law. The intermediate course covers this in detail.
""",
        """
[PLACEHOLDER: The company will supply its whistle-blower and grievance process.]

Until then:

- Raise concerns with your manager, HR or senior management.
- If your concern involves your manager, go to the next level or to HR.
- Raise concerns in good faith; you do not need proof, only an honest belief.
- Retaliation against someone who raises a concern in good faith is not acceptable.

When the company's process is supplied, it will list the contact points and how confidentiality is protected.
""",
    ],
    "questions": [
        q("SINGLE", "A relative owns a vendor you are evaluating. What should you do?", ["Declare it in writing and step back from the decision", "Choose them, since you trust them", "Keep it quiet", "Reject them without explanation"], ["Declare it in writing and step back from the decision"]),
        q("TRUE_FALSE", "Giving a small payment to a government official to speed up an approval is acceptable if it is customary.", TF, ["False"], explanation="It is a bribe and a crime."),
        q("MULTIPLE", "Which are good information security habits? Select all that apply.", ["Lock your screen when away", "Report a lost laptop immediately", "Use multi-factor authentication", "Forward customer data to personal email to work from home"], ["Lock your screen when away", "Report a lost laptop immediately", "Use multi-factor authentication"], points=2),
        q("SINGLE", "A vendor offers you cash to approve their invoice faster. What should you do?", ["Refuse and report it", "Accept a small amount", "Ask for more", "Ignore it and approve"], ["Refuse and report it"]),
        q("TRUE_FALSE", "You need proof before you can raise a concern.", TF, ["False"], explanation="An honest belief, raised in good faith, is enough."),
        q("FILL_BLANK", "When your personal interest could affect a work decision, it is called a conflict of ____.", ["interest"]),
    ],
}

COURSES["Compliance Intermediate: Data Protection and Statutory Requirements"] = {
    "lessons": [
        """
India's Digital Personal Data Protection Act, 2023 (DPDP Act) governs digital personal data: information about an identifiable person, such as name, phone number, email, ID numbers or location.

## Key terms

- **Data principal:** the person the data is about.
- **Data fiduciary:** the organisation that decides why and how the data is processed (for customer and employee data, usually us).
- **Data processor:** someone processing data on the fiduciary's behalf, such as a cloud or payroll provider.

## Core duties of a data fiduciary

- Process personal data only for a lawful purpose, with valid **consent** or another ground the Act allows.
- Give a clear **notice** of what data is collected and why.
- Collect only what is needed, and keep it accurate.
- Protect it with reasonable **security safeguards**.
- Delete it when the purpose is served, unless law requires keeping it.
- Report **personal data breaches** as the law requires.

> The Act's rules and timelines are set out in detailed rules issued by the government. Your company's data protection contact will explain how they apply to your work.
""",
        """
Turn the principles into daily habits.

## Collect

- Ask only for data needed for the task. A demo registration does not need a date of birth.
- Tell people why you are collecting it.

## Use

- Use data only for the purpose it was collected for.
- Do not add customer contacts to marketing lists without a valid basis.

## Store and share

- Keep personal data only in approved company systems, not on personal devices or messaging apps.
- Share only with colleagues and processors who need it.
- When a vendor processes data for us, there should be an agreement covering protection.

## Requests from individuals

People have rights, such as to access, correct or erase their data and to raise grievances. Pass any such request to the data protection contact at once; do not handle it alone.
""",
        """
A personal data breach is any unauthorised access, sharing, loss or destruction of personal data. Examples: an email with a customer list sent to the wrong person, a lost unencrypted laptop, a hacked account.

## If you suspect a breach

1. **Do not hide it** or try to fix it quietly.
2. **Report immediately** to your manager and the IT or data protection contact.
3. **Contain** if you safely can: recall the email, change the password, disconnect the device from the network.
4. **Preserve evidence:** do not delete logs or emails.
5. Let the response team assess and handle any notification required by law.

> Speed matters. The law expects breaches to be reported promptly, and the company cannot meet that duty if it does not know.
""",
        """
[PLACEHOLDER: The company will supply the statutory obligations relevant to it.]

This lesson will list the registers, returns and filings the company must maintain, and who owns each. Typical areas for an Indian company include:

- **Tax:** GST returns, TDS returns, income tax.
- **Employment:** provident fund, ESI, professional tax, payment of wages, leave records.
- **Company law:** statutory registers, annual filings, board meetings.
- **Safety and premises:** shops and establishments registration, fire safety.

Know which of these your role contributes to, and the deadlines you must meet.
""",
    ],
    "questions": [
        q("MATCHING", "Match each DPDP Act term to its meaning.", ["Data principal=The person the data is about", "Data fiduciary=The organisation that decides why and how data is processed", "Data processor=Someone processing data on the fiduciary's behalf"], points=3),
        q("SINGLE", "Which is personal data?", ["A customer contact's mobile number", "The model number of a switch", "A product price list", "The company's GST rate table"], ["A customer contact's mobile number"]),
        q("TRUE_FALSE", "You should collect as much personal data as possible in case it is useful later.", TF, ["False"], explanation="Collect only what is needed for the purpose."),
        q("SINGLE", "You emailed a customer list to the wrong address. What is the first thing to do?", ["Report it immediately to your manager and the data protection contact", "Wait and see if anyone notices", "Delete your sent email", "Email the list again to the right person only"], ["Report it immediately to your manager and the data protection contact"]),
        q("MULTIPLE", "Where may customer personal data be kept? Select all that apply.", ["Approved company systems", "A personal messaging app", "A personal USB drive at home", "Shared only with colleagues who need it"], ["Approved company systems", "Shared only with colleagues who need it"], points=2),
        q("SHORT_ANSWER", "A customer asks you to delete all the personal data we hold about them. Explain what you would do.", points=4, explanation="Model answer: acknowledge the request, do not delete anything yourself, pass it at once to the data protection contact with the customer's details, and let them verify identity, check legal retention needs and respond."),
    ],
}

COURSES["Compliance Advanced: Contract Compliance"] = {
    "lessons": [
        """
Contracts with customers, OEMs and vendors define what we must deliver and what happens if we do not. Read the key clauses before signing and before delivery.

## Clauses to find in every contract

- **Scope:** exactly what we supply, including services. Anything outside scope is extra.
- **Delivery and acceptance:** dates, location, and how the customer accepts the work.
- **Warranty:** what is covered, for how long, and from when (delivery, installation or acceptance).
- **Service levels (SLAs):** response and resolution times, uptime commitments.
- **Penalties or liquidated damages:** amounts payable for delay or SLA failures.
- **Liability:** caps on how much either side can be liable for.
- **Payment terms:** milestones, retention, documents needed for payment.
- **Termination:** when and how either side can end the contract.
""",
        """
Signing the contract is the start. Track each obligation until it is met.

## An obligation register

For each contract, list:

- the obligation (for example, "deliver 40 access points");
- the clause number;
- the owner in our team;
- the due date;
- the evidence that it was met (POD, installation report, acceptance certificate);
- the status.

## Back-to-back

Our obligations to the customer often depend on OEMs and vendors. Make sure their terms (warranty length, delivery times, SLAs) are at least as good as what we promised. If the customer gets a three-year warranty and the OEM gives one year, the gap is our risk.
""",
        """
Some terms carry more risk than usual and need approval before we accept them.

## Warning signs

- **Unlimited liability,** or liability far above the contract value.
- **Penalties without a cap,** or penalties for things outside our control.
- **Warranties longer than the OEM's.**
- **Acceptance** that depends only on the customer's opinion, with no objective test.
- **Payment** tied to events we do not control.
- **Unclear scope,** such as "all other items required".
- **Intellectual property** clauses giving away rights we do not own.

When you see these, do not agree on the spot. Refer the contract for review following the approval matrix.
""",
        """
[PLACEHOLDER: The company will supply its contract approval matrix.]

This lesson will show who can approve which contracts and deviations. Until then:

- Do not sign or accept any contract or PO terms beyond your authority.
- Send non-standard terms to your manager and Finance before accepting.
- Keep the signed contract and all amendments in the contract file.
""",
    ],
    "questions": [
        q("MULTIPLE", "Which clauses should you find in every contract? Select all that apply.", ["Scope", "Warranty", "Penalties or liquidated damages", "The customer's office decor"], ["Scope", "Warranty", "Penalties or liquidated damages"], points=2),
        q("SINGLE", "We promised the customer a 3-year warranty, but the OEM gives 1 year. What is the effect?", ["The 2-year gap is our risk", "The customer gets only 1 year", "The OEM must extend it automatically", "Nothing"], ["The 2-year gap is our risk"]),
        q("TRUE_FALSE", "Unlimited liability is a normal term that does not need review.", TF, ["False"]),
        q("SINGLE", "What does an obligation register track?", ["Each contractual obligation, its owner, due date and evidence", "Employee leave", "Stock levels", "Marketing campaigns"], ["Each contractual obligation, its owner, due date and evidence"]),
        q("MATCHING", "Match each clause to its purpose.", ["SLA=Response and resolution commitments", "Liquidated damages=Amounts payable for delay", "Acceptance=How the customer confirms the work is complete"], points=3),
        q("SHORT_ANSWER", "A customer PO says 'supplier to provide all other items required for a complete solution'. Explain the risk and what you would do.", points=4, explanation="Model answer: the scope is open-ended, so we could be forced to supply unpriced items; do not accept as is; ask for a defined scope or a list of exclusions and refer it for approval."),
    ],
}

# ---------------------------------------------------------------- Government Sales

COURSES["Government Sales Basic: GeM Portal and Government Buyers"] = {
    "lessons": [
        """
Government buyers spend public money, so they must follow written rules that ensure fairness, transparency and value. Understanding these rules is the first step to winning government business.

## Who buys

- Central ministries and departments, and their attached offices.
- Central public sector enterprises (PSUs) and autonomous bodies.
- State governments, state PSUs and local bodies, under their own rules.

## Main rules for central buyers

- The **General Financial Rules (GFR)** set the principles and procurement methods.
- Each organisation may have its own **procurement manual**.
- The **Government e-Marketplace (GeM)** is the main online platform for buying common goods and services.
- Larger or specialised purchases go through **tenders**, often on the Central Public Procurement Portal or the organisation's own e-procurement site.

> Government buying is slower and more formal than private buying. Patience and complete paperwork win.
""",
        """
GeM (gem.gov.in) is the government's online marketplace. Central government buyers are generally required to buy goods and services available on GeM through it.

## As a seller

- **Registration:** using the company's PAN and other verified details, with an authorised person.
- **Seller profile:** company details, bank account, office addresses, and documents such as GST registration.
- **Vendor assessment:** GeM may require an assessment for some categories.
- **Catalogue:** products are listed under categories with detailed specifications.
- **OEM and reseller:** a reseller listing a brand's product generally needs the OEM's authorisation on GeM.

## Keep the account healthy

- Keep documents and authorisations current.
- Respond to orders and messages within the time allowed.
- Poor performance or false information can lead to suspension.

> [PLACEHOLDER: The company's GeM seller ID, authorised users and internal approval for GeM bids.]
""",
        """
GeM supports several ways of buying, depending mainly on the value of the purchase. The value limits are set by GFR and GeM rules and are revised from time to time, so check the current limits on GeM.

## The main modes

- **Direct purchase:** for low-value purchases, the buyer may order directly from any seller meeting the requirement.
- **L1 purchase:** for purchases in the next value band, the buyer compares offers and orders from the lowest-priced (L1) seller meeting the requirement.
- **Bid / reverse auction:** for higher values, the buyer publishes a bid; sellers submit offers, sometimes followed by a reverse auction where prices are revised downwards.

## What this means for sellers

- For direct and L1 buys, **catalogue price and accurate specifications** decide who wins.
- For bids, read the bid document carefully: eligibility, technical specifications, EMD and documents.
- Watch the published deadlines; GeM does not accept late offers.
""",
        """
The catalogue is our shop window on GeM. Errors can lead to rejected orders or penalties.

## Listing well

- Use the correct category and fill every specification field accurately.
- Use the OEM's official part number and datasheet.
- Price realistically; the price must be honoured if an order comes.
- Keep stock status and delivery periods realistic.

## Stay compliant

- Remove or update products that are discontinued or out of stock.
- Never list a product you are not authorised to sell.
- Update prices when costs change, following GeM's rules on price changes.
- Make sure specifications match exactly what will be delivered; a mismatch can mean rejection at delivery.
""",
    ],
    "questions": [
        q("SINGLE", "What is GeM?", ["The government's online marketplace for goods and services", "A private shopping website", "A tax filing portal", "A bank"], ["The government's online marketplace for goods and services"]),
        q("MATCHING", "Match each GeM buying mode to how it works.", ["Direct purchase=Low value; buyer orders directly from a seller meeting the need", "L1 purchase=Buyer compares offers and orders from the lowest-priced seller", "Bid / reverse auction=Higher value; sellers submit offers to a published bid"], points=3),
        q("TRUE_FALSE", "A reseller may list any brand on GeM without the OEM's authorisation.", TF, ["False"]),
        q("SINGLE", "Which rules set the principles for central government procurement?", ["General Financial Rules (GFR)", "The Companies Act", "Income Tax Rules", "The Motor Vehicles Act"], ["General Financial Rules (GFR)"]),
        q("MULTIPLE", "Which are good practices for a GeM catalogue? Select all that apply.", ["Fill every specification field accurately", "Use the OEM's official part number", "Remove discontinued products", "List products you hope to get authorisation for later"], ["Fill every specification field accurately", "Use the OEM's official part number", "Remove discontinued products"], points=2),
        q("FILL_BLANK", "In an L1 purchase, the order goes to the ____-priced seller meeting the requirement.", ["lowest"]),
    ],
}

COURSES["Government Sales Intermediate: Tenders, EMD and Bank Guarantees"] = {
    "lessons": [
        """
A tender moves through fixed stages. Missing one can disqualify a strong bid.

## Stages

1. **Notice published** on the portal: read it the same day.
2. **Pre-bid meeting and queries:** ask about unclear or restrictive clauses before the query deadline.
3. **Corrigenda:** the buyer may change dates, specifications or terms. Check the portal for corrigenda right up to submission.
4. **Bid submission:** usually online, often in two covers: technical (with EMD and eligibility documents) and financial.
5. **Technical evaluation:** bids that fail eligibility or specifications are rejected.
6. **Financial opening:** prices of technically qualified bidders are opened; the lowest acceptable (L1) is identified.
7. **Award:** letter of award or purchase order, followed by performance security and contract signing.
""",
        """
Eligibility criteria decide whether the bid is even evaluated. Check them first.

## Common eligibility criteria

- Minimum **annual turnover** over recent years.
- **Similar work experience:** past orders of a given value and type, with completion certificates.
- **OEM authorisation** (manufacturer's authorisation form, MAF) for the tender.
- **Certifications** such as ISO.
- **Registrations:** GST, PAN, and sometimes local office presence.
- **Declarations:** not blacklisted, no conflicts of interest, integrity pact for large tenders.

## Prepare in advance

Keep a ready, current set of company documents: financial statements, past order copies with completion certificates, certificates and registrations. Requesting the MAF from the OEM early is essential; it can take days.
""",
        """
Two kinds of security protect the buyer.

## Earnest money deposit (EMD) or bid security

Submitted with the bid, to discourage bidders from withdrawing or changing their bid. GFR provides a typical range of a few percent of the estimated value; the exact amount and the accepted forms (bank guarantee, online payment) are in the tender. Many tenders accept a **bid security declaration** instead, and registered **MSEs and eligible startups** are often exempt; check the tender.

The EMD of unsuccessful bidders is returned after the award. It can be forfeited if a bidder withdraws during the validity period or refuses the award.

## Performance security

Submitted by the winning bidder after the award, usually as a **bank guarantee** for a percentage of the contract value stated in the tender (GFR provides a typical range). It protects the buyer if we fail to perform, and is returned after the contract and warranty obligations end.

## Bank guarantees in practice

- Use the exact format in the tender.
- Check amount, beneficiary name, validity and claim period before submitting.
- Track expiry dates and extend in time if the contract runs longer.
""",
        """
Before submission, clarify and track.

## Pre-bid queries

- Raise queries where specifications point to one brand, eligibility is unclear, or terms are unreasonable.
- Quote the clause number, state the issue, and propose a change.
- Submit before the deadline, in the format required.

## Corrigenda

- Buyers publish answers and changes as corrigenda.
- A corrigendum can change dates, specifications, quantities or terms.
- Check for corrigenda daily until submission, and make sure the bid follows the latest version.

> Missing a corrigendum is one of the commonest reasons a well-prepared bid is rejected.
""",
    ],
    "questions": [
        q("SINGLE", "In a two-cover tender, what usually happens first?", ["Technical evaluation", "Financial opening", "Award", "Contract signing"], ["Technical evaluation"]),
        q("MATCHING", "Match each security to when it is submitted.", ["EMD or bid security=With the bid", "Performance security=After the award"], points=2),
        q("TRUE_FALSE", "Registered MSEs are often exempt from EMD, but the tender document must be checked.", TF, ["True"]),
        q("MULTIPLE", "Which are common eligibility criteria? Select all that apply.", ["Minimum annual turnover", "Similar work experience with completion certificates", "OEM authorisation (MAF)", "The number of cars the company owns"], ["Minimum annual turnover", "Similar work experience with completion certificates", "OEM authorisation (MAF)"], points=2),
        q("SINGLE", "What is a corrigendum?", ["A change or clarification to the tender published by the buyer", "A type of bank guarantee", "A bidder's complaint", "The final contract"], ["A change or clarification to the tender published by the buyer"]),
        q("FILL_BLANK", "The OEM's letter authorising us to bid its products is the manufacturer's authorisation ____.", ["form", "MAF"]),
    ],
}

COURSES["Government Sales Advanced: Procurement Rules and Bid Documentation"] = {
    "lessons": [
        """
The General Financial Rules (GFR) set out how central government buys. Knowing the principles helps you prepare bids that evaluators can accept, and raise valid queries.

## Key principles

- **Transparency, competition, fairness** and elimination of arbitrariness.
- **Value for money:** the lowest acceptable bid that meets the specifications.
- **Specifications** should meet the need without favouring one brand.
- **Procurement methods** depend on value and situation: GeM, open tender, limited tender, single-source (with justification).
- **Two-bid system** for complex purchases: technical and financial bids evaluated separately.

## Where to look

- The GFR and the Ministry of Finance procurement manuals.
- The buying organisation's own manual.
- The tender document itself, which is final for that purchase.
""",
        """
Government policies give certain bidders preference. Know whether we qualify, and what declarations are required.

## Make in India (Public Procurement Preference)

The government's Make in India procurement order gives purchase preference to **local suppliers**, classified by the share of local content in what they supply (for example Class I and Class II local suppliers). The required local content and the declarations, such as a self-certificate of local content, are stated in the tender.

## MSE procurement policy

Government buyers have targets to buy from micro and small enterprises. Benefits for registered MSEs commonly include EMD exemption and purchase preference rules stated in the tender.

## Practical steps

- Check which preferences apply in each tender.
- Get local content certificates from OEMs early where needed.
- Make declarations only when they are true; false declarations can lead to debarment.
""",
        """
A complete, well-ordered bid is easier to qualify. Build it methodically.

## Typical bid structure

1. Covering letter and index.
2. EMD or bid security declaration, or exemption proof.
3. Eligibility documents in the order the tender lists them.
4. Technical bid: compliance statement, datasheets, MAF, deviations (ideally none).
5. Mandatory forms and declarations, signed and stamped.
6. Financial bid in the exact format required (often a BoQ sheet on the portal).

## Checks

- Every page that must be signed is signed by the authorised signatory.
- Names, numbers and values are consistent across all documents.
- File formats and sizes meet portal limits.
- Upload well before the deadline; portals slow down at the last minute.

> This module includes a practice lab: assemble a complete bid from a sample tender.
""",
        """
Winning the order is half the job. Government payments need complete paperwork.

## After the award

- Submit the performance security in time and in the required format.
- Sign the contract or accept the GeM order within the allowed time.
- Deliver exactly what was specified; deviations can lead to rejection.

## Getting paid

- Collect the documents the buyer needs: delivery challan, installation report, inspection and acceptance certificate, invoice.
- On GeM, the buyer issues a consignee receipt and acceptance certificate (CRAC) before payment; follow up so it is issued promptly.
- Track payment against the contract's terms and escalate politely through the right channel if delayed.
""",
    ],
    "questions": [
        q("SINGLE", "Under GFR, which bid is normally selected?", ["The lowest acceptable bid that meets the specifications", "The highest bid", "The bid from the largest company", "The first bid received"], ["The lowest acceptable bid that meets the specifications"]),
        q("TRUE_FALSE", "Government specifications should favour one brand to make evaluation easy.", TF, ["False"]),
        q("SINGLE", "What does the Make in India procurement order give preference to?", ["Local suppliers, based on local content", "Foreign suppliers", "The cheapest supplier regardless of origin", "Suppliers with the most employees"], ["Local suppliers, based on local content"]),
        q("MULTIPLE", "Which checks should be done before uploading a bid? Select all that apply.", ["Required pages signed by the authorised signatory", "Values consistent across documents", "File formats and sizes within portal limits", "Upload in the last five minutes to keep it secret"], ["Required pages signed by the authorised signatory", "Values consistent across documents", "File formats and sizes within portal limits"], points=2),
        q("SINGLE", "On GeM, which document from the buyer is needed before payment?", ["Consignee receipt and acceptance certificate (CRAC)", "A purchase requisition", "Our offer letter", "A credit note"], ["Consignee receipt and acceptance certificate (CRAC)"]),
        q("SHORT_ANSWER", "A tender requires a self-certificate of local content. The OEM has not confirmed the local content figure. What would you do?", points=4, explanation="Model answer: do not guess or sign a false declaration; ask the OEM for a written local content certificate early; if it cannot be obtained in time, bid without claiming the preference or escalate to the manager."),
    ],
}
