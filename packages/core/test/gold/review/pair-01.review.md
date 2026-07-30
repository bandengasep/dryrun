# Pair 01 — adjudication review sheet (29 gaps across 22 JD requirements, 0 adjudicated)

> **Sources:** JD = `test/fixtures/jd-01.txt` · Resume = `test/fixtures/resume-01.txt`
> Verdicts go in `test/gold/pair-01.adjudication.json`
>
> GENERATED READING AID — mechanical re-presentation of pair-01.adjudication.json
> plus fixture context, grouped by shared JD requirement. No judgments live here.
>
> Per gap: `agree` · `wrong_kind:<missing_skill|weak_evidence|strong_differentiator>` · `not_a_requirement`
> Then sweep the `·` lines of the coverage map at the bottom: any requirement the
> engine never surfaced goes into `missedRequirements[]` as a verbatim JD quote.

---

## Requirement 1/22 (1 claim)

**JD:** …Data Analyst — Growth Team Acme Commerce Pte Ltd, Singapore About the role **You will turn raw event data into decisions for the growth team.** What you will do - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting…

- **gap-1** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…
  - Rationale: Cleaning and joining clickstream tables for an ad-hoc churn analysis (cv-7) shows working with raw event data but does not explicitly state driving decisions for the growth team.

---

## Requirement 2/22 (5 claims)

**JD:** …Singapore About the role You will turn raw event data into decisions for the growth team. What you will do **- Build and maintain SQL models and dashboards for funnel, retention and campaign reporting** - Partner with product managers to design and analyze A/B experiments - Own the weekly business review metric…

- **gap-2** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…
  - Rationale: Wrote SQL queries in BigQuery to build a weekly retention report for the growth team (cv-6) directly demonstrates building SQL models for reporting.
- **gap-3** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …- Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024) **- Built Excel models for branch performance tracking** - Automated a monthly report with VBA macros SKILLS SQL (BigQuery), Python (pandas, matplotlib), Excel, Tabl…
  - Rationale: Built Excel models for branch performance tracking (cv-10) suggests producing analytic artifacts similar to dashboards but does not explicitly state dashboard creation or maintenance.
- **gap-4** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…
  - Rationale: Cleaning and joining clickstream tables for churn analysis (cv-7) is related to funnel-like event data work but does not explicitly describe funnel reporting.
- **gap-5** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…
  - Rationale: Explicitly wrote SQL queries in BigQuery to build a weekly retention report for the growth team (cv-6), directly evidencing retention reporting.
- **gap-6** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…
  - Rationale: Presented findings to the marketing lead in a monthly review (cv-8) indicates involvement with marketing stakeholders but does not explicitly state campaign reporting.

---

## Requirement 3/22 (3 claims)

**JD:** …What you will do - Build and maintain SQL models and dashboards for funnel, retention and campaign reporting **- Partner with product managers to design and analyze A/B experiments** - Own the weekly business review metrics pipeline end to end - Communicate findings to non-technical stakehol…

- **gap-7** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line explicitly mentions partnering with product managers.
- **gap-8** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line explicitly states designing A/B experiments.
- **gap-9** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line explicitly describes analyzing A/B experiments.

---

## Requirement 4/22 (1 claim)

**JD:** …unnel, retention and campaign reporting - Partner with product managers to design and analyze A/B experiments **- Own the weekly business review metrics pipeline end to end** - Communicate findings to non-technical stakeholders What we are looking for - 3+ years of hands-on SQL agai…

- **gap-10** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…
  - Rationale: Wrote SQL queries to build a weekly retention report (cv-6) demonstrates owning a weekly report but does not confirm end-to-end ownership of the full metrics pipeline.

---

## Requirement 5/22 (1 claim)

**JD:** …t managers to design and analyze A/B experiments - Own the weekly business review metrics pipeline end to end **- Communicate findings to non-technical stakeholders** What we are looking for - 3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflak…

- **gap-11** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…
  - Rationale: Presented findings to the marketing lead in a monthly review (cv-8) directly shows communicating results to non-technical stakeholders.

---

## Requirement 6/22 (1 claim)

**JD:** …w metrics pipeline end to end - Communicate findings to non-technical stakeholders What we are looking for - **3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflake preferred)** - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design - Proficiency i…

- **gap-12** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…
  - Rationale: Wrote SQL queries in BigQuery (cv-6) shows hands-on SQL against a data warehouse but does not provide evidence of 3+ years of experience.

---

## Requirement 7/22 (1 claim)

**JD:** …chnical stakeholders What we are looking for - 3+ years of hands-on SQL against a production data warehouse ( **BigQuery** or Snowflake preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, experimen…

- **gap-13** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …ta management. BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) **- Wrote SQL queries in BigQuery to build a weekly retention report for the growth team** - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis - Presented findings to the…
  - Rationale: Wrote SQL queries in BigQuery to build a weekly retention report (cv-6), directly evidencing BigQuery experience.

---

## Requirement 8/22 (1 claim)

**JD:** …eholders What we are looking for - 3+ years of hands-on SQL against a production data warehouse (BigQuery or **Snowflake** preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design - Pr…

- **gap-14** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions Snowflake.

---

## Requirement 9/22 (1 claim)

**JD:** …looking for - 3+ years of hands-on SQL against a production data warehouse (BigQuery or Snowflake preferred) **- Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design** - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looke…

- **gap-15** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …TIMOTHY TAN MSBA Candidate, National University of Singapore — graduating Aug 2026 EDUCATION **MSc Business Analytics, NUS. Coursework: statistics, machine learning, data management.** BBA (Finance), Universitas Indonesia. EXPERIENCE Data Analyst Intern, ShopFast (Jan–Jun 2026) - Wrote SQL qu…
  - Rationale: MSc Business Analytics with coursework in statistics (cv-3) demonstrates a formal grounding in statistics.

---

## Requirement 10/22 (1 claim)

**JD:** …n SQL against a production data warehouse (BigQuery or Snowflake preferred) - Strong grounding in statistics: **hypothesis testing** , confidence intervals, experiment design - Proficiency in Python for analysis (pandas, notebooks) - Experienc…

- **gap-16** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: None of the provided lines explicitly mention hypothesis testing.

---

## Requirement 11/22 (1 claim)

**JD:** …uction data warehouse (BigQuery or Snowflake preferred) - Strong grounding in statistics: hypothesis testing, **confidence intervals** , experiment design - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such…

- **gap-17** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: None of the provided lines explicitly mention confidence intervals.

---

## Requirement 12/22 (1 claim)

**JD:** …(BigQuery or Snowflake preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, **experiment design** - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looke…

- **gap-18** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No line explicitly describes experiment design.

---

## Requirement 13/22 (1 claim)

**JD:** …lake preferred) - Strong grounding in statistics: hypothesis testing, confidence intervals, experiment design **- Proficiency in Python for analysis (pandas, notebooks)** - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytics…

- **gap-19** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…
  - Rationale: Cleaned and joined clickstream tables with pandas (cv-7) demonstrates applied proficiency in Python for analysis.

---

## Requirement 14/22 (1 claim)

**JD:** …statistics: hypothesis testing, confidence intervals, experiment design - Proficiency in Python for analysis ( **pandas** , notebooks) - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and version-controll…

- **gap-20** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …hopFast (Jan–Jun 2026) - Wrote SQL queries in BigQuery to build a weekly retention report for the growth team **- Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis** - Presented findings to the marketing lead in a monthly review Business Analyst Intern, Bank Sentosa (2024)…
  - Rationale: Explicit use of pandas to clean and join clickstream tables for analysis (cv-7) directly evidences pandas experience.

---

## Requirement 15/22 (1 claim)

**JD:** …cs: hypothesis testing, confidence intervals, experiment design - Proficiency in Python for analysis (pandas, **notebooks** ) - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytic…

- **gap-21** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line explicitly mentions using notebooks.

---

## Requirement 16/22 (1 claim)

**JD:** …sis testing, confidence intervals, experiment design - Proficiency in Python for analysis (pandas, notebooks) **- Experience with a BI tool such as Tableau or Looker** - Familiarity with dbt and version-controlled analytics workflows is a plus - Excellent written and verbal co…

- **gap-22** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …king - Automated a monthly report with VBA macros SKILLS SQL (BigQuery), Python (pandas, matplotlib), Excel, **Tableau (coursework only)** …
  - Rationale: Tableau coursework (cv-15) indicates exposure to a BI tool but is qualified as coursework only, not professional experience.

---

## Requirement 17/22 (1 claim)

**JD:** …xperiment design - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as **Tableau** or Looker - Familiarity with dbt and version-controlled analytics workflows is a plus - Excellent written and…

- **gap-23** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …king - Automated a monthly report with VBA macros SKILLS SQL (BigQuery), Python (pandas, matplotlib), Excel, **Tableau (coursework only)** …
  - Rationale: Tableau is listed as coursework only (cv-15), showing familiarity but not professional Tableau experience.

---

## Requirement 18/22 (1 claim)

**JD:** …esign - Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or **Looker** - Familiarity with dbt and version-controlled analytics workflows is a plus - Excellent written and verbal co…

- **gap-24** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions Looker.

---

## Requirement 19/22 (1 claim)

**JD:** …Proficiency in Python for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looker **- Familiarity with dbt and version-controlled analytics workflows is a plus** - Excellent written and verbal communication in English…

- **gap-25** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: None of the provided lines mention dbt or version-controlled analytics workflows.

---

## Requirement 20/22 (1 claim)

**JD:** …hon for analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looker - Familiarity with **dbt** and version-controlled analytics workflows is a plus - Excellent written and verbal communication in English…

- **gap-26** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line explicitly mentions dbt.

---

## Requirement 21/22 (1 claim)

**JD:** …analysis (pandas, notebooks) - Experience with a BI tool such as Tableau or Looker - Familiarity with dbt and **version-controlled analytics workflows** is a plus - Excellent written and verbal communication in English…

- **gap-27** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line explicitly references version-controlled analytics workflows or tools like git.

---

## Requirement 22/22 (2 claims)

**JD:** …BI tool such as Tableau or Looker - Familiarity with dbt and version-controlled analytics workflows is a plus **- Excellent written and verbal communication in English** …

- **gap-28** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…
  - Rationale: Presented findings to the marketing lead in a monthly review (cv-8) demonstrates verbal communication to stakeholders but does not explicitly evidence strong written communication.
- **gap-29** · `strong_differentiator` · verdict so far: _(none)_
  - Resume: …n report for the growth team - Cleaned and joined clickstream tables with pandas for an ad-hoc churn analysis **- Presented findings to the marketing lead in a monthly review** Business Analyst Intern, Bank Sentosa (2024) - Built Excel models for branch performance tracking - Automate…
  - Rationale: Presenting findings to the marketing lead in a monthly review (cv-8) directly shows verbal communication with non-technical stakeholders.

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
