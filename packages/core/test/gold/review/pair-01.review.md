# Pair 01 — adjudication review sheet (29 gaps, 0 adjudicated)

> **Sources:** JD = `test/fixtures/jd-01.txt` · Resume = `test/fixtures/resume-01.txt`
> Verdicts go in `test/gold/pair-01.adjudication.json`
>
> GENERATED READING AID — mechanical re-presentation of pair-01.adjudication.json
> plus fixture context. No judgments live here; verdicts go in the JSON.
>
> Verdicts: `agree` · `wrong_kind:<missing_skill|weak_evidence|strong_differentiator>` · `not_a_requirement`
> Then sweep the `·` lines of the coverage map at the bottom: any requirement the
> engine never surfaced goes into `missedRequirements[]` as a verbatim JD quote.

---

### gap-1 · `weak_evidence` · verdict so far: _(none)_

**JD:** …Data Analyst — Growth Team Acme Commerce Pte Ltd, Singapore About the role **You will turn raw event data into decisions for the growth team.** What you will do - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting…

**Resume:** …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…

**Engine's rationale:** Cleaning and joining clickstream tables for an ad-hoc churn analysis (cv-7) shows working with raw event data but does not explicitly state driving decisions for the growth team.

---

### gap-2 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …Singapore About the role You will turn raw event data into decisions for the growth team. What you will do **- Build and maintain SQL models and dashboards for funnel, retention and campaign reporting** - Partner with product managers to design and analyze A/B experiments - Own the weekly business review metric…

**Resume:** …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…

**Engine's rationale:** Wrote SQL queries in BigQuery to build a weekly retention report for the growth team (cv-6) directly demonstrates building SQL models for reporting.

---

### gap-3 · `weak_evidence` · verdict so far: _(none)_

**JD:** …Singapore About the role You will turn raw event data into decisions for the growth team. What you will do **- Build and maintain SQL models and dashboards for funnel, retention and campaign reporting** - Partner with product managers to design and analyze A/B experiments - Own the weekly business review metric…

**Resume:** …- Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024) **- Built Excel models for branch performance tracking** - Automated a monthly report with VBA macros SKILLS SQL (BigQuery), Python (pandas, matplotlib), Excel, Tabl…

**Engine's rationale:** Built Excel models for branch performance tracking (cv-10) suggests producing analytic artifacts similar to dashboards but does not explicitly state dashboard creation or maintenance.

---

### gap-4 · `weak_evidence` · verdict so far: _(none)_

**JD:** …Singapore About the role You will turn raw event data into decisions for the growth team. What you will do **- Build and maintain SQL models and dashboards for funnel, retention and campaign reporting** - Partner with product managers to design and analyze A/B experiments - Own the weekly business review metric…

**Resume:** …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…

**Engine's rationale:** Cleaning and joining clickstream tables for churn analysis (cv-7) is related to funnel-like event data work but does not explicitly describe funnel reporting.

---

### gap-5 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …Singapore About the role You will turn raw event data into decisions for the growth team. What you will do **- Build and maintain SQL models and dashboards for funnel, retention and campaign reporting** - Partner with product managers to design and analyze A/B experiments - Own the weekly business review metric…

**Resume:** …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…

**Engine's rationale:** Explicitly wrote SQL queries in BigQuery to build a weekly retention report for the growth team (cv-6), directly evidencing retention reporting.

---

### gap-6 · `weak_evidence` · verdict so far: _(none)_

**JD:** …Singapore About the role You will turn raw event data into decisions for the growth team. What you will do **- Build and maintain SQL models and dashboards for funnel, retention and campaign reporting** - Partner with product managers to design and analyze A/B experiments - Own the weekly business review metric…

**Resume:** …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…

**Engine's rationale:** Presented findings to the marketing lead in a monthly review (cv-8) indicates involvement with marketing stakeholders but does not explicitly state campaign reporting.

---

### gap-7 · `missing_skill` · verdict so far: _(none)_

**JD:** …What you will do - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting **- Partner with product managers to design and analyze A/B experiments** - Own the weekly business review metrics pipeline end to end - Communicate findings to non-technical stakehol…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line explicitly mentions partnering with product managers.

---

### gap-8 · `missing_skill` · verdict so far: _(none)_

**JD:** …What you will do - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting **- Partner with product managers to design and analyze A/B experiments** - Own the weekly business review metrics pipeline end to end - Communicate findings to non-technical stakehol…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line explicitly states designing A/B experiments.

---

### gap-9 · `missing_skill` · verdict so far: _(none)_

**JD:** …What you will do - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting **- Partner with product managers to design and analyze A/B experiments** - Own the weekly business review metrics pipeline end to end - Communicate findings to non-technical stakehol…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line explicitly describes analyzing A/B experiments.

---

### gap-10 · `weak_evidence` · verdict so far: _(none)_

**JD:** …unnel, retention and campaign reporting - Partner with product managers to design and analyze A/B experiments **- Own the weekly business review metrics pipeline end to end** - Communicate findings to non-technical stakeholders What we are looking for - 3+ years of hands-on SQL agai…

**Resume:** …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…

**Engine's rationale:** Wrote SQL queries to build a weekly retention report (cv-6) demonstrates owning a weekly report but does not confirm end-to-end ownership of the full metrics pipeline.

---

### gap-11 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …t managers to design and analyze A/B experiments - Own the weekly business review metrics pipeline end to end **- Communicate findings to non-technical stakeholders** What we are looking for - 3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflak…

**Resume:** …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…

**Engine's rationale:** Presented findings to the marketing lead in a monthly review (cv-8) directly shows communicating results to non-technical stakeholders.

---

### gap-12 · `weak_evidence` · verdict so far: _(none)_

**JD:** …w metrics pipeline end to end - Communicate findings to non-technical stakeholders What we are looking for - **3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflake preferred)** - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design - Proficiency i…

**Resume:** …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…

**Engine's rationale:** Wrote SQL queries in BigQuery (cv-6) shows hands-on SQL against a data warehouse but does not provide evidence of 3+ years of experience.

---

### gap-13 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …chnical stakeholders What we are looking for - 3+ years of hands-on SQL against a production data warehouse ( **BigQuery** or Snowflake preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, experimen…

**Resume:** …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…

**Engine's rationale:** Wrote SQL queries in BigQuery to build a weekly retention report (cv-6), directly evidencing BigQuery experience.

---

### gap-14 · `missing_skill` · verdict so far: _(none)_

**JD:** …eholders What we are looking for - 3+ years of hands-on SQL against a production data warehouse (BigQuery or **Snowflake** preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design - Pr…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line mentions Snowflake.

---

### gap-15 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …looking for - 3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflake preferred) **- Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design** - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looke…

**Resume:** …TIMOTHY TAN MSBA Candidate, National University of Singapore — graduating Aug 2026 EDUCATION **MSc Business Analytics, NUS. Coursework: statistics, machine learning, data management.** BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) - Wrote SQL qu…

**Engine's rationale:** MSc Business Analytics with coursework in statistics (cv-3) demonstrates a formal grounding in statistics.

---

### gap-16 · `missing_skill` · verdict so far: _(none)_

**JD:** …n SQL against a production data warehouse (BigQuery or Snowflake preferred) - Strong grounding in statistics: **hypothesis testing** , confidence intervals, experiment design - Proficiency in Python for analysis (pandas, notebooks) - Experienc…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** None of the provided lines explicitly mention hypothesis testing.

---

### gap-17 · `missing_skill` · verdict so far: _(none)_

**JD:** …uction data warehouse (BigQuery or Snowflake preferred) - Strong grounding in statistics: hypothesis testing, **confidence intervals** , experiment design - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** None of the provided lines explicitly mention confidence intervals.

---

### gap-18 · `missing_skill` · verdict so far: _(none)_

**JD:** …(BigQuery or Snowflake preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, **experiment design** - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looke…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No line explicitly describes experiment design.

---

### gap-19 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …lake preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design **- Proficiency in Python for analysis (pandas, notebooks)** - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytics…

**Resume:** …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…

**Engine's rationale:** Cleaned and joined clickstream tables with pandas (cv-7) demonstrates applied proficiency in Python for analysis.

---

### gap-20 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …statistics: hypothesis testing, confidence intervals, experiment design - Proficiency in Python for analysis ( **pandas** , notebooks) - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and version-controll…

**Resume:** …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…

**Engine's rationale:** Explicit use of pandas to clean and join clickstream tables for analysis (cv-7) directly evidences pandas experience.

---

### gap-21 · `missing_skill` · verdict so far: _(none)_

**JD:** …cs: hypothesis testing, confidence intervals, experiment design - Proficiency in Python for analysis (pandas, **notebooks** ) - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytic…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line explicitly mentions using notebooks.

---

### gap-22 · `weak_evidence` · verdict so far: _(none)_

**JD:** …sis testing, confidence intervals, experiment design - Proficiency in Python for analysis (pandas, notebooks) **- Experience with a BI tool such as Tableau or Looker** - Familiarity with dbt and version-controlled analytics workflows is a plus - Excellent written and verbal co…

**Resume:** …king - Automated a monthly report with VBA macros SKILLS SQL (BigQuery), Python (pandas, matplotlib), Excel, **Tableau (coursework only)** …

**Engine's rationale:** Tableau coursework (cv-15) indicates exposure to a BI tool but is qualified as coursework only, not professional experience.

---

### gap-23 · `weak_evidence` · verdict so far: _(none)_

**JD:** …xperiment design - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as **Tableau** or Looker - Familiarity with dbt and version-controlled analytics workflows is a plus - Excellent written and…

**Resume:** …king - Automated a monthly report with VBA macros SKILLS SQL (BigQuery), Python (pandas, matplotlib), Excel, **Tableau (coursework only)** …

**Engine's rationale:** Tableau is listed as coursework only (cv-15), showing familiarity but not professional Tableau experience.

---

### gap-24 · `missing_skill` · verdict so far: _(none)_

**JD:** …esign - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or **Looker** - Familiarity with dbt and version-controlled analytics workflows is a plus - Excellent written and verbal co…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line mentions Looker.

---

### gap-25 · `missing_skill` · verdict so far: _(none)_

**JD:** …Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looker **- Familiarity with dbt and version-controlled analytics workflows is a plus** - Excellent written and verbal communication in English…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** None of the provided lines mention dbt or version-controlled analytics workflows.

---

### gap-26 · `missing_skill` · verdict so far: _(none)_

**JD:** …hon for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looker - Familiarity with **dbt** and version-controlled analytics workflows is a plus - Excellent written and verbal communication in English…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line explicitly mentions dbt.

---

### gap-27 · `missing_skill` · verdict so far: _(none)_

**JD:** …analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and **version-controlled analytics workflows** is a plus - Excellent written and verbal communication in English…

**Resume:** _(resume silent — no quote)_

**Engine's rationale:** No resume line explicitly references version-controlled analytics workflows or tools like git.

---

### gap-28 · `weak_evidence` · verdict so far: _(none)_

**JD:** …BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytics workflows is a plus **- Excellent written and verbal communication in English** …

**Resume:** …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…

**Engine's rationale:** Presented findings to the marketing lead in a monthly review (cv-8) demonstrates verbal communication to stakeholders but does not explicitly evidence strong written communication.

---

### gap-29 · `strong_differentiator` · verdict so far: _(none)_

**JD:** …BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytics workflows is a plus **- Excellent written and verbal communication in English** …

**Resume:** …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…

**Engine's rationale:** Presenting findings to the marketing lead in a monthly review (cv-8) directly shows verbal communication with non-technical stakeholders.

---

## JD coverage map — sweep the `·` lines for missedRequirements

```
· Data Analyst — Growth Team
· Acme Commerce Pte Ltd, Singapore

· About the role
✓ You will turn raw event data into decisions for the growth team.

· What you will do
✓ - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting
✓ - Partner with product managers to design and analyze A/B experiments
✓ - Own the weekly business review metrics pipeline end to end
✓ - Communicate findings to non-technical stakeholders

· What we are looking for
✓ - 3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflake preferred)
✓ - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design
✓ - Proficiency in Python for analysis (pandas, notebooks)
✓ - Experience with a BI tool such as Tableau or Looker
✓ - Familiarity with dbt and version-controlled analytics workflows is a plus
✓ - Excellent written and verbal communication in English

```
