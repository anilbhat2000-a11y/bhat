"""Networking, Print, Cyber Security, Cloud, HPC/AI/ML and Server and Storage."""
from . import q, TF

COURSES = {}

# ---------------------------------------------------------------- Networking

COURSES["Networking Advanced: SD-WAN and Network Architecture"] = {
    "lessons": [
        """
SD-WAN (software-defined WAN) connects branches over several kinds of link and steers traffic by policy from a central controller.

## Key ideas

- **Multiple transports:** MPLS, broadband internet, 4G/5G, used together.
- **Overlay:** encrypted tunnels between sites run over any transport.
- **Application-aware routing:** traffic is steered by application and link quality, for example video calls on the link with the lowest loss and jitter.
- **Central orchestration:** policies set once and pushed to all sites.
- **Zero-touch provisioning:** a branch device configures itself when connected.

## Design steps

1. List sites, users, applications and current links.
2. Classify applications by priority and sensitivity to loss and delay.
3. Choose at least two diverse links for important sites.
4. Decide where internet traffic breaks out (locally, or through a central or cloud security service).
5. Plan the hub sites and redundancy for controllers and hubs.

> This module includes a lab: design the SD-WAN policies for a sample 20-branch company.
""",
        """
A campus network connects users and devices within a site or group of buildings.

## Hierarchy

- **Access layer:** switches that connect users, phones, access points.
- **Distribution layer:** aggregates access switches and applies policy.
- **Core layer:** fast, highly available backbone.

Smaller sites often combine core and distribution (**collapsed core**). Data centres often use a **spine-leaf** design for predictable east-west traffic.

## Resilience

- Dual uplinks from access to distribution or core.
- Redundant core switches, using stacking or multi-chassis link aggregation.
- A first-hop redundancy protocol (such as VRRP) for default gateways.
- A dynamic routing protocol (such as OSPF) between layers for fast reconvergence.
- Power redundancy for core devices, and PoE budgets for access switches.
""",
        """
Network design and security design are now the same conversation.

## Building security into the network

- **Segmentation:** separate users, guests, servers, IoT and management traffic with VLANs and routing policies, so an infection cannot spread freely.
- **Network access control (NAC):** authenticate devices and users before they get access, commonly with 802.1X, and place them in the right segment.
- **Firewall zones:** control traffic between segments and to the internet.
- **Secure management:** a separate management network, strong authentication, logging of changes.
- **Zero trust principles:** never trust by network location alone; verify each user and device.

Agree the security policy with the customer's security team before the design is finalised.
""",
        """
A network is only as good as its operations.

## Monitoring

- **SNMP** for device health and interface statistics.
- **Flow data** (such as NetFlow or IPFIX) for who is using bandwidth and for what.
- **Syslog** for events and errors, sent to a central server.
- Alerts with clear owners and escalation.

## Operations practice

- Automated configuration backups, kept off the devices.
- Change management with rollback plans.
- Regular software updates, tested first.
- Up-to-date diagrams and IP plans.
- Capacity reviews of WAN and uplinks.
""",
    ],
    "questions": [
        q("SINGLE", "What does application-aware routing in SD-WAN do?", ["Steers traffic by application and link quality", "Blocks all applications", "Uses only one link", "Removes the need for security"], ["Steers traffic by application and link quality"]),
        q("MULTIPLE", "Which are features of SD-WAN? Select all that apply.", ["Multiple transports used together", "Central orchestration", "Zero-touch provisioning", "Manual configuration of every branch by hand only"], ["Multiple transports used together", "Central orchestration", "Zero-touch provisioning"], points=2),
        q("MATCHING", "Match each campus layer to its role.", ["Access=Connects users and devices", "Distribution=Aggregates access switches and applies policy", "Core=Fast, highly available backbone"], points=3),
        q("SINGLE", "What is network segmentation for?", ["Limiting how far an infection or attack can spread", "Making cables shorter", "Increasing printer speed", "Avoiding IP addresses"], ["Limiting how far an infection or attack can spread"]),
        q("FILL_BLANK", "A standard commonly used for network access control that authenticates devices before giving access is 802.____.", ["1X", "1x"]),
        q("TRUE_FALSE", "Configuration backups should be stored only on the devices themselves.", TF, ["False"]),
    ],
}

# ---------------------------------------------------------------- Print

COURSES["Print Solutions Intermediate: Print Fleet Assessment"] = {
    "lessons": [
        """
A print fleet assessment shows what a customer has, how it is used and what it costs, before proposing changes.

## Collect data

- **Inventory:** every printer, copier and MFP: model, age, location, connection.
- **Volumes:** monthly pages per device, mono and colour, from meter reads or monitoring software.
- **Users:** how many people use each device.
- **Costs:** consumables, service contracts, paper, and staff time spent on printer issues.
- **Pain points:** breakdowns, slow devices, security concerns.

## Methods

- Install monitoring software for a few weeks to collect accurate volumes.
- Walk the site to find local desktop printers that are not on the network.
- Interview a sample of users and the IT team.

> This module includes a lab: build a fleet inventory and volume table for a sample office.
""",
        """
Most customers underestimate what printing costs them.

## Cost per page

Cost per page = (consumables + service + device cost spread over its life + power) ÷ pages printed.

Example: a printer costs ₹3,000 a month in toner, ₹1,000 in service, and ₹1,000 a month in depreciation, and prints 10,000 pages: ₹5,000 ÷ 10,000 = ₹0.50 per page.

## What drives cost up

- Many small desktop printers with expensive cartridges.
- Colour printing where mono would do.
- Old devices with high service costs.
- No control over who prints what.

Present current costs per device and in total; it becomes the baseline for the savings in your proposal.
""",
        """
Right-sizing means having the right devices, in the right places, for the real volumes.

## Principles

- **Consolidate** many small printers into fewer shared MFPs where users are close together.
- **Match duty cycle to volume:** a device's recommended monthly volume should comfortably cover its actual use.
- **Ratio of users to devices:** shared MFPs commonly serve a team or a floor section; balance convenience against cost.
- **Keep specialist devices** where needed (labels, wide format, secure areas).
- **Default to mono and duplex** printing.

## The proposal

Show the current state, the future state, the cost difference and the implementation plan, including how users will be trained.
""",
        """
Printed documents and printers themselves are security risks.

## Common risks

- Confidential documents left in output trays.
- Devices storing copies of scanned or printed documents on internal drives.
- Default administrator passwords and open management ports.
- Scan-to-email used to send data outside the company.

## Controls

- **Secure print release (pull printing):** jobs are held until the user authenticates at the device with a card or PIN.
- **Device hardening:** change default passwords, disable unused protocols, keep firmware current.
- **Encryption** of stored data, and secure wiping when devices are removed.
- **Audit logs** of who printed, copied or scanned what.
""",
    ],
    "questions": [
        q("MULTIPLE", "What should a print fleet assessment collect? Select all that apply.", ["Device inventory and age", "Monthly page volumes", "Consumable and service costs", "Staff birthdays"], ["Device inventory and age", "Monthly page volumes", "Consumable and service costs"], points=2),
        q("SINGLE", "A printer costs ₹5,000 a month in total and prints 10,000 pages. What is the cost per page?", ["₹0.50", "₹5", "₹0.05", "₹50"], ["₹0.50"]),
        q("TRUE_FALSE", "A device's recommended monthly volume should comfortably cover its actual use.", TF, ["True"]),
        q("SINGLE", "What does secure print release do?", ["Holds jobs until the user authenticates at the device", "Prints faster", "Removes toner", "Prints in colour by default"], ["Holds jobs until the user authenticates at the device"]),
        q("MULTIPLE", "Which reduce printing cost? Select all that apply.", ["Consolidating desktop printers into shared MFPs", "Defaulting to mono and duplex", "Replacing old high-service devices", "Printing every email in colour"], ["Consolidating desktop printers into shared MFPs", "Defaulting to mono and duplex", "Replacing old high-service devices"], points=2),
        q("FILL_BLANK", "Printing on both sides of the paper is called ____ printing.", ["duplex"]),
    ],
}

COURSES["Print Solutions Advanced: Managed Print Services"] = {
    "lessons": [
        """
Managed print services (MPS) mean we take responsibility for the customer's printing: devices, supplies, service and reporting, for a predictable charge.

## Define the scope

- Which devices and locations are covered, including existing devices taken over.
- What is included: consumables (often everything except paper), service, parts, monitoring, help desk.
- What is excluded: paper, user errors, damage, specialist devices.

## Service levels

- Response time and fix time for breakdowns, by location.
- Consumables delivered before they run out.
- Device uptime targets.
- Regular service reviews.

Clear scope and service levels avoid disputes during the contract.
""",
        """
MPS can be priced in several ways.

## Common models

- **Cost per page (click charge):** a rate per mono page and a higher rate per colour page, billed from meter readings.
- **Fixed fee plus pages:** a monthly fee covering devices and a page allowance, with an overage rate.
- **Minimum volume commitment:** the customer pays for at least a set number of pages.

## Pricing carefully

- Build the rate from real costs: device finance, consumables at expected coverage, service visits, monitoring, margin.
- Check volume assumptions against the fleet assessment.
- State what happens if volumes rise or fall significantly.

[PLACEHOLDER: the company's pricing rules, margin targets and approval levels for MPS deals.]
""",
        """
Good MPS runs on data from the devices.

## Monitoring

- Software collects meter readings, toner levels and error alerts automatically from every device.
- Meter readings feed billing directly, removing manual reads and disputes.
- Error alerts let the service team respond before users call.

## Automatic supplies

- Toner is shipped when the level falls below a threshold, timed to arrive before it runs out.
- Track toner yield against expected coverage; very low yields can indicate a fault or waste.

> Agree with the customer's IT team how the monitoring software connects to devices, and what data leaves their network.
""",
        """
Regular reporting shows the customer the value of the service and spots improvements.

## A monthly or quarterly report

- Total pages, mono and colour, by device and department.
- Cost against the baseline from the original assessment.
- Service performance: tickets, response and fix times, against SLAs.
- Device uptime and problem devices.
- Recommendations: move, replace or remove devices; adjust policies.

## The review meeting

Walk through the report with the customer, agree actions, and record them. Customers who see continuous improvement renew.
""",
    ],
    "questions": [
        q("SINGLE", "What is typically excluded from MPS consumables?", ["Paper", "Toner", "Drums", "Service parts"], ["Paper"]),
        q("MATCHING", "Match each MPS pricing model to its description.", ["Cost per page=A rate per mono page and a higher rate per colour page", "Fixed fee plus pages=A monthly fee with a page allowance and overage rate", "Minimum volume commitment=Customer pays for at least a set number of pages"], points=3),
        q("TRUE_FALSE", "Automatic meter readings can feed billing directly and reduce disputes.", TF, ["True"]),
        q("SINGLE", "Why track toner yield against expected coverage?", ["Very low yields can indicate a fault or waste", "To make toner cheaper", "Because GST requires it", "It has no purpose"], ["Very low yields can indicate a fault or waste"]),
        q("MULTIPLE", "What belongs in an MPS service report? Select all that apply.", ["Pages by device and department", "Cost against baseline", "Service performance against SLAs", "The account manager's lunch preferences"], ["Pages by device and department", "Cost against baseline", "Service performance against SLAs"], points=2),
        q("SHORT_ANSWER", "A customer's print volume falls by 40% after a move to digital workflows. Explain how this affects an MPS contract and what you would discuss.", points=4, explanation="Model answer: revenue under cost-per-page falls and a minimum commitment may apply; review the fleet (remove or consolidate devices), revisit the volume assumptions and pricing, and agree a revised plan in the service review."),
    ],
}

# ---------------------------------------------------------------- Cyber Security

COURSES["Cyber Security Basic: Threats and Protection"] = {
    "lessons": [
        """
Most attacks on companies start with people, not technology.

## Common threats

- **Phishing:** emails or messages that trick you into clicking a link, opening an attachment or giving a password. Look for urgency, unexpected requests and mismatched sender addresses.
- **Ransomware:** malware that encrypts files and demands payment. Often arrives through phishing or unpatched systems.
- **Business email compromise:** criminals impersonate a manager or vendor to request payments or bank detail changes.
- **Credential theft:** stolen or reused passwords used to log in as you.
- **Insider risk:** data taken or damaged by someone inside, deliberately or by mistake.

> If an email asks you to act urgently, pay, change bank details or log in, stop and verify through another channel.
""",
        """
No single product stops every attack. Security works in layers, so that if one fails, another catches the threat.

## The main layers

- **Firewall:** controls traffic between the internet and the company network, and between internal segments.
- **Email security:** filters spam, phishing and malicious attachments.
- **Endpoint protection:** on laptops and servers, detects and blocks malware; modern tools (EDR) also detect suspicious behaviour.
- **Patching:** updates close the holes attackers use.
- **Backups:** kept separate and tested, so data can be restored after ransomware.
- **Access control:** each person gets only the access they need.
- **People:** trained staff who spot and report attacks.

These are also the building blocks of most security solutions we sell.
""",
        """
Passwords are still the main lock on most accounts.

## Good passwords

- Long: a passphrase of several words is strong and easy to remember.
- Unique: never reuse a work password anywhere else.
- Stored in an approved password manager, not on paper or in a spreadsheet.

## Multi-factor authentication (MFA)

MFA asks for something more than a password, such as a code from an app or a security key. Even if a password is stolen, the attacker cannot log in without the second factor.

- Turn on MFA wherever it is offered.
- Never approve an MFA prompt you did not start; it means someone has your password. Report it.
""",
        """
Fast reporting limits the damage of an incident.

## Report immediately if

- you clicked a suspicious link or opened a suspicious attachment;
- you entered your password on a page you now doubt;
- you see unexpected MFA prompts;
- your device behaves strangely, or files become unreadable;
- you lose a laptop, phone or storage device.

## How

Report to IT and your manager at once [PLACEHOLDER: company IT security contact]. Do not try to fix it alone, and do not switch off an infected device unless told to; disconnect it from the network instead.

> In India, organisations must report certain cyber incidents to CERT-In within short time limits. Your quick report helps the company meet that duty.
""",
    ],
    "questions": [
        q("SINGLE", "An email from your 'manager' urgently asks you to change a vendor's bank details. What should you do?", ["Verify through another channel before acting", "Change them immediately", "Reply asking for more urgency", "Forward it to the vendor"], ["Verify through another channel before acting"]),
        q("MATCHING", "Match each threat to its description.", ["Phishing=Tricks you into clicking or giving a password", "Ransomware=Encrypts files and demands payment", "Business email compromise=Impersonates a manager or vendor to request payments"], points=3),
        q("TRUE_FALSE", "Security works best in layers, so that if one control fails another catches the threat.", TF, ["True"]),
        q("SINGLE", "You receive an MFA prompt you did not start. What does it mean?", ["Someone may have your password; report it", "The system is testing you; approve it", "Nothing; ignore it forever", "Your phone needs charging"], ["Someone may have your password; report it"]),
        q("MULTIPLE", "Which should be reported to IT immediately? Select all that apply.", ["Clicking a suspicious link", "Losing a company laptop", "Files suddenly becoming unreadable", "A colleague's birthday"], ["Clicking a suspicious link", "Losing a company laptop", "Files suddenly becoming unreadable"], points=2),
        q("FILL_BLANK", "Asking for a code from an app in addition to a password is called multi-factor ____.", ["authentication"]),
    ],
}

COURSES["Cyber Security Advanced: Compliance Frameworks and Security Architecture"] = {
    "lessons": [
        """
Frameworks give a structured way to build and measure a security programme. Customers often ask which framework a solution supports.

## ISO/IEC 27001

An international standard for an **information security management system (ISMS)**. Organisations can be certified. It requires risk assessment and treatment, with a reference set of controls in Annex A (in the 2022 version, grouped into organisational, people, physical and technological controls).

## NIST Cybersecurity Framework (CSF)

A widely used framework organised into functions. Version 2.0 has six: **Govern, Identify, Protect, Detect, Respond, Recover**. Useful for describing maturity and planning improvements.

## Indian context

Sector regulators (for example in banking and insurance) and CERT-In directions add specific requirements, such as incident reporting and log retention. Check which apply to each customer.
""",
        """
A gap assessment compares a customer's current security against a framework or policy and lists what is missing.

## Steps

1. **Agree the scope:** sites, systems, business units, and the framework to use.
2. **Collect evidence:** policies, configurations, interviews, tool reports.
3. **Assess each control:** in place, partially in place, or missing, with evidence.
4. **Rate the risk** of each gap: likelihood and impact.
5. **Recommend actions** with priorities, effort and cost.

## Presenting results

A heat map of gaps by risk, plus a prioritised action list, is easy for leaders to act on. The action list becomes the roadmap, and often the next projects.

> This module includes a lab: assess a sample company against a short list of controls.
""",
        """
Defence in depth means layering controls so that no single failure exposes critical assets.

## Layers to design

- **Identity:** single sign-on, MFA everywhere, privileged access management for admin accounts.
- **Endpoint:** EDR on laptops and servers, device encryption, patch management.
- **Network:** segmentation, next-generation firewalls, secure remote access.
- **Email and web:** filtering, sandboxing, DNS security.
- **Data:** classification, data loss prevention, encryption.
- **Backup and recovery:** immutable or offline copies, tested restores.
- **Detection and response:** central logging (SIEM), monitoring by a SOC, incident response plans.

## Zero trust

Verify every user, device and request; give least privilege; assume breach and limit blast radius.
""",
        """
A security roadmap turns gap findings into a funded plan over one to three years.

## Building the roadmap

- **Quick wins first:** MFA, patching, backup protection; low cost, high risk reduction.
- **Foundations next:** identity, endpoint detection, logging.
- **Maturity later:** advanced detection, automation, data protection programmes.

## For each item

State the risk it reduces, the cost, the effort, the owner and the timeline. Group items into phases aligned with budget cycles.

## Review

Re-assess at least yearly; threats, business and regulations change. A roadmap is also a sales plan: each phase is a project we can propose.
""",
    ],
    "questions": [
        q("SINGLE", "What does ISO/IEC 27001 specify?", ["An information security management system", "A cable standard", "A GST rule", "A UPS rating"], ["An information security management system"]),
        q("MULTIPLE", "Which are functions of NIST CSF 2.0? Select all that apply.", ["Govern", "Detect", "Recover", "Advertise"], ["Govern", "Detect", "Recover"], points=2),
        q("SINGLE", "What is the output of a gap assessment?", ["Missing controls rated by risk, with recommended actions", "A firewall configuration", "An invoice", "A network diagram only"], ["Missing controls rated by risk, with recommended actions"]),
        q("TRUE_FALSE", "Zero trust means trusting every device on the internal network.", TF, ["False"]),
        q("MATCHING", "Match each control to its layer.", ["Privileged access management=Identity", "EDR=Endpoint", "SIEM and SOC=Detection and response"], points=3),
        q("SHORT_ANSWER", "A customer with a limited budget asks what to do first after a gap assessment. What would you recommend and why?", points=4, explanation="Model answer: quick wins with high risk reduction and low cost: MFA everywhere, patching critical systems, protecting and testing backups, and email security; then build foundations in later phases."),
    ],
}

# ---------------------------------------------------------------- Cloud

COURSES["Cloud Advanced: Hybrid Architecture and Operations"] = {
    "lessons": [
        """
Hybrid cloud combines on-premise infrastructure with one or more public clouds, connected and managed as one.

## Why hybrid

- Some workloads must stay on-premise (latency, data residency, legacy systems).
- Others benefit from cloud scale and services.
- Disaster recovery to the cloud avoids a second data centre.

## Connectivity

- **Site-to-site VPN** over the internet: quick and low-cost.
- **Dedicated private connections** offered by cloud providers: predictable performance for heavy or critical traffic.
- Plan IP addressing so on-premise and cloud ranges do not overlap.

## Identity and management

Use one identity system across both, and consistent monitoring, security policies and automation, so hybrid does not become two separate worlds.
""",
        """
Without governance, cloud environments become expensive and insecure quickly.

## A landing zone

Before workloads move, set up a foundation: account or subscription structure, networking, identity, logging and security baselines.

## Policies

- **Tagging:** every resource tagged with owner, project and environment, so costs can be allocated.
- **Guardrails:** policies that block risky settings, such as public storage or unapproved regions.
- **Least privilege:** roles with only the permissions needed.
- **Budgets and alerts** for each project.

## Cost management

Review costs monthly: right-size instances, remove idle resources, use reserved capacity for steady workloads, and schedule non-production systems to switch off out of hours.
""",
        """
Cloud makes backup and disaster recovery (DR) more affordable, but it must be designed.

## Definitions

- **RPO (recovery point objective):** how much data loss is acceptable, measured in time.
- **RTO (recovery time objective):** how quickly service must be restored.

## Patterns

- **Backup to cloud:** low cost; slower restore.
- **Pilot light:** core systems replicated and ready; others started when needed.
- **Warm standby:** a smaller copy running, scaled up in a disaster.
- **Active-active:** full capacity in two places; highest cost and fastest recovery.

## Protect the backups

Use immutable or separately secured backup copies, so ransomware that reaches production cannot delete them. Test restores regularly.

> This module includes a lab: design DR for a sample application to meet a given RPO and RTO.
""",
        """
Managed cloud services mean we operate the customer's cloud environment for them.

## Typical scope

- Monitoring and incident response, around the clock.
- Patching, backup and DR management.
- Security baseline enforcement and reviews.
- Cost optimisation reports and actions.
- Change requests within agreed limits.

## Agree clearly

- Which accounts, subscriptions and workloads are covered.
- Responsibilities versus the cloud provider's shared responsibility model.
- Service levels and reporting.
- Pricing: per resource, per workload, or a percentage of cloud spend.
""",
    ],
    "questions": [
        q("SINGLE", "Why should on-premise and cloud IP ranges not overlap?", ["Overlapping ranges cannot be routed between each other cleanly", "To reduce cost", "Because GST requires it", "It does not matter"], ["Overlapping ranges cannot be routed between each other cleanly"]),
        q("MATCHING", "Match each term to its meaning.", ["RPO=How much data loss is acceptable", "RTO=How quickly service must be restored"], points=2),
        q("SINGLE", "Which DR pattern has full capacity running in two places?", ["Active-active", "Backup to cloud", "Pilot light", "Warm standby"], ["Active-active"]),
        q("MULTIPLE", "Which are good cloud governance practices? Select all that apply.", ["Tag resources with owner and project", "Guardrails that block public storage", "Budgets and alerts per project", "Giving everyone administrator rights"], ["Tag resources with owner and project", "Guardrails that block public storage", "Budgets and alerts per project"], points=2),
        q("TRUE_FALSE", "Backups should be protected so that ransomware reaching production cannot delete them.", TF, ["True"]),
        q("FILL_BLANK", "The foundation of accounts, networking, identity and security set up before workloads move to cloud is called a landing ____.", ["zone"]),
    ],
}

# ---------------------------------------------------------------- HPC / AI / ML

COURSES["HPC, AI and ML Basic: Concepts and Use Cases"] = {
    "lessons": [
        """
These terms are often mixed up. In plain words:

- **Artificial intelligence (AI):** computers doing tasks that normally need human intelligence, such as understanding language or recognising images.
- **Machine learning (ML):** a way of building AI where the system learns patterns from data instead of following hand-written rules.
- **Deep learning:** machine learning using large neural networks with many layers; behind most modern image, speech and language AI.
- **Generative AI:** models that create new text, images or code, such as large language models (LLMs).

## Two phases

- **Training:** the model learns from large amounts of data. Very compute-intensive.
- **Inference:** the trained model is used to make predictions or generate output. Less intensive per request, but can be large in total when many users are served.
""",
        """
High-performance computing (HPC) solves very large problems by splitting them across many processors working in parallel.

## Where HPC is used

- Weather forecasting and climate modelling.
- Engineering simulation: crash tests, fluid dynamics, structures.
- Scientific research: genomics, chemistry, physics.
- Financial risk modelling.

## The building blocks

- **Compute nodes:** servers with many CPU cores and often GPUs.
- **High-speed interconnect:** low-latency networks so nodes can work together.
- **Parallel storage:** file systems that many nodes can read and write at once.
- **Scheduler:** software that queues and runs jobs on the cluster.

HPC and AI infrastructure share much of this design, which is why they are often sold together.
""",
        """
Customers ask "what can AI do for us?" Common enterprise use cases help start the conversation.

## Examples

- **Customer service:** chatbots and assistants answering common questions.
- **Document processing:** extracting data from invoices, forms and contracts.
- **Knowledge search:** employees asking questions of internal documents.
- **Computer vision:** quality inspection, safety monitoring, counting.
- **Predictive maintenance:** spotting equipment failures before they happen.
- **Forecasting:** demand, inventory and sales.

## Deployment choice

Some customers use cloud AI services; others need on-premise infrastructure because of data sensitivity, cost at scale, or latency. That on-premise demand is where infrastructure solutions fit.
""",
        """
AI projects fail when the goal or the data is unclear. Ask before proposing hardware.

## Discovery questions

- What business problem will AI solve, and how will success be measured?
- What data exists, where is it, and how much? Is it labelled?
- Is the plan to train models, fine-tune existing models, or only run inference?
- How many users or requests, and what response time is needed?
- Must data stay on-premise for regulatory or confidentiality reasons?
- Who will build and run the models: in-house team, partner, or vendor?
- What is the timeline and budget?

The answers decide whether the customer needs GPU servers, storage, networking, cloud services, or a partner for model development.
""",
    ],
    "questions": [
        q("MATCHING", "Match each term to its meaning.", ["Machine learning=Systems learn patterns from data", "Deep learning=ML with large multi-layer neural networks", "Generative AI=Models that create new text, images or code"], points=3),
        q("SINGLE", "Which phase is usually the most compute-intensive?", ["Training", "Inference", "Data entry", "Printing results"], ["Training"]),
        q("MULTIPLE", "Which are building blocks of an HPC cluster? Select all that apply.", ["Compute nodes", "High-speed interconnect", "Parallel storage", "A fax machine"], ["Compute nodes", "High-speed interconnect", "Parallel storage"], points=2),
        q("SINGLE", "Why might a customer run AI on-premise instead of in the cloud?", ["Data sensitivity, cost at scale, or latency", "Because cloud AI does not exist", "To avoid using GPUs", "It is always cheaper in every case"], ["Data sensitivity, cost at scale, or latency"]),
        q("TRUE_FALSE", "It is best to propose GPU hardware before understanding the customer's data and goals.", TF, ["False"]),
        q("FILL_BLANK", "Software that queues and runs jobs on an HPC cluster is called a ____.", ["scheduler", "job scheduler"]),
    ],
}

COURSES["HPC, AI and ML Advanced: Solution Sizing and Design"] = {
    "lessons": [
        """
GPU sizing starts from the workload: the model size, whether it is training or inference, and the required speed.

## Memory first

A model must fit in GPU memory. A rough guide for inference: each parameter needs about 2 bytes at 16-bit precision. A 7-billion-parameter model therefore needs about 14 GB for its weights alone, plus memory for the context and batch. Lower precision (quantisation) reduces this.

Training needs much more memory per parameter than inference, because gradients and optimiser states are stored too; large models are spread across many GPUs.

## Throughput

- For inference: requests per second and response time targets decide how many GPUs.
- For training: dataset size, model size and the time allowed decide the GPU count.

## Validate

Use OEM and software vendor sizing guides, and benchmark with the customer's real workload when possible. State every assumption in the sizing.

> This module includes a lab: size GPUs for a sample inference workload.
""",
        """
GPUs are only fast if data reaches them fast enough.

## Networking

- **Inside a server:** high-speed GPU-to-GPU links connect the GPUs in one node.
- **Between servers:** low-latency, high-bandwidth fabrics such as InfiniBand or RDMA over Ethernet (RoCE) for multi-node training.
- Separate networks are common for compute traffic, storage traffic and management.

## Storage

- Training reads large datasets repeatedly; slow storage leaves GPUs idle.
- **Parallel file systems** spread data across many storage servers so all nodes can read at high speed.
- Use tiers: fast flash for active datasets, cheaper capacity storage for archives.

## Facilities

GPU servers draw a lot of power and produce a lot of heat; check rack power density and cooling (often liquid cooling for dense deployments).
""",
        """
Hardware is useless without a working software stack.

## Layers

- **Operating system and drivers:** a supported Linux distribution and GPU drivers.
- **GPU computing libraries** from the GPU vendor.
- **Containers:** package frameworks and dependencies consistently.
- **Frameworks:** such as PyTorch or TensorFlow for training and inference.
- **Orchestration and scheduling:** an HPC scheduler (such as Slurm) or Kubernetes to share the cluster between users and jobs.
- **Monitoring:** GPU utilisation, temperatures, job status.

## Sharing the cluster

Define how users submit jobs, how GPUs are allocated, quotas, and priorities. Poor scheduling wastes expensive GPU time.
""",
        """
A sizing is a recommendation the customer will spend a lot of money on. Present it clearly and honestly.

## Structure

1. **Workload summary:** what the customer wants to run, in their words.
2. **Assumptions:** model sizes, precision, users, dataset sizes, growth.
3. **Recommended configuration:** servers, GPUs, network, storage, software.
4. **Expected performance** and how it was estimated.
5. **Facilities requirements:** power, cooling, space.
6. **Options:** a smaller starting point and how to scale.
7. **Risks and next steps:** for example, a proof of concept to validate performance.

## Be honest

If performance depends on assumptions not yet confirmed, say so and propose how to confirm them.

> This module includes a live session: present a sizing to a mock customer panel.
""",
    ],
    "questions": [
        q("SINGLE", "At 16-bit precision, roughly how much GPU memory do the weights of a 7-billion-parameter model need?", ["About 14 GB", "About 1 GB", "About 140 GB", "About 7 MB"], ["About 14 GB"], explanation="About 2 bytes per parameter × 7 billion ≈ 14 GB."),
        q("TRUE_FALSE", "Training a model needs more memory per parameter than running inference.", TF, ["True"]),
        q("MULTIPLE", "Which are used to connect GPU servers for multi-node training? Select all that apply.", ["InfiniBand", "RDMA over Ethernet (RoCE)", "Low-latency high-bandwidth fabrics", "A USB hub"], ["InfiniBand", "RDMA over Ethernet (RoCE)", "Low-latency high-bandwidth fabrics"], points=2),
        q("SINGLE", "Why do AI training clusters often use parallel file systems?", ["So all nodes can read large datasets at high speed", "To print faster", "To avoid using networks", "Because they are the cheapest storage"], ["So all nodes can read large datasets at high speed"]),
        q("MATCHING", "Match each software layer to its role.", ["Containers=Package frameworks and dependencies consistently", "Scheduler or Kubernetes=Share the cluster between users and jobs", "Frameworks=Train and run models"], points=3),
        q("SHORT_ANSWER", "A customer wants to run an internal chatbot for 500 employees on-premise. List the information you need before sizing, and explain why.", points=4, explanation="Model answer: model choice and size and precision (memory), expected concurrent users and response time (throughput), document volume for retrieval (storage), data residency needs, growth, and facilities limits (power and cooling)."),
    ],
}

# ---------------------------------------------------------------- Server and Storage

COURSES["Server and Storage Basic: Servers, RAID and Storage Types"] = {
    "lessons": [
        """
Servers come in three main shapes.

- **Tower servers:** look like desktop PCs; for small offices without a rack. Quiet and simple, but take floor space.
- **Rack servers:** fit standard 19-inch racks, measured in rack units (1U, 2U and so on). The most common choice in server rooms and data centres.
- **Blade servers:** thin servers sharing power, cooling and networking in a chassis. Dense; suited to larger deployments.

## Choosing

- Number of servers now and later.
- Space, power and cooling available.
- Expansion needs: drives, memory, GPUs, network cards.
- Management: remote management controllers on each server.
""",
        """
RAID combines several drives to improve resilience, performance or both.

## Common levels

- **RAID 0 (striping):** fast, but no protection; one drive failure loses everything.
- **RAID 1 (mirroring):** two copies; survives one drive failure; 50% usable capacity.
- **RAID 5 (single parity):** survives one drive failure; usable capacity is (number of drives − 1).
- **RAID 6 (double parity):** survives two drive failures; usable capacity is (number of drives − 2).
- **RAID 10 (mirroring + striping):** fast and resilient; 50% usable capacity.

## Example

Six 4 TB drives: RAID 5 gives 20 TB usable; RAID 6 gives 16 TB; RAID 10 gives 12 TB.

> RAID is not a backup. It protects against drive failure, not against deletion, corruption or ransomware.
""",
        """
Storage can be connected to servers in three main ways.

## DAS: direct-attached storage

Drives inside or cabled directly to one server. Simple and fast, but not easily shared.

## NAS: network-attached storage

A storage device on the network that shares **files** (for example over SMB or NFS). Good for shared folders, home directories and file archives.

## SAN: storage area network

A dedicated network giving servers access to **blocks** of storage, as if they were local disks (for example over Fibre Channel or iSCSI). Used for databases and virtualisation clusters that need shared, high-performance storage.

## Choosing

Ask what is stored (files or application data), how many servers need it, the performance needed, and the growth expected.
""",
        """
A server refresh starts with understanding what exists and what is needed.

## Collect requirements

- Current servers: age, warranty and support status, utilisation of CPU, memory and storage.
- Applications: what runs where, and their performance needs.
- Growth: users, data and new applications expected over three to five years.
- Availability: which systems cannot go down.
- Constraints: rack space, power, cooling, budget.

## Opportunities

- Consolidate many old servers onto fewer new ones with virtualisation.
- Right-size storage with the right RAID level and room for growth.
- Add backup and DR if they are missing.

> This module includes a lab: collect refresh requirements using a sample checklist.
""",
    ],
    "questions": [
        q("SINGLE", "Which server form factor is the most common in server rooms with racks?", ["Rack server", "Tower server", "Laptop", "Blade-only phone"], ["Rack server"]),
        q("MATCHING", "Match each RAID level to its property.", ["RAID 0=Fast but no protection", "RAID 1=Mirroring with 50% usable capacity", "RAID 6=Survives two drive failures"], points=3),
        q("SINGLE", "Six 4 TB drives in RAID 5 give how much usable capacity?", ["20 TB", "24 TB", "16 TB", "12 TB"], ["20 TB"], explanation="(6 − 1) × 4 TB = 20 TB."),
        q("TRUE_FALSE", "RAID is a backup.", TF, ["False"], explanation="RAID protects against drive failure, not deletion, corruption or ransomware."),
        q("MATCHING", "Match each storage type to what it provides.", ["NAS=Shared files over the network", "SAN=Block storage over a dedicated network", "DAS=Drives attached to one server"], points=3),
        q("FILL_BLANK", "Running many virtual servers on fewer physical servers is called server ____.", ["consolidation", "virtualisation", "virtualization"]),
    ],
}

COURSES["Server and Storage Advanced: Architecture and Disaster Recovery"] = {
    "lessons": [
        """
Not all data needs the same speed or cost of storage. Tiering puts each kind of data on the right media.

## Typical tiers

- **Performance tier:** all-flash (NVMe or SSD) for databases and busy virtual machines.
- **Capacity tier:** large hard drives for file shares and less active data.
- **Archive tier:** the lowest cost per terabyte for data rarely accessed, such as object storage, tape or cloud archive.

## Design points

- Measure workload needs: IOPS, throughput, latency, capacity.
- Use automated tiering or policies where the storage supports them.
- Plan data protection per tier: snapshots, replication, backup.
- Design controllers, paths and power for redundancy.
""",
        """
Disaster recovery protects against losing a whole site or system, not just a drive.

## Replication

- **Synchronous:** each write is confirmed at both sites before completing. Zero data loss, but needs short distances and low latency.
- **Asynchronous:** writes are sent to the second site shortly after. Works over long distances; a small amount of data may be lost.

## DR site options

- A second company site.
- A colocation data centre.
- The cloud, as a DR target.

## Objectives

Set an **RPO** (acceptable data loss) and **RTO** (acceptable downtime) for each application with the business. They drive the replication method and the cost.

## Backups still matter

Replication copies mistakes and ransomware too. Keep backups following the **3-2-1 rule**: three copies, on two types of media, one off-site, with at least one copy immutable or offline.
""",
        """
A DR plan that has never been tested is a hope, not a plan.

## Types of test

- **Tabletop:** walk through the plan on paper with the team.
- **Component test:** restore a single server or database.
- **Failover test:** switch selected services to the DR site.
- **Full test:** run the business from the DR site for a period.

## Running a test

1. Agree scope, success criteria and a rollback plan.
2. Inform stakeholders.
3. Follow the runbook step by step and record times.
4. Compare achieved RPO and RTO with the targets.
5. Fix the gaps found and update the plan.

Test at least yearly, and after major changes.

> This module includes a lab: run a restore test and record the achieved recovery time.
""",
        """
Newer architectures simplify infrastructure by moving storage functions into software.

## Hyper-converged infrastructure (HCI)

Compute, storage and virtualisation combined in standard servers (nodes). Each node contributes its local drives to a shared, software-defined storage pool. Scale by adding nodes.

- **Strengths:** simple to deploy and manage, scales in steps, fewer separate systems.
- **Considerations:** compute and storage grow together; licensing models vary; check performance for demanding workloads.

## Software-defined storage (SDS)

Storage software running on standard servers, providing block, file or object storage without proprietary arrays.

## Choosing

Compare traditional SAN, HCI and SDS on workload fit, growth pattern, skills, total cost and vendor support.
""",
    ],
    "questions": [
        q("SINGLE", "Which tier suits a busy database?", ["Performance tier (all-flash)", "Archive tier (tape)", "Capacity tier (large HDDs)", "USB drives"], ["Performance tier (all-flash)"]),
        q("MATCHING", "Match each replication type to its property.", ["Synchronous=Zero data loss, short distances", "Asynchronous=Long distances, a little data may be lost"], points=2),
        q("SINGLE", "What does the 3-2-1 backup rule mean?", ["Three copies, two media types, one off-site", "Three servers, two racks, one switch", "Back up three times a day", "Keep backups for 321 days"], ["Three copies, two media types, one off-site"]),
        q("TRUE_FALSE", "Replication alone protects against ransomware because it copies data to another site.", TF, ["False"], explanation="Replication copies the encrypted data too; immutable or offline backups are needed."),
        q("MULTIPLE", "Which are types of DR test? Select all that apply.", ["Tabletop", "Failover test", "Full test", "Guessing"], ["Tabletop", "Failover test", "Full test"], points=2),
        q("FILL_BLANK", "Infrastructure that combines compute, storage and virtualisation in standard server nodes is called hyper-____ infrastructure.", ["converged"]),
    ],
}
