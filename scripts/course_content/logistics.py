"""Logistics: dispatch and documentation, warehousing and inventory, shipping and multi-site delivery."""
from . import q, TF

COURSES = {}

CBIC_GST = ("CBIC GST: CGST Rules (Rule 55 delivery challan, Rule 138 e-way bill) and Schedule I", "https://cbic-gst.gov.in/")
EWAY = ("GST e-way bill system", "https://ewaybillgst.gov.in/")
APICS = ("ASCM (APICS): supply chain and inventory management body of knowledge", "https://www.ascm.org/")
MORTH = ("Ministry of Road Transport and Highways: Carriage by Road Act, 2007 and rules", "https://morth.nic.in/")
IRDAI = ("IRDAI: insurance regulator (marine and transit insurance guidance)", "https://irdai.gov.in/")

COURSES["Logistics Basic: Dispatch and Documentation"] = {
    "lessons": [
        """
Every shipment that leaves our warehouse must travel with the right documents. Missing or wrong paperwork can stop a truck at a checkpoint, delay a customer's project and lead to penalties under GST. The logistics team is responsible for getting it right every time.

## The main dispatch documents

- **Tax invoice:** issued when goods are sold. It travels with the goods.
- **Delivery challan:** used when goods move without a sale, for example for a demo, repair, job work or a stock transfer within the same GSTIN. Rule 55 of the CGST Rules sets out when a challan is used and what it must contain.
- **E-way bill:** generally required when the consignment value is more than ₹50,000, under Rule 138 of the CGST Rules. It is generated on the government e-way bill portal.
- **Packing list:** the contents of each box, with serial numbers where applicable.
- **Lorry receipt (LR) or consignment note:** issued by the transporter as proof that it has received the goods for carriage.

## Checks before dispatch

1. The invoice or challan matches the sales order: items, quantities, customer and delivery address.
2. Serial numbers on the packing list match the units being shipped.
3. The e-way bill is generated with the correct invoice number, value, and vehicle number.
4. The customer's site contact and delivery instructions are clear.

## Key terms

- **Delivery challan:** a document for moving goods when there is no sale.
- **E-way bill:** an electronic document for the movement of goods above the threshold.
- **Consignee:** the person or company receiving the goods.
- **Lorry receipt (LR):** the transporter's receipt for goods accepted for carriage.

## Real-world example

A laptop shipment worth ₹4 lakh leaves the warehouse with the invoice but without an e-way bill, because the dispatcher thought the transporter would generate it. The truck is stopped at a checkpoint and the goods are detained until the issue is resolved, delaying a customer's office opening. The company makes e-way bill generation part of the dispatch checklist, with a second person checking it.

## Common mistakes

- Sending goods without an e-way bill when one is needed.
- Using a tax invoice when goods are only being sent for demo or repair.
- Mismatched serial numbers between the packing list and the units.

## Key takeaways

- Every shipment needs an invoice or delivery challan, and often an e-way bill.
- Check documents against the sales order and the physical goods.
- Make document checks part of a dispatch checklist with a second check.
""",
        """
Good packing protects goods in transit and makes receiving easy for the customer. IT equipment is sensitive to shock, moisture and static, and a damaged server or display can delay a whole project.

## Packing principles

- Use the original manufacturer packaging where possible; it is designed for the product.
- Fill empty space so items do not move inside the box.
- Use anti-static bags for loose components such as memory, drives and cards.
- Stack heavy boxes at the bottom and do not exceed the stacking limit printed on the carton.
- Palletise and shrink-wrap large shipments, and strap them securely.
- Protect from moisture with plastic wrapping during the monsoon or for open vehicles.

## Labelling

Each box should carry a clear label with:

- Customer name and full delivery address with PIN code.
- Site contact name and phone number.
- Invoice or challan number and the box number, for example "Box 3 of 12".
- Handling marks where needed: "Fragile", "This way up", "Keep dry".

## Key terms

- **Palletising:** placing boxes on a pallet so they can be moved by forklift.
- **Electrostatic discharge (ESD):** static electricity that can damage electronic components.
- **Handling marks:** standard symbols that tell carriers how to handle a package.

## Real-world example

A shipment of 12 boxes reaches a customer, but box 7 is missing. Because each box was labelled "Box x of 12" and listed on the packing list with its contents, the customer notes the shortage on the delivery receipt at once. The transporter finds the box at its hub the next day. Without box numbers, the missing items might not have been noticed until installation.

## Common mistakes

- Reusing weak cartons for heavy items.
- Leaving loose components unprotected from static.
- Labels without box numbers or a contact phone number.

## Key takeaways

- Pack to protect against shock, moisture and static.
- Label every box with the address, contact, document number and box count.
- Use handling marks and follow stacking limits.
""",
        """
Proof of delivery (POD) is evidence that the customer received the goods. It is needed to close the order, to support the invoice for payment and to resolve any dispute. Many customers will not pay until they receive a signed POD.

## What a good POD contains

- The customer's name, site address and the date and time of delivery.
- The invoice or challan number.
- The number of boxes received.
- The name, signature and company stamp of the person receiving, with their phone number.
- Any remarks about damage or shortage.

Electronic POD, such as a photo or a signature captured on a transporter's app, is increasingly common. It should still show who received the goods and when.

## Collecting PODs reliably

- Instruct the transporter to collect a signed and stamped POD for every delivery.
- Track PODs daily and follow up on any that are missing.
- Scan and store PODs with the order record, so that accounts can attach them to invoices.
- Agree with key customers who is authorised to sign at each site.

## Key terms

- **Proof of delivery (POD):** confirmation that the consignee received the goods.
- **Consignee copy:** the copy of the documents kept by the receiver.
- **Electronic POD (ePOD):** a digital record of delivery, often with photo and signature.

## Real-world example

A customer disputes an invoice, claiming one of five UPS units was never delivered. The logistics team retrieves the POD, signed and stamped by the customer's stores in-charge, showing five boxes received without remarks. The customer checks internally and finds the unit in another building. The invoice is paid in full.

## Common mistakes

- Accepting a POD with no name, stamp or date.
- Not following up on missing PODs for weeks.
- Storing PODs separately from the order record.

## Key takeaways

- A complete POD is the evidence that closes an order and supports payment.
- Collect, track and store PODs with every order.
- Agree authorised receivers with key customers.
""",
        """
Even with good packing, goods are sometimes damaged or short when they arrive. How the problem is recorded at the moment of delivery decides whether we can recover the loss from the transporter or the insurer.

## At the time of delivery

- Ask the receiver to count the boxes and inspect them before signing.
- If a box is damaged, wet or appears tampered with, note it clearly on the POD and the transporter's copy, for example "Box 4 crushed, contents not checked".
- Take photographs of the damage, the labels and the vehicle.
- If the damage is severe, the customer may refuse that box; record this on the POD.

## After delivery

1. Inform the logistics team and the transporter in writing on the same day.
2. Raise a claim with the transporter and, where applicable, the insurer, with photos, the invoice, the packing list and the POD.
3. Arrange a replacement for the customer so that their project is not delayed.
4. Record the incident and the outcome to learn from it.

Under the Carriage by Road Act, 2007, a common carrier is responsible for loss or damage to goods in its care, subject to the conditions in the Act and the consignment note. Prompt written notice is important, so report problems as soon as possible.

## Key terms

- **Shortage:** fewer items received than invoiced.
- **Concealed damage:** damage inside an undamaged-looking box, found only on opening.
- **Claim:** a formal request to the transporter or insurer for compensation.

## Real-world example

A display arrives with a crushed corner on the box. The customer's receiver writes "Box damaged, contents to be checked" on the POD and takes photos. On opening, the screen is cracked. Because the damage was recorded and photographed, the transit insurer settles the claim, and a replacement reaches the customer within three days.

## Common mistakes

- Signing a clean POD without inspecting the boxes.
- Reporting damage days later without photos.
- Delaying the customer's replacement while waiting for the claim.

## Key takeaways

- Inspect before signing, and record damage or shortage on the POD.
- Photograph and report in writing the same day.
- Replace for the customer quickly, and pursue the claim in parallel.
""",
    ],
    "questions": [
        q("SINGLE", "Goods are sent to a customer for a demonstration, not sold. Which document should accompany them?", ["Tax invoice", "Delivery challan", "Credit note", "Purchase order"], ["Delivery challan"],
          explanation="Rule 55 of the CGST Rules allows a delivery challan for movements that are not sales."),
        q("SINGLE", "Above what consignment value is an e-way bill generally required?", ["₹10,000", "₹25,000", "₹50,000", "₹1,00,000"], ["₹50,000"],
          explanation="Rule 138 sets ₹50,000 as the general threshold, though some states set different intra-state limits."),
        q("MULTIPLE", "What should a box label include?", ["Delivery address with PIN code", "Site contact phone number", "Box number, such as 3 of 12", "The purchase price"], ["Delivery address with PIN code", "Site contact phone number", "Box number, such as 3 of 12"],
          explanation="Clear labels help delivery and make shortages easy to spot. Prices should not be on labels."),
        q("TRUE_FALSE", "If a box arrives damaged, the receiver should note it on the POD before signing.", TF, ["True"],
          explanation="Remarks on the POD are key evidence for a claim."),
        q("SINGLE", "What is the main purpose of a proof of delivery?", ["Marketing", "Evidence that the customer received the goods", "Calculating GST", "Ordering stock"], ["Evidence that the customer received the goods"],
          explanation="A POD closes the order and supports payment and dispute resolution."),
        q("TRUE_FALSE", "Anti-static bags are used to protect loose electronic components.", TF, ["True"],
          explanation="Static discharge can damage memory, drives and cards."),
        q("MATCHING", "Match each document to its purpose.", ["Tax invoice=Issued when goods are sold", "Delivery challan=Movement without a sale", "E-way bill=Electronic record for moving goods above the threshold", "Lorry receipt=Transporter's receipt for goods"],
          explanation="Using the right document avoids detention and disputes."),
    ],
    "sources": [CBIC_GST, EWAY, MORTH, APICS],
}

COURSES["Logistics Intermediate: Warehousing and Inventory Movement"] = {
    "lessons": [
        """
Goods receipt is the first control point for stock entering the warehouse. Errors here flow through the whole business: wrong stock levels, wrong invoices to customers and payments for goods we never received.

## The goods receipt process

1. **Check the documents:** match the vendor's invoice or challan and e-way bill with our purchase order.
2. **Count the boxes** against the transporter's documents before signing.
3. **Inspect for damage** and record any issue on the transporter's copy.
4. **Open and verify:** check part numbers, quantities and serial numbers against the PO.
5. **Create the goods receipt note (GRN)** in the ERP, recording what was actually accepted.
6. **Label and store** the goods in the correct location.
7. **Inform** purchase and sales that the goods have arrived.

## Handling exceptions

- **Wrong item:** do not accept it into stock; keep it aside and inform purchase.
- **Short quantity:** record only what was received.
- **Damaged goods:** record, photograph and keep in a quarantine area.
- **No PO:** do not receive until purchase confirms the order.

## Key terms

- **Goods receipt note (GRN):** the record of goods received and accepted.
- **Quarantine area:** a separate space for goods that cannot yet be accepted.
- **Put-away:** moving received goods to their storage location.
- **Bin location:** the specific shelf or rack position where an item is stored.

## Real-world example

A shipment of 40 switches arrives, but the packing list shows 24-port models while the PO is for 48-port models. The stores executive keeps the goods in quarantine and informs purchase the same day. The distributor arranges an exchange. Had the switches been received into stock, they might have been shipped to the customer by mistake.

## Common mistakes

- Signing for goods without counting boxes.
- Creating a GRN for the PO quantity instead of the actual quantity.
- Mixing unaccepted goods with saleable stock.

## Key takeaways

- Goods receipt is a control: check documents, count, inspect and verify.
- Record only what was actually received and accepted.
- Keep exceptions in quarantine and inform purchase immediately.
""",
        """
Every time stock moves, the system must record it. Accurate stock movements mean we always know what we have, where it is and what is committed to customers.

## Types of stock movement

- **Receipt:** goods arriving from vendors (GRN).
- **Issue:** goods leaving for a customer, a project or internal use.
- **Transfer:** goods moving between locations, such as from the main warehouse to a branch.
- **Return:** goods coming back from a customer or going back to a vendor.
- **Adjustment:** correcting stock after a count, damage or write-off, with approval.

## Picking and issuing

- Pick only against an approved sales order or issue request.
- Follow FIFO (first in, first out) so that older stock is used first, which matters for batteries and products with firmware or warranty start dates.
- Scan or record serial numbers when picking.
- Have a second person check high-value picks.

## Stock transfers between states

If our company moves goods between its own offices in different states, each registration (GSTIN) is treated as a distinct person under GST. Such a transfer is generally a taxable supply that needs a tax invoice and, above the threshold, an e-way bill. A transfer within the same GSTIN usually moves on a delivery challan.

## Key terms

- **FIFO:** first in, first out; issue the oldest stock first.
- **Stock adjustment:** an approved correction to recorded stock.
- **Distinct person:** under GST, each registration of the same company in a different state.
- **Reserved stock:** stock allocated to a specific customer order.

## Real-world example

UPS batteries lose charge and capacity when stored for long periods. A warehouse that picks the newest batteries first finds that older ones have deteriorated beyond use. After adopting FIFO, with storage dates on each pallet, the company stops writing off old batteries.

## Common mistakes

- Moving stock without recording the movement.
- Adjusting stock without approval or explanation.
- Treating inter-state transfers between our own branches as if they need no tax invoice.

## Key takeaways

- Record every receipt, issue, transfer, return and adjustment.
- Use FIFO, especially for batteries and date-sensitive items.
- Inter-state transfers between our own GSTINs generally need a tax invoice.
""",
        """
A cycle count is a regular count of a portion of the inventory, rather than counting everything once a year. Over a cycle, every item is counted. Cycle counting finds errors early, keeps records accurate and avoids shutting the warehouse for a full stock-take.

## How to plan cycle counts

Use ABC analysis to decide how often to count each item:

- **A items:** high value or fast-moving, often about 20% of items but most of the value. Count frequently, such as monthly.
- **B items:** medium value. Count quarterly.
- **C items:** low value, many items. Count once or twice a year.

## Running a count

1. Freeze movements for the items being counted, or count at a quiet time.
2. Count physically without looking at the system quantity (a "blind count").
3. Compare with the system and recount any difference.
4. Investigate the cause: a missed GRN, a wrong pick, damage or theft.
5. Post an approved adjustment and fix the process that caused the error.

## Measuring accuracy

**Inventory record accuracy** is the percentage of counted items where the system matches the physical count, within tolerance. Many well-run warehouses aim for 95% or higher.

## Key terms

- **Cycle count:** counting part of the inventory on a rolling schedule.
- **ABC analysis:** grouping items by value or importance.
- **Blind count:** counting without seeing the expected quantity.
- **Inventory record accuracy:** the share of counts that match records.

## Real-world example

A monthly cycle count of laptops shows two fewer units than the system. Investigation finds that two laptops were issued to a customer as replacements without an issue entry in the ERP. The team adds a rule that no item leaves the warehouse without a system document, and the next counts match.

## Common mistakes

- Counting while goods are still moving in and out.
- Adjusting stock without finding the cause.
- Counting only once a year.

## Key takeaways

- Count high-value items often using ABC analysis.
- Use blind counts, investigate differences and fix the cause.
- Track inventory record accuracy as a key measure.
""",
        """
Most IT equipment has a unique serial number. Tracking serial numbers from receipt to customer delivery is essential for warranty claims, OEM audits, returns and fraud prevention.

## Why serial numbers matter

- **Warranty:** OEMs check serial numbers to confirm warranty status and start dates.
- **OEM audits:** special-priced units must be traceable to the named end customer.
- **Returns:** we must confirm that a returned unit is the one we sold.
- **Theft and fraud:** missing or swapped units can be identified.
- **Customer asset registers:** many customers ask for serial number lists for their records.

## Good practice

- Scan serial numbers at goods receipt and record them in the ERP against the GRN.
- Scan again when picking and dispatching, and link each serial to the customer invoice.
- Include serial numbers on the packing list and, where required, on the invoice.
- Record serials for returns and replacements, linking old and new units.
- Use barcode scanners to avoid typing errors.

## Key terms

- **Serial number:** a unique identifier for an individual unit.
- **Traceability:** the ability to follow a unit through its history.
- **RMA:** return merchandise authorisation, an OEM's approval to return a faulty unit.
- **Asset register:** a list of a customer's equipment, often with serial numbers and locations.

## Real-world example

A customer reports that a server bought eight months ago has failed. The OEM asks for the serial number to log a warranty case. Because the company recorded serial numbers at dispatch and linked them to the invoice, the support team confirms the purchase date and warranty in minutes, and a replacement part arrives the next day.

## Common mistakes

- Typing serial numbers by hand, causing errors.
- Recording serials at receipt but not at dispatch.
- Not linking replacement units to the original.

## Key takeaways

- Capture serial numbers at receipt, dispatch, return and replacement.
- Link each serial to the customer invoice for warranty and audit purposes.
- Use scanners to reduce errors.
""",
    ],
    "questions": [
        q("SINGLE", "A shipment contains a different model from the PO. What should stores do?", ["Receive it into stock", "Keep it in quarantine and inform purchase", "Return it without telling anyone", "Ship it to the customer"], ["Keep it in quarantine and inform purchase"],
          explanation="Unaccepted goods are kept separate until purchase resolves the issue."),
        q("SINGLE", "What does FIFO mean?", ["Fast in, fast out", "First in, first out", "Free in, free out", "Final inspection, final order"], ["First in, first out"],
          explanation="FIFO issues the oldest stock first, which matters for batteries and date-sensitive items."),
        q("TRUE_FALSE", "Under GST, a transfer of goods between our own offices in different states is generally a taxable supply needing a tax invoice.", TF, ["True"],
          explanation="Each state registration is a distinct person, so inter-state transfers are generally taxable."),
        q("SINGLE", "In ABC analysis, which items should be counted most often?", ["A items", "B items", "C items", "None"], ["A items"],
          explanation="A items carry most of the value and are counted most frequently."),
        q("SINGLE", "What is a blind count?", ["Counting in the dark", "Counting without seeing the system quantity", "Counting only boxes", "Skipping a count"], ["Counting without seeing the system quantity"],
          explanation="Blind counts avoid bias towards the expected number."),
        q("MULTIPLE", "Why do we track serial numbers?", ["Warranty claims", "OEM audits of special pricing", "Verifying returns", "Calculating GST rates"], ["Warranty claims", "OEM audits of special pricing", "Verifying returns"],
          explanation="Serial numbers support warranty, audit and returns; GST rates depend on HSN codes."),
        q("FILL_BLANK", "The record created when goods are received and accepted is the goods ______ note.", ["receipt", "Receipt"],
          explanation="The goods receipt note (GRN) records what was actually accepted."),
    ],
    "sources": [APICS, CBIC_GST, EWAY, APICS],
}

COURSES["Logistics Advanced: Shipping, Transport and Multi-site Delivery"] = {
    "lessons": [
        """
Large IT projects often involve delivering to many sites, such as bank branches, schools, retail stores or government offices across several states. Multi-site delivery needs careful planning so that every site receives the right items, at the right time, with the right documents.

## Planning steps

1. **Build a site list** with full addresses, PIN codes, contact names, phone numbers, working hours and access rules.
2. **Define the bill of materials per site,** so each site's kit is clear.
3. **Group sites by region and route** to reduce transport costs.
4. **Agree the delivery schedule** with the customer and the installation team, so that goods do not arrive weeks before engineers.
5. **Prepare documents per site:** invoice or challan, e-way bill and packing list.
6. **Track every delivery** and collect a POD from each site.

## Kitting

Kitting means packing all the items for one site together, labelled with the site name or code. It prevents mix-ups and makes installation faster.

## Key terms

- **Site master:** the list of all delivery locations with their details.
- **Kitting:** grouping all items for one site into one labelled kit.
- **Milk run:** a planned route that delivers to several sites in one trip.
- **Last-mile delivery:** the final step from a local hub to the site.

## Real-world example

A company must deliver network kits to 150 bank branches in five states within six weeks. The logistics team builds a site master, packs a labelled kit for each branch, and plans regional milk runs from three hubs. A daily tracker shows each branch's status. When a branch is closed for renovation, its kit is held at the hub and delivered later, instead of being lost in transit.

## Common mistakes

- Starting deliveries without a verified site list.
- Sending goods long before the installation team is scheduled.
- Mixing items for different sites in the same boxes.

## Key takeaways

- Build and verify a site master before dispatch.
- Kit by site and align deliveries with installation schedules.
- Track each site and collect a POD from every location.
""",
        """
Choosing the right transport and protecting goods in transit are key logistics decisions. The cost, speed and risk of transport vary by mode, and the right insurance protects the company from losses.

## Transport options

- **Courier and express:** fast and trackable, good for small, urgent and high-value items.
- **Part truck load (PTL):** goods share a vehicle with other consignments; economical for medium shipments.
- **Full truck load (FTL):** a dedicated vehicle; best for large shipments and lower handling risk.
- **Air freight:** fastest for long distances, but costly and with restrictions on items such as lithium batteries.

## Transit risk and insurance

- Goods in transit can be lost, stolen or damaged.
- **Transit (marine inland) insurance** covers goods moving by road, rail or air within India. Many companies hold an open policy that covers all shipments up to a limit, declaring each shipment.
- Check whether our policy or the transporter's covers the shipment, and what the transporter's liability is under the consignment note.
- Declare correct values; under-declaring can reduce claim settlements.

## Dangerous goods

Lithium batteries, found in laptops, UPS units and some devices, are classed as dangerous goods for air transport. Airlines and couriers follow strict rules on packing, labelling and quantity, based on IATA's Dangerous Goods Regulations. Check with the carrier before booking.

## Key terms

- **FTL / PTL:** full truck load and part truck load.
- **Open policy:** an insurance policy covering many shipments over a period.
- **Declared value:** the value of goods stated for transport and insurance.
- **Dangerous goods:** items that can pose a risk in transport, such as lithium batteries.

## Real-world example

A company ships 300 laptops by part truck load to save money. The goods are handled at three hubs, and several boxes are damaged. For the next large order, the team compares the cost of FTL with the damage and delay costs from PTL, and switches to FTL for shipments above a set value.

## Common mistakes

- Choosing the cheapest mode without considering handling risk.
- Shipping without confirming insurance cover.
- Booking air freight for lithium batteries without following carrier rules.

## Key takeaways

- Match the transport mode to value, size, urgency and risk.
- Confirm insurance cover and declare correct values.
- Follow dangerous goods rules for lithium batteries.
""",
        """
Moving goods between states adds tax and documentation requirements. Mistakes can lead to goods being detained, penalties and loss of input tax credit.

## Rules to remember

- **Tax type:** inter-state sales attract IGST. The invoice must show the place of supply with the name of the state.
- **E-way bill:** required for inter-state movement when the consignment value exceeds ₹50,000, regardless of state-specific intra-state limits.
- **Validity:** one day for every 200 km or part of it for normal cargo; the transporter must deliver within this time or the e-way bill must be extended.
- **Branch transfers:** moving goods between our own registrations in different states is generally a taxable supply and needs a tax invoice.
- **Bill-to ship-to:** when the buyer and the delivery location differ, the invoice and e-way bill must correctly show both.

## During transit

- The driver must carry the invoice or challan and the e-way bill number, physically or electronically.
- Tax officers can intercept and verify goods. If documents are in order, the vehicle continues.
- If a vehicle changes during transit, Part B of the e-way bill must be updated.

## Key terms

- **Place of supply:** the location that decides whether IGST or CGST plus SGST applies.
- **Bill-to ship-to:** a transaction where the billing party and the delivery location differ.
- **Part B update:** changing the vehicle details on an e-way bill.

## Real-world example

A company in Gujarat sells equipment to a customer whose head office is in Mumbai but asks for delivery to its plant in Madhya Pradesh. The logistics and accounts teams prepare a bill-to ship-to invoice and an e-way bill showing the Mumbai buyer and the Madhya Pradesh delivery address. The goods pass checkpoints smoothly, and the customer can claim its credit.

## Common mistakes

- Wrong place of supply on the invoice.
- Not updating Part B when the vehicle changes.
- Letting the e-way bill expire during delays.

## Key takeaways

- Inter-state movement means IGST, a correct place of supply and an e-way bill above ₹50,000.
- Handle bill-to ship-to and branch transfers carefully.
- Update and extend e-way bills when transit plans change.
""",
        """
Delivery performance shows how reliably we get goods to customers. Measuring it helps identify problems with vendors, transporters and our own processes, and shows customers that we take commitments seriously.

## Key measures

- **On-time delivery (OTD):** the percentage of deliveries made on or before the promised date.
- **In-full delivery:** the percentage of deliveries with complete quantities.
- **OTIF (on time, in full):** deliveries that are both on time and complete. This is the most demanding and most meaningful measure.
- **Damage rate:** the percentage of shipments with damage.
- **POD turnaround:** how quickly PODs are received after delivery.
- **Order-to-delivery time:** the time from customer order to delivery.

## Improving performance

- Review missed deliveries every week and find the cause: vendor delay, stock error, transporter issue or wrong address.
- Share transporter scorecards and move volume to better performers.
- Improve promise accuracy: commit to dates you can meet.
- Communicate delays early to customers with a revised date.

## Key terms

- **OTIF:** on time, in full.
- **Root cause:** the underlying reason for a problem.
- **Transporter scorecard:** a periodic rating of a transporter's performance.

## Real-world example

A company's OTIF is 78%. Weekly reviews show that most failures come from one transporter on southern routes and from incomplete addresses on orders. The team switches southern volume to another transporter and makes the PIN code and site contact mandatory fields in the sales order. Within three months, OTIF rises to 92%.

## Common mistakes

- Measuring only on-time delivery and ignoring incomplete shipments.
- Reviewing performance without acting on causes.
- Promising dates without checking stock and transport times.

## Key takeaways

- OTIF is the key measure of delivery reliability.
- Review failures weekly and fix root causes.
- Promise realistic dates and communicate delays early.
""",
    ],
    "questions": [
        q("SINGLE", "What is kitting in multi-site delivery?", ["Buying spare parts", "Packing all items for one site together, labelled by site", "Hiring transporters", "Insuring goods"], ["Packing all items for one site together, labelled by site"],
          explanation="Kitting prevents mix-ups and speeds up installation."),
        q("SINGLE", "Which measure shows deliveries that are both on time and complete?", ["OTD", "OTIF", "DSO", "DPO"], ["OTIF"],
          explanation="OTIF means on time, in full."),
        q("TRUE_FALSE", "For inter-state movement of goods above ₹50,000, an e-way bill is required.", TF, ["True"],
          explanation="Rule 138 requires an e-way bill for inter-state movement above ₹50,000."),
        q("SINGLE", "A vehicle carrying goods breaks down and the goods move to another truck. What must be updated?", ["The invoice number", "Part B of the e-way bill", "The customer's GSTIN", "Nothing"], ["Part B of the e-way bill"],
          explanation="Part B holds the vehicle details and must be updated when the vehicle changes."),
        q("MULTIPLE", "Which factors should guide the choice of transport mode?", ["Value of goods", "Urgency", "Handling risk", "The colour of the boxes"], ["Value of goods", "Urgency", "Handling risk"],
          explanation="Value, size, urgency and risk decide the mode."),
        q("TRUE_FALSE", "Lithium batteries can be shipped by air without any special rules.", TF, ["False"],
          explanation="They are dangerous goods for air transport and follow IATA rules."),
        q("SINGLE", "What is the main reason to build a verified site master before a multi-site rollout?", ["To reduce GST", "To make sure every site has a correct address, contact and access details", "To choose colours", "To skip PODs"], ["To make sure every site has a correct address, contact and access details"],
          explanation="Wrong or incomplete site details are a common cause of failed deliveries."),
    ],
    "sources": [EWAY, CBIC_GST, IRDAI, ("IATA: Dangerous Goods Regulations and lithium battery guidance", "https://www.iata.org/en/programs/cargo/dgr/"), MORTH],
}
