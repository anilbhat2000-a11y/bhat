"""Extra Data and Analytics courses outside the catalogue."""
from . import q, TF, MS_LEARN

EXTRA = {}

POWER_BI = ("Microsoft Learn: Power BI documentation (data models, refresh, workspaces)", "https://learn.microsoft.com/en-us/power-bi/")
TABLEAU = ("Tableau: visual best practices and learning resources", "https://www.tableau.com/learn")
GOV_UK_DATA = ("GOV.UK Analysis Function: guidance on data visualisation and presenting statistics", "https://analysisfunction.civilservice.gov.uk/")
DAMA = ("DAMA International: data management body of knowledge (data quality dimensions)", "https://www.dama.org/")
MEITY = ("MeitY: Digital Personal Data Protection Act, 2023 and Rules", "https://www.meity.gov.in/")
NIST_ESH = ("NIST/SEMATECH e-Handbook of Statistical Methods", "https://www.itl.nist.gov/div898/handbook/")

EXTRA["Data-Driven Decision Making"] = {
    "lessons": [
        """
Data-driven decision making means using evidence, rather than instinct alone, to make business choices. The most common mistake is to start by collecting data and hoping an answer appears. Good analysis starts with the decision you need to make.

## Framing the question

Before looking at any data, write down:

- **The decision:** what choice must be made? For example, "Should we open a new service centre in Pune?"
- **The options:** what are the realistic alternatives?
- **The information needed:** what would you need to know to choose well? Demand, cost, travel times, competitor presence?
- **The deadline:** when must the decision be made?
- **The decision maker:** who decides, and what do they care about?

## Good and weak questions

- **Weak:** "What does our sales data show?"
- **Strong:** "Which three customer segments grew fastest last year, and should we shift sales effort towards them next quarter?"

A strong question is specific, linked to an action and answerable with available data.

## Key terms

- **Decision:** a choice between options that leads to action.
- **Hypothesis:** a testable statement, such as "Branches with two internet links have fewer billing outages."
- **Evidence:** data and facts that support or challenge a hypothesis.

## Real-world example

A service manager asks the analytics team for "all the ticket data". After a short conversation, the real decision becomes clear: whether to hire two more engineers for the southern region or extend support hours. The team analyses ticket volumes by region and hour, and response times against SLAs. The data shows most breaches happen in the evening, so extending hours with a shift change solves the problem without new hires.

## Common mistakes

- Starting with data instead of the decision.
- Questions too broad to answer.
- Ignoring who will make the decision and what they need.

## Key takeaways

- Start with the decision, options, information needed and deadline.
- Write specific questions linked to actions.
- Use hypotheses to focus the analysis.
""",
        """
Metrics turn business goals into numbers you can track. Key performance indicators (KPIs) are the few metrics that matter most for a goal. Choosing and defining them well prevents confusion and wrong decisions.

## Metric versus KPI

- **Metric:** any measurement, such as the number of tickets closed.
- **KPI:** a metric directly linked to a key objective, such as "percentage of priority-1 tickets resolved within SLA".

## Defining a metric properly

Every metric needs a clear written definition:

- **Name and purpose:** what it measures and why.
- **Formula:** exactly how it is calculated, including what is included and excluded.
- **Data source:** which system provides the data.
- **Frequency:** how often it is measured.
- **Owner:** who is responsible for the metric.
- **Target:** what good looks like.

Without a shared definition, two teams can report different numbers for the "same" metric.

## Leading and lagging indicators

- **Lagging indicators** measure outcomes after they happen, such as revenue or customer churn.
- **Leading indicators** predict future outcomes, such as pipeline value or the number of discovery meetings held.
- Use both: leading indicators give time to act; lagging indicators confirm results.

## Key terms

- **KPI:** key performance indicator.
- **Metric definition:** the exact formula, source and rules for a metric.
- **Leading / lagging indicator:** predictive / outcome measure.
- **Target:** the level of performance aimed for.

## Real-world example

Sales and finance report different "monthly revenue" figures. Sales counts orders booked; finance counts invoices raised. Both are valid, but the confusion wastes meetings. The company defines two metrics, "order bookings" and "invoiced revenue", with written formulas and sources. Reports become consistent.

## Common mistakes

- Too many KPIs, so nothing is in focus.
- Metrics without written definitions.
- Using only lagging indicators.

## Key takeaways

- KPIs are the few metrics linked to key objectives.
- Define every metric with formula, source, frequency, owner and target.
- Use both leading and lagging indicators.
""",
        """
Decisions are only as good as the data behind them. Poor data quality leads to wrong conclusions, wasted effort and lost trust. Checking data quality is a routine step in every analysis.

## Dimensions of data quality

Data management professionals, such as those following the DAMA body of knowledge, commonly describe these dimensions:

- **Accuracy:** does the data reflect reality?
- **Completeness:** are required values present?
- **Consistency:** does the data agree across systems?
- **Timeliness:** is the data up to date for the decision?
- **Validity:** does the data follow the expected format and rules?
- **Uniqueness:** are there duplicate records?

## Practical checks

- Count records and compare with expected totals.
- Look for blanks, impossible values (such as negative quantities) and outliers.
- Check for duplicates, such as the same customer entered twice.
- Compare totals with another trusted source, such as finance reports.
- Check date ranges and time zones.
- Ask the people who enter the data how it is captured.

## Handling problems

- Fix data at the source where possible, not just in the report.
- Document any cleaning steps and assumptions.
- Tell decision makers about limitations.
- Handle personal data carefully and lawfully under the DPDP Act, using only what the analysis needs.

## Key terms

- **Data quality:** how fit data is for its intended use.
- **Outlier:** a value far from the others.
- **Duplicate:** a record that appears more than once.
- **Data owner:** the person responsible for a dataset's quality.

## Real-world example

An analysis suggests that one region has doubled its sales. A quality check finds that a CRM import created duplicate opportunities for that region. After removing duplicates, growth is modest. Catching the error prevents the company from moving resources based on a false trend.

## Common mistakes

- Trusting data without checking it.
- Cleaning data silently without documenting changes.
- Fixing reports instead of fixing the source.

## Key takeaways

- Check accuracy, completeness, consistency, timeliness, validity and uniqueness.
- Compare with trusted sources and look for blanks, outliers and duplicates.
- Fix at the source, document cleaning and share limitations.
""",
        """
A common trap in analysis is assuming that because two things move together, one causes the other. **Correlation** means two measures change together. **Causation** means one actually causes the other. Confusing them leads to costly mistakes.

## Why correlation is not causation

- **Confounding factors:** a third factor may cause both. For example, larger branches may have both more staff and more sales; adding staff to a small branch may not raise sales.
- **Reverse causation:** the effect may cause the "cause". Customers who are happier may use support less, rather than less support making them happy.
- **Coincidence:** with enough data, some measures move together by chance.

## Testing for cause

- **Controlled experiments (A/B tests):** randomly split customers or sites into groups, change one thing for one group and compare results.
- **Pilots with comparison groups:** try a change in some branches and compare with similar branches that did not change.
- **Before-and-after with care:** compare results before and after a change, while checking for other factors such as seasons.
- **Statistical methods:** regression and other techniques can account for some confounding factors, but need care and expertise.

## Key terms

- **Correlation:** measures moving together.
- **Causation:** one factor causing another.
- **Confounding factor:** a third factor affecting both measures.
- **A/B test:** a controlled experiment comparing two versions.

## Real-world example

Analysis shows that customers who attended a product webinar bought more the next quarter. Marketing wants to make webinars mandatory for all sales campaigns. A closer look shows that customers who attended were already larger and more engaged. The team runs a test: half of a matched customer list is invited and half is not. The invited group buys slightly more, but far less than the original analysis suggested. Investment is adjusted accordingly.

## Common mistakes

- Treating correlation as proof of cause.
- Ignoring confounding factors.
- Making large changes without a pilot or test.

## Key takeaways

- Correlation does not prove causation; check for confounders, reverse causation and chance.
- Use A/B tests, pilots with comparison groups and careful before-and-after analysis.
- Test before making large investments.
""",
    ],
    "questions": [
        q("SINGLE", "What should good analysis start with?", ["Collecting all available data", "The decision that needs to be made", "Choosing a chart", "Buying software"], ["The decision that needs to be made"],
          explanation="Framing the decision focuses the analysis."),
        q("SINGLE", "Which is a leading indicator for sales?", ["Last year's revenue", "Number of discovery meetings held", "Annual profit", "Customer churn last year"], ["Number of discovery meetings held"],
          explanation="Leading indicators predict future outcomes."),
        q("MULTIPLE", "Which are dimensions of data quality?", ["Accuracy", "Completeness", "Timeliness", "Colourfulness"], ["Accuracy", "Completeness", "Timeliness"],
          explanation="Other dimensions include consistency, validity and uniqueness."),
        q("TRUE_FALSE", "If two measures move together, one must cause the other.", TF, ["False"],
          explanation="Correlation does not prove causation."),
        q("SINGLE", "What is the best way to test whether a change causes an improvement?", ["Ask one manager", "Run a controlled test or pilot with a comparison group", "Look at one month's data", "Assume it works"], ["Run a controlled test or pilot with a comparison group"],
          explanation="Comparison groups help separate the effect from other factors."),
        q("SINGLE", "Sales and finance report different revenue figures. What is the best fix?", ["Use whichever is higher", "Write clear definitions for each metric", "Stop reporting revenue", "Average them"], ["Write clear definitions for each metric"],
          explanation="Written definitions remove confusion."),
        q("MATCHING", "Match each term to its meaning.", ["KPI=Key metric linked to an objective", "Confounding factor=Third factor affecting both measures", "Outlier=Value far from the others", "A/B test=Controlled comparison of two versions"],
          explanation="These are core analysis terms."),
    ],
    "sources": [DAMA, NIST_ESH, MEITY, MS_LEARN],
}

EXTRA["Data Visualization Fundamentals"] = {
    "lessons": [
        """
A chart should answer a question quickly. Choosing the right chart type depends on what you want to show: comparison, trend, composition, distribution or relationship.

## Matching chart to purpose

- **Compare categories:** bar charts (horizontal bars work well for long labels).
- **Show a trend over time:** line charts.
- **Show parts of a whole:** stacked bar charts, or a pie chart only for a few parts (two to four) where exact comparison is not needed.
- **Show distribution:** histograms or box plots.
- **Show relationship between two measures:** scatter plots.
- **Show a single important number:** a large number with context, such as a target or change from last period.
- **Show exact values:** a well-formatted table.

## Choosing well

- Start with the question: "Which region grew fastest?" suggests a sorted bar chart of growth.
- Prefer simple, familiar charts; people read bar and line charts accurately.
- Sort bars meaningfully, usually from largest to smallest.
- Avoid 3D effects, which distort sizes.

## Key terms

- **Bar chart:** compares values across categories.
- **Line chart:** shows change over time.
- **Histogram:** shows how values are distributed.
- **Scatter plot:** shows the relationship between two measures.

## Real-world example

A monthly report shows sales for 15 product lines in a pie chart. Readers cannot tell which slices are bigger. Replacing it with a sorted horizontal bar chart makes the top and bottom performers obvious at a glance, and the meeting discussion moves straight to actions.

## Common mistakes

- Pie charts with many slices.
- 3D charts that distort values.
- Unsorted bars that hide the message.

## Key takeaways

- Choose charts by purpose: comparison, trend, composition, distribution or relationship.
- Prefer simple bar and line charts, sorted meaningfully.
- Use tables when exact values matter.
""",
        """
Charts can mislead, sometimes by accident. Honest charts show the data accurately and let readers draw correct conclusions. Trust in your reports depends on it.

## Common ways charts mislead

- **Truncated axes on bar charts:** starting the y-axis above zero exaggerates differences. Bar charts should start at zero because bar length represents value.
- **Inconsistent scales:** comparing charts with different scales side by side.
- **Cherry-picked time ranges:** choosing dates that support a story while hiding the bigger picture.
- **Area and 3D distortion:** sizes that do not match values.
- **Missing context:** no comparison with targets, previous periods or totals.
- **Dual axes:** two different scales on one chart can suggest relationships that do not exist.

## Principles for honest charts

- Start bar chart axes at zero; line charts may use a narrower range if clearly labelled.
- Label axes, units and time periods clearly.
- Show the data source and date.
- Include context, such as targets or last year's figures.
- Use consistent scales when comparing charts.
- Mention data limitations, such as incomplete months.

## Key terms

- **Truncated axis:** an axis that does not start at zero.
- **Cherry-picking:** selecting data that supports a conclusion while ignoring the rest.
- **Context:** comparisons that give meaning to numbers.

## Real-world example

A dashboard shows customer satisfaction rising sharply, with bars growing to double the height. In fact, the score moved from 4.1 to 4.3 out of 5; the y-axis started at 4.0. When the axis is corrected to start at zero and the target is added, managers see a small improvement still below target, and continue the improvement plan instead of celebrating.

## Common mistakes

- Bar charts with axes not starting at zero.
- No source or date.
- Missing comparison with targets.

## Key takeaways

- Avoid truncated bar axes, inconsistent scales, cherry-picking and 3D distortion.
- Label clearly, show sources and add context.
- Honest charts build trust.
""",
        """
Colour, labels and emphasis guide the reader's attention. Used well, they make the message obvious. Used badly, they create clutter and confusion.

## Using colour well

- **Use colour with purpose:** highlight what matters and keep the rest neutral, such as grey.
- **Limit the palette:** too many colours make charts hard to read.
- **Be consistent:** the same category should have the same colour across charts.
- **Consider colour vision deficiency:** avoid relying only on red versus green; use labels, patterns or colour-blind-friendly palettes.
- **Use sequential colours** for ordered values (light to dark) and **diverging colours** for values above and below a midpoint.

## Labels and text

- Write a **headline title** that states the message: "Southern region missed SLA targets in three of four months", not "SLA by region".
- Label data directly on the chart where possible, instead of using a separate legend.
- Remove unnecessary gridlines, borders and decimal places.
- Use clear units and readable font sizes.

## Emphasis

- Highlight the key bar, line or number with colour or annotation.
- Add short annotations to explain spikes or changes: "New SD-WAN rollout completed".

## Key terms

- **Palette:** the set of colours used.
- **Headline title:** a title that states the main message.
- **Direct labelling:** placing labels next to data instead of in a legend.
- **Annotation:** a note on the chart explaining a point.

## Real-world example

A chart of support tickets for 12 product lines uses 12 bright colours and a legend. Readers struggle to find anything. The redesign uses grey for all lines except the two that are rising fastest, which are highlighted in the company colour and directly labelled. The title states: "Firewall and Wi-Fi tickets rose 30% this quarter." The message is understood in seconds.

## Common mistakes

- Using many bright colours without purpose.
- Generic titles that do not state the message.
- Relying on red and green alone.

## Key takeaways

- Use colour to highlight, keep the rest neutral and stay consistent.
- Write headline titles and label data directly.
- Annotate important changes and design for colour vision deficiency.
""",
        """
A dashboard brings key metrics together so people can monitor performance and spot issues at a glance. A good dashboard is designed for a specific audience and purpose.

## Design steps

1. **Know the audience and purpose:** executives need a high-level view; operations teams need detail and real-time status.
2. **Choose a few key metrics:** focus on the KPIs that drive decisions.
3. **Arrange by importance:** people read from top left; put the most important information there.
4. **Group related information:** for example, sales metrics together, service metrics together.
5. **Provide context:** targets, trends and comparisons with previous periods.
6. **Allow drill-down:** let users click from summary to detail when needed.
7. **Keep it clean:** consistent colours, enough white space and no decorative clutter.

## Keeping dashboards useful

- Show when the data was last refreshed.
- Make sure definitions of each metric are available.
- Review usage and remove metrics nobody uses.
- Control access, especially where dashboards include personal or sensitive data.

## Key terms

- **Dashboard:** a visual display of key metrics.
- **Drill-down:** moving from summary to detailed data.
- **Refresh:** updating the dashboard with new data.
- **Audience:** the people who will use the dashboard.

## Real-world example

An operations dashboard has 40 charts on one page, and managers stop using it. The redesign shows five KPIs at the top, each with target and trend, followed by one section per region with drill-down to individual sites. A "last refreshed" time is shown. Managers start opening it in daily stand-up meetings.

## Common mistakes

- Trying to show everything on one page.
- No targets or trends, so numbers lack meaning.
- No refresh time, so users do not trust the data.

## Key takeaways

- Design for a specific audience and purpose with a few key metrics.
- Arrange by importance, group related information and provide context.
- Show refresh times, definitions and control access.
""",
    ],
    "questions": [
        q("SINGLE", "Which chart is best for showing a trend over time?", ["Pie chart", "Line chart", "Scatter plot", "Table"], ["Line chart"],
          explanation="Line charts show change over time clearly."),
        q("TRUE_FALSE", "Bar chart value axes should normally start at zero.", TF, ["True"],
          explanation="Bar length represents value; truncated axes exaggerate differences."),
        q("SINGLE", "Which title is best?", ["SLA by region", "Chart 3", "Southern region missed SLA targets in three of four months", "Data"], ["Southern region missed SLA targets in three of four months"],
          explanation="A headline title states the message."),
        q("MULTIPLE", "Which practices make a dashboard useful?", ["A few key metrics", "Targets and trends", "Last refreshed time", "As many charts as possible"], ["A few key metrics", "Targets and trends", "Last refreshed time"],
          explanation="Too many charts reduce usability."),
        q("SINGLE", "Why avoid relying only on red versus green?", ["They are expensive", "Some people have colour vision deficiency", "They print badly", "They are out of fashion"], ["Some people have colour vision deficiency"],
          explanation="Use labels, patterns or colour-blind-friendly palettes."),
        q("TRUE_FALSE", "3D effects make charts more accurate.", TF, ["False"],
          explanation="3D distorts sizes and makes comparison harder."),
        q("MATCHING", "Match each question to a chart type.", ["Compare regions=Bar chart", "Trend over months=Line chart", "Relationship between two measures=Scatter plot", "Distribution of values=Histogram"],
          explanation="Choose the chart by purpose."),
    ],
    "sources": [GOV_UK_DATA, TABLEAU, POWER_BI],
}

EXTRA["Analytics Platforms Essentials"] = {
    "lessons": [
        """
Business intelligence (BI) and analytics platforms, such as Microsoft Power BI, Tableau, Qlik and Looker, connect to data, prepare it, model it and present it in reports and dashboards that people across the organisation can use.

## What analytics platforms do

- **Connect** to data sources: databases, ERP and CRM systems, spreadsheets and cloud services.
- **Prepare** data: clean, combine and reshape it.
- **Model** data: define relationships between tables and calculations such as KPIs.
- **Visualise:** build charts, reports and dashboards.
- **Share and collaborate:** publish to users with the right access.
- **Govern:** control who sees what and keep definitions consistent.

## Self-service and central BI

- **Self-service BI** lets business users build their own reports, speeding up insight.
- **Central or managed BI** provides trusted, certified datasets and reports maintained by a data team.
- Most organisations combine both: certified central datasets that business users can build on.

## Key terms

- **Business intelligence (BI):** tools and practices for turning data into information for decisions.
- **Data source:** a system that provides data.
- **Report / dashboard:** a collection of visuals for analysis or monitoring.
- **Certified dataset:** a dataset approved as trusted for wide use.

## Real-world example

A company's managers each build their own spreadsheets from ERP exports, leading to different numbers in every meeting. The company introduces a BI platform with a certified sales and service dataset maintained by the finance team. Managers build their own views on top of it. Meetings now start from the same numbers.

## Common mistakes

- Every team building separate datasets with different definitions.
- Treating the BI tool as only a charting tool.
- No ownership of data and reports.

## Key takeaways

- Analytics platforms connect, prepare, model, visualise, share and govern data.
- Combine self-service with certified central datasets.
- Assign clear ownership of data and reports.
""",
        """
Reports are only as current as their data. Understanding how platforms connect to sources and refresh data helps you choose the right approach for each need.

## Connection approaches

- **Import (scheduled refresh):** data is copied into the platform and refreshed on a schedule, such as daily or hourly. Fast for users; data is as fresh as the last refresh.
- **Direct query / live connection:** the platform queries the source each time a user views the report. Data is current, but performance depends on the source system.
- **Hybrid approaches:** some data imported, some queried live.
- **Streaming:** for real-time data such as device telemetry.

## Gateways and on-premises data

When data is on-premises, a **data gateway** securely connects the cloud BI service to local sources. It must be installed, kept updated and monitored.

## Planning refresh

- Match refresh frequency to the decision: daily sales review needs daily data; network monitoring may need near real time.
- Schedule refreshes outside peak hours for source systems.
- Monitor refresh failures and alert data owners.
- Show the last refresh time on reports.

## Key terms

- **Scheduled refresh:** updating imported data at set times.
- **Direct query:** querying the source at view time.
- **Data gateway:** software connecting cloud BI services to on-premises data.
- **Latency:** delay between data changing and appearing in reports.

## Real-world example

A sales dashboard uses direct query against the live ERP database. Every morning, when many managers open it, the ERP slows down for order entry staff. The data team switches the dashboard to an import model refreshed every two hours from a reporting replica. Dashboards load faster and the ERP is no longer affected.

## Common mistakes

- Direct query on busy operational systems.
- Refresh failures nobody notices.
- Refreshing more often than decisions require.

## Key takeaways

- Choose import, direct query, hybrid or streaming based on freshness and performance needs.
- Use and monitor gateways for on-premises data.
- Match refresh frequency to decisions and show refresh times.
""",
        """
A data model defines how tables relate and how key measures are calculated. A good model makes reports fast, accurate and consistent. Shared definitions mean everyone uses the same calculation for the same metric.

## Building a good data model

- **Star schema:** a common design with **fact tables** (events or transactions, such as sales lines or tickets) surrounded by **dimension tables** (descriptive data, such as customers, products, dates and regions). Star schemas are easy to understand and perform well in most BI tools.
- **Relationships:** connect facts to dimensions using keys.
- **Date table:** a dedicated calendar table supports time comparisons such as month-on-month or financial year to date, including India's April-to-March financial year.
- **Measures:** central calculations, such as revenue, margin percentage or SLA compliance, defined once in the model.

## Shared definitions

- Define each KPI once in a central model, not separately in each report.
- Document definitions in a data dictionary, with formula, source and owner.
- Certify trusted datasets so users know which to use.

## Key terms

- **Data model:** the structure of tables, relationships and measures.
- **Fact table:** records events or transactions.
- **Dimension table:** describes entities such as customers or products.
- **Data dictionary:** documentation of fields and metric definitions.

## Real-world example

Three reports show three different margin percentages for the same quarter, because each calculates margin differently. The data team defines one margin measure in the central model, documents it in the data dictionary and certifies the dataset. All reports switch to the shared measure, and the debate about "whose number is right" ends.

## Common mistakes

- One large flat table with everything in it.
- Calculating the same KPI differently in each report.
- No date table, making time comparisons difficult.

## Key takeaways

- Use star schemas with fact and dimension tables and a date table.
- Define measures once in the model and document them.
- Certify trusted datasets for shared use.
""",
        """
Publishing reports widely brings value, but also risk: the wrong people may see sensitive data, or poorly built reports may spread confusion. Governance keeps analytics trusted, secure and useful.

## Access control

- **Workspaces or projects:** organise content by team or purpose.
- **Roles:** viewers, contributors and administrators have different permissions.
- **Row-level security (RLS):** users see only the rows they are allowed to, such as their own region's data.
- **Sensitivity labels and classification:** mark confidential reports and control sharing and export.
- **Personal data:** follow the DPDP Act and company policy; show personal details only where needed.

## Governance practices

- **Ownership:** each dataset and report has a named owner.
- **Certification:** trusted datasets and reports are marked as certified.
- **Lifecycle:** development, testing and production stages for important reports.
- **Usage monitoring:** see which reports are used and retire unused ones.
- **Training and standards:** templates, naming conventions and design guidelines.

## Key terms

- **Row-level security:** restricting data rows by user.
- **Workspace:** a container for reports and datasets.
- **Sensitivity label:** a classification controlling handling of data.
- **Certification:** marking content as trusted.

## Real-world example

A sales performance report, including individual salespeople's incentives, is shared with "everyone in the company" by mistake. After the incident, the company applies row-level security so managers see only their teams, adds a "confidential" sensitivity label that blocks external sharing, and reviews workspace access monthly.

## Common mistakes

- Sharing reports with everyone by default.
- No row-level security for sensitive data.
- Hundreds of unused, unowned reports.

## Key takeaways

- Control access with workspaces, roles, row-level security and sensitivity labels.
- Assign owners, certify trusted content and manage report lifecycles.
- Monitor usage and protect personal data.
""",
    ],
    "questions": [
        q("SINGLE", "In a star schema, what does a fact table hold?", ["Descriptions of customers", "Events or transactions such as sales lines", "User passwords", "Report colours"], ["Events or transactions such as sales lines"],
          explanation="Dimension tables hold descriptive data."),
        q("SINGLE", "What does row-level security do?", ["Encrypts the whole database", "Restricts which data rows each user can see", "Speeds up refresh", "Adds colours to rows"], ["Restricts which data rows each user can see"],
          explanation="Users see only the data they are allowed to."),
        q("TRUE_FALSE", "Direct query on a busy operational database can slow that system down.", TF, ["True"],
          explanation="Each report view queries the source."),
        q("MULTIPLE", "Which are good governance practices for analytics?", ["Named owners for datasets", "Certified datasets", "Usage monitoring", "Sharing all reports with everyone"], ["Named owners for datasets", "Certified datasets", "Usage monitoring"],
          explanation="Broad sharing creates risk."),
        q("SINGLE", "What connects a cloud BI service to on-premises data?", ["A data gateway", "A printer", "A UPS", "A firewall rule only"], ["A data gateway"],
          explanation="Gateways securely link cloud services to local sources."),
        q("TRUE_FALSE", "Each report should calculate key KPIs in its own way.", TF, ["False"],
          explanation="Define measures once centrally for consistency."),
        q("MATCHING", "Match each term to its meaning.", ["Scheduled refresh=Updating imported data at set times", "Dimension table=Describes entities like customers", "Data dictionary=Documents fields and definitions", "Certified dataset=Approved as trusted"],
          explanation="These terms appear in every BI platform."),
    ],
    "sources": [POWER_BI, TABLEAU, DAMA, MEITY],
}

EXTRA["Sharing Data Insights: Storytelling for Decisions"] = {
    "lessons": [
        """
Busy decision makers want the answer first. Leading with the insight, the main finding and what it means, respects their time and makes your analysis more likely to drive action.

## What an insight is

An insight is more than a number. It combines:

- **What happened:** the finding, such as "Billing outages fell 40% at branches with dual links."
- **Why it matters:** the business impact, such as "This protects daily collections."
- **What to do:** the recommended action, such as "Extend dual links to the remaining 60 branches."

## Leading with the insight

- Start presentations, emails and reports with a one- or two-sentence summary of the insight and recommendation.
- Follow with supporting evidence.
- Keep details and methods for later sections or an appendix.

This "answer first" approach, often called the pyramid principle in consulting, helps readers grasp the message even if they read only the beginning.

## Key terms

- **Insight:** a finding plus its meaning and implications.
- **Executive summary:** a short opening that states the insight and recommendation.
- **Answer first:** presenting the conclusion before the supporting detail.

## Real-world example

An analyst sends a ten-page report on service performance, with the key finding on page eight. Nobody acts. The next month, the email opens with: "Evening tickets breach SLAs three times more often than daytime tickets; extending the support shift by two hours would fix most breaches at low cost." The operations head approves the change the same day.

## Common mistakes

- Starting with methods and data sources.
- Presenting numbers without meaning or action.
- Burying the key finding.

## Key takeaways

- An insight is what happened, why it matters and what to do.
- Lead with the insight and recommendation.
- Put methods and detail later.
""",
        """
A clear story structure helps your audience follow the analysis and reach a decision. Stories connect data to the audience's goals and concerns.

## A simple structure

1. **Context:** the situation and why it matters to the audience.
2. **Complication:** the problem, change or question that needs attention.
3. **Resolution:** your insight and recommended action, supported by evidence.

This situation-complication-resolution structure is widely used for business communication.

## Building the story

- **Know your audience:** what they care about, what they already know and what decision they must make.
- **Choose a few key points:** usually three or fewer supporting points.
- **Use one chart per point,** with a headline title stating the message.
- **Connect points logically:** each slide or section should lead naturally to the next.
- **End with the decision or next step.**

## Key terms

- **Situation-complication-resolution:** a structure for business stories.
- **Supporting point:** evidence that backs the main message.
- **Storyline:** the sequence of points from context to recommendation.

## Real-world example

An analyst presents customer churn data as a series of 20 charts. The leadership team gets lost. Restructured, the story becomes: context, renewals are a growing share of revenue; complication, churn rose among mid-sized customers after a support change; resolution, restoring a named account manager for those customers is projected to cut churn, with a pilot proposed. Three charts support it. Leadership approves the pilot.

## Common mistakes

- Showing every chart from the analysis.
- No clear link between points.
- Ending without a decision request.

## Key takeaways

- Use context, complication and resolution.
- Tailor the story to the audience and limit it to a few key points.
- End with a clear decision or next step.
""",
        """
All data has limits. Showing uncertainty honestly builds trust and helps decision makers judge how much weight to give your findings.

## Sources of uncertainty

- **Sample size:** small samples can give misleading results.
- **Data quality:** missing, inaccurate or outdated data.
- **Assumptions:** forecasts depend on assumptions about the future.
- **Measurement:** how a metric is defined and captured.
- **External factors:** seasonality, market changes or one-off events.

## Communicating uncertainty

- State key assumptions clearly.
- Use ranges rather than single numbers where appropriate: "We expect savings of ₹20–30 lakh."
- Show confidence levels in plain language: "high confidence", "moderate confidence".
- Explain data limitations briefly, such as "Data excludes the two newest branches."
- Present scenarios: best case, expected case and worst case.
- Distinguish facts from interpretation and recommendation.

## Why it matters

Decision makers can plan for risk only if they know it exists. Overstating certainty damages trust when results differ from predictions.

## Key terms

- **Uncertainty:** the degree to which a result may differ from reality.
- **Range:** a span of likely values.
- **Scenario:** a possible future based on different assumptions.
- **Assumption:** something accepted as true for the analysis.

## Real-world example

A forecast predicts that a new managed service will reach a specific revenue figure in year one. It misses by 30%, and leadership loses confidence in analytics. For the next forecast, the analyst presents a range with best, expected and worst cases, lists key assumptions and explains which assumption matters most. When results land within the range, trust is restored.

## Common mistakes

- Presenting forecasts as certain single numbers.
- Hiding data limitations.
- Mixing facts with opinions without saying so.

## Key takeaways

- Identify uncertainty from samples, data quality, assumptions and external factors.
- Use ranges, scenarios and plain-language confidence levels.
- Be honest about limits; it builds trust.
""",
        """
Analysis creates value only when it leads to action. Driving follow-up turns insights into decisions, decisions into actions and actions into measurable results.

## Turning insights into action

- **End every presentation with a clear request:** a decision, approval or next step.
- **Agree actions with owners and dates** before the meeting ends.
- **Send a short written summary** of the insight, decision and actions within a day.

## Tracking results

- Define how success will be measured before the action starts.
- Set a review date to check results.
- Compare results with expectations, and report back honestly.
- Feed lessons learned into future analysis.

## Building a decision-making culture

- Share successful examples where analysis led to better decisions.
- Make data easy to access through trusted dashboards.
- Encourage questions and challenge of assumptions.
- Recognise people who use data well.

## Key terms

- **Action owner:** the person responsible for an agreed action.
- **Review date:** when results will be checked.
- **Closed loop:** tracking actions through to measured results.

## Real-world example

An analysis shows that late invoices cause most payment delays. The analyst's presentation ends with a request to introduce an invoice checklist. The finance head agrees, assigns an owner and sets a review in two months. At the review, average collection time has improved. The results are shared company-wide, and other teams start requesting analysis for their own problems.

## Common mistakes

- Presentations that end without a request.
- No owners or dates for actions.
- Never checking whether actions worked.

## Key takeaways

- End with a clear request and agree actions with owners and dates.
- Measure results and report back.
- Close the loop and share successes to build a data-driven culture.
""",
    ],
    "questions": [
        q("SINGLE", "What should come first in a report for busy decision makers?", ["Data sources", "Methods", "The insight and recommendation", "Appendices"], ["The insight and recommendation"],
          explanation="Answer first, then support it."),
        q("MULTIPLE", "Which are parts of an insight?", ["What happened", "Why it matters", "What to do", "The analyst's job title"], ["What happened", "Why it matters", "What to do"],
          explanation="An insight links a finding to meaning and action."),
        q("SINGLE", "What is the situation-complication-resolution structure?", ["A chart type", "A structure for business stories", "A database model", "A security framework"], ["A structure for business stories"],
          explanation="It moves from context to problem to recommendation."),
        q("TRUE_FALSE", "Presenting a forecast as a range with stated assumptions is more honest than a single certain number.", TF, ["True"],
          explanation="Ranges and assumptions show uncertainty clearly."),
        q("SINGLE", "What should happen before a meeting about an insight ends?", ["Nothing", "Agree actions with owners and dates", "Delete the data", "Start a new analysis"], ["Agree actions with owners and dates"],
          explanation="Actions with owners turn insights into results."),
        q("TRUE_FALSE", "Showing every chart from the analysis makes a presentation stronger.", TF, ["False"],
          explanation="Focus on a few key points that support the message."),
        q("MATCHING", "Match each term to its meaning.", ["Executive summary=Short opening with insight and recommendation", "Scenario=Possible future based on different assumptions", "Action owner=Person responsible for an action", "Closed loop=Tracking actions to measured results"],
          explanation="These terms support decision-focused communication."),
    ],
    "sources": [GOV_UK_DATA, TABLEAU, MS_LEARN],
}
