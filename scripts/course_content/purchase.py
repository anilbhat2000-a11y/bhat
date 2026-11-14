"""Purchase: the procurement process, vendor management and the PO lifecycle, OEM and channel compliance."""
from . import q, TF

COURSES = {}

CIPS = ("CIPS (Chartered Institute of Procurement & Supply): procurement knowledge and standards", "https://www.cips.org/")
GST_PORTAL = ("GST portal (Government of India): GSTIN search and taxpayer services", "https://www.gst.gov.in/")
CBIC_GST = ("CBIC GST: Acts, rules, notifications and circulars", "https://cbic-gst.gov.in/")
MCA = ("Ministry of Corporate Affairs: company master data", "https://www.mca.gov.in/")

COURSES["Purchase Basic: The Procurement Process"] = {
    "lessons": [
        """
Procure-to-pay (P2P) is the complete process of buying goods and services, from identifying a need to paying the supplier. In an IT system-integration company, purchase is closely tied to sales: most purchases are made to fulfil a customer order, so speed and accuracy directly affect delivery and profit.

## The procure-to-pay steps

1. **Requirement:** a need is raised, usually from a confirmed sales order or for internal use.
2. **Purchase requisition (PR):** an internal request describing what is needed, approved by the right person.
3. **Sourcing:** getting quotations from authorised distributors or vendors and comparing them.
4. **Purchase order (PO):** the formal order sent to the chosen vendor.
5. **Goods or service receipt:** checking that what arrived matches the PO.
6. **Invoice verification:** matching the vendor's invoice to the PO and receipt.
7. **Payment:** paying the vendor according to agreed terms.

## Why the process matters

- It ensures we buy only what is needed and approved.
- It gets the right price and terms, protecting the margin on the customer deal.
- It creates a clear record for audits, tax and OEM compliance.
- It prevents fraud, such as payments for goods never received.

## Key terms

- **Purchase requisition (PR):** an internal, approved request to buy.
- **Purchase order (PO):** a legally binding order to a vendor, stating items, quantities, prices and terms.
- **Goods receipt note (GRN):** a record that goods were received and checked.
- **Lead time:** the time between placing an order and receiving the goods.

## Real-world example

Sales confirms an order for 30 laptops for a customer. The purchase executive, Suresh, raises a PR linked to the sales order, gets quotes from two authorised distributors, and places a PO with the one offering the best price and the earliest delivery. When the laptops arrive, the stores team checks the quantity and serial numbers and creates a GRN. Accounts matches the distributor's invoice with the PO and GRN before releasing payment. Each step leaves a record.

## Common mistakes

- Placing orders by phone or chat without a PO.
- Skipping the requisition and approval for "urgent" purchases.
- Paying invoices before the goods are received and checked.

## Key takeaways

- Procure-to-pay runs from requirement to payment, with a record at every step.
- Every purchase needs an approved requisition and a formal PO.
- Receipt and invoice checks protect the company from paying for the wrong thing.
""",
        """
A purchase order is a legal document. Once the vendor accepts it, it becomes a contract. A clear, complete PO prevents wrong deliveries, price disputes and payment delays.

## What a PO must contain

- PO number and date.
- Our company's legal name, billing address, delivery address and GSTIN.
- The vendor's legal name, address and GSTIN.
- For each line: part number, description, quantity, unit price, taxes and total.
- Delivery date and place, including any customer site details.
- Payment terms, such as 30 days from invoice.
- Warranty and support terms, where relevant.
- Reference to the quotation and to our terms and conditions.
- Authorised signature or system approval.

## Getting it right

- Copy part numbers exactly from the quotation, and check that they match the sales order.
- Make sure the tax rate and place of supply are correct, as these affect GST.
- For deliveries direct to a customer site, include the contact person and any access requirements.
- Send the PO through the official channel and ask the vendor to acknowledge it.

## Key terms

- **GSTIN:** the 15-character Goods and Services Tax Identification Number of a registered business.
- **Place of supply:** the location that decides whether CGST and SGST, or IGST, apply.
- **Order acknowledgement:** the vendor's confirmation that it has accepted the PO.
- **Drop shipment:** delivery directly from the vendor to our customer.

## Real-world example

A PO for network switches lists the wrong part number: a 24-port model instead of the 48-port model on the sales order. The distributor ships what the PO says. The mistake is discovered at the customer site, delaying the project by two weeks and adding return freight costs. After this, the team adds a check: the purchase executive compares every PO line with the sales order before sending.

## Common mistakes

- Wrong or incomplete part numbers.
- Missing GSTIN or wrong delivery address.
- Not getting an order acknowledgement from the vendor.

## Key takeaways

- A PO becomes a contract when accepted; treat it with care.
- Include all mandatory details, especially part numbers, GSTINs, delivery and payment terms.
- Check each PO against the quotation and the sales order before sending.
""",
        """
Three-way match is a control used before paying a supplier. It compares three documents: the purchase order (what we ordered), the goods receipt note (what we received) and the supplier's invoice (what we are being asked to pay). Payment is released only when all three agree, within any allowed tolerance.

## How three-way match works

1. **PO vs invoice:** are the items, quantities and prices on the invoice the same as on the PO?
2. **GRN vs invoice:** has the quantity invoiced actually been received and accepted?
3. **Taxes and totals:** are the GST rate, HSN or SAC code and totals correct?

If everything matches, the invoice is approved for payment. If not, it is put on hold and the difference is resolved with the vendor or the internal team.

## Common mismatches and what to do

- **Price difference:** the vendor charged more than the PO price. Ask for a corrected invoice or a credit note.
- **Quantity difference:** the invoice is for 10 units but only 8 were received. Pay for 8 or wait for the remaining delivery.
- **Wrong tax:** for example IGST charged instead of CGST and SGST. Ask the vendor for a corrected invoice, because the wrong tax type can affect our input tax credit.
- **Damaged goods:** record the damage on the GRN and raise a claim before payment.

## Key terms

- **Three-way match:** comparing PO, GRN and invoice before payment.
- **Two-way match:** comparing only PO and invoice, often used for services.
- **Tolerance:** a small allowed difference, such as rounding.
- **Input tax credit (ITC):** GST paid on purchases that a business can set off against the GST it collects, if the conditions are met.

## Real-world example

An invoice arrives for 50 UPS batteries. The GRN shows only 45 were received; five are still in transit. Accounts approves payment for 45 batteries and keeps the remaining amount on hold. When the last five arrive and a GRN is created, the balance is paid. The vendor is paid fairly and the company does not pay for goods it has not received.

## Common mistakes

- Paying invoices without checking the GRN.
- Accepting invoices with the wrong tax type.
- Not recording damage or shortage at the time of receipt.

## Key takeaways

- Three-way match compares PO, GRN and invoice before payment.
- Resolve mismatches before paying, using corrected invoices or credit notes.
- Accurate receipt records make the match possible.
""",
        """
Every company has a purchase policy that sets out who can buy what, how vendors are chosen and what approvals are needed. This lesson explains the topics such a policy normally covers. Your administrator will add 3C's own purchase policy below.

> **[PLACEHOLDER]** Company purchase policy: approval limits by role, the number of quotations required by value, approved vendor rules, emergency purchase rules and the systems used. The LMS administrator adds these details.

## What a purchase policy usually covers

- **Approval limits:** the value each role can approve, for example a manager up to one amount and a director above it.
- **Number of quotations:** for example, one quote for small purchases, three quotes above a set value.
- **Approved vendor list:** buying only from vendors that have been evaluated and registered.
- **Authorised channels:** buying OEM products only through authorised distributors, to protect warranty and support.
- **Emergency purchases:** how to buy urgently while still recording approvals afterwards.
- **Conflict of interest:** declaring any personal relationship with a vendor.
- **Record keeping:** where quotations, POs and approvals are stored.

## Why policies protect you

Following the policy protects the company from overpaying and from fraud. It also protects you personally: if a purchase is questioned later, a complete record of quotations and approvals shows that you acted correctly.

## Key terms

- **Approved vendor list (AVL):** vendors the company has evaluated and allows purchases from.
- **Delegation of authority:** the rules on who can approve which decisions and values.
- **Conflict of interest:** a situation where personal interests could influence a business decision.

## Real-world example

A project manager asks purchase to buy cables from a local shop owned by a relative, because "it is faster". The purchase executive explains that the shop is not on the approved vendor list and that the relationship must be declared. The cables are bought from an approved vendor the next day. During the next audit, the clean record helps the company pass without comments.

## Common mistakes

- Splitting a purchase to stay under an approval limit.
- Buying from unapproved or unauthorised sources.
- Not declaring a personal relationship with a vendor.

## Key takeaways

- Learn the approval limits, quotation rules and approved vendors.
- Buy OEM products only through authorised channels.
- Keep complete records: they protect the company and you.
""",
    ],
    "questions": [
        q("SINGLE", "Which document is an internal, approved request to buy?", ["Purchase order", "Purchase requisition", "Invoice", "Goods receipt note"], ["Purchase requisition"],
          explanation="The requisition comes first; the PO is sent to the vendor after approval and sourcing."),
        q("MULTIPLE", "Which documents are compared in a three-way match?", ["Purchase order", "Goods receipt note", "Supplier invoice", "Sales quotation"], ["Purchase order", "Goods receipt note", "Supplier invoice"],
          explanation="Three-way match compares what we ordered, what we received and what we are billed."),
        q("TRUE_FALSE", "A PO becomes a binding contract once the vendor accepts it.", TF, ["True"],
          explanation="That is why its details must be accurate and complete."),
        q("SINGLE", "An invoice is for 10 units but only 8 were received. What should accounts do?", ["Pay for 10", "Pay for 8 and hold the balance until the rest arrive", "Reject the vendor permanently", "Pay nothing ever"], ["Pay for 8 and hold the balance until the rest arrive"],
          explanation="Pay only for goods received and accepted."),
        q("FILL_BLANK", "A GSTIN has ______ characters.", ["15", "fifteen"],
          explanation="The GST Identification Number has 15 characters, starting with the two-digit state code."),
        q("TRUE_FALSE", "Splitting one purchase into smaller orders to avoid an approval limit is acceptable when the project is urgent.", TF, ["False"],
          explanation="Splitting orders bypasses controls. Use the emergency purchase process instead."),
        q("MATCHING", "Match each term to its meaning.", ["GRN=Record that goods were received and checked", "Lead time=Time from order to receipt", "AVL=Vendors the company allows purchases from", "ITC=GST on purchases that can be set off"],
          explanation="These terms come up in every purchase transaction."),
    ],
    "sources": [CIPS, GST_PORTAL, CBIC_GST],
}

COURSES["Purchase Intermediate: Vendor Management and the PO Lifecycle"] = {
    "lessons": [
        """
Vendors are an extension of our business. If a distributor delivers late or a service partner does poor work, our customer blames us. Vendor evaluation makes sure we choose partners who are reliable, compliant and good value.

## What to evaluate

- **Legal and tax status:** registered company details, GSTIN, PAN and bank details verified.
- **Authorisation:** for OEM products, proof that the vendor is an authorised distributor or partner.
- **Capability:** product range, stock levels, technical skills and geographic coverage.
- **Commercials:** pricing, payment terms and credit offered.
- **Quality and reliability:** past delivery performance, defect rates and references.
- **Financial stability:** signs that the vendor will be able to deliver and support over time.
- **Compliance:** willingness to follow our code of conduct and data protection requirements.

## A simple scorecard

Many companies use a weighted scorecard. For example: price 30%, delivery performance 25%, quality 20%, support 15% and compliance 10%. Each vendor is scored on a scale, and the weighted total helps compare them fairly. Scorecards should be reviewed regularly, not only at onboarding.

## Key terms

- **Vendor onboarding:** the process of verifying and registering a new vendor.
- **Vendor scorecard:** a structured way of rating vendor performance.
- **PAN:** Permanent Account Number issued by the Income Tax Department.
- **Single-source risk:** dependence on only one vendor for an important item.

## Real-world example

A company relies on one distributor for a popular laptop brand. During a busy quarter, that distributor runs out of stock and three customer deliveries are delayed. The purchase team reviews its vendor list, onboards a second authorised distributor after checking its authorisation letter and GST registration, and splits orders between them. Future shortages are handled without delay.

## Common mistakes

- Onboarding vendors without checking authorisation or GST registration.
- Choosing purely on price without considering delivery and support.
- Evaluating vendors once and never reviewing performance.

## Key takeaways

- Evaluate vendors on legal status, authorisation, capability, commercials, quality and compliance.
- Use a weighted scorecard and review it regularly.
- Reduce single-source risk for critical items.
""",
        """
Sending a PO is not the end of the purchase process. Purchase must track every order until it is delivered, received and closed. Customers' projects depend on it, and late follow-up is one of the most common causes of delayed delivery.

## The PO lifecycle

1. **Created and approved** in the system.
2. **Sent and acknowledged** by the vendor, with a confirmed delivery date.
3. **In transit:** tracking shipment details, including e-way bills for goods above the threshold.
4. **Received:** goods receipt note created; any shortage or damage recorded.
5. **Invoiced and matched:** three-way match completed.
6. **Closed:** all lines received, invoiced and paid.

## Good follow-up habits

- Ask for an order acknowledgement within one working day.
- Track expected delivery dates in a shared sheet or the ERP.
- Follow up before the due date, not after it is missed.
- Tell sales and the project team early about any delay, with a revised date.
- Escalate to the vendor's manager or the OEM if a delay threatens a customer commitment.

## Key terms

- **Open PO:** a PO that has not yet been fully received and closed.
- **Expected date of delivery (EDD):** the date the vendor has committed to.
- **Backorder:** items the vendor has accepted but cannot yet supply.
- **ERP:** enterprise resource planning software used to manage purchase, stock and accounts.

## Real-world example

A PO for firewalls is acknowledged with a two-week delivery date. One week before the due date, the purchase executive checks with the distributor and learns that the OEM has a shortage and stock will arrive in five weeks. She informs the sales manager immediately. Sales speaks to the customer, who agrees to a phased delivery using a similar model available from stock. The customer appreciates the early warning.

## Common mistakes

- Assuming the vendor will deliver on time without checking.
- Informing the project team only after the date is missed.
- Leaving old POs open, which distorts stock and liability reports.

## Key takeaways

- Track every PO through its lifecycle until it is closed.
- Follow up before due dates and share delays early.
- Close completed POs and review open ones regularly.
""",
        """
Changes are a normal part of business. A customer may change quantities, a product may be replaced by a new model, or a project may be cancelled. Changes to a PO must be handled formally, so that the vendor, our systems and our accounts all agree.

## PO amendments

An amendment changes an existing PO, for example quantity, price, delivery date or part number. Good practice is:

- Get the change approved internally, following the same approval limits as a new PO.
- Issue a revised PO or a formal amendment with a revision number and date.
- Ask the vendor to acknowledge the amendment in writing.
- Update the ERP so that receipts and invoices match the new version.

## PO cancellations

- Check the vendor's terms first. Some items, especially customised or special-priced OEM products, are non-cancellable and non-returnable (NCNR).
- Inform the vendor in writing as early as possible.
- Agree any cancellation charges before confirming.
- Close the PO in the system and inform accounts and sales.

## Key terms

- **Amendment:** a formal change to an existing PO.
- **Revision number:** a number that identifies the latest version of a PO.
- **NCNR:** non-cancellable, non-returnable; common for special-priced or configured items.
- **Restocking fee:** a charge a vendor may apply for accepting returned goods.

## Real-world example

A customer reduces an order of 100 desktops to 80. The purchase executive checks the distributor's terms and finds that the desktops were ordered under special project pricing and are NCNR. She informs sales immediately. Sales negotiates with the customer to take the remaining 20 desktops in the next quarter. Because the issue was found early, the company avoided carrying unsold stock.

## Common mistakes

- Changing orders by phone without a revised PO.
- Cancelling without checking NCNR terms.
- Forgetting to update the ERP after a change.

## Key takeaways

- Treat amendments like new POs: approve, document and get acknowledgement.
- Check cancellation terms, especially NCNR, before promising a customer anything.
- Keep the ERP, the vendor and accounts in step.
""",
        """
Accurate vendor records are the foundation of safe purchasing and payment. Errors in bank details or tax registration can lead to lost money, rejected tax credits or audit findings. A vendor master record must be created carefully and kept up to date.

## What the vendor master holds

- Legal name, address and contact details.
- GSTIN and PAN, verified on the government portals.
- Bank account details, verified with a cancelled cheque or bank letter.
- MSME registration (Udyam), if applicable; payments to micro and small enterprises have legal time limits.
- Authorisation letters and certificates, with expiry dates.
- Agreed payment terms and credit limits.

## Keeping records safe

- Separate duties: the person who creates or edits vendor records should not be the person who approves payments.
- Verify any change to bank details by calling the vendor on a known phone number, not one given in the change request.
- Review records periodically and deactivate vendors that have not been used for a long time.
- Store supporting documents securely.

## Key terms

- **Vendor master:** the central record of each vendor's details in the ERP.
- **Udyam registration:** the registration for micro, small and medium enterprises in India.
- **Segregation of duties:** dividing tasks so that no single person controls a whole transaction.

## Real-world example

Accounts receives an email, apparently from a regular distributor, asking to change its bank account. The purchase executive calls the distributor's finance contact on the number already in the vendor master. The distributor confirms that it sent no such request. The email was a fraud attempt. Because the company verifies bank changes by phone, no money was lost.

## Common mistakes

- Changing bank details based on an email alone.
- Not checking the GSTIN status on the GST portal.
- Allowing the same person to create vendors and approve payments.

## Key takeaways

- Verify GSTIN, PAN and bank details before a vendor is used.
- Confirm any bank detail change by calling a known number.
- Separate vendor creation from payment approval.
""",
    ],
    "questions": [
        q("MULTIPLE", "Which checks are part of vendor onboarding?", ["GSTIN and PAN verification", "OEM authorisation letter", "Bank details verification", "The vendor's social media followers"], ["GSTIN and PAN verification", "OEM authorisation letter", "Bank details verification"],
          explanation="Legal, tax, authorisation and bank checks protect the company."),
        q("SINGLE", "What does NCNR mean on a quotation?", ["New customer, new rate", "Non-cancellable, non-returnable", "No charge, no return", "Not currently in stock"], ["Non-cancellable, non-returnable"],
          explanation="NCNR items cannot be cancelled or returned once ordered, so changes are costly."),
        q("SINGLE", "You receive an email asking to change a vendor's bank account. What should you do?", ["Update it immediately", "Call the vendor on the number already in the vendor master", "Reply to the email to confirm", "Ignore all future emails"], ["Call the vendor on the number already in the vendor master"],
          scenario="The email looks like it comes from a regular distributor.",
          explanation="Bank change requests are a common fraud. Verify using a known contact, not details in the request."),
        q("TRUE_FALSE", "The same person should create vendor records and approve payments, so that responsibility is clear.", TF, ["False"],
          explanation="Segregation of duties requires these tasks to be done by different people."),
        q("SINGLE", "When should you tell the project team about a delivery delay?", ["After the due date is missed", "As soon as you learn about it", "Only if the customer complains", "At month end"], ["As soon as you learn about it"],
          explanation="Early warning lets sales and the project team plan with the customer."),
        q("TRUE_FALSE", "A PO amendment should follow the same approval limits as a new PO.", TF, ["True"],
          explanation="A change in value or terms carries the same risk as a new order."),
        q("MATCHING", "Match each PO stage to what happens.", ["Acknowledged=Vendor confirms acceptance and date", "Received=GRN created and checked", "Matched=PO, GRN and invoice agree", "Closed=All lines received, invoiced and paid"],
          explanation="Tracking each stage keeps orders and accounts accurate."),
    ],
    "sources": [CIPS, GST_PORTAL, ("Udyam Registration portal (Ministry of MSME)", "https://udyamregistration.gov.in/"), MCA],
}

COURSES["Purchase Advanced: OEM and Channel Compliance"] = {
    "lessons": [
        """
Most IT products reach customers through a channel: the OEM (original equipment manufacturer) sells to distributors, distributors sell to partners such as system integrators, and partners sell to end customers. OEMs run partner programmes that reward partners with better pricing, support and leads in return for meeting certain requirements.

## How partner programmes work

- **Partner tiers:** for example registered, silver, gold and platinum, with names that differ by OEM.
- **Requirements:** revenue targets, certified engineers, sales training, customer satisfaction and sometimes a demo lab.
- **Benefits:** higher discounts, rebates, marketing funds, access to deal registration and technical support.
- **Specialisations:** some OEMs certify partners in areas such as security, data centre or collaboration.

## The role of distributors

Distributors hold stock, provide credit, handle logistics and often offer presales support and configuration services. In India, most OEMs require partners to buy through their authorised distributors, so that warranties and support are valid.

## Key terms

- **OEM:** the company that makes and brands the product.
- **Distributor:** the authorised wholesaler between the OEM and partners.
- **Partner tier:** the level a partner holds in an OEM programme.
- **Rebate:** money returned by the OEM after meeting targets.
- **Market development funds (MDF):** OEM money for joint marketing activities.

## Real-world example

A system integrator is a silver partner of a networking OEM. Moving to gold would give an extra discount and access to the OEM's lead programme, but requires two more certified engineers and a higher annual revenue. The company invests in certification for two engineers and focuses on larger campus deals. Within a year it reaches gold, and the extra discount improves its margins on every deal.

## Common mistakes

- Buying OEM products from unauthorised sources, which can void warranty and support.
- Losing track of certification expiry dates, which can reduce partner tier.
- Not claiming rebates and marketing funds the company has earned.

## Key takeaways

- OEM partner programmes reward investment in skills, revenue and customer satisfaction.
- Buy through authorised distributors to keep warranties and support valid.
- Track requirements and expiry dates to keep the partner tier.
""",
        """
Deal registration and special pricing are two of the most valuable benefits in OEM programmes. Used correctly, they protect the partner who found the opportunity and allow competitive pricing on large deals. Used incorrectly, they can lead to penalties or loss of partner status.

## Deal registration

Deal registration lets a partner tell the OEM about an opportunity it is working on. If approved, the partner usually receives extra discount or protection for a set period. Typical requirements:

- Register early, before the customer receives quotes from others.
- Provide accurate customer details, products, quantities, value and expected close date.
- Show genuine involvement, such as meetings or a solution design.
- Renew or update the registration if the deal is delayed.

## Special pricing

For large or competitive deals, partners can request special pricing from the OEM, often called a special bid. The request includes the end customer, quantities, competition and the target price. The approved price is valid only for that customer, those products and that period.

## Rules that must be followed

- Special pricing must be used only for the named end customer.
- Products bought at special prices must not be resold to others or kept as stock.
- Quotes and invoices must match the approved deal details.
- OEMs may ask for proof of delivery to the named end customer.

## Key terms

- **Deal registration:** formal notice to the OEM of an opportunity, giving the partner protection or extra discount.
- **Special bid / special pricing:** an OEM-approved price for a specific deal.
- **Grey market:** goods sold outside the authorised channel, often at special prices meant for others.

## Real-world example

A partner receives special pricing for 200 laptops for a bank. The bank finally orders 180. The partner's warehouse team suggests selling the extra 20 to another customer at the special price. The purchase head stops this, because special pricing is valid only for the named customer, and misuse could lead to an OEM audit and loss of partner status. The 20 units are returned to the distributor under the agreed terms.

## Common mistakes

- Registering deals late, after other partners have quoted.
- Using special-priced products for a different customer.
- Not keeping proof of delivery to the named end customer.

## Key takeaways

- Register deals early and accurately.
- Use special pricing only for the approved customer, products and period.
- Keep evidence that the deal was delivered as approved.
""",
        """
OEMs and distributors have the right, under partner agreements, to audit how partners use special pricing, rebates and marketing funds. Customers, especially government bodies, may also audit our compliance. Being audit-ready means keeping complete, organised evidence for every transaction.

## What evidence to keep

- **Deal registration and special pricing approvals,** with reference numbers.
- **Customer PO and our quotation,** matching the approved deal.
- **Our PO to the distributor** and the distributor's invoice.
- **Our invoice to the end customer,** with serial numbers where applicable.
- **Delivery proof:** delivery challan, e-way bill where required, and signed proof of delivery.
- **Installation or acceptance reports** for projects.
- **Marketing fund claims:** invoices, photographs of events, attendee lists.

## Organising evidence

- Store all documents for a deal in one folder or ERP record, named by deal reference.
- Record serial numbers at receipt and dispatch, so that units can be traced to the end customer.
- Follow the record retention period required by law and by OEM agreements; GST records, for example, must generally be kept for at least 72 months from the due date of the annual return for the year.

## Key terms

- **Audit trail:** the documents that show how a transaction happened from start to finish.
- **Proof of delivery (POD):** a signed or electronic confirmation that the customer received the goods.
- **Serial number traceability:** the ability to link each unit to its purchase and sale.

## Real-world example

An OEM audits a partner's special-price deals for the past year. The partner provides, for each deal, the approval, the customer PO, invoices, serial numbers and signed proof of delivery, all from one ERP record. The audit finishes in two days with no findings. Another partner who cannot show where 50 units went faces recovery of the special discount.

## Common mistakes

- Keeping documents in personal mailboxes instead of shared records.
- Not recording serial numbers.
- Throwing away records before the retention period ends.

## Key takeaways

- Keep a complete audit trail for every special-price or rebate deal.
- Record serial numbers and proof of delivery.
- Store evidence centrally and keep it for the required period.
""",
        """
Each OEM and distributor relationship has its own contract terms, credit limits and programme rules. This lesson explains the topics usually covered. Your administrator will add 3C's specific OEM and channel terms below.

> **[PLACEHOLDER]** Company OEM and channel terms: current partner tiers by OEM, authorised distributors, credit limits, rebate programmes, certification requirements and the internal owner for each relationship. The LMS administrator adds these details.

## Topics covered in channel agreements

- **Authorisation:** which products and territories the partner may sell.
- **Pricing and discounts:** standard discounts and how special pricing works.
- **Credit and payment:** distributor credit limits, payment terms and penalties for late payment.
- **Returns:** conditions for returning products, including dead-on-arrival (DOA) handling.
- **Warranty and support:** how warranty claims and support cases are raised.
- **Compliance:** anti-bribery, export control and data protection obligations.
- **Audit rights:** the OEM's right to check records.

## Managing channel relationships

- Assign an owner in the company for each major OEM and distributor.
- Hold regular business reviews to discuss targets, pipeline and issues.
- Track programme requirements, such as certifications, on a calendar.
- Share relevant updates, such as new pricing rules, with sales and presales.

## Key terms

- **Dead on arrival (DOA):** a product that does not work when first delivered.
- **Export control:** rules that restrict the sale of certain technologies to certain countries or users.
- **Quarterly business review (QBR):** a regular meeting to review partnership performance.

## Real-world example

A distributor reduces the company's credit limit after two late payments, and a large order is held. The OEM relationship owner meets the distributor, agrees a payment schedule with accounts and restores the limit. To prevent a repeat, the company sets up weekly reviews of distributor dues. Deliveries are never held again for credit reasons.

## Common mistakes

- Not knowing who owns each OEM relationship.
- Missing credit and payment terms, leading to order holds.
- Ignoring compliance obligations such as export control.

## Key takeaways

- Know the key terms of each OEM and distributor agreement.
- Assign owners and hold regular reviews.
- Track credit, certifications and compliance obligations.
""",
    ],
    "questions": [
        q("SINGLE", "Why should OEM products be bought through authorised distributors?", ["They are always cheapest", "To keep warranty and support valid", "Because it is faster", "To avoid GST"], ["To keep warranty and support valid"],
          explanation="Products from unauthorised sources may not be covered by OEM warranty and support."),
        q("SINGLE", "When should a partner register a deal with an OEM?", ["After the order is received", "Early, before the customer receives quotes from others", "Only if the deal is lost", "At year end"], ["Early, before the customer receives quotes from others"],
          explanation="Early registration gives protection; late registration is often rejected."),
        q("TRUE_FALSE", "Products bought at special pricing for one customer can be sold to another customer if the first order is reduced.", TF, ["False"],
          explanation="Special pricing is valid only for the named customer, products and period."),
        q("MULTIPLE", "Which documents form a good audit trail for a special-price deal?", ["Special pricing approval", "Customer PO", "Serial numbers and proof of delivery", "Internal chat messages only"], ["Special pricing approval", "Customer PO", "Serial numbers and proof of delivery"],
          explanation="Formal documents linking approval, order, delivery and units make the audit trail."),
        q("SINGLE", "What does DOA mean?", ["Date of agreement", "Dead on arrival", "Distributor of authority", "Delivery on account"], ["Dead on arrival"],
          explanation="A DOA product does not work when first delivered and is usually replaced under special rules."),
        q("TRUE_FALSE", "Expired engineer certifications can affect a partner's tier with an OEM.", TF, ["True"],
          explanation="Many programmes require a minimum number of certified staff."),
        q("MATCHING", "Match each term to its meaning.", ["Rebate=Money returned by the OEM after meeting targets", "MDF=OEM funds for joint marketing", "Grey market=Goods sold outside the authorised channel", "QBR=Regular partnership performance review"],
          explanation="These terms appear in every OEM partner programme."),
    ],
    "sources": [CIPS, CBIC_GST, GST_PORTAL],
}
