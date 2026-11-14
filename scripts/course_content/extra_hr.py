"""Extra Human Resources courses outside the catalogue."""
from . import q, TF

EXTRA = {}

SHRM = ("SHRM: HR knowledge and toolkits", "https://www.shrm.org/")
ATD = ("ATD (Association for Talent Development): learning and development resources", "https://www.td.org/")
KIRKPATRICK = ("Kirkpatrick Partners: the Kirkpatrick Model of training evaluation", "https://www.kirkpatrickpartners.com/")
PROSCI = ("Prosci: the ADKAR model of change", "https://www.prosci.com/methodology/adkar")
KOTTER = ("Kotter Inc.: the 8-step process for leading change", "https://www.kotterinc.com/methodology/8-steps/")
GALLUP = ("Gallup: workplace engagement and manager research", "https://www.gallup.com/workplace/")
REWORK = ("Google re:Work: guides on structured interviewing and team effectiveness", "https://rework.withgoogle.com/")
CCL = ("Center for Creative Leadership: leadership development research", "https://www.ccl.org/")
MEITY = ("MeitY: Digital Personal Data Protection Act, 2023 and Rules", "https://www.meity.gov.in/")
LABOUR = ("Ministry of Labour and Employment: Labour Codes and employment rules", "https://labour.gov.in/")

EXTRA["Talent Acquisition Essentials"] = {
    "lessons": [
        """
Good hiring starts long before the first interview. If the role is unclear, you will attract the wrong candidates, interview inconsistently and risk a poor hire. Defining the role carefully is the most important step in talent acquisition.

## What to define

- **Purpose of the role:** why it exists and what business problem it solves.
- **Key responsibilities:** the main tasks and outcomes, in order of importance.
- **Success measures:** what good performance looks like after six and twelve months.
- **Must-have skills and experience:** the true minimum requirements.
- **Nice-to-have skills:** helpful but not essential.
- **Behaviours and values:** how the person should work with others.
- **Practical details:** location, travel, reporting line, salary range and working arrangements.

## Writing the job description

- Use clear, simple language and avoid internal jargon.
- Keep must-have requirements short; long lists discourage good candidates.
- Use inclusive wording that does not exclude people unfairly by gender, age or background.
- Describe what the company offers: learning, growth and culture.

## Key terms

- **Job description:** a document describing the role, responsibilities and requirements.
- **Success profile:** a description of what success in the role looks like.
- **Must-have / nice-to-have:** essential versus desirable requirements.

## Real-world example

A manager asks HR to hire "a senior engineer" urgently. HR asks what the person will actually do. The answer is: lead network installations at customer sites across three states, with travel two weeks a month. The job description is rewritten to highlight field leadership and travel. Candidates who apply now understand the role, and the person hired stays because the job matches expectations.

## Common mistakes

- Copying old job descriptions without checking the role has changed.
- Listing too many must-have requirements.
- Hiding important facts, such as heavy travel, that later cause early resignations.

## Key takeaways

- Define purpose, responsibilities, success measures and requirements before hiring.
- Keep must-haves essential and the language clear and inclusive.
- Be honest about the realities of the role.
""",
        """
Sourcing means finding candidates who match the role. The best channel depends on the role, its seniority, the location and how quickly you need to hire.

## Common sourcing channels

- **Employee referrals:** often produce good-quality candidates who fit the culture; many companies offer referral rewards.
- **Job portals:** widely used job boards and professional networking sites.
- **Company careers page:** attracts candidates already interested in the company.
- **Campus hiring:** engineering colleges and institutes for entry-level roles.
- **Recruitment agencies:** useful for specialised or senior roles.
- **Professional networks and communities:** industry events, OEM partner communities and technical groups.
- **Internal candidates:** promoting or moving existing employees.

## Using channels well

- Track which channels produce candidates who are hired and stay, not just the most applications.
- Respond quickly; good candidates often have several offers.
- Keep a talent pool of promising candidates for future roles, with their consent.
- Handle candidate personal data lawfully under the Digital Personal Data Protection Act, 2023: collect only what is needed, use it for the stated purpose and delete it when no longer needed.

## Key terms

- **Sourcing:** finding potential candidates.
- **Talent pool:** a group of candidates kept in contact for future roles.
- **Time to hire:** the days from opening a role to an accepted offer.
- **Quality of hire:** how well new hires perform and how long they stay.

## Real-world example

A company struggles to hire certified network engineers through job portals. Analysis shows that the best recent hires came through employee referrals and OEM partner communities. HR increases the referral reward for hard-to-fill technical roles and attends OEM partner events. Time to hire falls and new engineers stay longer.

## Common mistakes

- Using the same channel for every role.
- Measuring only the number of applications.
- Keeping candidate data indefinitely without consent.

## Key takeaways

- Choose channels by role, seniority, location and urgency.
- Track quality of hire, not just volume.
- Handle candidate data in line with the DPDP Act.
""",
        """
A structured interview asks every candidate for the same role the same core questions, linked to the job requirements, and scores answers against agreed criteria. Research on hiring has consistently found structured interviews to be among the better predictors of job performance, and they are fairer than unstructured conversations.

## Building a structured interview

1. **Choose competencies** from the success profile, such as technical skill, problem solving, customer focus and teamwork.
2. **Write questions for each competency:**
   - **Behavioural questions:** "Tell me about a time when you handled an angry customer."
   - **Situational questions:** "What would you do if a critical switch failed during a customer's peak hours?"
3. **Define a scoring guide:** what a poor, acceptable and strong answer looks like.
4. **Use a panel** where possible, with each interviewer scoring independently before discussing.
5. **Add work samples or technical tests** for skill-based roles.

## The STAR method

Candidates can be guided to answer behavioural questions using **STAR: Situation, Task, Action, Result.** Interviewers can use it to probe for specifics: what exactly did *you* do, and what was the outcome?

## Fair interviewing

- Ask only job-related questions.
- Avoid questions about religion, caste, marital status, family plans or other personal matters unrelated to the job.
- Take notes on evidence, not impressions.

## Key terms

- **Competency:** a skill or behaviour needed for success in the role.
- **Behavioural question:** asks about past actions.
- **Situational question:** asks how the candidate would handle a scenario.
- **STAR:** Situation, Task, Action, Result.

## Real-world example

A company's sales hires vary widely in quality because each manager interviews differently. HR introduces a structured interview with five competencies, standard questions and a scoring guide, plus a short role-play. Over the next year, more new hires reach their targets, and managers agree more often on who to hire.

## Common mistakes

- Different questions for each candidate.
- Deciding in the first few minutes based on impressions.
- Asking personal questions unrelated to the job.

## Key takeaways

- Use the same job-related questions and a scoring guide for all candidates.
- Use behavioural and situational questions, probing with STAR.
- Interview fairly, recording evidence rather than impressions.
""",
        """
Candidate experience is how candidates feel about every step of the hiring process. A good experience helps you attract top talent, protects the company's reputation and makes offers more likely to be accepted, even from candidates who are not hired.

## What shapes candidate experience

- **Clear job information:** accurate descriptions and honest expectations.
- **Easy application:** short forms that work on mobile phones.
- **Fast, regular communication:** acknowledge applications and give updates at every stage.
- **Respectful interviews:** start on time, introduce the panel and explain the process.
- **Timely decisions:** delays often mean losing good candidates to other offers.
- **Feedback:** offer brief, constructive feedback to candidates who interviewed, where possible.
- **Smooth offer and onboarding:** clear offer letters, quick answers to questions and a planned first day.

## Measuring it

- Ask candidates for short feedback after interviews.
- Track offer acceptance rates and drop-out rates at each stage.
- Monitor public reviews on employer review websites.

## Key terms

- **Candidate experience:** the candidate's overall impression of the hiring process.
- **Offer acceptance rate:** the share of offers accepted.
- **Drop-out rate:** the share of candidates who leave the process at each stage.
- **Employer brand:** how the company is seen as a place to work.

## Real-world example

A company loses three strong candidates in a month because it takes three weeks after the final interview to make offers. HR sets a target of decisions within three working days of the final interview and assigns a coordinator to update candidates. Offer acceptance rises noticeably the next quarter.

## Common mistakes

- Leaving candidates without updates for weeks.
- Long, complicated application forms.
- No feedback or closure for rejected candidates.

## Key takeaways

- Every step, from job ad to first day, shapes candidate experience.
- Communicate quickly, interview respectfully and decide promptly.
- Measure experience through feedback, acceptance and drop-out rates.
""",
    ],
    "questions": [
        q("SINGLE", "What should be done before advertising a role?", ["Book interview rooms", "Define the role's purpose, responsibilities and success measures", "Make an offer", "Choose a joining date"], ["Define the role's purpose, responsibilities and success measures"],
          explanation="A clear role definition attracts the right candidates."),
        q("SINGLE", "What does STAR stand for in interviews?", ["Skills, Training, Attitude, Results", "Situation, Task, Action, Result", "Strengths, Talents, Abilities, References", "Start, Test, Assess, Recruit"], ["Situation, Task, Action, Result"],
          explanation="STAR helps structure and probe behavioural answers."),
        q("TRUE_FALSE", "Structured interviews ask every candidate for the role the same core questions and score answers against agreed criteria.", TF, ["True"],
          explanation="Consistency improves fairness and prediction."),
        q("MULTIPLE", "Which are sourcing channels?", ["Employee referrals", "Campus hiring", "Job portals", "Salary slips"], ["Employee referrals", "Campus hiring", "Job portals"],
          explanation="Choose channels to suit the role."),
        q("SINGLE", "Which interview question is appropriate?", ["Are you planning to have children?", "Tell me about a time you solved a difficult customer problem.", "What is your religion?", "Are you married?"], ["Tell me about a time you solved a difficult customer problem."],
          explanation="Ask only job-related questions."),
        q("TRUE_FALSE", "Candidate personal data can be kept forever for future use without the candidate's consent.", TF, ["False"],
          explanation="Under the DPDP Act, data should be used for its purpose and deleted when no longer needed."),
        q("MATCHING", "Match each term to its meaning.", ["Time to hire=Days from opening a role to accepted offer", "Quality of hire=How well new hires perform and stay", "Talent pool=Candidates kept in contact for future roles", "Offer acceptance rate=Share of offers accepted"],
          explanation="These measures show how well hiring works."),
    ],
    "sources": [SHRM, REWORK, MEITY, LABOUR],
}

EXTRA["Employee Retention Strategies"] = {
    "lessons": [
        """
Every resignation costs the company: recruitment, training, lost customer knowledge and pressure on remaining staff. In IT services, where skilled engineers and account managers are in high demand, retention is a business priority. Understanding why people leave is the first step.

## Common reasons people leave

- **Their manager:** poor relationships, little support or recognition. Gallup's research finds that managers account for most of the variation in team engagement.
- **Lack of growth:** no clear career path, learning opportunities or promotions.
- **Pay and benefits:** below market or perceived as unfair.
- **Workload and work-life balance:** constant overtime, travel or unrealistic targets.
- **Lack of recognition:** good work goes unnoticed.
- **Culture and values:** poor teamwork, unfair treatment or misalignment with values.
- **Better offers:** competitors actively recruit skilled staff.

## Measuring turnover

- **Attrition rate:** the number of leavers in a period divided by average headcount, as a percentage.
- **Regretted attrition:** leavers the company wanted to keep.
- **Early attrition:** people who leave within their first year, often a sign of hiring or onboarding problems.

## Key terms

- **Attrition:** employees leaving the organisation.
- **Regretted attrition:** losing people you wanted to keep.
- **Engagement:** employees' commitment and enthusiasm for their work.

## Real-world example

A company loses several presales engineers in six months. Exit interviews show that most felt stuck: no certification support and no path to architect roles. The company introduces a certification budget and a clear technical career ladder. Regretted attrition in presales falls the following year.

## Common mistakes

- Assuming pay is the only reason people leave.
- Measuring only total attrition, not regretted or early attrition.
- Ignoring the role of managers.

## Key takeaways

- People leave for many reasons; managers and growth are among the most important.
- Track total, regretted and early attrition.
- Use data to find patterns and act on them.
""",
        """
Stay interviews and exit interviews are two simple tools for understanding what keeps people and what drives them away. Stay interviews are held while employees are still with the company; exit interviews are held when they leave.

## Stay interviews

A stay interview is a one-to-one conversation between a manager and a valued employee to understand what keeps them and what might make them leave. Useful questions include:

- What do you enjoy most about your work?
- What would make your job better?
- What would tempt you to leave?
- What skills would you like to develop?
- How can I support you better?

Act on what you hear and follow up. A stay interview without action can harm trust.

## Exit interviews

An exit interview gathers feedback from employees who are leaving.

- Conduct it through HR or a neutral person, so the employee speaks openly.
- Ask about reasons for leaving, the manager, growth, workload and what could have changed their decision.
- Look for patterns across many exits, not just individual stories.
- Keep responses confidential and handle personal data responsibly.

## Key terms

- **Stay interview:** a conversation to understand why valued employees stay.
- **Exit interview:** feedback gathered from leaving employees.
- **Pattern analysis:** looking for common themes across many responses.

## Real-world example

A team lead holds stay interviews with her five best engineers. Three say they want exposure to cloud projects. She arranges for them to join a cloud migration project and supports their certification. All three are still with the company two years later, while a similar team without such conversations loses two engineers to cloud-focused competitors.

## Common mistakes

- Holding exit interviews only, after it is too late.
- Not acting on stay interview feedback.
- Treating exit interview data as individual complaints rather than patterns.

## Key takeaways

- Use stay interviews to learn what keeps valued employees, and act on it.
- Use exit interviews, run neutrally, to find patterns.
- Keep feedback confidential and follow up with action.
""",
        """
People stay where they can see a future. Clear career paths and real development opportunities are among the strongest drivers of retention, especially for skilled IT professionals.

## Building career paths

- **Define levels** for each job family, such as engineer, senior engineer, lead and architect, with the skills and responsibilities expected at each level.
- **Offer more than one path:** a management path and a technical or specialist path, so experts can grow without becoming people managers.
- **Make criteria transparent,** so employees know what they need to progress.
- **Allow lateral moves,** such as from support to presales, to broaden skills.

## Development opportunities

- **Certifications:** OEM and industry certifications, such as networking, cloud and security credentials, valued by both employees and customers.
- **Stretch assignments:** challenging projects that build new skills.
- **Mentoring and coaching:** pairing employees with experienced colleagues.
- **Internal learning:** courses on the company LMS, lunch-and-learn sessions and knowledge sharing.
- **Individual development plans (IDPs):** agreed goals and actions reviewed regularly with the manager.

## Key terms

- **Career path:** a sequence of roles and levels an employee can progress through.
- **Dual career ladder:** parallel management and technical paths.
- **Individual development plan (IDP):** a personal plan for skill growth.
- **Stretch assignment:** a task beyond current comfort that builds skills.

## Real-world example

A company's best network engineer resigns because the only promotion available is to a manager role he does not want. The company introduces a dual career ladder with principal engineer and architect roles at senior pay levels. Several strong engineers who had been considering leaving decide to stay and progress on the technical path.

## Common mistakes

- Only offering management as a route to promotion.
- Vague or secret promotion criteria.
- Development plans that are written once and never reviewed.

## Key takeaways

- Define clear levels and transparent criteria, with management and technical paths.
- Offer certifications, stretch assignments, mentoring and IDPs.
- Review development plans regularly.
""",
        """
Recognition means noticing and appreciating good work. It costs little but has a strong effect on motivation and retention. The most effective recognition is specific, timely and genuine.

## Principles of good recognition

- **Specific:** say exactly what the person did and why it mattered. "Your quick fix of the core switch kept the hospital's billing running during peak hours."
- **Timely:** recognise soon after the achievement, not months later.
- **Genuine:** sincere appreciation, not routine praise.
- **Fair:** recognise contributions across the team, including quieter and behind-the-scenes work.
- **Personal:** some people prefer public praise; others prefer a private thank-you.

## Forms of recognition

- **Everyday appreciation:** a thank-you in person, by message or in a team meeting.
- **Peer recognition:** colleagues recognising each other, for example through a simple recognition channel.
- **Formal awards:** quarterly or annual awards for outstanding contribution.
- **Customer feedback:** sharing praise from customers with the team and leadership.
- **Growth opportunities:** high-profile projects or learning opportunities as recognition.
- **Financial rewards:** bonuses or spot awards, following company policy.

## Key terms

- **Recognition:** acknowledging an employee's contribution.
- **Peer recognition:** recognition given by colleagues.
- **Spot award:** an immediate reward for a specific achievement.

## Real-world example

A customer emails the account manager praising a field engineer who stayed late to complete an installation before a product launch. The account manager forwards it to the engineer's manager, who shares it in the team meeting and copies the company head. The engineer later says this recognition meant more to him than a small bonus.

## Common mistakes

- Generic praise such as "good job, everyone".
- Recognising only the most visible people.
- Waiting for annual reviews to recognise good work.

## Key takeaways

- Make recognition specific, timely, genuine, fair and personal.
- Use everyday appreciation, peer recognition, awards and customer feedback.
- Recognition is low-cost and strongly supports retention.
""",
    ],
    "questions": [
        q("SINGLE", "Which factor does research consistently link strongly to employee engagement and retention?", ["Office colour", "The employee's manager", "The company logo", "Parking space"], ["The employee's manager"],
          explanation="Gallup finds managers account for most of the variation in team engagement."),
        q("SINGLE", "What is a stay interview?", ["An interview with a leaving employee", "A conversation with a valued employee about what keeps them", "A job interview for a new hire", "A disciplinary meeting"], ["A conversation with a valued employee about what keeps them"],
          explanation="Stay interviews help prevent regretted attrition."),
        q("TRUE_FALSE", "A dual career ladder lets experts grow without becoming people managers.", TF, ["True"],
          explanation="Technical and management paths run in parallel."),
        q("MULTIPLE", "Which make recognition effective?", ["Specific", "Timely", "Genuine", "Delayed until the annual review"], ["Specific", "Timely", "Genuine"],
          explanation="Recognition should be soon after the achievement."),
        q("SINGLE", "What does 'regretted attrition' mean?", ["All leavers", "Leavers the company wanted to keep", "Retirements only", "New hires"], ["Leavers the company wanted to keep"],
          explanation="It focuses on losing valued people."),
        q("TRUE_FALSE", "Holding stay interviews without acting on the feedback can harm trust.", TF, ["True"],
          explanation="Employees expect follow-up when they share concerns."),
        q("MATCHING", "Match each term to its meaning.", ["IDP=Personal plan for skill growth", "Early attrition=Leaving within the first year", "Stretch assignment=Challenging task that builds skills", "Spot award=Immediate reward for an achievement"],
          explanation="These are common retention terms."),
    ],
    "sources": [GALLUP, SHRM, CCL],
}

EXTRA["Learning and Development Planning"] = {
    "lessons": [
        """
A training needs analysis (TNA) finds the gap between the skills people have and the skills the business needs. Without it, training is often chosen because it is popular or available, not because it solves a real problem.

## Three levels of analysis

- **Organisational level:** what the business strategy requires. For example, a move into cloud services needs cloud-skilled presales and engineers.
- **Role or task level:** the skills and knowledge each role needs to perform well.
- **Individual level:** each person's current skills compared with what their role requires.

## Methods for finding needs

- **Business data:** sales results, customer satisfaction, project delays, audit findings and support ticket trends.
- **Skill assessments:** tests, practical tasks and certification status.
- **Performance reviews and manager input.**
- **Surveys and interviews** with employees and customers.
- **Observation** of people at work.

## Is training the answer?

Not every performance problem is a skills problem. Poor processes, unclear goals, missing tools or low motivation may be the real cause. A good TNA checks these before recommending training.

## Key terms

- **Training needs analysis (TNA):** a structured study of skill gaps.
- **Skill gap:** the difference between current and required skills.
- **Competency framework:** a defined set of skills and behaviours for each role.

## Real-world example

A company's support team takes too long to resolve network tickets. Managers ask for a general networking course. A TNA reviews ticket data and finds that most delays involve one type of firewall the team rarely sees, and that the knowledge base has no runbooks for it. The solution is a focused firewall workshop plus new runbooks, delivered at lower cost and with better results than a general course.

## Common mistakes

- Choosing training before identifying the problem.
- Assuming every performance issue needs training.
- Ignoring business data.

## Key takeaways

- Analyse needs at organisational, role and individual levels.
- Use business data, assessments, reviews, surveys and observation.
- Check whether training is really the right solution.
""",
        """
Learning objectives describe what learners will be able to do after the training. Clear objectives guide course design, help learners focus and make it possible to measure success.

## Writing good objectives

Good objectives are specific and measurable. Many organisations use the **SMART** guide: Specific, Measurable, Achievable, Relevant and Time-bound.

- **Weak:** "Understand firewalls."
- **Strong:** "By the end of the course, configure a firewall policy that allows only approved traffic between two network zones, without errors, in a lab."

## Using action verbs

Bloom's taxonomy, revised in 2001, describes levels of thinking from simple to complex: **remember, understand, apply, analyse, evaluate and create.** Choose verbs that match the level you need:

- Remember: list, define, identify.
- Understand: explain, describe, summarise.
- Apply: configure, calculate, demonstrate.
- Analyse: compare, troubleshoot, diagnose.
- Evaluate: recommend, justify, assess.
- Create: design, plan, build.

Avoid vague verbs such as "know", "understand" or "be aware of" in final objectives, because they cannot be measured directly.

## Linking objectives to assessment

Each objective should have a matching assessment. If the objective is "configure", the assessment should involve configuring, not just answering multiple-choice questions about it.

## Key terms

- **Learning objective:** a statement of what learners will be able to do.
- **SMART:** Specific, Measurable, Achievable, Relevant, Time-bound.
- **Bloom's taxonomy:** a framework of thinking levels for writing objectives.

## Real-world example

A presales course originally had the objective "learn about RFPs". It is rewritten to "build a compliance matrix for a sample RFP, correctly marking each requirement and referencing evidence". The course now includes a practical exercise, and managers see better RFP responses from participants.

## Common mistakes

- Vague objectives that cannot be measured.
- Objectives that do not match the assessment.
- Too many objectives for the time available.

## Key takeaways

- Write specific, measurable objectives using SMART and action verbs.
- Use Bloom's levels to choose the right verb.
- Match each objective to an assessment.
""",
        """
People learn in many ways: courses, practice, colleagues and real work. Blended learning combines different methods to build skills more effectively than any single method alone.

## Learning methods

- **E-learning:** self-paced online courses, such as those on the company LMS.
- **Instructor-led training:** in person or virtual, useful for discussion and practice.
- **Hands-on labs:** practising technical skills in safe environments.
- **On-the-job learning:** real tasks with guidance, such as shadowing an experienced engineer.
- **Coaching and mentoring:** personal guidance from managers or senior colleagues.
- **Peer learning:** learning circles, knowledge-sharing sessions and communities.
- **Microlearning:** short lessons or videos for quick reference.

## The 70-20-10 guideline

A widely cited guideline, which originated in research associated with the Center for Creative Leadership, suggests that much development comes from challenging experiences (about 70%), a significant part from relationships with others (about 20%) and a smaller part from formal courses (about 10%). The percentages are a guide, not a rule, but the message is clear: formal training works best when combined with practice and support.

## Designing a blended programme

1. Start with the learning objectives.
2. Choose methods that suit each objective: knowledge through e-learning, skills through labs and practice, behaviours through coaching.
3. Sequence the programme: prepare, learn, practise, apply and review.
4. Involve managers to support practice on the job.

## Key terms

- **Blended learning:** combining several learning methods.
- **Experiential learning:** learning by doing and reflecting.
- **70-20-10:** a guideline on sources of development.
- **Microlearning:** short, focused learning units.

## Real-world example

A company trains new account managers with a two-day classroom course, but many struggle in their first customer meetings. The redesigned programme combines e-learning on products, role-play workshops, shadowing senior account managers for a month and weekly coaching. New account managers reach their first targets faster.

## Common mistakes

- Relying only on classroom training.
- No opportunity to practise new skills.
- Managers not involved in supporting learning.

## Key takeaways

- Combine e-learning, instructor-led training, labs, on-the-job learning, coaching and peer learning.
- Use 70-20-10 as a guide: practice and relationships matter as much as courses.
- Design from objectives and involve managers.
""",
        """
Measuring the impact of training shows whether it worked and whether it was worth the investment. The most widely used approach is the **Kirkpatrick Model,** which evaluates training at four levels.

## The four Kirkpatrick levels

1. **Reaction:** did participants find the training useful and engaging? Measured with feedback forms.
2. **Learning:** did they gain the intended knowledge and skills? Measured with assessments, tests and practical tasks.
3. **Behaviour:** do they apply what they learned on the job? Measured through observation, manager feedback and work data, typically weeks or months later.
4. **Results:** did the training improve business outcomes, such as sales, customer satisfaction, quality or fewer incidents?

Some practitioners add a fifth level, **return on investment (ROI),** associated with the Phillips ROI Methodology, comparing the monetary benefit of training with its cost.

## Making measurement practical

- Decide how you will measure results before designing the training.
- Collect baseline data before the training, so you can compare.
- Use data the business already tracks, such as ticket resolution times or win rates.
- Involve managers in observing behaviour change.
- Report results clearly, including what did not work.

## Key terms

- **Kirkpatrick Model:** a four-level framework for evaluating training.
- **Baseline:** performance measured before training.
- **ROI:** return on investment.
- **Behaviour change:** applying new skills at work.

## Real-world example

A company runs troubleshooting training for support engineers. Feedback scores are high (level 1) and test scores improve (level 2). Three months later, managers confirm engineers use the new troubleshooting method (level 3), and average ticket resolution time falls compared with the baseline (level 4). The results justify extending the programme to other teams.

## Common mistakes

- Measuring only participant satisfaction.
- No baseline data before training.
- Not involving managers in follow-up.

## Key takeaways

- Use Kirkpatrick's four levels: reaction, learning, behaviour and results.
- Plan measurement before training and collect baselines.
- Link training to business data and report honestly.
""",
    ],
    "questions": [
        q("SINGLE", "What does a training needs analysis identify?", ["The cheapest course", "The gap between current and required skills", "The trainer's availability", "The training room size"], ["The gap between current and required skills"],
          explanation="TNA links training to real skill gaps."),
        q("SINGLE", "Which is the best learning objective?", ["Understand firewalls", "Know about RFPs", "Configure a firewall policy between two zones without errors in a lab", "Be aware of security"], ["Configure a firewall policy between two zones without errors in a lab"],
          explanation="Good objectives are specific and measurable."),
        q("MULTIPLE", "Which are levels of the Kirkpatrick Model?", ["Reaction", "Learning", "Behaviour", "Results", "Attendance"], ["Reaction", "Learning", "Behaviour", "Results"],
          explanation="Attendance is not a Kirkpatrick level."),
        q("TRUE_FALSE", "Every performance problem should be solved with training.", TF, ["False"],
          explanation="Processes, tools, goals or motivation may be the real cause."),
        q("SINGLE", "In the 70-20-10 guideline, where does the largest share of development come from?", ["Formal courses", "Relationships", "Challenging experiences and practice", "Reading manuals"], ["Challenging experiences and practice"],
          explanation="About 70% is attributed to experience; the numbers are a guide."),
        q("SINGLE", "Which Bloom's taxonomy level does 'design a network' belong to?", ["Remember", "Understand", "Create", "Apply"], ["Create"],
          explanation="Design, plan and build are 'create' verbs."),
        q("MATCHING", "Match each Kirkpatrick level to how it is measured.", ["Reaction=Feedback forms", "Learning=Tests and practical tasks", "Behaviour=Observation on the job", "Results=Business outcomes"],
          explanation="Each level needs different evidence."),
    ],
    "sources": [KIRKPATRICK, ATD, CCL],
}

EXTRA["Manager Learning Circles"] = {
    "lessons": [
        """
A learning circle is a small group of peers, typically five to eight managers, who meet regularly to learn together, share experiences and solve real work problems. It is a low-cost, high-impact way to develop leaders, because managers learn from each other's real situations.

## How learning circles work

- **Small, stable group:** the same members meet regularly, building trust.
- **Regular rhythm:** for example, every two to four weeks for 60 to 90 minutes.
- **Real topics:** members bring actual challenges, such as handling a difficult conversation or improving team performance.
- **Shared learning:** members discuss, ask questions and offer ideas, rather than receiving lectures.
- **Action:** each member commits to trying something and reports back next time.

The approach draws on **action learning,** developed by Reg Revans, in which people learn by working on real problems and reflecting on the results with peers.

## Benefits

- Managers learn practical skills they can apply immediately.
- They build a support network across departments.
- Knowledge and good practices spread through the organisation.
- It complements formal leadership training.

## Key terms

- **Learning circle:** a small peer group that meets to learn together.
- **Action learning:** learning by working on real problems and reflecting.
- **Facilitator:** the person who guides the session.

## Real-world example

A company promotes several engineers to team lead roles at once. Instead of only sending them on a course, HR forms a learning circle that meets every three weeks. In one session, a new team lead shares that she struggles to give feedback to a former peer. Others share how they handled similar situations, and she tries a structured feedback approach. At the next session, she reports a much better conversation.

## Common mistakes

- Groups that are too large for real discussion.
- Meetings that become status updates rather than learning.
- No commitment to action between sessions.

## Key takeaways

- Learning circles are small peer groups learning from real challenges.
- They meet regularly, discuss real topics and commit to action.
- They build skills and support networks at low cost.
""",
        """
A well-run session keeps the learning circle focused, inclusive and useful. A simple, repeatable structure helps groups make the most of their time.

## A typical session structure (about 75 minutes)

1. **Check-in (10 minutes):** each member shares briefly how they are and one update.
2. **Review of actions (15 minutes):** members report what they tried since the last session and what they learned.
3. **Main topic or case (35 minutes):** one member presents a real challenge. Others ask clarifying questions first, then offer ideas and experiences. The presenter listens, then shares what they will try.
4. **Learning input (optional, 10 minutes):** a short article, video or model related to the topic.
5. **Commitments and close (5 minutes):** each member states one action for the next session.

## The facilitator's role

- Keep time and follow the structure.
- Make sure everyone speaks and no one dominates.
- Encourage questions before advice.
- Protect confidentiality.
- Rotate facilitation among members once the group is established.

## Ground rules

- What is said in the circle stays in the circle.
- Listen to understand, not to respond.
- Offer experiences, not instructions.
- Come prepared and on time.

## Key terms

- **Check-in:** a brief opening round.
- **Case:** a real challenge brought by a member.
- **Ground rules:** agreed behaviours for the group.
- **Commitment:** an action a member agrees to try.

## Real-world example

A learning circle's sessions drift into general complaints about workload. The facilitator reintroduces the structure: one real case per session, questions before advice and clear commitments. Within two sessions, members report concrete changes in their teams, and attendance improves.

## Common mistakes

- No structure, leading to unfocused discussion.
- Jumping to advice before understanding the situation.
- One or two people dominating.

## Key takeaways

- Use a repeatable structure: check-in, review, case, input and commitments.
- The facilitator manages time, participation and confidentiality.
- Agree and follow ground rules.
""",
        """
Psychological safety is a shared belief that a group is safe for taking interpersonal risks, such as asking questions, admitting mistakes or offering new ideas, without fear of embarrassment or punishment. The term was developed by Harvard professor Amy Edmondson. Google's Project Aristotle research on team effectiveness found psychological safety to be the most important factor among those it studied.

## Why it matters

- People share problems early, before they grow.
- Teams learn from mistakes instead of hiding them.
- More ideas are shared, improving decisions.
- In learning circles, members can discuss real challenges openly.

## How leaders build psychological safety

- **Frame work as learning:** acknowledge uncertainty and that everyone has something to learn.
- **Admit your own mistakes and limits:** this shows it is safe for others.
- **Ask questions and invite input:** "What are we missing?" "What do you think?"
- **Respond well to bad news:** thank people for raising problems, focus on solutions, not blame.
- **Make sure everyone is heard:** draw in quieter members.
- **Keep confidentiality** where it has been promised.

## What psychological safety is not

It is not about being comfortable all the time or lowering standards. High-performing teams combine psychological safety with high standards and accountability.

## Key terms

- **Psychological safety:** a belief that the team is safe for interpersonal risk-taking.
- **Blameless review:** reviewing a problem to learn, not to punish.
- **Accountability:** responsibility for commitments and results.

## Real-world example

In a project team, engineers hide small configuration mistakes because the previous manager publicly criticised errors. Problems surface late and cause outages. The new manager introduces blameless reviews after incidents and thanks people for reporting issues early. Engineers begin reporting problems quickly, and incidents fall.

## Common mistakes

- Punishing people for raising problems.
- Confusing psychological safety with avoiding difficult conversations.
- Leaders never admitting their own mistakes.

## Key takeaways

- Psychological safety lets people speak up, admit mistakes and share ideas.
- Leaders build it by framing work as learning, admitting mistakes and responding well to bad news.
- Combine psychological safety with high standards and accountability.
""",
        """
Learning circles create value only when managers turn insights into changes in how their teams work. Moving from learning to team practice needs deliberate steps.

## Turning insights into practice

1. **Choose one change at a time:** for example, holding regular one-to-one meetings or starting a weekly team learning slot.
2. **Explain the change to the team:** why it matters and what will be different.
3. **Try it for a set period,** such as four to six weeks.
4. **Gather feedback** from the team on what works.
5. **Adjust and continue,** or try something different.
6. **Report back to the learning circle,** sharing results and lessons.

## Spreading good practices

- Document practices that work, such as meeting templates or feedback guides.
- Share them with other managers through the learning circle or internal channels.
- Recognise managers who improve their teams.
- Link practices to team results, such as engagement scores, retention or customer satisfaction.

## Sustaining learning circles

- Get leadership support and time for managers to attend.
- Refresh membership or topics periodically to keep energy high.
- Connect circles to formal development programmes.

## Key terms

- **Team practice:** a regular way the team works, such as one-to-ones.
- **Pilot period:** a set time for trying a change.
- **Knowledge sharing:** spreading useful practices across the organisation.

## Real-world example

In a learning circle, a manager hears how a colleague uses short weekly one-to-ones to spot problems early. She tries them with her team for six weeks. Team members say they feel more supported, and she notices issues sooner. She reports back to the circle, and two other managers adopt the practice. Over the year, engagement scores in those teams improve.

## Common mistakes

- Trying to change too many things at once.
- Not explaining changes to the team.
- Not reporting back, so learning is not shared.

## Key takeaways

- Turn insights into one change at a time, with a trial period and feedback.
- Share and document practices that work.
- Sustain circles with leadership support and links to development programmes.
""",
    ],
    "questions": [
        q("SINGLE", "What is a learning circle?", ["A large training lecture", "A small peer group that meets regularly to learn from real challenges", "An online quiz", "A performance review"], ["A small peer group that meets regularly to learn from real challenges"],
          explanation="Learning circles are small, regular and practical."),
        q("SINGLE", "Who developed the concept of psychological safety in teams?", ["Amy Edmondson", "John Kotter", "Neil Rackham", "Donald Kirkpatrick"], ["Amy Edmondson"],
          explanation="Amy Edmondson of Harvard developed the concept."),
        q("TRUE_FALSE", "Psychological safety means lowering standards so everyone is comfortable.", TF, ["False"],
          explanation="High-performing teams combine psychological safety with high standards."),
        q("SINGLE", "In a learning circle case discussion, what should come first?", ["Advice", "Clarifying questions", "Criticism", "Voting"], ["Clarifying questions"],
          explanation="Understand the situation before offering ideas."),
        q("MULTIPLE", "Which actions help build psychological safety?", ["Admitting your own mistakes", "Thanking people for raising problems", "Inviting input from quieter members", "Publicly criticising errors"], ["Admitting your own mistakes", "Thanking people for raising problems", "Inviting input from quieter members"],
          explanation="Public criticism discourages people from speaking up."),
        q("TRUE_FALSE", "Members should commit to an action and report back at the next session.", TF, ["True"],
          explanation="Action and reflection drive learning."),
        q("MATCHING", "Match each term to its meaning.", ["Action learning=Learning by working on real problems", "Facilitator=Guides the session", "Blameless review=Learning from problems without punishment", "Ground rules=Agreed group behaviours"],
          explanation="These terms describe how circles work."),
    ],
    "sources": [REWORK, CCL, ATD],
}

EXTRA["Driving Cultural Change and Business Results"] = {
    "lessons": [
        """
Culture is "the way we do things here": the shared values, beliefs and habits that shape how people behave. Changing culture is hard because habits are strong, people fear losing what they value, and change often competes with daily pressures.

## Why change fails

- **No clear reason:** people do not understand why change is needed.
- **Mixed messages:** leaders say one thing but do another.
- **Fear and loss:** people worry about status, skills or job security.
- **Too much at once:** many initiatives compete for attention.
- **No reinforcement:** old habits return when attention moves on.
- **Systems unchanged:** targets, rewards and processes still support the old ways.

## What successful change needs

- A compelling, clearly communicated reason.
- Visible, consistent leadership behaviour.
- Involvement of people affected by the change.
- Support to learn new skills.
- Alignment of systems, such as goals, rewards and processes.
- Patience and reinforcement over time.

## Key terms

- **Organisational culture:** shared values, beliefs and behaviours.
- **Change management:** a structured approach to helping people adopt change.
- **Resistance:** reluctance to accept change, often driven by fear or loss.

## Real-world example

A company wants to move from selling products to selling solutions and services. It announces the strategy, but sales targets and incentives still reward product revenue only. Salespeople keep selling boxes. Only when incentives are changed to reward services and recurring revenue, and leaders celebrate solution wins, does behaviour begin to change.

## Common mistakes

- Announcing change without explaining why.
- Leaders not modelling the new behaviour.
- Leaving old systems and incentives in place.

## Key takeaways

- Culture change is hard because habits, fears and systems resist it.
- Success needs a clear reason, consistent leadership, involvement, skills and aligned systems.
- Reinforce change over time.
""",
        """
The **ADKAR model,** developed by Jeff Hiatt and published by Prosci, describes the five outcomes each individual needs to achieve for a change to succeed. Organisations change only when individuals change.

## The five ADKAR elements

1. **Awareness** of the need for change: why it is happening.
2. **Desire** to support and take part in the change: personal motivation.
3. **Knowledge** of how to change: what to do differently.
4. **Ability** to implement the change: skills and behaviours in practice.
5. **Reinforcement** to sustain the change: recognition, rewards and follow-up.

## Using ADKAR

- **Diagnose where people are stuck:** for example, a team may understand the change (awareness) but not want it (desire).
- **Choose the right action for each stage:**
  - Awareness: clear communication from leaders about the business reasons.
  - Desire: involve people, address concerns and explain personal benefits.
  - Knowledge: training and information.
  - Ability: practice, coaching and time to build skills.
  - Reinforcement: recognition, measurement and celebrating success.

## Key terms

- **ADKAR:** Awareness, Desire, Knowledge, Ability, Reinforcement.
- **Barrier point:** the first ADKAR element where a person is stuck.
- **Change sponsor:** a senior leader who champions the change.

## Real-world example

A company introduces a new CRM. Training is delivered (knowledge), but usage stays low. An ADKAR assessment shows that salespeople do not see why the CRM matters to them (desire). Leaders explain how CRM data will help forecasting and reduce reporting work, managers use CRM data in every review, and top users are recognised. Usage rises sharply.

## Common mistakes

- Jumping straight to training without building awareness and desire.
- Treating everyone as being at the same stage.
- No reinforcement after launch.

## Key takeaways

- ADKAR: Awareness, Desire, Knowledge, Ability, Reinforcement.
- Find each person's barrier point and act on it.
- Training alone is not enough without awareness, desire and reinforcement.
""",
        """
While ADKAR focuses on individuals, **John Kotter's eight-step process,** first described in his book *Leading Change* (1996), focuses on leading change across an organisation.

## Kotter's eight steps

1. **Create a sense of urgency:** help people see why change is needed now.
2. **Build a guiding coalition:** form a group of influential leaders to drive the change.
3. **Form a strategic vision:** describe the future clearly and simply.
4. **Communicate the vision:** repeatedly, through many channels, with leaders modelling it.
5. **Remove barriers and empower action:** change structures, systems and processes that block progress.
6. **Generate short-term wins:** achieve and celebrate visible early successes.
7. **Sustain acceleration:** use credibility from early wins to drive further change.
8. **Anchor the change in culture:** connect new behaviours to success and make them part of how things are done.

## Using the steps in practice

- The steps are a guide, not a rigid sequence; several may happen at once.
- Short-term wins are especially important for building momentum and silencing doubters.
- Anchoring takes time; declaring victory too early is a common cause of failure.

## Key terms

- **Sense of urgency:** shared understanding that change is needed now.
- **Guiding coalition:** leaders who drive the change together.
- **Short-term win:** a visible early success.
- **Anchoring:** making change part of the culture.

## Real-world example

A company wants to become customer-centric after losing two major accounts. Leaders share customer feedback widely to create urgency, form a cross-department coalition, and set a vision of "every customer issue owned and resolved". They remove a barrier by giving support engineers authority to issue small service credits, celebrate early improvements in customer satisfaction, and eventually build customer metrics into everyone's goals.

## Common mistakes

- Skipping urgency, so people see no reason to change.
- Communicating the vision once and stopping.
- Declaring victory too early.

## Key takeaways

- Kotter's eight steps guide organisation-wide change.
- Urgency, a guiding coalition, a clear vision and short-term wins build momentum.
- Anchor change in culture and avoid declaring victory too early.
""",
        """
Learning and culture programmes must show business value to earn ongoing support. Linking learning to measurable business results makes the case clear and helps focus effort where it matters.

## Starting from business results

- Begin with the business goal: higher win rates, faster project delivery, better customer satisfaction, fewer security incidents or lower attrition.
- Identify the behaviours that drive that result.
- Design learning and culture initiatives to build those behaviours.
- Agree the measures before starting.

## Measuring results

- Use the Kirkpatrick levels: reaction, learning, behaviour and results.
- Collect baseline data before the programme.
- Compare results over time, and where possible with a group that did not take part.
- Combine numbers with stories, such as customer feedback or examples of new behaviour.

## Communicating results

- Report in business language: revenue, cost, risk, customer and employee outcomes.
- Be honest about what worked and what did not.
- Share success stories to build momentum.

## Key terms

- **Business result:** a measurable organisational outcome.
- **Leading indicator:** an early measure that predicts results, such as CRM usage before win rates improve.
- **Lagging indicator:** a measure of the final outcome, such as revenue.
- **Comparison group:** a group that did not take part, used to estimate impact.

## Real-world example

A company runs a consultative selling programme for its sales team. It measures participants' use of discovery questions in CRM notes (behaviour, a leading indicator) and their win rates over the next two quarters (results, a lagging indicator), compared with a group that will be trained later. The trained group shows higher win rates, and leadership funds the programme for the whole team.

## Common mistakes

- Measuring only attendance and satisfaction.
- No baseline or comparison.
- Reporting in training jargon rather than business terms.

## Key takeaways

- Start from business goals and the behaviours that drive them.
- Measure with baselines, leading and lagging indicators, and comparisons.
- Report results in business language, honestly.
""",
    ],
    "questions": [
        q("SINGLE", "What does ADKAR stand for?", ["Awareness, Desire, Knowledge, Ability, Reinforcement", "Action, Decision, Knowledge, Assessment, Review", "Analyse, Design, Kickoff, Act, Repeat", "Attitude, Drive, Knowledge, Aptitude, Results"], ["Awareness, Desire, Knowledge, Ability, Reinforcement"],
          explanation="ADKAR describes the outcomes each individual needs for change."),
        q("SINGLE", "What is the first step in Kotter's eight-step process?", ["Generate short-term wins", "Create a sense of urgency", "Anchor the change in culture", "Hire consultants"], ["Create a sense of urgency"],
          explanation="Urgency helps people see why change is needed now."),
        q("TRUE_FALSE", "Training alone is enough for change if people lack the desire to change.", TF, ["False"],
          explanation="ADKAR shows awareness and desire must come before knowledge and ability."),
        q("MULTIPLE", "Which are common reasons change fails?", ["No clear reason for change", "Leaders not modelling new behaviour", "Old incentives left in place", "Celebrating short-term wins"], ["No clear reason for change", "Leaders not modelling new behaviour", "Old incentives left in place"],
          explanation="Short-term wins help change succeed."),
        q("SINGLE", "Which is a leading indicator for a consultative selling programme?", ["Annual revenue", "Use of discovery questions in CRM notes", "Office rent", "Number of chairs"], ["Use of discovery questions in CRM notes"],
          explanation="Behaviour measures predict later results such as win rates."),
        q("TRUE_FALSE", "Declaring victory too early is a common cause of change failure.", TF, ["True"],
          explanation="Kotter warns that change must be anchored in culture first."),
        q("MATCHING", "Match each ADKAR element to a supporting action.", ["Awareness=Leaders explain the business reasons", "Desire=Involve people and address concerns", "Knowledge=Training and information", "Reinforcement=Recognition and follow-up"],
          explanation="Each stage needs a different kind of support."),
    ],
    "sources": [PROSCI, KOTTER, KIRKPATRICK, SHRM],
}
