# Pair 02 — adjudication review sheet (28 gaps across 19 JD requirements, 0 adjudicated)

> **Sources:** JD = `test/fixtures/jd-02.txt` · Resume = `test/fixtures/resume-02.txt`
> Verdicts go in `test/gold/pair-02.adjudication.json`
>
> GENERATED READING AID — mechanical re-presentation of pair-02.adjudication.json
> plus fixture context, grouped by shared JD requirement. No judgments live here.
>
> Per gap: `agree` · `wrong_kind:<missing_skill|weak_evidence|strong_differentiator>` · `not_a_requirement`
> Then sweep the `·` lines of the coverage map at the bottom: any requirement the
> engine never surfaced goes into `missedRequirements[]` as a verbatim JD quote.

---

## Requirement 1/19 (1 claim)

**JD:** …Platform Engineer — Data Infrastructure Northbeam Logistics Pte Ltd, Singapore About the role **You will keep the pipelines and services that move our shipment data reliable and fast.** What you will do - Operate and scale the batch pipelines that feed our data warehouse - Automate provisionin…

- **gap-1** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions maintaining pipelines, shipment data, or services related to reliability/performance.

---

## Requirement 2/19 (1 claim)

**JD:** …ole You will keep the pipelines and services that move our shipment data reliable and fast. What you will do **- Operate and scale the batch pipelines that feed our data warehouse** - Automate provisioning and deployment across our AWS environments - Improve observability, alerting and inci…

- **gap-2** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …ghtwave Media (Jul 2024–present) - Built monthly campaign performance reports in Excel for six retail clients **- Pulled ad spend and conversion numbers with basic SQL queries in the agency reporting database** - Tracked website traffic and funnel drop-off in Google Analytics - Presented quarterly results to client sta…
  - Rationale: cv-18 shows basic SQL queries against an agency reporting database but does not indicate operating or scaling batch pipelines feeding a data warehouse.

---

## Requirement 3/19 (1 claim)

**JD:** …ata reliable and fast. What you will do - Operate and scale the batch pipelines that feed our data warehouse **- Automate provisioning and deployment across our AWS environments** - Improve observability, alerting and incident response for data services - Build internal tooling so product…

- **gap-3** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line references AWS provisioning, deployment, or automation.

---

## Requirement 4/19 (3 claims)

**JD:** …tch pipelines that feed our data warehouse - Automate provisioning and deployment across our AWS environments **- Improve observability, alerting and incident response for data services** - Build internal tooling so product teams can self-serve platform resources What we are looking for - 4+ yea…

- **gap-4** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line describes work on observability, monitoring, or alerting for data services.
- **gap-5** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions improving or implementing alerting for data services.
- **gap-6** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line references incident response or related practices for data services.

---

## Requirement 5/19 (1 claim)

**JD:** …loyment across our AWS environments - Improve observability, alerting and incident response for data services **- Build internal tooling so product teams can self-serve platform resources** What we are looking for - 4+ years operating production infrastructure on AWS (EC2, S3, IAM, VPC) - Hands-on…

- **gap-7** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line describes building internal tooling or self-serve platform resources for product teams.

---

## Requirement 6/19 (1 claim)

**JD:** …services - Build internal tooling so product teams can self-serve platform resources What we are looking for **- 4+ years operating production infrastructure on AWS (EC2, S3, IAM, VPC)** - Hands-on experience deploying and running services on Kubernetes - Infrastructure as code with Terraform, r…

- **gap-8** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line indicates multi-year experience operating production AWS infrastructure.

---

## Requirement 7/19 (1 claim)

**JD:** …self-serve platform resources What we are looking for - 4+ years operating production infrastructure on AWS ( **EC2** , S3, IAM, VPC) - Hands-on experience deploying and running services on Kubernetes - Infrastructure as code wi…

- **gap-9** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions EC2 or equivalent experience.

---

## Requirement 8/19 (1 claim)

**JD:** …serve platform resources What we are looking for - 4+ years operating production infrastructure on AWS (EC2, **S3** , IAM, VPC) - Hands-on experience deploying and running services on Kubernetes - Infrastructure as code with T…

- **gap-10** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions S3 or related experience.

---

## Requirement 9/19 (1 claim)

**JD:** …e platform resources What we are looking for - 4+ years operating production infrastructure on AWS (EC2, S3, **IAM** , VPC) - Hands-on experience deploying and running services on Kubernetes - Infrastructure as code with Terraf…

- **gap-11** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line references IAM or identity/access management experience.

---

## Requirement 10/19 (1 claim)

**JD:** …tform resources What we are looking for - 4+ years operating production infrastructure on AWS (EC2, S3, IAM, **VPC** ) - Hands-on experience deploying and running services on Kubernetes - Infrastructure as code with Terraform,…

- **gap-12** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions VPC or networking experience in cloud environments.

---

## Requirement 11/19 (1 claim)

**JD:** …resources What we are looking for - 4+ years operating production infrastructure on AWS (EC2, S3, IAM, VPC) **- Hands-on experience deploying and running services on Kubernetes** - Infrastructure as code with Terraform, reviewed and applied through CI - Experience building and operating…

- **gap-13** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line indicates deploying or running services on Kubernetes.

---

## Requirement 12/19 (2 claims)

**JD:** …infrastructure on AWS (EC2, S3, IAM, VPC) - Hands-on experience deploying and running services on Kubernetes **- Infrastructure as code with Terraform, reviewed and applied through CI** - Experience building and operating Airflow DAGs for scheduled data pipelines - Proficiency writing productio…

- **gap-14** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line references Terraform or infrastructure-as-code work.
- **gap-15** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line describes reviewing or applying Terraform through CI.

---

## Requirement 13/19 (1 claim)

**JD:** …g and running services on Kubernetes - Infrastructure as code with Terraform, reviewed and applied through CI **- Experience building and operating Airflow DAGs for scheduled data pipelines** - Proficiency writing production services in Go or Python - Strong SQL and day-to-day data warehouse operatio…

- **gap-16** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions building or operating Airflow DAGs or scheduled data pipelines.

---

## Requirement 14/19 (2 claims)

**JD:** …reviewed and applied through CI - Experience building and operating Airflow DAGs for scheduled data pipelines **- Proficiency writing production services in Go or Python** - Strong SQL and day-to-day data warehouse operations (Redshift or Snowflake), including query tuning - Parti…

- **gap-17** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line demonstrates proficiency writing production services in Go.
- **gap-18** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line demonstrates proficiency writing production services in Python.

---

## Requirement 15/19 (3 claims)

**JD:** …operating Airflow DAGs for scheduled data pipelines - Proficiency writing production services in Go or Python **- Strong SQL and day-to-day data warehouse operations (Redshift or Snowflake), including query tuning** - Participation in a weekly on-call rotation for platform incidents - Clear written communication: runbooks,…

- **gap-19** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …ign calendar and budget tracker in Excel SKILLS Excel (pivot tables, VLOOKUP), PowerPoint, Google Analytics, **SQL (basic SELECT queries)** , Canva…
  - Rationale: cv-56 lists SQL (basic SELECT queries), indicating some SQL skill but not strong SQL or data-warehouse-level expertise or tuning.
- **gap-20** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line references day-to-day operations of Redshift or Snowflake/data warehouse management.
- **gap-21** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …ly campaign performance reports in Excel for six retail clients - Pulled ad spend and conversion numbers with **basic SQL queries** in the agency reporting database - Tracked website traffic and funnel drop-off in Google Analytics - Presente…
  - Rationale: cv-22 notes basic SQL queries which touches querying but does not demonstrate query tuning for data warehouses.

---

## Requirement 16/19 (1 claim)

**JD:** …roficiency writing production services in Go or Python - Strong SQL and day-to-day data warehouse operations ( **Redshift** or Snowflake), including query tuning - Participation in a weekly on-call rotation for platform incidents - C…

- **gap-22** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions experience with Amazon Redshift.

---

## Requirement 17/19 (1 claim)

**JD:** …riting production services in Go or Python - Strong SQL and day-to-day data warehouse operations (Redshift or **Snowflake** ), including query tuning - Participation in a weekly on-call rotation for platform incidents - Clear written…

- **gap-23** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line mentions experience with Snowflake.

---

## Requirement 18/19 (1 claim)

**JD:** …Python - Strong SQL and day-to-day data warehouse operations (Redshift or Snowflake), including query tuning **- Participation in a weekly on-call rotation for platform incidents** - Clear written communication: runbooks, postmortems and incident updates…

- **gap-24** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line indicates participation in an on-call rotation for platform incidents.

---

## Requirement 19/19 (4 claims)

**JD:** …ift or Snowflake), including query tuning - Participation in a weekly on-call rotation for platform incidents **- Clear written communication: runbooks, postmortems and incident updates** …

- **gap-25** · `weak_evidence` · verdict so far: _(none)_
  - Resume: …QL queries in the agency reporting database - Tracked website traffic and funnel drop-off in Google Analytics **- Presented quarterly results to client stakeholders in PowerPoint** Marketing Intern, Lion City Retail Group (2023) - Scheduled social media posts and compiled engagement summa…
  - Rationale: cv-30 shows presenting quarterly results to stakeholders, evidencing communication skills but not runbooks, postmortems, or incident-update writing specifically.
- **gap-26** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line indicates writing runbooks or operational documentation.
- **gap-27** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line indicates writing postmortems.
- **gap-28** · `missing_skill` · verdict so far: _(none)_
  - Resume: _(resume silent — no quote)_
  - Rationale: No resume line indicates writing incident updates.

---

## JD coverage map — sweep the `·` lines for missedRequirements

```
· Platform Engineer — Data Infrastructure
· Northbeam Logistics Pte Ltd, Singapore

· About the role
✓ You will keep the pipelines and services that move our shipment data reliable and fast.

· What you will do
✓ - Operate and scale the batch pipelines that feed our data warehouse
✓ - Automate provisioning and deployment across our AWS environments
✓ - Improve observability, alerting and incident response for data services
✓ - Build internal tooling so product teams can self-serve platform resources

· What we are looking for
✓ - 4+ years operating production infrastructure on AWS (EC2, S3, IAM, VPC)
✓ - Hands-on experience deploying and running services on Kubernetes
✓ - Infrastructure as code with Terraform, reviewed and applied through CI
✓ - Experience building and operating Airflow DAGs for scheduled data pipelines
✓ - Proficiency writing production services in Go or Python
✓ - Strong SQL and day-to-day data warehouse operations (Redshift or Snowflake), including query tuning
✓ - Participation in a weekly on-call rotation for platform incidents
✓ - Clear written communication: runbooks, postmortems and incident updates

```
