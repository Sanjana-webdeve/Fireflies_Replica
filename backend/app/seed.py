"""Seeds realistic demo data on first run (only when the DB is empty)."""
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import ActionItem, Chapter, Meeting, Summary, User
from .services.meeting_service import DEFAULT_USER_ID, create_meeting
from .services.parser import parse_transcript

SEEDS = [
    {
        "title": "Q4 Product Roadmap Planning", "days": 0, "hour": 10, "platform": "Zoom",
        "tags": ["product", "planning"],
        "transcript": """
00:05 Sarah Chen: Thanks everyone for joining. Today we need to lock the Q4 roadmap and agree on what ships before the holiday freeze.
00:22 Marcus Johnson: Before we start, engineering capacity is down about twenty percent because two people are on leave in November.
00:41 Sarah Chen: Understood. Let's start with the biggest bet, the new onboarding flow. Priya, where is design on that?
00:58 Priya Patel: The high-fidelity mockups are done. We tested them with eight customers and seven finished setup in under three minutes.
01:20 Daniel Kim: That's a big improvement. Our current activation rate is stuck around forty percent, so this is the number one priority for growth.
01:42 Marcus Johnson: I can commit to shipping onboarding by October 28th if we pause the reporting revamp.
02:05 Sarah Chen: I think that's the right trade-off. Let's decide to move the reporting revamp to Q1.
02:20 Daniel Kim: Agreed. Sales can live with that as long as we keep the CSV export fix in this quarter.
02:44 Marcus Johnson: The CSV export fix is small. I'll take it and have it done by next Friday.
03:05 Sarah Chen: Great. Next topic, pricing page experiments. Daniel, what do you need?
03:22 Daniel Kim: I'd like to A/B test two layouts, but I need analytics events instrumented first.
03:45 Priya Patel: I can design both variants this week. I'll share them in Figma by Wednesday.
04:10 Sarah Chen: Perfect. I'll write up the roadmap decisions and send them to leadership by end of day tomorrow.
04:32 Marcus Johnson: One risk: the onboarding launch depends on the new email provider migration, which isn't finished.
04:55 Sarah Chen: Good catch. Marcus, please sync with DevOps on the migration timeline and report back at Thursday's standup.
05:15 Sarah Chen: Alright, that's everything. Thanks all, great discussion.
""",
        "overview": "The team finalized the Q4 roadmap. The redesigned onboarding flow became the top priority after testing showed seven of eight customers completing setup in under three minutes, with the goal of lifting a stalled 40% activation rate. To protect the October 28 ship date despite reduced capacity, the reporting revamp was moved to Q1, while the small CSV export fix stays in Q4.",
        "bullets": [
            "Engineering capacity is down ~20% in November due to leave.",
            "Onboarding flow ships by October 28; reporting revamp deferred to Q1.",
            "CSV export fix stays in Q4 to satisfy sales needs.",
            "Pricing page A/B test requires analytics instrumentation first.",
            "Risk: onboarding launch depends on the unfinished email provider migration.",
        ],
        "keywords": ["onboarding", "roadmap", "reporting", "activation", "pricing", "migration"],
        "chapters": [
            ("Capacity & goals", 5, "Kickoff and a heads-up that engineering capacity is reduced by about twenty percent."),
            ("Onboarding flow redesign", 41, "Design validated the new flow with customers; growth sees it as the top priority."),
            ("Reporting revamp trade-off", 102, "Agreed to move the reporting revamp to Q1 and keep the CSV export fix."),
            ("Pricing page experiments", 185, "Plan to A/B test two layouts once analytics events are in place."),
            ("Risks & wrap-up", 272, "Email provider migration flagged as a dependency; next steps assigned."),
        ],
        "actions": [
            ("Ship the new onboarding flow by October 28", "Marcus Johnson", 22, False),
            ("Fix the CSV export bug", "Marcus Johnson", 5, False),
            ("Share both pricing page design variants in Figma", "Priya Patel", 3, False),
            ("Write up roadmap decisions and send to leadership", "Sarah Chen", 1, True),
            ("Sync with DevOps on email migration timeline", "Marcus Johnson", 2, False),
        ],
    },
    {
        "title": "Weekly Engineering Standup", "days": 1, "hour": 9, "platform": "Google Meet",
        "tags": ["engineering", "standup"],
        "transcript": """
00:04 Marcus Johnson: Morning team. Quick round of updates, blockers first.
00:15 Elena Rossi: I'm blocked on the payments webhook. Staging keeps returning a 502 and I can't reproduce it locally.
00:38 Tom Becker: That sounds like the load balancer timeout. I'll check the staging config this morning and ping you.
01:00 Elena Rossi: Thanks Tom. Other than that, the invoice PDF generation is merged and in review.
01:22 Aisha Khan: I finished the search indexing work. Query latency dropped from eight hundred milliseconds to about two hundred.
01:48 Marcus Johnson: Excellent result. Can you write a short doc about the indexing approach so others can reuse it?
02:08 Aisha Khan: Sure, I'll publish it to the wiki by Wednesday.
02:25 Tom Becker: On my side, I'm upgrading the database to the latest minor version tonight. Expect a ten minute maintenance window at eleven p.m.
02:52 Marcus Johnson: Please post the maintenance notice in the status channel today.
03:10 Tom Becker: Will do. I'll also add a rollback plan to the runbook.
03:30 Elena Rossi: Quick question, are we still planning the code freeze for Friday?
03:44 Marcus Johnson: Yes, code freeze is Friday at five p.m. Please get your pull requests reviewed by Thursday.
04:05 Marcus Johnson: That's all. Thanks everyone.
""",
        "overview": "The standup surfaced one blocker: a 502 error on the payments webhook in staging, likely a load balancer timeout. Search indexing work cut query latency from 800ms to about 200ms. A database upgrade is scheduled tonight with a ten-minute maintenance window, and the code freeze remains Friday at 5 p.m.",
        "bullets": [
            "Payments webhook blocked by staging 502, suspected load balancer timeout.",
            "Search latency improved ~4x (800ms → 200ms).",
            "Database minor-version upgrade tonight at 11 p.m. with a rollback plan.",
            "Code freeze Friday 5 p.m.; PR reviews due Thursday.",
        ],
        "keywords": ["staging", "webhook", "latency", "maintenance", "freeze", "database"],
        "chapters": [
            ("Blockers: payments webhook", 15, "Staging returns 502s; Tom will inspect the load balancer config."),
            ("Search indexing results", 82, "Latency dropped fourfold; documentation requested."),
            ("Database maintenance", 145, "Upgrade planned tonight with a status notice and rollback plan."),
            ("Code freeze reminder", 210, "Freeze is Friday at five; reviews due Thursday."),
        ],
        "actions": [
            ("Check the staging load balancer timeout config", "Tom Becker", 0, False),
            ("Publish the search indexing doc to the wiki", "Aisha Khan", 2, False),
            ("Post the database maintenance notice in the status channel", "Tom Becker", 0, True),
            ("Add a rollback plan to the runbook", "Tom Becker", 1, False),
        ],
    },
    {
        "title": "Customer Discovery Call – Acme Corp", "days": 3, "hour": 15, "platform": "Microsoft Teams",
        "tags": ["sales", "customer"],
        "transcript": """
00:06 Daniel Kim: Hi Jennifer, thanks for making time. I'd love to understand how your team runs meetings today and where it hurts.
00:24 Jennifer Wu: Sure. We have about forty client calls a week and notes are a mess. Everyone writes in a different place, and follow-ups get lost.
00:52 Daniel Kim: How much time would you say your managers spend on manual note-taking and follow-up emails?
01:10 Jennifer Wu: Probably five hours a week per manager. It's a real cost, and we've missed commitments to clients because of it.
01:38 Rahul Mehta: That's exactly what we automate. Every call is transcribed, summarized, and action items are pushed to your CRM.
02:00 Jennifer Wu: CRM sync is a must-have for us. We use Salesforce. Security is the other concern, we're in a regulated industry.
02:28 Rahul Mehta: We support SSO and SOC 2 compliance, and I can send our security whitepaper after this call.
02:52 Jennifer Wu: That would help. What does pricing look like for around sixty seats?
03:12 Daniel Kim: For sixty seats on the annual plan, it would be roughly forty five hundred dollars per month, with a volume discount available.
03:38 Jennifer Wu: That's within budget, but I'll need approval from our CFO. Can we do a pilot first with two teams?
04:00 Daniel Kim: Absolutely. We can set up a thirty day pilot for twelve users starting next Monday.
04:24 Jennifer Wu: Great. Let's schedule a follow-up for next Thursday to review the pilot plan with my IT lead.
04:45 Daniel Kim: I'll send the invite today along with a proposal. Thanks Jennifer.
""",
        "overview": "Acme Corp runs about forty client calls per week and loses roughly five hours per manager weekly to manual notes and follow-ups, causing missed client commitments. Salesforce sync and security compliance are must-haves. Pricing for sixty seats was quoted near $4,500/month; because CFO approval is needed, both sides agreed on a 30-day, 12-user pilot starting next Monday.",
        "bullets": [
            "Pain point: scattered notes and lost follow-ups across ~40 weekly calls.",
            "Must-haves: Salesforce CRM sync, SSO and SOC 2 compliance.",
            "Quote: ~$4,500/month for 60 seats on an annual plan.",
            "CFO approval required, so a 30-day pilot for 12 users was proposed.",
        ],
        "keywords": ["pilot", "salesforce", "security", "pricing", "follow-ups", "seats"],
        "chapters": [
            ("Current pain points", 6, "Acme loses about five hours per manager each week to manual notes."),
            ("Requirements: CRM & security", 98, "Salesforce sync and regulated-industry security are critical."),
            ("Pricing discussion", 172, "Sixty seats quoted around $4,500 per month with volume discounts."),
            ("Pilot & next steps", 218, "A 30-day pilot for twelve users and a follow-up next Thursday."),
        ],
        "actions": [
            ("Send the security whitepaper to Jennifer", "Rahul Mehta", 0, False),
            ("Send follow-up invite and proposal", "Daniel Kim", 0, True),
            ("Set up 30-day pilot for 12 users", "Rahul Mehta", 4, False),
            ("Get CFO approval for the pilot", "Jennifer Wu", 6, False),
        ],
    },
    {
        "title": "Marketing Campaign Kickoff", "days": 6, "hour": 11, "platform": "Zoom",
        "tags": ["marketing", "planning"],
        "transcript": """
00:05 Olivia Martin: Welcome to the launch campaign kickoff. Our goal is twenty thousand signups in six weeks with a budget of fifty thousand dollars.
00:30 Sam Rivera: For content, I'm proposing three pillars: productivity tips, customer stories, and a product walkthrough series.
00:58 Nina Gomez: On social, LinkedIn drives the most qualified traffic for us, so I'd put sixty percent of paid spend there.
01:22 Olivia Martin: Makes sense. Let's allocate sixty percent to LinkedIn, twenty to Google Search, and twenty to experiments.
01:48 Sam Rivera: We should lock the launch date. Is November twelfth realistic for the landing page?
02:10 Nina Gomez: The landing page copy is ready, but we still need final visuals from design.
02:32 Olivia Martin: I'll follow up with design today and get a firm delivery date for the visuals.
02:55 Sam Rivera: I can draft the first two customer stories by next Tuesday if sales sends me three contacts.
03:20 Olivia Martin: I'll ask Daniel for the customer contacts. Nina, what about the webinar idea?
03:42 Nina Gomez: A launch webinar with a guest speaker would help. I can shortlist five speakers by Friday.
04:08 Olivia Martin: Great. We'll track weekly signups and cost per acquisition in a shared dashboard.
04:30 Sam Rivera: I'll set up the dashboard template and share it before the next sync.
04:50 Olivia Martin: Perfect. Let's meet again next Monday. Thanks everyone.
""",
        "overview": "The marketing team set a goal of 20,000 signups in six weeks on a $50,000 budget. Paid spend will be split 60% LinkedIn, 20% Google Search and 20% experiments, supported by three content pillars. The November 12 landing page launch is pending final design visuals, and a launch webinar and a shared performance dashboard were added to the plan.",
        "bullets": [
            "Goal: 20,000 signups in six weeks with a $50k budget.",
            "Budget split: 60% LinkedIn, 20% Google Search, 20% experiments.",
            "Content pillars: productivity tips, customer stories, product walkthroughs.",
            "Target launch date November 12, pending final visuals from design.",
        ],
        "keywords": ["campaign", "linkedin", "landing", "webinar", "signups", "dashboard"],
        "chapters": [
            ("Goals & budget", 5, "Targets of 20,000 signups within six weeks and a $50k budget."),
            ("Content & channel strategy", 30, "Three content pillars and a 60/20/20 paid spend allocation."),
            ("Launch date & landing page", 108, "November 12 is feasible once design delivers final visuals."),
            ("Webinar & measurement", 200, "Launch webinar speakers shortlisted; weekly dashboard for signups and CPA."),
        ],
        "actions": [
            ("Get a firm delivery date for final landing page visuals", "Olivia Martin", 0, False),
            ("Request three customer contacts from sales", "Olivia Martin", 1, True),
            ("Draft the first two customer stories", "Sam Rivera", 5, False),
            ("Shortlist five webinar guest speakers", "Nina Gomez", 3, False),
            ("Set up the signups and CPA dashboard template", "Sam Rivera", 4, False),
        ],
    },
]


def ensure_user(db: Session) -> None:
    if not db.get(User, DEFAULT_USER_ID):
        db.add(User(id=DEFAULT_USER_ID, name="Alex Morgan", email="alex.morgan@example.com"))
        db.commit()


def seed_if_empty(db: Session) -> None:
    ensure_user(db)
    if db.scalar(select(func.count(Meeting.id))):
        return
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    for s in SEEDS:
        when = (now - timedelta(days=s["days"])).replace(hour=s["hour"])
        m = create_meeting(db, title=s["title"], date=when, tags=s["tags"], platform=s["platform"],
                           segments=parse_transcript(s["transcript"]), ai=False)
        m.summary = Summary(overview=s["overview"], bullets=s["bullets"], keywords=s["keywords"])
        m.chapters = [Chapter(title=t, start=st, summary=sm) for t, st, sm in s["chapters"]]
        for text, who, due, done in s["actions"]:
            m.action_items.append(ActionItem(text=text, assignee=who, completed=done,
                                             due_date=date.today() + timedelta(days=due)))
        db.commit()