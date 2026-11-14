"""Print solutions: printers, MFPs and consumables; print fleet assessment; managed print services."""
from . import q, TF

COURSES = {}

ISO_YIELD = ("ISO: ISO/IEC 19752 and 19798 (toner yield) and ISO/IEC 24711 (ink yield) test methods", "https://www.iso.org/")
CPCB_EWASTE = ("Central Pollution Control Board: E-Waste (Management) Rules and authorised recyclers", "https://cpcb.nic.in/")
NIST_PRINT = ("NIST: guidance on securing networked devices such as printers (Cybersecurity Framework)", "https://www.nist.gov/cyberframework")
ENERGY_STAR = ("ENERGY STAR: imaging equipment efficiency specifications", "https://www.energystar.gov/")
BIS = ("Bureau of Indian Standards: compulsory registration for IT and electronics products", "https://www.bis.gov.in/")

COURSES["Print Solutions Basic: Printers, MFPs and Consumables"] = {
    "lessons": [
        """
Printing remains important in Indian businesses, from invoices and delivery challans to contracts, reports and labels. Choosing the right device type for each need saves money and frustration.

## Main device types

- **Laser printers (mono and colour):** fast, sharp text and low cost per page at higher volumes. The most common office choice.
- **Business inkjet printers:** lower power use and good colour; suitable for small offices and moderate volumes.
- **Multifunction printers (MFPs):** print, copy, scan and sometimes fax in one device. They replace separate printers, copiers and scanners.
- **A4 and A3 devices:** A4 devices handle standard pages; A3 devices also print larger sheets for drawings and spreadsheets.
- **Production printers:** very high volumes for print rooms and publishers.
- **Specialist printers:** label printers for logistics, receipt printers for retail and dot-matrix printers for multi-part stationery, still used in some billing and government offices.

## Matching device to need

- **Volume:** how many pages per month?
- **Colour:** is colour essential, or occasional?
- **Paper size:** A4 only, or A3 as well?
- **Functions:** copy, scan to email or folder, duplex (double-sided) printing?
- **Users:** individual or shared by a team?
- **Security:** confidential documents needing secure release?

## Key terms

- **MFP:** multifunction printer.
- **Duplex:** printing on both sides of the paper.
- **A3 / A4:** paper sizes; A3 is twice the size of A4.
- **Dot-matrix:** an impact printer that can print multi-part forms.

## Real-world example

A logistics office uses inkjet printers for hundreds of delivery documents a day. Cartridges run out constantly and the cost is high. The SI replaces them with two shared mono laser MFPs for documents and a thermal label printer for shipment labels. Costs drop and staff stop waiting for cartridge changes.

## Common mistakes

- Choosing devices by purchase price instead of running cost and volume.
- Buying colour devices for users who print only black text.
- Ignoring specialist needs such as labels or multi-part forms.

## Key takeaways

- Know the main types: laser, inkjet, MFP, A3/A4, production and specialist printers.
- Match devices to volume, colour, paper size, functions, users and security.
- Running cost matters more than purchase price.
""",
        """
Two numbers decide whether a printer suits a workload and what it will really cost: duty cycle and cost per page.

## Duty cycle and recommended volume

- **Maximum duty cycle:** the most pages a device can print in a month without damage, as stated by the manufacturer. It is a stress limit, not a target.
- **Recommended monthly print volume:** the range the device is designed to handle regularly. It is much lower than the maximum duty cycle.

Running a printer near its maximum duty cycle every month leads to frequent breakdowns and shorter life. Choose devices whose recommended volume matches the expected workload.

## Cost per page

Cost per page (CPP) is the running cost of each printed page, mainly consumables. A simple calculation is:

- Cost per page = consumable price ÷ rated page yield.
- For example, a toner cartridge costing ₹6,000 with a rated yield of 6,000 pages costs about ₹1 per page in toner.
- Add other consumables, such as drums, fusers and maintenance kits, and paper and power for a full picture.

**Page yields** are measured using ISO/IEC standards: ISO/IEC 19752 for monochrome toner, ISO/IEC 19798 for colour toner and ISO/IEC 24711 for inkjet. These use a standard test page at about 5% coverage, so real yields vary with what is printed.

## Key terms

- **Duty cycle:** maximum pages per month the device can handle.
- **Recommended monthly volume:** the regular workload the device is designed for.
- **Page yield:** pages a consumable produces under standard test conditions.
- **Coverage:** the share of the page covered with toner or ink.

## Real-world example

A company buys low-cost desktop printers for a department printing 8,000 pages a month on one device. The printer's recommended volume is 1,500 pages a month, and its cartridges are small and expensive per page. It breaks down every few months. The SI replaces it with a mid-range MFP designed for that volume, with high-yield toner. Breakdowns stop and cost per page falls by more than half.

## Common mistakes

- Comparing printers by maximum duty cycle instead of recommended volume.
- Ignoring cost per page when choosing devices.
- Assuming real yields always match rated yields.

## Key takeaways

- Choose devices by recommended monthly volume, not maximum duty cycle.
- Cost per page = consumable price ÷ rated yield, plus other consumables.
- Yields follow ISO/IEC test standards at about 5% coverage.
""",
        """
Choosing a printer means balancing upfront cost, running cost, features, reliability and support. A structured approach avoids common buying mistakes.

## A step-by-step selection

1. **Understand the workload:** monthly volume, colour share, paper sizes and peak times.
2. **List required functions:** scanning, copying, duplex, finishing (stapling, hole punch), fax.
3. **Consider users and location:** how many users share it and how far they walk.
4. **Check connectivity:** network, Wi-Fi, mobile printing and integration with document systems.
5. **Check security features:** secure release, user authentication, encrypted storage and firmware updates.
6. **Compare total cost of ownership:** device price, consumables, service and power over three to five years.
7. **Check service and support:** local service availability, response times and parts.

## Other considerations

- **Energy efficiency:** labels such as ENERGY STAR indicate efficient imaging equipment.
- **Indian compliance:** many electronics products sold in India must be registered with the Bureau of Indian Standards under its compulsory registration scheme.
- **Genuine consumables and warranty:** using non-genuine supplies can affect the manufacturer's warranty terms; check the policy.

## Key terms

- **Finishing:** post-print functions such as stapling and folding.
- **Secure release:** printing that waits until the user authenticates at the device.
- **TCO:** total cost of ownership.
- **Compulsory registration:** the BIS scheme requiring certain electronics to be registered before sale.

## Real-world example

A law firm buys printers based on the lowest device price. Within a year, the cost of small, expensive cartridges exceeds the device price several times, and confidential documents are often left in output trays. The SI recommends shared A3 MFPs with high-yield toner, secure release by staff ID card and a service contract. Three-year costs are lower and confidentiality improves.

## Common mistakes

- Choosing on device price alone.
- Ignoring security features for confidential work.
- No check of local service and parts availability.

## Key takeaways

- Start with workload and functions, then users, connectivity and security.
- Compare total cost of ownership over three to five years.
- Check efficiency, compliance, warranty and local support.
""",
        """
Consumables such as toner, ink, drums and paper are the largest ongoing cost of printing. Managing them well saves money, prevents downtime and reduces waste.

## Types of consumables

- **Toner cartridges** for laser devices, often available in standard and high-yield versions.
- **Ink cartridges or tanks** for inkjet devices.
- **Drums or imaging units,** which may be separate from the toner and have their own yield.
- **Maintenance parts,** such as fusers, transfer belts and rollers, replaced at set intervals.
- **Paper,** which should match the device's specification for weight and quality.

## Managing consumables

- **Standardise devices** so fewer consumable types are needed.
- **Choose high-yield options** where volume justifies them.
- **Track levels remotely** using device monitoring, rather than waiting for "toner empty" messages.
- **Keep a small, rotated stock** for critical devices.
- **Store correctly:** cool, dry and away from direct sunlight.
- **Recycle responsibly:** use manufacturer take-back programmes or authorised recyclers under India's E-Waste (Management) Rules.

## Genuine versus compatible

Compatible or refilled consumables may cost less but can vary in quality and yield, and some manufacturers' warranties exclude damage caused by non-genuine supplies. Evaluate the total cost, including print quality, failures and warranty impact.

## Key terms

- **High-yield cartridge:** a larger cartridge with a lower cost per page.
- **Imaging unit / drum:** the component that transfers the image to paper.
- **Take-back programme:** a manufacturer scheme to collect used consumables.
- **Fuser:** the part that bonds toner to paper using heat.

## Real-world example

A company with 40 different printer models keeps over 60 types of cartridges in stock, many expiring unused, while urgent needs still go unmet. The SI standardises on four models, sets up remote monitoring of toner levels and automatic ordering. Stock types fall to eight, waste drops and devices rarely run out.

## Common mistakes

- Too many device models, requiring many consumable types.
- Ordering only after cartridges run empty.
- Discarding used cartridges as general waste.

## Key takeaways

- Consumables are the biggest ongoing print cost.
- Standardise, use high-yield options and monitor levels remotely.
- Store correctly and recycle through authorised channels.
""",
    ],
    "questions": [
        q("SINGLE", "What is the main reason to choose a printer by recommended monthly volume rather than maximum duty cycle?", ["Maximum duty cycle is a stress limit, not a regular workload", "Duty cycle is a marketing term with no meaning", "Recommended volume is always higher", "It affects GST"], ["Maximum duty cycle is a stress limit, not a regular workload"],
          explanation="Running near the maximum duty cycle causes breakdowns and short device life."),
        q("SINGLE", "A toner cartridge costs ₹6,000 and has a rated yield of 6,000 pages. What is the toner cost per page?", ["₹0.10", "₹1", "₹6", "₹60"], ["₹1"],
          explanation="₹6,000 ÷ 6,000 pages = ₹1 per page."),
        q("SINGLE", "Which standard is used to measure monochrome toner yield?", ["ISO/IEC 19752", "ISO 9001", "IEEE 802.3", "IS 3043"], ["ISO/IEC 19752"],
          explanation="ISO/IEC 19752 is the monochrome toner yield test method."),
        q("TRUE_FALSE", "Rated page yields are measured at about 5% page coverage, so real yields vary with what is printed.", TF, ["True"],
          explanation="Pages with more coverage use more toner or ink."),
        q("MULTIPLE", "What are functions of an MFP?", ["Print", "Copy", "Scan", "Run the payroll"], ["Print", "Copy", "Scan"],
          explanation="MFPs combine printing, copying, scanning and sometimes fax."),
        q("TRUE_FALSE", "Used toner cartridges should be recycled through take-back programmes or authorised recyclers.", TF, ["True"],
          explanation="India's E-Waste (Management) Rules govern disposal of electronic waste."),
        q("MATCHING", "Match each term to its meaning.", ["Duplex=Printing on both sides", "Secure release=Print waits until user authenticates", "High-yield=Larger cartridge with lower cost per page", "Fuser=Bonds toner to paper using heat"],
          explanation="These terms are used when comparing printers."),
    ],
    "sources": [ISO_YIELD, ENERGY_STAR, BIS, CPCB_EWASTE],
}

COURSES["Print Solutions Intermediate: Print Fleet Assessment"] = {
    "lessons": [
        """
A print fleet assessment is a study of an organisation's printers, copiers and scanners: what they have, how they are used and what they cost. Most organisations do not know how much they spend on printing until they measure it.

## What a fleet assessment covers

- **Inventory:** every device, with make, model, age, location and connection type.
- **Usage:** pages printed per device per month, colour versus mono, simplex versus duplex.
- **Costs:** consumables, service, leases, power and staff time spent on printer issues.
- **User needs:** which departments need what functions, such as scanning or A3.
- **Workflows:** which business processes depend on printing.
- **Security:** how confidential documents are printed and collected.

## How data is collected

- **Network discovery tools** read page counters and status from networked devices using protocols such as SNMP.
- **Software agents** can capture print jobs from PCs, including locally connected printers.
- **Walk-around surveys** find devices that are not networked.
- **Interviews and questionnaires** capture user needs and pain points.
- **Invoices and purchase records** show consumable and service spending.

## Key terms

- **Fleet:** all the print devices in an organisation.
- **Page counter:** a device's record of pages printed.
- **Device-to-user ratio:** number of users per device.
- **Print audit:** another name for a fleet assessment.

## Real-world example

A company believes it has about 50 printers. A fleet assessment finds 140 devices, including many personal desktop printers bought on expense claims. Total annual print spending, including consumables bought locally, is three times what finance estimated. The findings make a strong case for a planned print strategy.

## Common mistakes

- Counting only networked printers.
- Ignoring consumables bought outside central purchasing.
- Not asking users about their needs.

## Key takeaways

- A fleet assessment measures devices, usage, costs, needs, workflows and security.
- Combine network discovery, agents, walk-arounds, interviews and invoices.
- Most organisations underestimate their fleet size and print costs.
""",
        """
Once the fleet data is collected, cost analysis shows where money is going and where it can be saved. It turns raw data into a business case.

## Calculating current costs

- **Consumables:** toner, ink, drums and maintenance parts.
- **Service:** contracts, repairs and call-out charges.
- **Hardware:** purchase or lease costs spread over device life.
- **Paper:** pages printed multiplied by paper cost.
- **Power:** device energy use.
- **Hidden costs:** IT staff time on printer problems, user downtime and wasted prints.

## Useful measures

- **Cost per page** by device and by department.
- **Total annual print spend.**
- **Utilisation:** monthly pages compared with each device's recommended volume.
- **Colour share:** the percentage of pages printed in colour.
- **Duplex share:** the percentage printed double-sided.

## Finding savings

- **Over-utilised devices** break down often and should be replaced with larger ones.
- **Under-utilised devices** cost money for little use and can be removed or consolidated.
- **Expensive personal printers** can be replaced by shared, lower-cost devices.
- **Colour policies,** such as defaulting to mono, can reduce costs.
- **Duplex by default** saves paper.

## Key terms

- **Utilisation:** how much a device is used compared with its design volume.
- **Consolidation:** reducing the number of devices by sharing.
- **Hidden cost:** a cost not shown in purchase records, such as staff time.

## Real-world example

A cost analysis shows that 30 personal inkjet printers in one office cost about ₹4 per page, while a shared mono laser MFP would cost well under ₹1 per page. Colour makes up 40% of pages, mostly for internal emails. Replacing personal printers with shared MFPs and setting mono as the default reduces annual print costs significantly, as shown in the business case.

## Common mistakes

- Counting only hardware costs.
- Ignoring hidden costs such as IT time.
- Recommending changes without measuring utilisation.

## Key takeaways

- Include consumables, service, hardware, paper, power and hidden costs.
- Measure cost per page, utilisation, colour share and duplex share.
- Target over-used, under-used and expensive personal devices.
""",
        """
Right-sizing means designing a print fleet with the right number and type of devices in the right places. It balances cost, convenience and productivity.

## Right-sizing principles

- **Match devices to workloads:** place higher-capacity devices where volumes are high.
- **Consolidate:** replace many small personal printers with fewer shared MFPs.
- **Reasonable walking distance:** users should not have to walk too far; plan locations by floor and department.
- **Keep exceptions where justified:** for example, a printer at a reception desk or for confidential HR work.
- **Standardise models:** fewer models means simpler support and consumables.
- **Plan for change:** allow for growth, office moves and remote work.

## A practical process

1. Map current devices and volumes on floor plans.
2. Define target ratios and locations by department.
3. Propose a future fleet with device models and locations.
4. Calculate future costs and savings.
5. Agree exceptions with department heads.
6. Plan the transition: install new devices, train users, then remove old devices.

## Key terms

- **Right-sizing:** matching the fleet to actual needs.
- **Future-state fleet:** the planned fleet after changes.
- **Exception:** a justified departure from standard design.

## Real-world example

A university library has 12 small printers scattered across floors, often out of toner. Students queue at the few that work. The right-sized design uses three high-capacity MFPs with card-based secure release, placed near study areas on each floor, and one colour MFP. Queues shrink, costs fall and staff no longer refill twelve printers.

## Common mistakes

- Removing too many devices and frustrating users.
- No consultation with departments.
- Removing old devices before new ones are working.

## Key takeaways

- Right-size by matching devices to workloads and locations.
- Consolidate, standardise and keep justified exceptions.
- Plan the transition carefully with user training.
""",
        """
Printers are networked computers with storage, operating systems and access to sensitive documents. They are often overlooked in security planning, making them an easy target and a source of data leaks.

## Printer security risks

- **Documents left in output trays** for anyone to pick up.
- **Stored data** on device hard drives or memory, including scanned and printed documents.
- **Unpatched firmware** with known vulnerabilities.
- **Default passwords** on admin interfaces.
- **Open network services** that attackers can use.
- **Scan-to-email misuse** sending documents outside the company.

## Security measures

- **Secure (pull) printing:** jobs are held until the user authenticates at the device with a PIN or ID card.
- **User authentication** for copying, scanning and printing.
- **Encrypted storage and secure wipe,** including when devices are returned or disposed of.
- **Firmware updates** applied regularly.
- **Change default passwords** and disable unused services.
- **Network segmentation:** put printers in their own VLAN with controlled access.
- **Audit logs:** record who printed, copied or scanned what.

## Key terms

- **Pull printing / follow-me printing:** print jobs released at any device after authentication.
- **Firmware:** the device's built-in software.
- **Secure wipe:** erasing stored data so it cannot be recovered.

## Real-world example

A hospital returns leased MFPs at the end of the contract without wiping their hard drives. The drives contain thousands of scanned patient records. When this is discovered, the hospital faces a serious data protection problem. Its new print contract includes encrypted drives, secure wipe certificates at return and secure release for all patient documents.

## Common mistakes

- Treating printers as simple office equipment, not computers.
- Leaving default admin passwords.
- Returning or disposing of devices without wiping data.

## Key takeaways

- Printers store and handle sensitive data and must be secured.
- Use secure release, authentication, encryption, firmware updates and segmentation.
- Wipe devices securely before return or disposal.
""",
    ],
    "questions": [
        q("MULTIPLE", "What does a print fleet assessment cover?", ["Inventory of devices", "Usage and costs", "User needs", "Employees' salaries"], ["Inventory of devices", "Usage and costs", "User needs"],
          explanation="It measures devices, usage, costs, needs, workflows and security."),
        q("SINGLE", "Which protocol do discovery tools commonly use to read printer page counters?", ["SNMP", "HDMI", "DHCP", "SMTP"], ["SNMP"],
          explanation="SNMP reads counters and status from networked devices."),
        q("TRUE_FALSE", "Most organisations accurately know how much they spend on printing.", TF, ["False"],
          explanation="Fleet assessments usually reveal much higher spend than expected."),
        q("SINGLE", "A device prints far more than its recommended volume and breaks down often. What should be done?", ["Leave it", "Replace it with a device sized for the workload", "Turn off duplex", "Buy more paper"], ["Replace it with a device sized for the workload"],
          explanation="Over-utilised devices should be right-sized."),
        q("SINGLE", "What is pull printing?", ["Printing from a phone", "Jobs held until the user authenticates at the device", "Printing in colour only", "Printing without a network"], ["Jobs held until the user authenticates at the device"],
          explanation="Pull printing prevents documents being left in trays."),
        q("TRUE_FALSE", "Leased MFPs should have their storage securely wiped before being returned.", TF, ["True"],
          explanation="Device storage can hold copies of sensitive documents."),
        q("MATCHING", "Match each finding to the right action.", ["Over-utilised device=Replace with a larger device", "Under-utilised device=Remove or consolidate", "High colour share for internal emails=Set mono as default", "Documents left in trays=Introduce secure release"],
          explanation="Each finding has a typical right-sizing action."),
    ],
    "sources": [NIST_PRINT, ISO_YIELD, CPCB_EWASTE],
}

COURSES["Print Solutions Advanced: Managed Print Services"] = {
    "lessons": [
        """
Managed print services (MPS) mean an outside provider takes responsibility for an organisation's print fleet: devices, consumables, service, monitoring and optimisation, usually for a predictable fee. MPS turns printing from a scattered cost into a managed service.

## What MPS usually includes

- **Assessment and design:** fleet assessment and right-sizing.
- **Devices:** supply of new devices or management of existing ones.
- **Consumables:** automatic supply based on remote monitoring.
- **Service and maintenance:** preventive maintenance and repairs, with response times.
- **Helpdesk:** a single point of contact for print issues.
- **Software:** secure release, accounting and mobile printing.
- **Reporting and optimisation:** regular reviews and recommendations.

## Service level agreements

SLAs define the service standards, such as:

- **Response time:** how quickly an engineer responds to a fault, often four or eight business hours depending on location and priority.
- **Fix time:** how quickly the device is working again.
- **Uptime:** the percentage of time devices are available.
- **Consumable delivery:** supplies arrive before devices run out.
- **Reporting:** monthly or quarterly reports and reviews.

Service credits may apply when SLAs are missed.

## Key terms

- **MPS:** managed print services.
- **SLA:** service level agreement.
- **Service credit:** a fee reduction for missed SLAs.
- **Scope:** the devices, locations and services covered.

## Real-world example

A company with offices in five cities manages printers through local dealers, each with different terms and response times. Under a single MPS contract, all devices are monitored centrally, toner arrives automatically and faults have a four-hour response in metro cities and next business day elsewhere. The company receives one monthly bill and one quarterly report.

## Common mistakes

- Vague scope that leaves some devices uncovered.
- SLAs that do not match locations, such as four-hour response in remote towns.
- No regular reviews after the contract starts.

## Key takeaways

- MPS covers assessment, devices, consumables, service, software and reporting.
- Define scope and realistic SLAs by location and priority.
- Review performance regularly against SLAs.
""",
        """
MPS contracts use different commercial models. Choosing the right one depends on the customer's budget style, volume stability and appetite for risk.

## Common commercial models

- **Cost per page (CPP or "click charge"):** the customer pays a fixed rate for each page printed, covering consumables and service. Hardware may be bought or leased separately.
- **All-inclusive CPP:** hardware, consumables and service included in a higher per-page rate.
- **Fixed monthly fee with included volume:** a fixed fee covers a set number of pages, with a rate for extra pages.
- **Per-device fee:** a monthly fee per device, plus page charges.
- **Hybrid:** combinations suited to the customer's fleet.

Rates are usually different for mono and colour pages, and may vary by device type.

## Factors in pricing

- Expected monthly volumes by device and colour mix.
- Device costs and contract length, often three to five years.
- Consumable costs and yields.
- Service costs, including travel to remote locations.
- Minimum volume commitments.
- Financing costs if hardware is included.

## Key terms

- **Click charge:** a per-page charge, named after the meter "click".
- **Minimum volume commitment:** the minimum pages the customer pays for.
- **Overage:** pages above the included volume.
- **Contract term:** the length of the agreement.

## Real-world example

An MPS provider prices a contract assuming 200,000 pages a month. After the customer moves many processes to digital forms, volume falls to 100,000 pages. With no minimum volume commitment, the provider's revenue halves while device costs remain. In its next contract, the provider includes a minimum volume and a review clause to adjust rates if volumes change significantly.

## Common mistakes

- Pricing without reliable volume data.
- No minimum commitment or review clause.
- Same rate for mono and colour pages.

## Key takeaways

- Common models: cost per page, all-inclusive, fixed fee with volume, per-device fee and hybrids.
- Price from real volumes, costs and contract length.
- Include minimum volumes and review clauses to manage volume changes.
""",
        """
Remote monitoring is the engine of managed print. It lets providers see device status, supply levels and page counts across the whole fleet, and act before users notice problems.

## What monitoring provides

- **Meter readings:** automatic page counts for billing, without manual readings.
- **Supply levels:** toner and ink levels, used to trigger automatic orders.
- **Alerts:** paper jams, errors and service needs.
- **Device health:** usage trends that show when maintenance is needed.
- **Usage data:** for optimisation and reporting.

## Automatic supply replenishment

1. Monitoring software reads toner levels from each device.
2. When a level falls below a threshold, an order is created automatically.
3. The consumable is shipped to the device location, timed to arrive before it runs out.
4. Delivery is tracked and the old cartridge is collected for recycling.

## Monitoring considerations

- Monitoring agents collect data over the network, typically using SNMP, and send it securely to the provider.
- Agree with the customer's IT team what data is collected and how it is transmitted.
- Cover non-networked devices with manual readings or USB agents where needed.

## Key terms

- **Remote monitoring:** collecting device data over the network.
- **Automatic replenishment:** ordering supplies based on monitored levels.
- **Threshold:** the level that triggers an order or alert.
- **Monitoring agent:** software that collects and sends device data.

## Real-world example

Before MPS, a customer's staff called the helpdesk every time toner ran out, and devices stood idle for days waiting for supplies. After monitoring and automatic replenishment start, toner arrives a few days before it runs out. Toner-related calls fall almost to zero, and devices are rarely idle.

## Common mistakes

- Thresholds set too low, so toner arrives late.
- Monitoring agents installed without the IT team's security approval.
- Ignoring non-networked devices.

## Key takeaways

- Monitoring provides meter readings, supply levels, alerts and usage data.
- Automatic replenishment sends supplies before devices run out.
- Agree data collection and security with the customer's IT team.
""",
        """
Regular reporting shows the value of managed print services and guides continuous improvement. Without it, customers cannot see what they are paying for.

## What to report

- **Volumes:** pages by device, department and colour, with trends.
- **Costs:** monthly spend and cost per page.
- **SLA performance:** response and fix times, uptime and consumable delivery.
- **Incidents:** number and types of faults, and repeat issues.
- **Utilisation:** over- and under-used devices.
- **Environmental impact:** paper saved through duplex and reduced printing.
- **Recommendations:** actions to improve cost, service or security.

## Running service reviews

- Hold quarterly business reviews with the customer's stakeholders.
- Compare performance with SLAs and previous periods.
- Discuss issues openly and agree actions with owners and dates.
- Plan changes, such as moving devices or updating policies.

## Key terms

- **Quarterly business review (QBR):** a regular meeting to review service performance.
- **Trend:** how a measure changes over time.
- **Continuous improvement:** ongoing changes to improve service.

## Real-world example

A quarterly report shows that one department's colour printing has doubled. Investigation finds that a new marketing team prints draft brochures repeatedly. The provider recommends a colour policy and a dedicated device with a lower colour cost per page. The next quarter, colour costs fall, and the customer sees MPS as a partner, not just a supplier.

## Common mistakes

- Sending raw data without insights.
- Reviewing only when problems arise.
- No action tracking from reviews.

## Key takeaways

- Report volumes, costs, SLAs, incidents, utilisation and environmental impact.
- Hold regular reviews with clear actions.
- Use reporting to drive continuous improvement.
""",
    ],
    "questions": [
        q("MULTIPLE", "What does a managed print service usually include?", ["Consumables supplied automatically", "Service and maintenance", "Reporting and optimisation", "Payroll processing"], ["Consumables supplied automatically", "Service and maintenance", "Reporting and optimisation"],
          explanation="MPS manages the full print fleet as a service."),
        q("SINGLE", "What is a 'click charge'?", ["A fee for each mouse click", "A per-page charge for printing", "An installation charge", "A late payment fee"], ["A per-page charge for printing"],
          explanation="Click charges are per-page rates, usually different for mono and colour."),
        q("TRUE_FALSE", "A minimum volume commitment protects the provider if printing volumes fall sharply.", TF, ["True"],
          explanation="It ensures a base level of revenue to cover fixed costs."),
        q("SINGLE", "How is automatic toner replenishment triggered?", ["When users complain", "When monitored toner levels fall below a threshold", "Once a year", "When the device is replaced"], ["When monitored toner levels fall below a threshold"],
          explanation="Monitoring triggers orders before devices run out."),
        q("SINGLE", "What is the purpose of a quarterly business review in MPS?", ["To change the logo", "To review performance against SLAs and agree improvements", "To sell new devices only", "To collect payment"], ["To review performance against SLAs and agree improvements"],
          explanation="Reviews drive continuous improvement."),
        q("TRUE_FALSE", "A four-hour response SLA is always realistic for every location, including remote towns.", TF, ["False"],
          explanation="SLAs should match locations and priorities."),
        q("SHORT_ANSWER", "In two or three sentences, explain how remote monitoring benefits both the customer and the MPS provider.",
          explanation="The customer gets supplies before devices run out and faster fault response. The provider gets accurate billing data, lower service costs and insight for optimisation."),
    ],
    "sources": [ISO_YIELD, NIST_PRINT, CPCB_EWASTE],
}
