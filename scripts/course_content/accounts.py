"""Accounts: billing, invoicing and GST; receivables, payables and reconciliation; financial reporting basics."""
from . import q, TF

COURSES = {}

CBIC_GST = ("CBIC GST: CGST Act, CGST Rules (including Rule 46 on tax invoices and Rule 138 on e-way bills) and notifications", "https://cbic-gst.gov.in/")
GST_PORTAL = ("GST portal (GSTN): returns, GSTIN search and advisories", "https://www.gst.gov.in/")
EINVOICE = ("GST e-invoice system (Invoice Registration Portal)", "https://einvoice1.gst.gov.in/")
EWAY = ("GST e-way bill system", "https://ewaybillgst.gov.in/")
GST_COUNCIL = ("GST Council: rate decisions and meeting outcomes", "https://gstcouncil.gov.in/")
ICAI = ("The Institute of Chartered Accountants of India (ICAI): accounting standards and guidance", "https://www.icai.org/")
MCA = ("Ministry of Corporate Affairs: Companies Act 2013, Schedule III and Ind AS", "https://www.mca.gov.in/")
SAMADHAAN = ("MSME Samadhaan: delayed payment portal for micro and small enterprises", "https://samadhaan.msme.gov.in/")

COURSES["Accounts Basic: Billing, Invoicing and GST"] = {
    "lessons": [
        """
An invoice is more than a request for payment. Under GST, a tax invoice is a legal document: it allows the customer to claim input tax credit and it records our tax liability. A wrong or incomplete invoice can delay payment, cause the customer to lose tax credit, and lead to penalties.

## Mandatory fields on a tax invoice

Rule 46 of the CGST Rules lists what a tax invoice must contain. The main fields are:

- The supplier's name, address and GSTIN.
- A unique, consecutive invoice number of up to 16 characters, unique for the financial year.
- The date of issue.
- The recipient's name, address and GSTIN (if registered).
- The HSN code for goods or SAC code for services.
- A description of the goods or services, the quantity and the unit.
- The taxable value, after any discount.
- The tax rate and the tax amount, shown separately for CGST, SGST or UTGST, and IGST.
- The place of supply, with the name of the state, for inter-state supplies.
- The delivery address if it is different from the place of supply.
- Whether tax is payable on reverse charge.
- The signature or digital signature of the supplier or an authorised representative.

## Good invoicing practice

- Raise the invoice on time, matching the customer's PO exactly: items, quantities, prices and PO number.
- Check the customer's GSTIN on the GST portal before the first invoice.
- Attach supporting documents the customer requires, such as delivery proof or installation reports.
- Never edit an issued invoice. Use a credit note or debit note to correct it.

## Key terms

- **Tax invoice:** the GST document issued for a taxable supply.
- **Taxable value:** the value on which GST is calculated.
- **Reverse charge:** a case where the recipient, not the supplier, pays the GST.

## Real-world example

A customer's accounts team rejects an invoice for ₹8 lakh because the PO number is missing and the GSTIN has one wrong character. The payment, due in 30 days, is delayed by three weeks while a corrected invoice is issued. The billing team now checks every invoice against the PO and validates the GSTIN on the portal before sending.

## Common mistakes

- Missing the customer's PO reference.
- Wrong GSTIN or place of supply.
- Editing an invoice after issue instead of issuing a credit or debit note.

## Key takeaways

- A tax invoice must contain the fields listed in Rule 46 of the CGST Rules.
- Match every invoice to the customer's PO and verify the GSTIN.
- Correct errors with credit or debit notes, never by editing an issued invoice.
""",
        """
Goods and Services Tax (GST) is India's main indirect tax on the supply of goods and services. It was introduced on 1 July 2017 and replaced many earlier taxes such as excise, service tax and VAT. Everyone in a commercial role should understand its basic structure.

## Which GST applies

- **Intra-state supply** (supplier and place of supply in the same state): **CGST** (central) plus **SGST** (state), or UTGST in a Union Territory, split equally.
- **Inter-state supply** (different states): **IGST**, collected by the centre.
- **Example:** an 18% supply within Maharashtra is charged 9% CGST plus 9% SGST. The same supply from Maharashtra to Karnataka is charged 18% IGST.

## GST rates

GST rates are set by the GST Council. Following the Council's decision of September 2025, effective 22 September 2025, the main rates are 5% and 18%, with a 40% rate for a small group of luxury and "sin" goods, and special low rates for a few items. Most IT hardware, software and IT services fall under 18%. Rates change, so always check the latest notification or ask the tax team before quoting.

## Input tax credit

A registered business can usually set off the GST it paid on purchases (input tax) against the GST it collects on sales (output tax). To claim it, the supplier must have reported the invoice in its returns, the goods or services must have been received, and the business must hold a valid tax invoice.

## Key terms

- **CGST, SGST, UTGST, IGST:** the components of GST depending on where the supply takes place.
- **Place of supply:** the location that decides whether a supply is intra-state or inter-state.
- **Input tax credit (ITC):** GST paid on purchases that can be set off against GST collected.
- **GSTR-1 and GSTR-3B:** common GST returns for reporting sales and paying tax.

## Real-world example

A Delhi-based company sells servers to a customer in Noida, Uttar Pradesh, and delivers them there. Although the two cities are close, they are in different states, so the supply is inter-state and IGST applies. An invoice charging CGST and SGST would be wrong, and the customer could have trouble claiming its credit.

## Common mistakes

- Charging CGST and SGST on an inter-state supply, or IGST on an intra-state one.
- Quoting old GST rates.
- Assuming input credit is available without checking the supplier's returns.

## Key takeaways

- CGST plus SGST for intra-state supplies; IGST for inter-state supplies.
- Most IT goods and services are taxed at 18%, but always check current rates.
- Input tax credit depends on valid invoices and the supplier's compliance.
""",
        """
Every product and service on a GST invoice needs a classification code. Goods use HSN codes and services use SAC codes. The code decides the tax rate, so a wrong code can mean wrong tax.

## HSN codes for goods

HSN stands for Harmonized System of Nomenclature, an international system maintained by the World Customs Organization. India uses up to eight digits. Under GST notifications in force since 1 April 2021:

- Businesses with aggregate turnover up to ₹5 crore in the previous year must show at least **4-digit** HSN codes on B2B invoices.
- Businesses with turnover above ₹5 crore must show at least **6-digit** HSN codes on all invoices.

Examples of chapters common in IT:

- **8471:** computers and their units, such as laptops, desktops and servers.
- **8517:** telephone and data communication equipment, including switches and routers.
- **8504:** electrical transformers and static converters, which includes UPS units.
- **8528:** monitors and projectors.

## SAC codes for services

SAC stands for Services Accounting Code. SAC codes start with 99. For example, heading **9983** covers other professional, technical and business services, which includes IT consulting, design and support services. Installation, maintenance and repair services have their own headings.

## Choosing the right code

- Use the code from the OEM's or distributor's invoice as a starting point, but confirm it.
- For bundled supplies, such as hardware with installation, check with the tax team whether it is a composite supply, where the main item's rate applies.
- Keep a master list of approved codes for common products and services.

## Key terms

- **HSN:** Harmonized System of Nomenclature, the code for goods.
- **SAC:** Services Accounting Code, the code for services.
- **Composite supply:** two or more supplies naturally bundled, taxed at the rate of the principal supply.

## Real-world example

A billing executive uses a 4-digit HSN code on an invoice. The company's turnover last year was ₹40 crore, so a 6-digit code is required. The customer's auditor flags it. The company updates its item master so that every product carries the correct 6-digit code, avoiding repeated corrections.

## Common mistakes

- Using too few digits for the company's turnover.
- Copying codes without checking.
- Using a goods code for a service.

## Key takeaways

- Goods use HSN codes; services use SAC codes starting with 99.
- Above ₹5 crore turnover, show at least 6-digit HSN codes on invoices.
- Keep an approved master list and check unusual items with the tax team.
""",
        """
E-invoicing and e-way bills are two digital systems under GST. E-invoicing validates B2B invoices through a government portal. E-way bills track the movement of goods. Both are mandatory above set limits, and mistakes can lead to penalties or goods being detained in transit.

## E-invoicing

- **Who:** businesses whose aggregate annual turnover exceeds **₹5 crore** in any financial year since 2017-18 must issue e-invoices for B2B supplies and exports. This limit applies from 1 August 2023 (Notification 10/2023-Central Tax). It was reduced in stages from ₹500 crore.
- **How:** the invoice details are uploaded to the Invoice Registration Portal (IRP), which returns an Invoice Reference Number (IRN) and a signed QR code. The invoice is valid only with the IRN.
- **Time limit:** some taxpayers must report invoices to the IRP within 30 days of the invoice date; check the current GSTN advisory for the limit that applies.

## E-way bills

- **When:** an e-way bill is generally required when goods worth more than **₹50,000** are moved, under Rule 138 of the CGST Rules. Some states set different limits for movement within the state.
- **Parts:** Part A holds invoice and consignee details; Part B holds vehicle details.
- **Validity:** for normal cargo, one day for every 200 km or part of it; for over-dimensional cargo, one day for every 20 km.
- **Extension:** can be extended before or shortly after expiry if goods are delayed.

## Key terms

- **IRN:** Invoice Reference Number, a unique number generated by the IRP.
- **IRP:** Invoice Registration Portal.
- **Consignment value:** the value of goods, including tax, shown on the invoice or challan.

## Real-world example

A company dispatches ₹6 lakh of networking equipment from Bengaluru to a customer in Chennai, about 350 km away. The e-way bill is valid for two days. The truck breaks down and arrives on day three. Because the logistics team extended the e-way bill before it expired, the goods are not detained at a checkpoint.

## Common mistakes

- Issuing a B2B invoice without an IRN when e-invoicing applies.
- Moving goods without an e-way bill, or with one that has expired.
- Wrong vehicle number in Part B.

## Key takeaways

- E-invoicing applies above ₹5 crore turnover; an invoice needs an IRN to be valid.
- E-way bills are generally required for goods above ₹50,000, with validity based on distance.
- Check details carefully and extend e-way bills before they expire.
""",
    ],
    "questions": [
        q("SINGLE", "A supplier in Maharashtra sells an 18% item to a customer in Karnataka. Which tax applies?", ["9% CGST + 9% SGST", "18% IGST", "18% SGST", "No GST"], ["18% IGST"],
          explanation="Inter-state supplies attract IGST."),
        q("MULTIPLE", "Which fields must appear on a GST tax invoice?", ["Supplier's GSTIN", "HSN or SAC code", "Tax rate and amount", "The salesperson's mobile number"], ["Supplier's GSTIN", "HSN or SAC code", "Tax rate and amount"],
          explanation="These are among the mandatory fields listed in Rule 46 of the CGST Rules."),
        q("SINGLE", "A company's turnover last year was ₹40 crore. How many HSN digits must it show on invoices?", ["2", "4", "At least 6", "8 only"], ["At least 6"],
          explanation="Above ₹5 crore turnover, at least 6-digit HSN codes are required."),
        q("FILL_BLANK", "Services are classified using ______ codes, which start with 99.", ["SAC", "Services Accounting Code"],
          explanation="SAC stands for Services Accounting Code."),
        q("SINGLE", "From 1 August 2023, e-invoicing applies to businesses with aggregate turnover above:", ["₹500 crore", "₹50 crore", "₹10 crore", "₹5 crore"], ["₹5 crore"],
          explanation="Notification 10/2023-Central Tax reduced the limit to ₹5 crore from 1 August 2023."),
        q("SINGLE", "For normal cargo, how long is an e-way bill valid?", ["One day per 100 km", "One day per 200 km", "Seven days always", "One day per 500 km"], ["One day per 200 km"],
          explanation="Rule 138 gives one day for every 200 km or part of it for normal cargo."),
        q("TRUE_FALSE", "If an issued invoice has an error, you should edit it and resend it with the same number.", TF, ["False"],
          explanation="Issued invoices are corrected through credit or debit notes, not edited."),
        q("MATCHING", "Match each HSN chapter to its products.", ["8471=Computers, laptops and servers", "8517=Switches, routers and phones", "8504=Static converters such as UPS", "8528=Monitors and projectors"],
          explanation="Knowing common chapters helps you check product codes."),
    ],
    "sources": [CBIC_GST, GST_PORTAL, EINVOICE, EWAY, GST_COUNCIL],
}

COURSES["Accounts Intermediate: Receivables, Payables and Reconciliation"] = {
    "lessons": [
        """
Receivables are the amounts customers owe us for goods and services already delivered and invoiced. In an IT business with thin product margins, a sale is not complete until the money is received. Late payments tie up cash, increase borrowing costs and can turn a profitable deal into a loss.

## Measuring receivables

- **Ageing report:** shows outstanding invoices grouped by how long they have been due, for example 0–30, 31–60, 61–90 and over 90 days.
- **Days Sales Outstanding (DSO):** a measure of how long customers take to pay on average. A simple formula is: receivables ÷ revenue for the period × number of days in the period.

## A collections process that works

1. **Before the invoice:** confirm the billing address, GSTIN, PO number and any documents the customer needs for payment.
2. **On invoicing:** send the invoice promptly with all supporting documents, and confirm receipt.
3. **Before the due date:** a polite reminder and a check that the invoice is approved in the customer's system.
4. **After the due date:** follow up by phone and email, escalating step by step.
5. **Serious delay:** involve sales and management, and consider holding further supplies according to policy.

## Working with sales

Sales owns the customer relationship and can often unlock delayed payments by speaking to the right person. Share the ageing report with sales every week, and agree who will follow up on each overdue invoice.

## Key terms

- **Accounts receivable (AR):** money owed to us by customers.
- **Ageing report:** outstanding invoices grouped by days overdue.
- **DSO:** the average number of days customers take to pay.
- **Bad debt:** an amount that is unlikely to be collected.

## Real-world example

A ₹25 lakh invoice is 60 days overdue. The collections executive learns that the customer's accounts team is waiting for a signed installation report, which the project team never sent. Once the report is shared, the invoice is approved and paid within a week. The team adds the installation report to the standard invoice pack for project sales.

## Common mistakes

- Starting follow-up only after the due date.
- Sending invoices without the documents the customer needs.
- Not involving sales when payments are seriously delayed.

## Key takeaways

- Cash is collected, not just invoiced; track the ageing report and DSO.
- Follow a step-by-step collections process that begins before the due date.
- Work closely with sales and the project team to remove payment blockers.
""",
        """
Payables are the amounts we owe our suppliers. Paying them correctly and on time keeps supply flowing, protects our relationship with distributors and avoids legal and tax problems.

## A sound payables process

1. Receive the vendor invoice and record it.
2. Complete the three-way match with the PO and goods receipt note.
3. Check GST details so that input tax credit can be claimed.
4. Deduct tax at source (TDS) where income-tax law requires it.
5. Get payment approval according to the approval matrix.
6. Pay on the due date and send a payment advice to the vendor.

## Paying micro and small enterprises on time

Under Section 15 of the MSMED Act, 2006, a buyer must pay a micro or small enterprise supplier within the agreed period, which cannot exceed **45 days** from acceptance of the goods or services; if there is no written agreement, the limit is 15 days. Late payment attracts compound interest at three times the bank rate notified by the RBI. Since the financial year 2023-24, Section 43B(h) of the Income-tax Act also disallows the expense deduction for such payments until they are actually paid, if they are paid late. Vendor records should show each supplier's MSME (Udyam) status.

## Key terms

- **Accounts payable (AP):** money we owe to suppliers.
- **TDS:** tax deducted at source under the Income-tax Act on certain payments.
- **Payment advice:** a note to the vendor listing the invoices paid and deductions.
- **Days Payable Outstanding (DPO):** the average number of days we take to pay suppliers.

## Real-world example

A small cabling contractor registered as a micro enterprise has an invoice approved but unpaid for 70 days. The contractor files a complaint on the MSME Samadhaan portal. The company must pay interest, and the expense deduction for the year is affected. After this, the payables team adds an MSME flag to the vendor master and a weekly report of MSME invoices nearing 45 days.

## Common mistakes

- Paying before the three-way match is complete.
- Ignoring MSME payment time limits.
- Not sending a payment advice, which leads to reconciliation problems for the vendor.

## Key takeaways

- Match, check GST, apply TDS and approve before paying.
- Pay micro and small enterprises within the legal limit of 45 days at most.
- Clear payment advice helps vendors reconcile and avoids disputes.
""",
        """
Reconciliation means comparing two sets of records to check they agree, and explaining any differences. It catches errors, missing entries and fraud early. Accounts teams reconcile the bank, customer and vendor ledgers, and GST data regularly.

## Bank reconciliation

Compare the bank statement with the bank account in our books. Differences usually come from:

- Cheques issued but not yet presented to the bank.
- Deposits recorded in our books but not yet credited by the bank.
- Bank charges or interest not yet recorded in our books.
- Errors, such as an amount entered twice.

The result is a bank reconciliation statement that explains every difference.

## Customer and vendor reconciliation

- Send customers a statement of account regularly and ask them to confirm the balance.
- Compare vendor statements with our ledger, and resolve missing invoices, payments or credit notes.
- Agree differences in writing.

## GST reconciliation

Compare our purchase register with the input tax credit shown in the GST portal (GSTR-2B), so that credit is claimed only for invoices the supplier has reported. Also check that our sales register matches what we reported in GSTR-1.

## Key terms

- **Bank reconciliation statement (BRS):** a statement explaining differences between the bank statement and our books.
- **Statement of account:** a list of invoices, payments and the balance for a customer or vendor.
- **GSTR-2B:** an auto-drafted statement of input tax credit available, based on suppliers' filings.

## Real-world example

During the monthly vendor reconciliation, the accounts team finds that a distributor's statement shows ₹3 lakh more than our ledger. The difference is a credit note the distributor issued for returned goods, which our team had not recorded. Once it is recorded, the balances agree and the company avoids overpaying.

## Common mistakes

- Reconciling only at year end.
- Leaving differences unexplained.
- Claiming input credit for invoices that are not in GSTR-2B.

## Key takeaways

- Reconcile bank, customer, vendor and GST records regularly, usually monthly.
- Explain and resolve every difference.
- Claim input credit only for invoices reported by suppliers.
""",
        """
Credit notes and debit notes are the correct way to change the value of an invoice after it has been issued. Under GST, they are governed by Section 34 of the CGST Act and must contain prescribed details.

## Credit notes

A supplier issues a credit note when the value or tax on an invoice needs to go down, for example when:

- Goods are returned by the customer.
- The price charged was higher than agreed.
- A discount is given after the sale, as agreed before or at the time of supply.
- Goods or services were found to be deficient.

**Time limit:** a credit note for a financial year must be declared in returns by **30 November** following the end of that financial year, or the date of filing the annual return, whichever is earlier.

## Debit notes

A supplier issues a debit note when the value or tax needs to go up, for example when:

- The price charged was lower than agreed.
- Additional quantity was supplied.

## Good practice

- Always link the note to the original invoice number and date.
- Record the reason clearly.
- Make sure the customer or vendor records the same note so that both ledgers and GST returns match.

## Key terms

- **Credit note:** a document that reduces the value or tax of an earlier invoice.
- **Debit note:** a document that increases the value or tax of an earlier invoice.
- **Section 34:** the CGST Act section that governs credit and debit notes.

## Real-world example

A customer returns four damaged monitors from an invoice of 20. The company issues a credit note for the four monitors, linked to the original invoice, with the reason "goods returned: damaged in transit". The customer reverses the matching input tax credit. Both sides' GST returns match, and the customer's next payment is for the correct balance.

## Common mistakes

- Issuing a new, lower invoice instead of a credit note.
- Missing the 30 November deadline.
- Not linking the note to the original invoice.

## Key takeaways

- Use credit notes to reduce, and debit notes to increase, an issued invoice's value.
- Link each note to the original invoice and record the reason.
- Declare credit notes before 30 November after the financial year ends, or the annual return date if earlier.
""",
    ],
    "questions": [
        q("SINGLE", "What does an ageing report show?", ["Employee ages", "Outstanding invoices grouped by days overdue", "Stock levels", "Bank balances"], ["Outstanding invoices grouped by days overdue"],
          explanation="The ageing report helps prioritise collections."),
        q("SINGLE", "Under the MSMED Act, what is the longest payment period that can be agreed with a micro or small supplier?", ["30 days", "45 days", "60 days", "90 days"], ["45 days"],
          explanation="Section 15 limits the agreed period to 45 days from acceptance; 15 days applies if there is no agreement."),
        q("TRUE_FALSE", "Input tax credit should be claimed only for invoices that appear in GSTR-2B.", TF, ["True"],
          explanation="GSTR-2B reflects invoices the supplier has reported, which is a condition for credit."),
        q("SINGLE", "A customer returns damaged goods. Which document should the supplier issue?", ["Debit note", "Credit note", "New invoice", "Delivery challan"], ["Credit note"],
          explanation="A credit note reduces the value of the original invoice."),
        q("SINGLE", "By when must a credit note for a financial year be declared?", ["31 March", "30 September", "30 November after the year ends, or the annual return date if earlier", "Any time"], ["30 November after the year ends, or the annual return date if earlier"],
          explanation="This is the time limit in Section 34 of the CGST Act."),
        q("MULTIPLE", "Which items commonly cause bank reconciliation differences?", ["Cheques issued but not yet presented", "Bank charges not yet recorded", "Deposits not yet credited", "The company's GSTIN"], ["Cheques issued but not yet presented", "Bank charges not yet recorded", "Deposits not yet credited"],
          explanation="Timing differences and unrecorded bank entries are the usual causes."),
        q("FILL_BLANK", "DSO stands for Days Sales ______.", ["Outstanding"],
          explanation="Days Sales Outstanding measures how long customers take to pay."),
    ],
    "sources": [CBIC_GST, GST_PORTAL, SAMADHAAN, ("Income Tax Department: Income-tax Act and TDS information", "https://www.incometax.gov.in/")],
}

COURSES["Accounts Advanced: Financial Reporting Basics"] = {
    "lessons": [
        """
Financial statements summarise how a company has performed and where it stands. Indian companies prepare them under the Companies Act, 2013, in the format set by Schedule III, and following either Ind AS (Indian Accounting Standards, for listed and larger companies) or the accounting standards notified for other companies. You do not need to be an accountant to read them, but you need to know what each statement tells you.

## The main statements

- **Balance sheet:** what the company owns (assets), what it owes (liabilities) and the owners' stake (equity) on a given date. Assets = Liabilities + Equity.
- **Statement of profit and loss:** revenue, expenses and profit for a period, such as a quarter or a year.
- **Cash flow statement:** cash coming in and going out, split into operating, investing and financing activities.
- **Notes:** explanations, accounting policies and detailed breakdowns.

## Reading them together

Profit and cash are not the same. A company can show a profit but run short of cash if customers pay late or stock builds up. That is why the cash flow statement matters, especially in a trading-heavy IT business.

## Key terms

- **Revenue:** income from selling goods and services.
- **Gross profit:** revenue minus the direct cost of what was sold.
- **EBITDA:** earnings before interest, tax, depreciation and amortisation; a rough measure of operating profit.
- **Net profit:** profit after all expenses, interest and tax.
- **Current assets:** assets expected to turn into cash within a year, such as receivables and inventory.

## Real-world example

A systems integrator reports record revenue and a healthy profit for the year, but has to increase its bank overdraft. The cash flow statement shows why: receivables grew by ₹12 crore because two large government customers paid late. Management decides to tighten payment terms on new contracts and assign a dedicated collections owner for government accounts.

## Common mistakes

- Treating profit as if it were cash.
- Looking only at revenue growth and ignoring margins.
- Ignoring the notes, where important details are explained.

## Key takeaways

- The balance sheet, profit and loss statement and cash flow statement each answer different questions.
- Profit is not cash; watch receivables and inventory.
- Indian companies follow Schedule III and Ind AS or other notified standards.
""",
        """
Margin and working capital are two of the most important measures for an IT trading and services company. Margin shows how much we earn on each sale. Working capital shows how much cash is tied up in running the business.

## Margin

- **Gross margin %** = (revenue − cost of goods and services sold) ÷ revenue × 100.
- **Product margins** in IT resale are often thin, while **services margins** are usually higher.
- **Mix matters:** adding installation, support or managed services to a deal can raise its overall margin.

Note the difference between margin and markup. If you buy for ₹100 and sell for ₹125, the markup is 25% of cost, but the margin is 20% of the selling price.

## Working capital

Working capital is current assets minus current liabilities. In practice, it is the cash tied up in receivables and inventory, less what we owe suppliers.

The **cash conversion cycle** measures how many days cash is tied up:

Cash conversion cycle = Days Inventory Outstanding (DIO) + Days Sales Outstanding (DSO) − Days Payable Outstanding (DPO).

A shorter cycle means the business needs less borrowing to grow.

## Key terms

- **Gross margin:** profit after direct costs, as a percentage of revenue.
- **Markup:** profit as a percentage of cost.
- **Working capital:** current assets minus current liabilities.
- **Cash conversion cycle:** DIO + DSO − DPO, in days.

## Real-world example

A deal for 500 laptops brings ₹3 crore in revenue at a 6% gross margin, or ₹18 lakh. The customer asks for 90-day credit, while the distributor gives 30 days. The company must fund about 60 days of the purchase cost itself. At a borrowing cost of around 10% a year, financing roughly ₹2.8 crore for 60 days costs about ₹4.6 lakh, a quarter of the margin. The finance team asks sales to negotiate 45-day terms or add services to improve the margin.

## Common mistakes

- Confusing margin with markup.
- Agreeing long customer credit without considering financing cost.
- Holding stock that is not linked to customer orders.

## Key takeaways

- Know the difference between margin and markup.
- Working capital and the cash conversion cycle show how much cash the business ties up.
- Credit terms and stock levels can quietly erase thin margins.
""",
        """
Month-end close is the set of tasks the accounts team completes after each month ends, to produce accurate figures. A fast, reliable close gives management timely information and makes the year-end audit easier.

## Typical month-end tasks

1. **Cut-off:** make sure all sales and purchases are recorded in the right month, based on delivery and invoice dates.
2. **Revenue:** check that all deliveries and completed services have been invoiced, and record accrued revenue where work is done but not yet billed.
3. **Expenses:** record accruals for costs incurred but not yet invoiced, such as utilities or contractor work.
4. **Reconciliations:** bank, customer, vendor, inventory and GST.
5. **Fixed assets:** record additions and depreciation.
6. **Review:** compare actuals with budget and the previous month, and investigate unusual movements.
7. **Reporting:** prepare the management report.

## Making the close faster

- Use a checklist with owners and due dates for each task.
- Ask sales, purchase and logistics to submit documents by a fixed day.
- Reconcile accounts during the month, not only at the end.
- Automate repetitive entries where possible.

## Key terms

- **Cut-off:** recording transactions in the correct period.
- **Accrual:** recording income or expense in the period it relates to, even if not yet invoiced or paid.
- **Provision:** an amount set aside for a likely future cost, such as doubtful debts or warranty claims.
- **Variance:** the difference between actual and budget.

## Real-world example

A company's March results show unusually high revenue. During review, the controller finds that goods invoiced on 31 March were dispatched on 3 April. Under the company's revenue policy, the sale belongs to April. Correcting the cut-off before the books are closed avoids an audit qualification and gives management a true picture.

## Common mistakes

- Recording sales before the goods are delivered or the service performed.
- Leaving reconciliations until year end.
- Closing without reviewing unusual movements.

## Key takeaways

- Month-end close turns transactions into reliable monthly figures.
- Cut-off, accruals and reconciliations are the core tasks.
- A checklist with owners and deadlines makes the close faster and more accurate.
""",
        """
Every finance team works to a calendar of statutory deadlines and internal reporting dates. This lesson covers the common deadlines most Indian companies follow. Your administrator will add 3C's own reporting calendar below.

> **[PLACEHOLDER]** Company reporting calendar: monthly close dates, management report dates, board meeting schedule, budget cycle and the owners of each report. The LMS administrator adds these details.

## Common statutory deadlines

Deadlines change through notifications, so always check the official portals. Commonly applicable ones include:

- **GST returns:** GSTR-1 (outward supplies) monthly by the 11th of the next month for most monthly filers, and GSTR-3B (summary and tax payment) monthly by the 20th, with quarterly options for small taxpayers.
- **GST annual return (GSTR-9):** by 31 December after the financial year, where applicable.
- **TDS payment:** generally by the 7th of the following month, with quarterly TDS returns.
- **Advance income tax:** instalments due in June, September, December and March.
- **Companies Act filings:** annual accounts and annual return with the Registrar of Companies after the annual general meeting.

## Internal reporting

- **Monthly management report:** revenue, margin, receivables, payables, cash and key variances.
- **Quarterly review:** results compared with budget and forecast.
- **Annual budget:** prepared before the financial year starts on 1 April.

## Key terms

- **Statutory deadline:** a date set by law for a filing or payment.
- **Financial year (FY):** in India, 1 April to 31 March.
- **Registrar of Companies (RoC):** the authority where companies file annual documents.

## Real-world example

A company misses the GSTR-1 deadline one month because the billing team closed late. Its customers cannot see their input tax credit on time and complain. The finance team adds the GSTR-1 date to the company calendar with a reminder five days earlier, and sets an internal invoice cut-off two days before the filing date.

## Common mistakes

- Relying on memory instead of a shared calendar.
- Not allowing time for review before filing.
- Using outdated due dates after a change notification.

## Key takeaways

- Keep a shared calendar of statutory and internal deadlines with owners.
- Build in review time before each filing.
- Check official portals for the latest due dates.
""",
    ],
    "questions": [
        q("SINGLE", "Which statement shows what a company owns and owes on a given date?", ["Statement of profit and loss", "Balance sheet", "Cash flow statement", "Sales register"], ["Balance sheet"],
          explanation="The balance sheet shows assets, liabilities and equity at a point in time."),
        q("SINGLE", "You buy an item for ₹100 and sell it for ₹125. What is the gross margin?", ["25%", "20%", "12.5%", "125%"], ["20%"],
          explanation="Margin is profit ÷ selling price: 25 ÷ 125 = 20%. The markup is 25%."),
        q("SINGLE", "Which formula gives the cash conversion cycle?", ["DSO + DPO − DIO", "DIO + DSO − DPO", "DPO − DSO", "Revenue ÷ profit"], ["DIO + DSO − DPO"],
          explanation="Cash is tied up in inventory and receivables, less the credit suppliers give."),
        q("TRUE_FALSE", "A company that reports a profit can still run short of cash.", TF, ["True"],
          explanation="Late customer payments and high inventory can absorb cash even when the business is profitable."),
        q("SINGLE", "Goods invoiced on 31 March are dispatched on 3 April. Under a delivery-based revenue policy, when is the sale recorded?", ["March", "April", "Either", "When paid"], ["April"],
          explanation="Cut-off follows the revenue recognition policy; here delivery happened in April."),
        q("MULTIPLE", "Which tasks are part of a month-end close?", ["Cut-off checks", "Accruals", "Reconciliations", "Deleting old invoices"], ["Cut-off checks", "Accruals", "Reconciliations"],
          explanation="Cut-off, accruals and reconciliations are core close tasks; records are never deleted."),
        q("FILL_BLANK", "In India the financial year runs from 1 April to 31 ______.", ["March"],
          explanation="The Indian financial year ends on 31 March."),
    ],
    "sources": [MCA, ICAI, GST_PORTAL, ("Income Tax Department: due dates and e-filing", "https://www.incometax.gov.in/")],
}
