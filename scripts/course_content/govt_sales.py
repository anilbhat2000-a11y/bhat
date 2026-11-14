"""Government sales: GeM and government buyers; tenders, bid security and bank guarantees; procurement rules."""
from . import q, TF

COURSES = {}

GEM = ("Government e-Marketplace (GeM): seller registration, buying modes and terms and conditions", "https://gem.gov.in/")
DOE = ("Department of Expenditure: General Financial Rules 2017, procurement manuals and office memoranda", "https://doe.gov.in/")
CPPP = ("Central Public Procurement Portal (CPPP): e-tenders, corrigenda and bid submission", "https://eprocure.gov.in/")
DPIIT = ("DPIIT: Public Procurement (Preference to Make in India) Order", "https://dpiit.gov.in/")
MSME = ("Ministry of MSME: Public Procurement Policy for Micro and Small Enterprises", "https://msme.gov.in/")
CVC = ("Central Vigilance Commission: integrity pact guidelines", "https://cvc.gov.in/")
STARTUP_INDIA = ("Startup India: DPIIT recognition and public procurement benefits", "https://www.startupindia.gov.in/")

COURSES["Government Sales Basic: GeM Portal and Government Buyers"] = {
    "lessons": [
        """
Government departments, public sector undertakings (PSUs), autonomous bodies and state governments are some of the largest buyers of IT in India. They buy differently from private companies: every purchase must follow public procurement rules designed for transparency, fair competition and value for public money.

## The rules behind government buying

- **General Financial Rules, 2017 (GFR 2017):** issued by the Department of Expenditure, Ministry of Finance. They set the basic principles and methods for procurement by central government ministries and departments.
- **Procurement manuals:** the Department of Expenditure's manuals for the procurement of goods, of consultancy and other services, and of works explain the rules in detail and are updated from time to time.
- **Preference policies:** Make in India (local content), micro and small enterprises (MSEs) and startups receive certain preferences.
- **State rules:** state governments and their bodies follow their own procurement rules and portals, often based on similar principles.
- **PSU policies:** public sector companies have board-approved procurement policies and portals.

## Main ways government buys IT

- **GeM (Government e-Marketplace):** the online marketplace for common goods and services. Under Rule 149 of GFR 2017, procurement of goods and services available on GeM is mandatory for central ministries and departments.
- **E-tenders:** through the Central Public Procurement Portal (CPPP) or the organisation's own e-procurement portal, for items not on GeM or complex projects.

## Key terms

- **Public procurement:** buying by government organisations using public money.
- **GFR 2017:** the General Financial Rules, which govern central government finances and procurement.
- **PSU:** public sector undertaking, a government-owned company.
- **Value for money:** getting the best quality and price for the public funds spent.

## Real-world example

A central government institute wants 200 desktops. Because desktops are available on GeM, the purchase officer must buy through GeM rather than calling local dealers for quotes. A system integrator registered on GeM with a compliant catalogue can participate; one that relies only on personal relationships cannot.

## Common mistakes

- Treating government buyers like private customers who can choose a vendor freely.
- Ignoring state-specific rules and portals.
- Not registering on GeM and the relevant e-procurement portals in advance.

## Key takeaways

- Government buying follows GFR 2017, procurement manuals and preference policies.
- GeM is mandatory for central government purchases of goods and services available on it.
- Register early on GeM and the portals your target customers use.
""",
        """
The Government e-Marketplace (GeM) was launched in August 2016 and has become the main channel for central and many state government purchases. Sellers list products and services; government buyers compare and buy online. To sell on GeM, a company must register and keep its profile and catalogue accurate.

## Registering as a seller

- Register the organisation using PAN-based verification, with GST registration and bank details.
- Add Udyam registration if the company is a micro, small or medium enterprise, to claim MSE benefits.
- Choose seller type: OEM (manufacturer) or reseller. Resellers usually need the OEM's authorisation to list branded products.
- Complete the company profile: turnover, experience, office addresses and certifications.
- Some categories require vendor assessment or additional documents.

## Using the seller dashboard

- **Catalogue management:** add and update products and services with correct specifications and prices.
- **Bids and reverse auctions:** view bids in your categories and participate.
- **Orders:** accept orders, record delivery and track acceptance.
- **Invoices and payments:** submit invoices and track payment status.
- **Incident management:** respond to complaints and incidents raised by buyers.

## Key terms

- **Seller:** a company registered on GeM to sell.
- **OEM panel:** the process by which manufacturers register their brands and authorise resellers.
- **Catalogue:** the listing of a product or service with specifications and price.
- **Incident:** a complaint raised on GeM, which can lead to suspension if not resolved.

## Real-world example

A system integrator registers on GeM but does not update its catalogue for months. When prices fall, its listed prices remain high and it never appears among the lowest offers. Another integrator assigns a team member to review catalogue prices weekly and to respond to bids daily. It wins several direct purchase orders in its first quarter.

## Common mistakes

- Registering but not keeping the catalogue current.
- Listing branded products without valid OEM authorisation.
- Ignoring incidents raised by buyers.

## Key takeaways

- Register on GeM with accurate company, tax and MSE details.
- Get OEM authorisation before listing branded products as a reseller.
- Manage the catalogue, bids, orders and incidents actively.
""",
        """
GeM offers buyers different modes of purchase depending on the value of the order. Under the GFR, as amended by the Department of Expenditure's office memorandum of 10 July 2024, the limits for buying through GeM are:

## Buying modes by value

- **Up to ₹50,000:** **direct purchase** from any seller on GeM who meets the required quality, specification and delivery period.
- **Above ₹50,000 and up to ₹10 lakh:** **direct purchase through L1** — the buyer compares offers from sellers of at least three different manufacturers who meet the requirements, and buys from the lowest-priced (L1) seller.
- **Above ₹10 lakh:** **bid** or **reverse auction (RA)** on GeM. Buyers may also choose a bid or RA for lower values.

Buyers must record their reasons and follow their organisation's financial powers when they choose.

## How bids and reverse auctions work

- In a **bid**, sellers submit technical and price offers by a deadline. Technical evaluation comes first; prices of technically qualified sellers are then compared.
- In a **reverse auction**, technically qualified sellers lower their prices in real time for a set period, and the lowest price wins.
- Bid documents state eligibility criteria, specifications, delivery, warranty and any bid security or performance security.

## Key terms

- **Direct purchase:** buying from a seller without a bid, within the value limit.
- **L1:** the lowest-priced technically compliant offer.
- **Reverse auction (RA):** an online auction in which sellers lower prices.
- **Bid:** a formal competitive process on GeM with a submission deadline.

## Real-world example

A district office needs projectors worth ₹4 lakh. Because the value is between ₹50,000 and ₹10 lakh, the buyer compares products from at least three manufacturers that meet the specification and buys from the L1 seller. A seller whose catalogue price is competitive and whose product exactly matches the common specification wins the order without any bid.

## Common mistakes

- Using old value limits; they were revised in July 2024.
- Assuming the cheapest product always wins, without meeting specifications.
- Missing bid deadlines or technical documents.

## Key takeaways

- Up to ₹50,000: direct purchase. Above ₹50,000 to ₹10 lakh: L1 among at least three manufacturers. Above ₹10 lakh: bid or reverse auction.
- Technical compliance comes first; then price decides.
- Check the latest Department of Expenditure orders, as limits change.
""",
        """
On GeM, your catalogue is your shop window. Buyers find, compare and buy products based on what the catalogue says. An inaccurate catalogue can lead to lost orders, rejected deliveries, incidents and even suspension.

## What catalogue compliance means

- **Correct specifications:** every listed attribute must match the actual product delivered.
- **Correct price:** the offer price must be reasonable and not higher than the price offered elsewhere for the same conditions; GeM may compare prices with market references.
- **Country of origin and local content:** sellers must declare the country of origin and the percentage of local content, as required under the Make in India policy.
- **Authorisation:** resellers must have valid OEM authorisation for branded items.
- **Stock and delivery:** listed products should be available to deliver within the stated period.
- **Images and brochures:** must represent the actual product.

## Keeping the catalogue healthy

- Review prices regularly against the market and update them.
- Remove products that are end of sale or out of stock.
- Check specifications against OEM datasheets after any model change.
- Respond quickly to buyer queries and incidents.

## Key terms

- **Local content:** the share of value added in India, declared under the Make in India order.
- **Market price reasonableness:** the requirement that GeM prices are fair compared with the market.
- **Suspension:** temporary blocking of a seller or product on GeM for violations.

## Real-world example

A seller lists a laptop model with 16 GB of memory, but delivers units with 8 GB because the specification was copied from a different model. The buyer rejects the delivery and raises an incident. The seller must replace the units at its own cost and its rating suffers. After this, the seller checks every catalogue entry against the OEM's datasheet before publishing.

## Common mistakes

- Copying specifications from another model.
- Incorrect local content declarations.
- Leaving outdated prices and discontinued models listed.

## Key takeaways

- Catalogue specifications, prices and declarations must be accurate.
- Declare country of origin and local content correctly.
- Review and update the catalogue regularly.
""",
    ],
    "questions": [
        q("SINGLE", "Under which rule of GFR 2017 is procurement through GeM mandatory for goods and services available on it?", ["Rule 47", "Rule 149", "Rule 170", "Rule 171"], ["Rule 149"],
          explanation="Rule 149 of GFR 2017 covers procurement through GeM."),
        q("SINGLE", "A buyer needs items worth ₹40,000 available on GeM. Which mode can be used?", ["Direct purchase from any compliant seller", "Bid only", "Reverse auction only", "Open tender on CPPP"], ["Direct purchase from any compliant seller"],
          explanation="Up to ₹50,000, direct purchase from any seller meeting the requirements is allowed."),
        q("SINGLE", "For a purchase of ₹4 lakh on GeM, what is the usual direct purchase rule?", ["Buy from any seller", "Buy from the L1 seller after comparing at least three different manufacturers", "Always run a reverse auction", "Buy from the seller with the best brochure"], ["Buy from the L1 seller after comparing at least three different manufacturers"],
          explanation="Above ₹50,000 and up to ₹10 lakh, the buyer compares at least three manufacturers and buys from L1."),
        q("SINGLE", "Above what value does a GeM purchase normally require a bid or reverse auction?", ["₹50,000", "₹2.5 lakh", "₹10 lakh", "₹1 crore"], ["₹10 lakh"],
          explanation="The DoE office memorandum of 10 July 2024 set ₹10 lakh as the limit for direct purchase through L1."),
        q("TRUE_FALSE", "Sellers on GeM must declare the country of origin and local content of their products.", TF, ["True"],
          explanation="These declarations support the Make in India purchase preference."),
        q("TRUE_FALSE", "A reseller can list a branded product on GeM without the manufacturer's authorisation if it buys from a distributor.", TF, ["False"],
          explanation="Resellers generally need OEM authorisation to list branded products."),
        q("MATCHING", "Match each term to its meaning.", ["L1=Lowest-priced technically compliant offer", "Reverse auction=Sellers lower prices in real time", "GFR 2017=Rules governing central government procurement", "Incident=Complaint raised by a buyer on GeM"],
          explanation="These terms are used in every GeM transaction."),
    ],
    "sources": [GEM, DOE, CPPP, DPIIT],
}

COURSES["Government Sales Intermediate: Tenders, EMD and Bank Guarantees"] = {
    "lessons": [
        """
When an item is not on GeM, or a project is large and complex, government organisations run a tender. A tender is a formal, competitive process with fixed rules and dates. Every step must be followed exactly; a missed document or a late upload can disqualify an otherwise winning bid.

## Types of tender

- **Open tender (advertised tender enquiry):** published on the Central Public Procurement Portal (CPPP) or the organisation's e-procurement portal, open to all eligible bidders.
- **Limited tender:** sent to a limited number of registered or shortlisted vendors, usually for lower values or specialised items.
- **Single tender:** placed with one supplier in special cases, such as proprietary items, with recorded justification.
- **Two-stage bidding:** for complex projects where specifications are finalised after an initial technical stage.

## The tender lifecycle

1. **Publication:** the notice inviting tender (NIT) and tender documents are published.
2. **Pre-bid meeting:** bidders raise queries; the buyer clarifies.
3. **Corrigenda:** official changes to the tender are issued.
4. **Bid submission:** technical and financial bids uploaded online before the deadline, usually with a digital signature certificate.
5. **Technical evaluation:** eligibility and technical compliance are checked.
6. **Financial evaluation:** prices of technically qualified bidders are opened and compared.
7. **Award:** the letter of award or purchase order is issued to the successful bidder.
8. **Contract and performance security:** the contract is signed and performance security submitted.

## Key terms

- **NIT:** notice inviting tender.
- **Two-bid system:** separate technical and financial bids, opened in sequence.
- **Digital signature certificate (DSC):** an electronic signature needed to submit bids online.
- **Letter of award (LoA):** formal notice that a bidder has won.

## Real-world example

A company prepares an excellent bid for a state data-centre project but starts uploading 30 minutes before the deadline. The portal is slow, and the upload fails. The bid is not submitted, and months of preparation are wasted. The company now aims to upload at least a day before the deadline and keeps DSCs renewed and tested.

## Common mistakes

- Uploading at the last minute.
- Expired or untested digital signature certificates.
- Not reading corrigenda, which may change dates or requirements.

## Key takeaways

- Know the tender type and follow every step of the lifecycle.
- Read all corrigenda and attend the pre-bid meeting.
- Submit well before the deadline with a working DSC.
""",
        """
Eligibility criteria decide who can bid. Even the best technical solution is rejected if the company does not meet the eligibility conditions or fails to upload the required documents in the right format.

## Common eligibility criteria

- **Legal status:** registered company, with GST and PAN.
- **Financial capacity:** minimum average annual turnover over the last few years, supported by audited financial statements or a chartered accountant's certificate.
- **Experience:** completion of similar work of a specified value in recent years, supported by work orders and completion certificates.
- **OEM authorisation:** a manufacturer's authorisation form (MAF) for the products quoted.
- **Certifications:** for example ISO 9001 for quality or ISO/IEC 27001 for information security.
- **Declarations:** that the bidder is not blacklisted, and compliance with local content and other policies.

Micro and small enterprises and DPIIT-recognised startups may receive relaxations on prior turnover and experience, subject to meeting quality and technical specifications, as allowed by the government's orders and the tender document.

## Preparing documents

- Maintain an up-to-date document library: incorporation documents, financials, certificates, completion certificates and standard declarations.
- Read the tender's exact format requirements, such as specific annexure forms and notarisation.
- Check that names, addresses and signatures are consistent across documents.
- Prepare a checklist mapping each requirement to the uploaded file and page number.

## Key terms

- **Eligibility criteria:** minimum conditions a bidder must meet.
- **Manufacturer's authorisation form (MAF):** an OEM's letter authorising a bidder to quote its products.
- **Completion certificate:** a customer's confirmation that a project was completed.
- **Blacklisting:** debarment of a vendor from government procurement for a period.

## Real-world example

A company meets the turnover and experience criteria, but its completion certificate for a key project shows a value slightly below the required amount because taxes were excluded. The tender asked for the value including taxes. The company obtains a revised certificate from the customer before submission. A careful reading of the criteria saved the bid.

## Common mistakes

- Uploading documents in the wrong format or annexure.
- Missing the OEM authorisation form.
- Inconsistent company names across certificates.

## Key takeaways

- Check eligibility early and decide whether to bid.
- Keep a current library of standard documents.
- Map every requirement to a document with a checklist.
""",
        """
Government tenders protect the buyer against two risks: a bidder withdrawing its bid, and a winning supplier failing to perform. Bid security addresses the first; performance security addresses the second. Both are governed by the General Financial Rules.

## Bid security (earnest money deposit)

- **Rule 170 of GFR 2017:** bid security, also called earnest money deposit (EMD), is normally between **2% and 5%** of the estimated value of the goods or services.
- **Bid Security Declaration:** following a Department of Expenditure order of November 2020, organisations are encouraged to accept a **Bid Security Declaration** instead of a monetary EMD. In it, the bidder accepts that it will be suspended from bidding for a period if it withdraws or changes its bid during validity, or fails to sign the contract or submit performance security after award.
- **Exemptions:** micro and small enterprises registered for the tendered items and DPIIT-recognised startups are generally exempt from bid security, as provided in the tender.

## Performance security

- **Rule 171 of GFR 2017** (as amended): performance security is **3% to 5%** of the contract value for goods, consultancy and non-consultancy services. Works contracts follow separate limits.
- It must remain valid until 60 days after the completion of all contractual obligations, including warranty.

## Accepted forms

Common forms include bank guarantees, fixed deposit receipts, demand drafts, online payment and, since 2022, insurance surety bonds where the tender allows. Always use the format given in the tender.

## Key terms

- **EMD / bid security:** security that a bidder will not withdraw its bid.
- **Bid Security Declaration:** a written undertaking in place of a monetary EMD.
- **Performance security:** security for proper performance of the contract.
- **Bank guarantee (BG):** a bank's promise to pay the buyer if the supplier fails its obligations.

## Real-world example

A company wins a ₹2 crore order with performance security of 5%, or ₹10 lakh, valid until 60 days after a three-year warranty. Finance arranges a bank guarantee in the tender's format. The account manager records the expiry date and the claim period, so the guarantee can be extended if the warranty is extended, and released promptly at the end.

## Common mistakes

- Submitting a bank guarantee in the wrong format or with a short validity.
- Using old performance security percentages from before the amendment.
- Forgetting to claim release of guarantees after obligations end.

## Key takeaways

- Bid security is usually 2–5%, often replaced by a Bid Security Declaration; MSEs and startups are generally exempt.
- Performance security is 3–5% for goods and services, valid until 60 days after all obligations end.
- Follow the tender's format and track guarantee expiry and release.
""",
        """
Before submitting a bid, bidders can ask questions about the tender. After the pre-bid stage, the buyer may change the tender through corrigenda. Using pre-bid queries well and tracking every corrigendum are essential skills in government sales.

## Pre-bid queries

- **Purpose:** to clarify unclear points, request changes to restrictive specifications, and point out errors.
- **Timing:** submit queries by the deadline and in the format required, often a table with clause number, original text, query and suggested change.
- **Tone:** professional and factual. Explain why a change improves competition or quality.
- **Good topics:** specifications that favour one brand, unrealistic delivery periods, unclear scope, conflicting clauses, and payment terms.

## Corrigenda

A corrigendum (or addendum) is an official change to the tender. It can change dates, specifications, quantities, eligibility or terms. Answers to pre-bid queries are often issued as a corrigendum.

- Check the portal regularly until the bid deadline.
- Read every corrigendum fully and update the bid accordingly.
- Some tenders require bidders to upload signed copies of all corrigenda with the bid.

## Key terms

- **Pre-bid query:** a formal question submitted before the bid deadline.
- **Pre-bid meeting:** a meeting where the buyer answers bidders' questions.
- **Corrigendum / addendum:** an official change to the tender documents.

## Real-world example

A tender for campus Wi-Fi specifies an access point feature that only one brand offers. The company submits a pre-bid query explaining that equivalent standards-based features achieve the same result and that broader specifications would improve competition. The buyer issues a corrigendum accepting "equivalent or better" specifications. The company can now bid with its preferred OEM.

## Common mistakes

- Missing the query deadline.
- Asking vague questions without clause references.
- Not checking for corrigenda in the final days before submission.

## Key takeaways

- Use pre-bid queries to clarify and improve tender terms, with clause references.
- Track and read every corrigendum until the deadline.
- Update the bid and upload corrigenda copies if required.
""",
    ],
    "questions": [
        q("SINGLE", "Under Rule 170 of GFR 2017, bid security is normally:", ["0.5% to 1%", "2% to 5% of the estimated value", "10% of the contract value", "Not allowed"], ["2% to 5% of the estimated value"],
          explanation="Rule 170 sets bid security between 2% and 5% of the estimated value."),
        q("SINGLE", "What is the performance security range for goods and services under amended Rule 171?", ["1% to 2%", "3% to 5%", "5% to 10%", "10% to 15%"], ["3% to 5%"],
          explanation="The amendment reduced performance security for goods and services to 3–5% of contract value."),
        q("TRUE_FALSE", "A Bid Security Declaration can be accepted instead of a monetary EMD.", TF, ["True"],
          explanation="The Department of Expenditure's November 2020 order encourages Bid Security Declarations."),
        q("SINGLE", "Until when must performance security remain valid?", ["Until delivery", "Until 60 days after completion of all obligations, including warranty", "One year from award", "Until the first payment"], ["Until 60 days after completion of all obligations, including warranty"],
          explanation="Rule 171 requires validity until 60 days beyond completion of all contractual obligations."),
        q("MULTIPLE", "Which documents are commonly required to prove eligibility?", ["Audited financial statements or CA certificate", "Completion certificates", "Manufacturer's authorisation form", "Employee birthday list"], ["Audited financial statements or CA certificate", "Completion certificates", "Manufacturer's authorisation form"],
          explanation="Financial, experience and OEM documents are standard eligibility proofs."),
        q("SINGLE", "A specification seems to favour one brand. What should you do?", ["Bid anyway with another brand and hope", "Submit a pre-bid query with the clause reference and suggested change", "Complain to the media", "Ignore the tender"], ["Submit a pre-bid query with the clause reference and suggested change"],
          explanation="Pre-bid queries are the formal channel to request changes."),
        q("TRUE_FALSE", "Corrigenda can change dates, specifications and eligibility, so bidders must check for them until the deadline.", TF, ["True"],
          explanation="Missing a corrigendum can make a bid non-compliant."),
    ],
    "sources": [DOE, CPPP, MSME, STARTUP_INDIA, GEM],
}

COURSES["Government Sales Advanced: Procurement Rules and Bid Documentation"] = {
    "lessons": [
        """
Senior government sales professionals understand the rules buyers must follow. This helps you plan bids, raise the right queries and avoid actions that could disqualify you or put the buyer in a difficult position.

## The framework

- **General Financial Rules, 2017 (GFR 2017):** Chapter 6 covers procurement of goods and services, including principles, GeM, tender types, bid security, performance security and evaluation.
- **Manuals for Procurement:** the Department of Expenditure publishes manuals for goods, consultancy and other services, and works. They explain the GFR in practical detail and are updated periodically.
- **Delegation of financial powers:** each officer can approve purchases only within their financial powers.
- **CVC guidelines:** the Central Vigilance Commission issues guidelines on transparency, including the use of an integrity pact in large tenders.
- **State rules:** state governments have their own financial rules and procurement acts, such as transparency in public procurement acts in several states.

## Core principles buyers must follow

- Transparency, competition, fairness and elimination of arbitrariness.
- Specifications based on functional requirements, not a particular brand.
- Reasonable delivery periods and terms.
- Recorded reasons for decisions.

## Key terms

- **Chapter 6 of GFR 2017:** the chapter on procurement of goods and services.
- **Integrity pact:** an agreement between the buyer and bidders to avoid corrupt practices, monitored by independent external monitors.
- **Delegation of financial powers:** limits on what each officer can approve.

## Real-world example

A PSU's tender includes an integrity pact. A bidder's agent suggests approaching an evaluation committee member informally. The bid manager refuses, reminding the team that the integrity pact commits bidders to ethical conduct and that a violation could lead to disqualification and blacklisting. The company competes on merit and remains eligible for future tenders.

## Common mistakes

- Expecting buyers to bend rules to favour a relationship.
- Not understanding the buyer's financial powers and approval timelines.
- Ignoring the integrity pact terms.

## Key takeaways

- GFR 2017, procurement manuals, CVC guidelines and state rules frame government buying.
- Buyers must ensure transparency, competition and recorded reasons.
- Ethical conduct, including compliance with integrity pacts, is non-negotiable.
""",
        """
Government procurement policies give preferences to certain suppliers to support domestic manufacturing, small businesses and startups. Understanding them can change bid strategy, partner selection and pricing.

## Make in India (local content)

The **Public Procurement (Preference to Make in India) Order, 2017**, issued by DPIIT and revised over time, most recently in July 2024, classifies suppliers by local content:

- **Class I local supplier:** local content of **50% or more**.
- **Class II local supplier:** local content of **more than 20% but less than 50%**.
- **Non-local supplier:** local content of **20% or less**.

Class I local suppliers receive purchase preference, with a margin of purchase preference of 20% in the cases defined by the order. Bidders must declare local content, and false declarations attract penalties, including debarment. Many ministries notify higher local content requirements for specific products.

## Micro and small enterprises

Under the **Public Procurement Policy for MSEs Order, 2012** (amended in 2018), central ministries, departments and PSUs must procure at least **25%** of their annual procurement of goods and services from micro and small enterprises, including **4%** from enterprises owned by SC/ST entrepreneurs and **3%** from women-owned enterprises. MSEs also receive benefits such as free tender documents and exemption from bid security. A list of items is reserved for purchase from MSEs.

## Startups

DPIIT-recognised startups may receive relaxations from prior turnover and experience criteria, subject to meeting quality and technical specifications, and are generally exempt from bid security.

## Key terms

- **Local content:** the value added in India as a share of the total value.
- **Margin of purchase preference:** the price band within which a preferred supplier can be awarded the order by matching L1.
- **MSE:** micro and small enterprise, registered under Udyam.

## Real-world example

A company's bid uses an imported server brand with low local content, while a competitor offers a server assembled in India with more than 50% local content. The competitor qualifies as a Class I local supplier and receives purchase preference. For the next tender, the company partners with an OEM that manufactures in India and declares local content with supporting certificates.

## Common mistakes

- Ignoring local content when selecting OEMs for government bids.
- Making local content declarations without evidence.
- Not registering as an MSE when eligible.

## Key takeaways

- Class I (50% or more), Class II (over 20% and under 50%), non-local (20% or less).
- MSEs: 25% annual procurement target, with 4% SC/ST and 3% women-owned.
- Choose partners and declare local content with evidence.
""",
        """
Bid assembly turns months of work into a complete, compliant submission. A disciplined process prevents last-minute errors, which are the most common reason good bids fail.

## The bid team

- **Bid manager:** owns the timeline, checklist and final submission.
- **Sales:** customer insight, pricing strategy and relationships.
- **Presales:** technical solution, compliance statement and BOM.
- **Finance:** pricing, bid security, financial documents and certificates.
- **Legal and compliance:** contract terms, declarations and integrity pact.

## The bid assembly process

1. **Bid/no-bid decision:** check eligibility, competition, margins and risks.
2. **Requirements checklist:** list every document, form and annexure with an owner.
3. **Technical bid:** compliance statement, solution, datasheets and OEM authorisations.
4. **Commercial bid:** price schedule in the exact format, with taxes stated as required.
5. **Internal review:** a second person checks every page against the checklist.
6. **Approval:** final price and terms approved by the authorised person.
7. **Upload:** at least a day early, with a tested digital signature certificate.
8. **Post-submission:** save the submission receipt and a complete copy of the bid.

## Key terms

- **Bid/no-bid decision:** deciding whether to invest in a bid.
- **Price schedule / BoQ:** the buyer's format for prices, also called bill of quantities.
- **Submission receipt:** the portal's confirmation of a successful bid upload.

## Real-world example

During internal review, the bid team discovers that the technical bid quotes a switch model with a two-year warranty, while the tender requires three years. The price schedule assumed three years. The team corrects the datasheet and the OEM authorisation before upload. Without the review, the bid would have been rejected for inconsistency.

## Common mistakes

- No clear bid manager or checklist.
- Prices revealed in the technical bid, which can lead to rejection in a two-bid system.
- Inconsistencies between the technical and commercial bids.

## Key takeaways

- Make a clear bid/no-bid decision and assign a bid manager.
- Use a checklist and an independent internal review.
- Upload early and keep proof of submission and a full copy.
""",
        """
Winning the order is half the work. Government contracts have strict delivery, acceptance and documentation requirements. Payment depends on meeting them exactly.

## After the award

- **Accept the order or contract** within the required time.
- **Submit performance security** in the required form and validity.
- **Plan delivery and installation** to meet the contract schedule; delays can attract liquidated damages.
- **Deliver with correct documents:** invoice, delivery challan where needed, e-way bill and warranty certificates.
- **Obtain acceptance:** installation and acceptance certificates signed by the consignee.

## Payments on GeM

On GeM, the consignee generates a **Consignee Receipt and Acceptance Certificate (CRAC)** after receiving and accepting the goods or services; if the consignee does not act in time, GeM can generate it automatically. Under GeM's general terms and conditions and Ministry of Finance instructions, the buyer must pay within **10 days of the CRAC** being generated, including auto-generation. Late payment can attract penal interest charged to the buyer organisation. Sellers can track payment status on the portal and raise issues if payment is delayed.

## Payments under tenders

- Payments follow the contract's milestones, for example a percentage on delivery and the balance on installation and acceptance.
- Submit complete bills with all required documents to avoid queries.
- Track deductions such as TDS under income tax, TDS under GST where applicable, and any liquidated damages.

## Key terms

- **CRAC:** Consignee Receipt and Acceptance Certificate on GeM.
- **Consignee:** the official who receives the goods on behalf of the buyer.
- **Liquidated damages:** pre-agreed deductions for delay.
- **Final bill:** the last payment claim after all obligations are met.

## Real-world example

A company delivers 100 desktops to a government school network through GeM. It coordinates with the consignee to verify the delivery and generate the CRAC promptly, then submits its invoice the same day. Payment arrives within the 10 days set by GeM. Another seller who delivered on time but did not follow up on the CRAC waited two months.

## Common mistakes

- Delivering without the exact documents required by the contract.
- Not following up for acceptance certificates or the CRAC.
- Ignoring liquidated damages clauses when planning delivery.

## Key takeaways

- Accept the order, submit performance security and deliver on schedule.
- On GeM, payment follows the CRAC; follow up with the consignee promptly.
- Submit complete bills and track deductions and guarantee releases.
""",
    ],
    "questions": [
        q("SINGLE", "Under the Make in India order as revised in 2024, what local content makes a Class I local supplier?", ["10% or more", "20% or more", "50% or more", "100%"], ["50% or more"],
          explanation="Class I requires local content of 50% or more."),
        q("SINGLE", "A supplier with 35% local content is classified as:", ["Class I local supplier", "Class II local supplier", "Non-local supplier", "Exempt"], ["Class II local supplier"],
          explanation="Class II is more than 20% and less than 50% local content."),
        q("SINGLE", "What share of annual procurement must central ministries and PSUs source from MSEs?", ["10%", "20%", "25%", "50%"], ["25%"],
          explanation="The MSE procurement policy sets a 25% target, including 4% SC/ST and 3% women-owned enterprises."),
        q("FILL_BLANK", "On GeM, the certificate generated after goods are received and accepted is called the ______.", ["CRAC", "Consignee Receipt and Acceptance Certificate"],
          explanation="Payment on GeM follows the CRAC."),
        q("TRUE_FALSE", "In a two-bid system, revealing prices in the technical bid can lead to rejection.", TF, ["True"],
          explanation="Prices belong only in the financial bid, which is opened after technical evaluation."),
        q("MULTIPLE", "Which actions are part of a disciplined bid assembly?", ["Bid/no-bid decision", "Requirements checklist with owners", "Independent internal review", "Uploading in the last ten minutes"], ["Bid/no-bid decision", "Requirements checklist with owners", "Independent internal review"],
          explanation="Last-minute uploads are a common cause of failure."),
        q("SHORT_ANSWER", "Explain in two or three sentences why accurate local content declarations matter in government bids.",
          explanation="Local content decides the supplier's class and purchase preference under the Make in India order. False declarations can lead to penalties and debarment, so declarations must be backed by evidence."),
    ],
    "sources": [DOE, DPIIT, MSME, GEM, CVC],
}
