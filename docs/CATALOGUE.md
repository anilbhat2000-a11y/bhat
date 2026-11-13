# Course catalogue

<!-- Generated from content/catalogue.json by `npm run catalogue:docs`. Do not edit by hand. -->

The catalogue has 17 subjects, each with Basic, Intermediate and Advanced courses. Each level requires the level below it. Every module lists the content the company will supply and its expected format. Text marked [PLACEHOLDER] must be supplied or approved by the company; nothing here states company policy, prices or product claims.

Courses marked "in the portal" already exist with sample content. The others can be created as draft course shells, with their modules, by running `npm run db:seed-catalogue`.

Supported content formats: VIDEO (MP4 with WebVTT captions), PDF, TEXT, LINK, LAB (checklist) and LIVE_SESSION. SCORM packages are not supported yet (see open questions in ARCHITECTURE.md).

## Subjects

- [Sales](#sales) (business)
- [Presales](#presales) (business)
- [Purchase](#purchase) (business)
- [Accounts](#accounts) (business)
- [Logistics](#logistics) (business)
- [Compliance](#compliance) (business)
- [Govt Sales](#govt-sales) (business)
- [System Integration Sales](#system-integration-sales) (business)
- [IT INFRA](#it-infra) (technical)
- [AUDIO VIDEO](#audio-video) (technical)
- [POWER SOLUTIONS](#power-solutions) (technical)
- [NETWORKING](#networking) (technical)
- [PRINT SOLUTIONS](#print-solutions) (technical)
- [CYBER SECURITY](#cyber-security) (technical)
- [CLOUD SOLUTIONS](#cloud-solutions) (technical)
- [HPC/AI/ML](#hpcaiml) (technical)
- [Server and storage](#server-and-storage) (technical)

## Sales

**Recommended learning path:** Start with Sales Basic in the first month. Move to Intermediate after 3 months of live deals, and to Advanced once you own key accounts.

### Sales Basic: The B2B Sales Process

The stages of a B2B IT sale, from prospecting to closure, and how to manage a pipeline.

- **Level:** Basic
- **Estimated duration:** 2 h
- **Prerequisites:** none
- **In the portal:** yes, as "Fundamentals of Enterprise Sales"

**Learning objectives**

- Describe each stage of the B2B sales process
- Qualify a lead using a framework such as BANT
- Keep accurate records of customer interactions in the CRM
- Read a pipeline report and spot stalled deals

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | The sales process end to end | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Prospecting and qualification | 40 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Pipeline and CRM hygiene | 30 min | [PLACEHOLDER: company to supply] PDF |
| 4 | [PLACEHOLDER] Company sales policy and approval levels | 20 min | [PLACEHOLDER: company to supply] PDF |

### Sales Intermediate: Consultative Selling and Negotiation

Running discovery, presenting value, handling objections, and negotiating terms.

- **Level:** Intermediate
- **Estimated duration:** 3 h
- **Prerequisites:** Sales Basic: The B2B Sales Process
- **In the portal:** yes, as "Consultative Sales"

**Learning objectives**

- Run a structured discovery meeting
- Write a value proposition tied to a customer outcome
- Handle common objections with evidence
- Plan a negotiation, including your walk-away point

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Discovery and questioning | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Value propositions | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Objection handling role-plays | 60 min | [PLACEHOLDER: company to supply] LIVE_SESSION (instructor-led) |
| 4 | Negotiation planning | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Sales Advanced: Strategic Accounts and Closure

Account planning, CXO conversations, multi-stakeholder deals, and forecasting.

- **Level:** Advanced
- **Estimated duration:** 3 h
- **Prerequisites:** Sales Intermediate: Consultative Selling and Negotiation
- **In the portal:** yes, as "Key Account Management"

**Learning objectives**

- Build an account plan with stakeholder map
- Lead a conversation with a CXO about business outcomes
- Close a multi-stakeholder deal
- Forecast with evidence for each committed deal

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Account planning and mapping | 60 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | CXO engagement | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 3 | Complex closure | 45 min | [PLACEHOLDER: company to supply] LIVE_SESSION (instructor-led) |
| 4 | Forecast discipline | 30 min | [PLACEHOLDER: company to supply] PDF |

## Presales

**Recommended learning path:** Presales staff take all three levels in order. Sales staff take Basic to work well with presales.

### Presales Basic: Understanding Solutions and Requirements

The presales role, reading customer requirements, and turning them into a solution outline.

- **Level:** Basic
- **Estimated duration:** 2 h
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain the presales role in the sales cycle
- Capture functional and technical requirements
- Map requirements to a solution outline
- Know where to find [PLACEHOLDER] approved OEM datasheets

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | The presales role | 20 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Requirement gathering | 40 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | From requirement to solution outline | 40 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Company solution library tour | 20 min | [PLACEHOLDER: company to supply] PDF |

### Presales Intermediate: RFP/RFQ Responses and Technical Proposals

Writing compliant, persuasive responses to RFPs and RFQs, with a technical proposal and bill of materials.

- **Level:** Intermediate
- **Estimated duration:** 2 h 50 min
- **Prerequisites:** Presales Basic: Understanding Solutions and Requirements
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Build a compliance matrix for an RFP
- Write a technical proposal with a clear architecture section
- Prepare a bill of materials with assumptions stated
- Review a response before submission using a checklist

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Reading an RFP and the compliance matrix | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Writing the technical proposal | 60 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Bill of materials and assumptions | 45 min | [PLACEHOLDER: company to supply] PDF |
| 4 | [PLACEHOLDER] Company proposal templates | 20 min | [PLACEHOLDER: company to supply] PDF |

### Presales Advanced: Demos, POCs and Solution Design

Planning and running demos and proofs of concept, and designing multi-vendor solutions.

- **Level:** Advanced
- **Estimated duration:** 3 h
- **Prerequisites:** Presales Intermediate: RFP/RFQ Responses and Technical Proposals
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Plan a demo around the customer's success criteria
- Scope a POC with entry and exit criteria
- Design a multi-vendor solution with integration points
- Present a solution to technical and business audiences

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Demo planning | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | POC scoping and success criteria | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Multi-vendor solution design | 60 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | Presenting the solution | 45 min | [PLACEHOLDER: company to supply] LIVE_SESSION (instructor-led) |

## Purchase

**Recommended learning path:** Purchase staff take all levels. Sales and presales take Basic to understand order lead times.

### Purchase Basic: The Procurement Process

How a customer order becomes a purchase order, and the documents involved.

- **Level:** Basic
- **Estimated duration:** 1 h 50 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Describe the procure-to-pay cycle
- Raise a purchase order with the required details
- Match PO, goods receipt and invoice (three-way match)
- Follow [PLACEHOLDER] company purchase approval levels

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Procure-to-pay overview | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Raising a PO | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Three-way match | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Company purchase policy | 20 min | [PLACEHOLDER: company to supply] PDF |

### Purchase Intermediate: Vendor Management and the PO Lifecycle

Choosing and managing vendors, tracking POs to delivery, and handling changes and cancellations.

- **Level:** Intermediate
- **Estimated duration:** 2 h 5 min
- **Prerequisites:** Purchase Basic: The Procurement Process
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Evaluate vendors on price, lead time, quality and terms
- Track a PO from release to closure
- Handle PO amendments and cancellations correctly
- Keep vendor records current

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Vendor evaluation | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | PO tracking and follow-up | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Amendments and cancellations | 30 min | [PLACEHOLDER: company to supply] PDF |
| 4 | Vendor records | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Purchase Advanced: OEM and Channel Compliance

Working within OEM and distributor programmes: deal registration, pricing approvals, and audit readiness.

- **Level:** Advanced
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** Purchase Intermediate: Vendor Management and the PO Lifecycle
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain how OEM deal registration and special pricing work
- Keep the evidence an OEM audit asks for
- Avoid common channel-compliance breaches
- Escalate a compliance doubt before ordering

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | OEM and distributor programmes | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Deal registration and special pricing | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Audit evidence | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Company OEM and channel terms | 30 min | [PLACEHOLDER: company to supply] PDF |

## Accounts

**Recommended learning path:** Accounts staff take all levels. Sales staff take Basic for billing and GST awareness.

### Accounts Basic: Billing, Invoicing and GST

Raising correct invoices and the GST basics every IT sale touches.

- **Level:** Basic
- **Estimated duration:** 2 h 5 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Raise an invoice with all mandatory fields
- Explain CGST, SGST and IGST and when each applies
- Use HSN and SAC codes correctly
- Know when an e-invoice and e-way bill are needed

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Invoices and mandatory fields | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | GST basics | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 3 | HSN and SAC codes | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | E-invoice and e-way bill | 30 min | [PLACEHOLDER: company to supply] PDF |

### Accounts Intermediate: Receivables, Payables and Reconciliation

Managing collections and payments, and reconciling accounts.

- **Level:** Intermediate
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** Accounts Basic: Billing, Invoicing and GST
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Run an ageing report and follow up overdue receivables
- Schedule payables against terms
- Reconcile bank and ledger balances
- Handle credit notes and debit notes

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Receivables and collections | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Payables | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Bank and ledger reconciliation | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | Credit and debit notes | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Accounts Advanced: Financial Reporting Basics

Reading financial statements and the reports managers use.

- **Level:** Advanced
- **Estimated duration:** 2 h 20 min
- **Prerequisites:** Accounts Intermediate: Receivables, Payables and Reconciliation
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Read a profit and loss statement and balance sheet
- Explain gross margin and working capital
- Prepare a month-end checklist
- Support an audit with the right records

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Reading financial statements | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Margin and working capital | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Month-end close | 45 min | [PLACEHOLDER: company to supply] PDF |
| 4 | [PLACEHOLDER] Company reporting calendar | 20 min | [PLACEHOLDER: company to supply] PDF |

## Logistics

**Recommended learning path:** Logistics staff take all levels. Sales and project staff take Basic.

### Logistics Basic: Dispatch and Documentation

Dispatching goods with the right documents, and proof of delivery.

- **Level:** Basic
- **Estimated duration:** 1 h 30 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- List the documents a dispatch needs
- Pack and label equipment safely
- Record proof of delivery
- Report damage or shortage correctly

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Dispatch documents | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Packing and labelling | 20 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 3 | Proof of delivery | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Damage and shortage | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Logistics Intermediate: Warehousing and Inventory Movement

Receiving, storing and moving stock, with accurate records.

- **Level:** Intermediate
- **Estimated duration:** 1 h 50 min
- **Prerequisites:** Logistics Basic: Dispatch and Documentation
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Receive goods against a PO
- Record stock movements accurately
- Run a cycle count
- Track serial numbers for equipment

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Goods receipt | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Stock movements | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Cycle counts | 30 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | Serial number tracking | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Logistics Advanced: Shipping, Transport and Multi-site Delivery

Planning multi-site deliveries, choosing transport, and handling inter-state rules.

- **Level:** Advanced
- **Estimated duration:** 2 h 5 min
- **Prerequisites:** Logistics Intermediate: Warehousing and Inventory Movement
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Plan a multi-site rollout delivery schedule
- Choose transport and insurance for high-value equipment
- Apply inter-state movement rules
- Measure delivery performance

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Multi-site delivery planning | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Transport and insurance | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Inter-state movement | 30 min | [PLACEHOLDER: company to supply] PDF |
| 4 | Delivery performance | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## Compliance

**Recommended learning path:** Every employee takes Compliance Basic on joining and every year. Managers take Intermediate. Legal, finance and senior staff take Advanced.

### Compliance Basic: Code of Conduct and Company Policies

The code of conduct, key company policies, and how to raise a concern.

- **Level:** Basic
- **Estimated duration:** 1 h 35 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain the main points of the code of conduct
- Recognise conflicts of interest, gifts and bribery risks
- Protect company and customer information
- Raise a concern through the right channel

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | [PLACEHOLDER] Company code of conduct | 30 min | [PLACEHOLDER: company to supply] PDF |
| 2 | Conflicts, gifts and anti-bribery | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 3 | Information security basics | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Whistle-blower and grievance process | 15 min | [PLACEHOLDER: company to supply] PDF |

### Compliance Intermediate: Data Protection and Statutory Requirements

Personal data protection and the statutory duties that affect daily work.

- **Level:** Intermediate
- **Estimated duration:** 2 h 15 min
- **Prerequisites:** Compliance Basic: Code of Conduct and Company Policies
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain the duties of the Digital Personal Data Protection Act, 2023 at a working level
- Handle personal data according to purpose and consent
- Respond to a suspected data breach
- List the statutory registers and filings relevant to your role

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Data protection principles | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Handling personal data | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Breach response | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Statutory obligations relevant to the company | 30 min | [PLACEHOLDER: company to supply] PDF |

### Compliance Advanced: Contract Compliance

Reading and complying with customer, OEM and vendor contracts.

- **Level:** Advanced
- **Estimated duration:** 2 h 5 min
- **Prerequisites:** Compliance Intermediate: Data Protection and Statutory Requirements
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Identify key clauses: liability, warranty, SLA, penalties
- Track contractual obligations through delivery
- Spot non-standard terms that need approval
- Keep evidence of contract compliance

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Key contract clauses | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Obligation tracking | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Non-standard terms and approvals | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Company contract approval matrix | 20 min | [PLACEHOLDER: company to supply] PDF |

## Govt Sales

**Recommended learning path:** Govt sales staff take all levels in order. Presales and accounts staff supporting tenders take Basic.

### Government Sales Basic: GeM Portal and Government Buyers

How government buyers purchase, and how the GeM portal works for sellers.

- **Level:** Basic
- **Estimated duration:** 2 h 5 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain how central and state buyers procure IT
- Navigate the GeM seller portal
- List products and respond to direct purchases and L1 buys
- Keep the seller profile and catalogue compliant

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | How government buys | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | GeM seller portal walkthrough | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 3 | Direct purchase, L1 and bids on GeM | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Catalogue compliance | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Government Sales Intermediate: Tenders, EMD and Bank Guarantees

The tender process from publication to award, with EMD and performance security.

- **Level:** Intermediate
- **Estimated duration:** 2 h 20 min
- **Prerequisites:** Government Sales Basic: GeM Portal and Government Buyers
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Read a tender document and its eligibility criteria
- Prepare EMD and understand exemptions
- Arrange a performance bank guarantee
- Track pre-bid queries and corrigenda

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Tender lifecycle | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Eligibility and documents | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | EMD and bank guarantees | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Pre-bid queries and corrigenda | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Government Sales Advanced: Procurement Rules and Bid Documentation

General Financial Rules, procurement manuals, and building a winning, compliant bid.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** Government Sales Intermediate: Tenders, EMD and Bank Guarantees
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Apply the relevant provisions of the General Financial Rules
- Use Make in India and MSE preferences where eligible
- Assemble a complete technical and financial bid
- Handle post-award documentation and payments

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | General Financial Rules and procurement manuals | 45 min | [PLACEHOLDER: company to supply] PDF |
| 2 | Preference policies | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Bid assembly | 60 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | Post-award and payments | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## System Integration Sales

**Recommended learning path:** Sales and presales staff take Basic early. Account managers continue to Intermediate and Advanced.

### SI Sales Basic: The System Integration Business Model

How an SI earns revenue across products, services and support, and the solution lifecycle.

- **Level:** Basic
- **Estimated duration:** 1 h 40 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain the SI business model and revenue streams
- Describe the solution lifecycle from design to support
- Identify where services add value to a product sale
- Know the company's practice areas [PLACEHOLDER]

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | The SI business model | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | The solution lifecycle | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Services and support | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | [PLACEHOLDER] Company practice areas | 20 min | [PLACEHOLDER: company to supply] PDF |

### SI Sales Intermediate: Customer Discovery

Discovering business problems and mapping them to multi-practice solutions.

- **Level:** Intermediate
- **Estimated duration:** 2 h 20 min
- **Prerequisites:** SI Sales Basic: The System Integration Business Model
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Run a discovery across business and IT stakeholders
- Map a business problem to practice areas
- Identify cross-sell opportunities
- Hand over a qualified opportunity to presales

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Multi-stakeholder discovery | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Problem-to-solution mapping | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Cross-sell | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Hand-over to presales | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### SI Sales Advanced: Solution-based Selling

Selling outcomes: business cases, total cost of ownership, and managed services.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** SI Sales Intermediate: Customer Discovery
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Build a business case with ROI and TCO
- Position managed services and multi-year contracts
- Manage partners in a joint solution
- Present a solution to an executive committee

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Business cases, ROI and TCO | 60 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Managed services | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Partner management | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Executive presentation | 45 min | [PLACEHOLDER: company to supply] LIVE_SESSION (instructor-led) |

## IT INFRA

**Recommended learning path:** Technical staff take Basic first; Intermediate after 6 months of project work; Advanced for architects.

### IT Infrastructure Basic: Building Blocks

Desktops, servers, networks, storage and data centres: what they are and how they fit together.

- **Level:** Basic
- **Estimated duration:** 1 h 50 min
- **Prerequisites:** none
- **In the portal:** yes, as "IT Infrastructure Fundamentals"

**Learning objectives**

- Name the components of a typical enterprise IT setup
- Explain how end-user, data-centre and network layers connect
- Read a simple infrastructure diagram
- Ask the right questions in an infrastructure discovery

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | End-user computing | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Data-centre components | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | How it connects | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Discovery questions | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### IT Infrastructure Intermediate: Data Centre and Facilities

Data-centre design: racks, cooling, power, cabling and monitoring.

- **Level:** Intermediate
- **Estimated duration:** 2 h 15 min
- **Prerequisites:** IT Infrastructure Basic: Building Blocks
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Plan rack layout and capacity
- Explain cooling and power density basics
- Specify monitoring and remote management
- Plan a server-room refresh

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Racks and layout | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Cooling and power density | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 3 | Monitoring and remote management | 30 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | Refresh planning | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### IT Infrastructure Advanced: Infrastructure Architecture

Designing resilient infrastructure for availability, scale and operations.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** IT Infrastructure Intermediate: Data Centre and Facilities
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Design for high availability and avoid single points of failure
- Size infrastructure for growth
- Plan operations and lifecycle management
- Document an architecture for handover

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | High availability design | 60 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Capacity planning | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 3 | Operations and lifecycle | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Architecture documentation | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## AUDIO VIDEO

**Recommended learning path:** AV engineers take all levels. Sales staff selling AV take Basic.

### AV Solutions Basic: Displays, Audio and Conferencing

The building blocks of meeting-room and auditorium AV.

- **Level:** Basic
- **Estimated duration:** 2 h
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Choose displays and projectors for a room
- Explain microphones, speakers and DSPs
- Describe video-conferencing room types
- Run an AV site survey

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Displays and projection | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Audio basics | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 3 | Conferencing rooms | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Site survey | 30 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |

### AV Solutions Intermediate: Integrated Rooms

Designing and integrating conferencing rooms with control and signal distribution.

- **Level:** Intermediate
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** AV Solutions Basic: Displays, Audio and Conferencing
- **In the portal:** yes, as "Audio Video and Video Conferencing Solutions"

**Learning objectives**

- Design a meeting room from requirements
- Plan signal distribution and switching
- Specify control systems
- Commission and test a room

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Room design | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Signal distribution | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Control systems | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 4 | Commissioning | 30 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |

### AV Solutions Advanced: Large Venues and AV over IP

Auditoriums, command centres, video walls and AV over IP networks.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** AV Solutions Intermediate: Integrated Rooms
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Design AV for large venues
- Plan video walls and command centres
- Design AV over IP with network requirements
- Plan managed AV services

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Large venues and acoustics | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Video walls and command centres | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | AV over IP | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Managed AV services | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## POWER SOLUTIONS

**Recommended learning path:** Power engineers take all levels. Infrastructure sales staff take Basic.

### Power Solutions Basic: UPS, Power Quality and Earthing

Why IT needs clean power, UPS types, and earthing basics.

- **Level:** Basic
- **Estimated duration:** 1 h 50 min
- **Prerequisites:** none
- **In the portal:** yes, as "Power Solutions: UPS and Power Protection"

**Learning objectives**

- Explain common power-quality problems
- Compare offline, line-interactive and online UPS
- Explain why earthing matters for IT equipment
- Collect the load details for sizing

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Power quality | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | UPS types | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Earthing basics | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Load survey | 20 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |

### Power Solutions Intermediate: Sizing UPS, Batteries and DG Sets

Sizing UPS capacity, battery backup and diesel generators.

- **Level:** Intermediate
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** Power Solutions Basic: UPS, Power Quality and Earthing
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Size a UPS from a load list with growth
- Calculate battery backup time
- Size a DG set to work with a UPS
- Plan power conditioning for sensitive loads

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | UPS sizing | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Battery sizing | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 3 | DG sets with UPS | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Power conditioning | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Power Solutions Advanced: Resilient Power Design

Redundant power architectures for data centres and critical sites.

- **Level:** Advanced
- **Estimated duration:** 2 h 15 min
- **Prerequisites:** Power Solutions Intermediate: Sizing UPS, Batteries and DG Sets
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Design N+1 and 2N power architectures
- Plan distribution, PDUs and monitoring
- Coordinate power with cooling
- Plan maintenance without downtime

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Redundant architectures | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Distribution and PDUs | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Power and cooling together | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 4 | Maintenance planning | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## NETWORKING

**Recommended learning path:** Network engineers take all levels in order. Sales and presales take Basic.

### Networking Basic: LAN, WAN and Structured Cabling

How networks are built: switching, routing, Wi-Fi and cabling.

- **Level:** Basic
- **Estimated duration:** 2 h 5 min
- **Prerequisites:** none
- **In the portal:** yes, as "Networking Fundamentals"

**Learning objectives**

- Explain the role of switches, routers and access points
- Describe IP addressing and subnets
- Explain structured cabling standards
- Gather requirements for a branch network

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Network building blocks | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | IP addressing | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Structured cabling | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Branch requirements | 20 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |

### Networking Intermediate: Switching, Routing and Wi-Fi Design

VLANs, routing protocols, wireless design and WAN connectivity.

- **Level:** Intermediate
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** Networking Basic: LAN, WAN and Structured Cabling
- **In the portal:** yes, as "Telecom and Connectivity Solutions"

**Learning objectives**

- Design VLANs and inter-VLAN routing
- Choose between static and dynamic routing
- Plan Wi-Fi coverage and capacity
- Compare WAN links: MPLS, broadband and leased lines

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | VLANs and switching design | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Routing | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Wi-Fi design | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 4 | WAN connectivity | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Networking Advanced: SD-WAN and Network Architecture

SD-WAN, campus architecture, network security integration and operations.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** Networking Intermediate: Switching, Routing and Wi-Fi Design
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Design an SD-WAN for multiple branches
- Design a resilient campus network
- Integrate network and security policy
- Plan monitoring and operations

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | SD-WAN design | 60 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Campus architecture | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Network and security | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Monitoring and operations | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## PRINT SOLUTIONS

**Recommended learning path:** Print specialists take all levels. Sales staff take Basic.

### Print Solutions Basic: Printers, MFPs and Consumables

Printer and MFP types, consumables and choosing the right device.

- **Level:** Basic
- **Estimated duration:** 1 h 40 min
- **Prerequisites:** none
- **In the portal:** yes, as "Print Solutions"

**Learning objectives**

- Compare laser, inkjet and MFP devices
- Explain duty cycle and cost per page
- Recommend a device for an office
- Plan consumable supply

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Device types | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Duty cycle and cost per page | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Choosing a device | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Consumables | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Print Solutions Intermediate: Print Fleet Assessment

Assessing an existing print fleet and proposing a better one.

- **Level:** Intermediate
- **Estimated duration:** 2 h 15 min
- **Prerequisites:** Print Solutions Basic: Printers, MFPs and Consumables
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Run a print fleet assessment
- Calculate current print cost
- Propose a right-sized fleet
- Plan secure printing and access control

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Fleet assessment | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Cost analysis | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Right-sizing | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Secure printing | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Print Solutions Advanced: Managed Print Services

Designing, pricing and running a managed print service.

- **Level:** Advanced
- **Estimated duration:** 2 h 20 min
- **Prerequisites:** Print Solutions Intermediate: Print Fleet Assessment
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Define MPS scope and SLAs
- Build an MPS commercial model [PLACEHOLDER: company pricing rules]
- Plan monitoring and automatic supplies
- Report service performance

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | MPS scope and SLAs | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Commercial models | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Monitoring and auto-supply | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 4 | Service reporting | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## CYBER SECURITY

**Recommended learning path:** Everyone takes Basic awareness. Security engineers continue to Intermediate and Advanced.

### Cyber Security Basic: Threats and Protection

The threat landscape and the main layers of protection.

- **Level:** Basic
- **Estimated duration:** 1 h 35 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Describe common threats: phishing, ransomware, insider risk
- Explain firewall, endpoint and email protection
- Apply good password and MFA practice
- Report a security incident

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Threat landscape | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Layers of protection | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Passwords and MFA | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Reporting incidents | 15 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Cyber Security Intermediate: Firewalls, Endpoint and SOC Basics

Configuring and selling firewalls and endpoint security, and how a SOC works.

- **Level:** Intermediate
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** Cyber Security Basic: Threats and Protection
- **In the portal:** yes, as "Cyber Security Fundamentals"

**Learning objectives**

- Design firewall policies for a branch
- Compare EDR and traditional antivirus
- Explain SOC roles and the incident lifecycle
- Read basic security logs

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Firewall policy design | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Endpoint and EDR | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | SOC basics | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 4 | Log reading | 30 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |

### Cyber Security Advanced: Compliance Frameworks and Security Architecture

ISO 27001, NIST CSF and designing security architecture to meet them.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** Cyber Security Intermediate: Firewalls, Endpoint and SOC Basics
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Map controls to ISO 27001 and NIST CSF
- Run a gap assessment
- Design a defence-in-depth architecture
- Plan a security roadmap for a customer

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Frameworks | 45 min | [PLACEHOLDER: company to supply] PDF |
| 2 | Gap assessment | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 3 | Security architecture | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Security roadmaps | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## CLOUD SOLUTIONS

**Recommended learning path:** Cloud engineers take all levels. Sales staff take Basic.

### Cloud Basic: IaaS, PaaS and SaaS

Cloud service and deployment models, and where cloud fits.

- **Level:** Basic
- **Estimated duration:** 1 h 40 min
- **Prerequisites:** none
- **In the portal:** yes, as "Cloud Solutions Fundamentals"

**Learning objectives**

- Compare IaaS, PaaS and SaaS
- Compare public, private and hybrid cloud
- Explain the shared responsibility model
- Identify good first workloads for cloud

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Service models | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Deployment models | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Shared responsibility | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | First workloads | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Cloud Intermediate: Migration and Cost Management

Planning migrations and keeping cloud costs under control.

- **Level:** Intermediate
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** Cloud Basic: IaaS, PaaS and SaaS
- **In the portal:** yes, as "Cloud Security Fundamentals"

**Learning objectives**

- Assess workloads for migration
- Choose a migration strategy (rehost, refactor and others)
- Estimate and monitor cloud cost
- Secure a cloud tenancy

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Workload assessment | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Migration strategies | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Cost management | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Cloud security basics | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Cloud Advanced: Hybrid Architecture and Operations

Designing hybrid cloud, governance and managed cloud services.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** Cloud Intermediate: Migration and Cost Management
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Design a hybrid architecture with connectivity
- Plan governance, tagging and policy
- Design backup and DR in the cloud
- Define a managed cloud service

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Hybrid design | 60 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Governance | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Cloud backup and DR | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | Managed cloud services | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

## HPC/AI/ML

**Recommended learning path:** Technical staff with Server and Storage Intermediate take this path.

### HPC, AI and ML Basic: Concepts and Use Cases

What AI, ML and HPC are, and where customers use them.

- **Level:** Basic
- **Estimated duration:** 1 h 50 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Explain AI, ML and deep learning in plain terms
- Describe HPC and where it is used
- Identify common enterprise AI use cases
- Ask discovery questions for an AI project

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | AI and ML concepts | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | HPC concepts | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Use cases | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Discovery | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### HPC, AI and ML Intermediate: Infrastructure for AI Workloads

GPU servers, storage and networking for training and inference.

- **Level:** Intermediate
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** HPC, AI and ML Basic: Concepts and Use Cases
- **In the portal:** yes, as "HPC, AI and ML Infrastructure Essentials"

**Learning objectives**

- Explain why GPUs suit AI workloads
- Compare training and inference infrastructure
- Specify storage and networking for AI
- Plan power and cooling for GPU servers

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | GPUs and accelerators | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Training and inference | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Storage and networking for AI | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Power and cooling | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### HPC, AI and ML Advanced: Solution Sizing and Design

Sizing GPU clusters and designing complete AI and HPC solutions.

- **Level:** Advanced
- **Estimated duration:** 2 h 45 min
- **Prerequisites:** HPC, AI and ML Intermediate: Infrastructure for AI Workloads
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Size a GPU cluster from a workload description
- Design the cluster network and storage
- Plan the software stack and scheduling
- Present a sizing with stated assumptions

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Cluster sizing | 60 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 2 | Network and storage design | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | Software stack and scheduling | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Presenting a sizing | 30 min | [PLACEHOLDER: company to supply] LIVE_SESSION (instructor-led) |

## Server and storage

**Recommended learning path:** Technical staff take all levels. Sales staff take Basic.

### Server and Storage Basic: Servers, RAID and Storage Types

Server form factors, RAID, and DAS, NAS and SAN.

- **Level:** Basic
- **Estimated duration:** 1 h 50 min
- **Prerequisites:** none
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Compare tower, rack and blade servers
- Explain RAID levels and their trade-offs
- Compare DAS, NAS and SAN
- Collect requirements for a server refresh

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Server form factors | 30 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | RAID | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | DAS, NAS and SAN | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | Refresh requirements | 20 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |

### Server and Storage Intermediate: Virtualisation and Backup

Virtualisation platforms, backup design and recovery objectives.

- **Level:** Intermediate
- **Estimated duration:** 2 h 35 min
- **Prerequisites:** Server and Storage Basic: Servers, RAID and Storage Types
- **In the portal:** yes, as "Server and Storage Fundamentals"

**Learning objectives**

- Explain hypervisors and virtual machines
- Size hosts for a virtual environment
- Design backup with the 3-2-1 rule
- Set RPO and RTO with a customer

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Virtualisation | 45 min | [PLACEHOLDER: company to supply] VIDEO (MP4, 720p, with WebVTT captions) |
| 2 | Host sizing | 45 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 3 | Backup design | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 4 | RPO and RTO | 20 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |

### Server and Storage Advanced: Architecture and Disaster Recovery

Designing storage architecture and disaster recovery for critical workloads.

- **Level:** Advanced
- **Estimated duration:** 2 h 30 min
- **Prerequisites:** Server and Storage Intermediate: Virtualisation and Backup
- **In the portal:** no, create with npm run db:seed-catalogue

**Learning objectives**

- Design tiered storage
- Design replication and DR sites
- Plan and run a DR test
- Plan hyper-converged and software-defined options

| # | Module | Time | Content to supply |
| --- | --- | --- | --- |
| 1 | Storage architecture | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 2 | Replication and DR | 45 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
| 3 | DR testing | 30 min | [PLACEHOLDER: company to supply] LAB (step-by-step checklist) |
| 4 | HCI and software-defined storage | 30 min | [PLACEHOLDER: company to supply] TEXT (written lesson) |
