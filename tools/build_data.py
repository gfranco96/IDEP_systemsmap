import json, os, collections

OUT = "/home/claude/pkg/data"
os.makedirs(OUT, exist_ok=True)

nodes, edges, chains, loops = [], [], [], []
_e = [0]


def N(**k):
    nodes.append(k)
    return k["id"]


def E(src, tgt, arrow, valence, conn, prov="explicit", chain=None, loop=None,
      relation=None, closure=False, note=None):
    _e[0] += 1
    e = {
        "id": f"e{_e[0]:03d}",
        "source": src,
        "target": tgt,
        "arrowType": arrow,
        "valence": valence,
        "connectionTypes": conn,
        "provenance": prov,
        "chainId": chain,
        "loopId": loop,
    }
    if relation:
        e["relation"] = relation
    if closure:
        e["loopClosure"] = True
    if note:
        e["note"] = note
    edges.append(e)
    return e["id"]


# ---------------------------------------------------------------- CURRENTS
CURRENTS = [
    {"id": "education", "label": "Developmental and educational system", "role": "current", "order": 1,
     "color": "#0072B2", "systemNodeId": "sys_education"},
    {"id": "family", "label": "Family, peer, and community system", "role": "current", "order": 2,
     "color": "#009E73", "systemNodeId": "sys_family"},
    {"id": "market", "label": "Market, labor, and consumer system", "role": "current", "order": 3,
     "color": "#E69F00", "systemNodeId": "sys_market"},
    {"id": "platform", "label": "Media, platform, data, and AI system", "role": "current", "order": 4,
     "color": "#CC79A7", "systemNodeId": "sys_platform"},
    {"id": "cultural", "label": "Cultural moral system", "role": "overlay", "order": 5,
     "color": "#6A51A3", "systemNodeId": "sys_cultural",
     "description": "Beliefs about worth, maturity, success, discipline, leisure, play, adulthood, and \u201cwasted time.\u201d"},
]

# ------------------------------------------------------------------ STAGES
STAGES = [
    ("stage_childhood", "Childhood", "Joy is expected, scaffolded, and increasingly assessed",
     "Prenatal/family formation through approximately age 10\u201312.",
     "From embodied and relational joy toward school-mediated evaluation and structured accomplishment.", 1),
    ("stage_adolescence", "Adolescence", "Joy becomes socially mediated, visible, and comparative",
     "Approximately 12\u201318/early 20s.",
     "Play does not disappear; it becomes socially regulated through identity, status, surveillance, credentials, and platform visibility.", 2),
    ("stage_adulthood", "Adulthood", "Joy must be justified, optimized, purchased, or made productive",
     "Approximately 25 onward, with subgroups determined less by age alone than by work, care, economic security, and health.",
     "Play is often treated as a reward after work, a purchasable experience, a wellness tool, a performance of identity, or an optimization mechanism\u2014rather than a legitimate dimension of ordinary life.", 3),
]
for sid, label, tag, rng, trans, o in STAGES:
    N(id=sid, type="stage", label=label, tagline=tag, ageRangeLabel=rng, mainTransition=trans,
      stage=sid.replace("stage_", ""), order=o, sourceSection=f"{label} parent node")
for a, b in [("stage_childhood", "stage_adolescence"), ("stage_adolescence", "stage_adulthood")]:
    E(a, b, "forward", "neutral", ["developmental / institutional transition"], prov="inferred",
      note="Timeline progression between parent stages.")

# --------------------------------------------------------------- SUBSTAGES
# (id, stage, label, ageLabel, ageStart, ageEnd, joyMode, rewardShift, leadsTo[])
SUBS = [
    ("sub_infancy", "childhood", "Infancy and early caregiving", "birth\u201318 months", 0, 1.5,
     "Sensory pleasure, attachment, movement, shared attention, laughter, repetition",
     "Caregiver attunement and comfort are the principal regulatory system; joy is largely relational and embodied",
     ["Secure exploration", "Early agency", "Social trust", "Capacity to seek connection"]),
    ("sub_toddler", "childhood", "Toddlerhood and early autonomy", "18 months\u20133 years", 1.5, 3,
     "\u201cI do it myself,\u201d imitation, pretend, messy experimentation, object play",
     "Adult approval and boundaries enter more visibly; praise can either support agency or become controlling",
     ["Autonomy development", "Early internalization of \u201cgood\u201d versus \u201cbad\u201d behavior"]),
    ("sub_early_childhood", "childhood", "Early childhood / imaginative play", "3\u20136 years", 3, 6,
     "Pretend worlds, role play, absurdity, storytelling, social play, sensory making",
     "Preschool routines, behavioral charts, developmental milestones, and branded media begin organizing play",
     ["Play scripts", "Gender norms", "Consumer desire", "Early performance orientation"]),
    ("sub_middle_childhood", "childhood", "Middle childhood / school-age play", "6\u201311 years", 6, 11,
     "Peer play, games, collecting, making, competition, skill-building, rule negotiation",
     "Grades, standardized comparison, sports ranking, extracurricular credentials, screen engagement metrics become more salient",
     ["Competence identity", "Peer status sensitivity", "Achievement\u2013worth association"]),
    ("sub_early_transition", "childhood", "Early transition to adolescence", "10\u201313 years", 10, 13,
     "Belonging, identity experimentation, group humor, fandom, gaming, social media",
     "Likes, follows, appearance feedback, academic sorting, and peer comparison become increasingly intertwined",
     ["Externalized self-evaluation", "Platform-mediated belonging"]),
    ("sub_early_adolescence", "adolescence", "Early adolescence", "11\u201314", 11, 14,
     "Friendship, humor, fandom, games, music, experimenting with self-presentation",
     "Peer approval, school ranking, body/image norms, early social metrics",
     ["Social comparison", "Belonging through visible signals"]),
    ("sub_middle_adolescence", "adolescence", "Middle adolescence", "14\u201317", 14, 17,
     "Skill development, subcultures, team activity, creative production, romantic connection",
     "Academic competition, extracurricular achievement, likes/follows, gaming rank, parental monitoring",
     ["Credentialization of hobbies", "Identity performance"]),
    ("sub_late_adolescence", "adolescence", "Late adolescence / emerging adulthood", "17\u201324", 17, 24,
     "Independence, collective projects, nightlife, making, political/creative communities, experimentation",
     "College admissions, employability, internships, personal branding, debt, productivity tools",
     ["Career identity", "Self-optimization", "Commodified leisure"]),
    ("sub_early_working", "adulthood", "Early working adulthood", "roughly 22\u201334", 22, 34,
     "Building relationships, exploration, hobbies, travel, creative identity, gaming, nightlife",
     "Career precarity, debt, productivity apps, professional visibility, side-hustle pressure",
     ["Work identity", "Leisure compression"]),
    ("sub_established", "adulthood", "Established adulthood", "roughly 35\u201354", 35, 54,
     "Family/social rituals, craft, social hobbies, community participation, home-based play",
     "Promotion, caregiving, household logistics, financial obligations, time scarcity",
     ["Scheduled leisure", "Reduced spontaneity"]),
    ("sub_later_adulthood", "adulthood", "Later adulthood", "roughly 55\u201374", 55, 74,
     "Generativity, cultural participation, mentoring, companionship, hobbies, play with younger generations",
     "Retirement security, health constraints, age norms, caregiving, digital inclusion/exclusion",
     ["Potential recovery of non-instrumental time", "Intensified isolation"]),
    ("sub_elderhood", "adulthood", "Later life / elderhood", "75+", 75, None,
     "Connection, reminiscence, embodied or adapted play, storytelling, intergenerational contact",
     "Care systems, accessibility, mobility, institutional routines, social isolation",
     ["Play as connection and dignity", "Withdrawal from meaningful engagement"]),
]
prev = {}
for i, (sid, st, label, age, a0, a1, joy, shift, leads) in enumerate(SUBS, 1):
    N(id=sid, type="substage", label=label, stage=st, parent=f"stage_{st}", ageRangeLabel=age,
      ageStart=a0, ageEnd=a1, centralJoyMode=joy, rewardSystemShift=shift, leadsTo=leads, order=i,
      sourceSection=f"{st.capitalize()} substage table")
    if st in prev:
        E(prev[st], sid, "forward", "neutral", ["developmental sequence"], prov="inferred",
          note="Ordered substage sequence within a parent stage.")
    prev[st] = sid

# ----------------------------------------------------------------- OUTCOMES
OUTS = [
    ("out_intrinsic_joy", "Intrinsic joy capacity",
     "The ability to pursue activity for curiosity, pleasure, meaning, exploration, play, or connection without needing an external payoff",
     ["Autonomy", "Unstructured time", "Material play", "Safety", "Peer connection", "Agency", "Mastery without surveillance"], "protective"),
    ("out_extrinsic_orientation", "Extrinsic reward orientation",
     "Increased reliance on approval, grades, metrics, money, streaks, status, likes, or productivity as reasons to act",
     ["Conditional praise", "Rankings", "Platform feedback", "Performance culture", "Scarcity", "Workplace metrics"], "constraining"),
    ("out_joy_deficit", "Joy deficit",
     "A structural imbalance in which attention, time, design resources, and social legitimacy privilege rewardable productivity and screen stimulation over direct connection and open-ended play",
     ["Compressed time", "Precarious work", "Surveillance", "Optimization norms", "Instrumentalized leisure"], "constraining"),
    ("out_burnout", "Burnout / alienation",
     "Exhaustion, reduced agency, cynicism, depleted curiosity, and difficulty accessing pleasure outside reward or escape loops",
     ["Chronic overload", "Self-optimization", "Low autonomy", "Economic insecurity", "Work\u2013life blur"], "constraining"),
    ("out_restorative_play", "Restorative adult play",
     "Voluntary, socially meaningful, materially or bodily engaging activity that restores autonomy, relatedness, curiosity, and non-instrumental enjoyment",
     ["Protected time", "Low-stakes social settings", "Accessible third places", "Playful objects", "Community rituals"], "protective"),
]
for i, (oid, label, meaning, fed, pol) in enumerate(OUTS, 1):
    N(id=oid, type="outcome", label=label, description=meaning, fedBy=fed, polarity=pol, stage="outcome",
      order=i, sourceSection="Core outcome nodes")

# ------------------------------------------------------------------ SYSTEMS
SYS = [
    ("sys_education", "education", "Education system",
     ["Definitions of competence", "Legitimacy", "Time allocation", "Peer hierarchy",
      "The extent to which play is protected or subordinated to achievement"]),
    ("sys_family", "family", "Family and care system",
     ["Early attachment", "Norms of rest", "Availability of time", "Access to materials",
      "Household rules around screens", "Beliefs about \u201cearning\u201d leisure"]),
    ("sys_market", "market", "Labor and economic system",
     ["Time scarcity", "Income security", "Access to leisure", "Consumer motivations",
      "Perceived permission to rest"]),
    ("sys_platform", "platform", "Platform, media, and AI system",
     ["Behavioral data collection", "Social comparison", "Attention allocation", "Reward architecture",
      "The cultural expectation of instantaneous stimulation"]),
    ("sys_cultural", "cultural", "Cultural narratives and moral norms",
     ["What feels respectable", "What feels childish", "What feels selfish", "What feels mature",
      "What feels useful", "What feels wasteful", "What feels worthy"]),
]
for sid, cur, label, leads in SYS:
    N(id=sid, type="system", label=label, current=cur, stage="cross", leadsTo=leads,
      sourceSection="Cross-life systems")


# ------------------------------------------------------------------- CHAINS
def chain(cid, scope, stage, system, primary, secondary, title, conn, summary, steps, links, outcomes,
          arrow, valence, order, source, framing=None, design=None, secondary_arrow=None):
    """steps: (suffix,label,desc,col,row). links: (from,to[,arrow,valence]).
    outcomes: (suffix,outcome_id,arrow,valence,prov)."""
    step_ids, edge_ids, outcome_edge_ids = [], [], []
    for suf, label, desc, col, row in steps:
        nid = f"{cid}_{suf}"
        n = dict(id=nid, type="factor", label=label, chainId=cid, stage=stage if scope == "stage" else "cross",
                 current=primary, layout={"col": col, "row": row}, sourceSection=source)
        if desc:
            n["description"] = desc
        if secondary:
            n["secondaryCurrents"] = secondary
        if scope == "cross":
            n["parent"] = system
        nodes.append(n)
        step_ids.append(nid)
    for l in links:
        a, b = l[0], l[1]
        ar = l[2] if len(l) > 2 else arrow
        va = l[3] if len(l) > 3 else valence
        edge_ids.append(E(f"{cid}_{a}", f"{cid}_{b}", ar, va, conn, chain=cid))
    for suf, oid, ar, va, prov in outcomes:
        outcome_edge_ids.append(E(f"{cid}_{suf}", oid, ar, va, conn, prov=prov, chain=cid))
    c = dict(id=cid, title=title, scope=scope, stage=stage if scope == "stage" else None,
             system=system, primaryCurrent=primary, secondaryCurrents=secondary or [], order=order,
             connectionTypes=conn, summary=summary, defaultArrowType=arrow, defaultValence=valence,
             stepNodeIds=step_ids, edgeIds=edge_ids, outcomeEdgeIds=outcome_edge_ids,
             sourceSection=source)
    if framing:
        c["framingNote"] = framing
    if design:
        c["designImplication"] = design
    chains.append(c)


# ----- Childhood
S = "Childhood: causal chains"
chain("ch_c1", "stage", "childhood", None, "family", [],
      "Caregiver attunement \u2192 agency \u2192 intrinsic exploration",
      ["enabling", "developmental", "protective"],
      "Responsive caregiving builds felt safety, which allows free exploration and intrinsic competence.",
      [("s1", "Caregiver responsiveness", None, 0, 0),
       ("s2", "Felt safety and co-regulation", None, 1, 0),
       ("s3", "Free exploration, curiosity, and willingness to make mistakes", None, 2, 0),
       ("s4", "Intrinsic competence", "\u201cI can try because I want to know,\u201d rather than \u201cI must perform to be approved.\u201d", 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_intrinsic_joy", "upward", "protective", "inferred")],
      "upward", "protective", 1, S + " #1")
chain("ch_c2", "stage", "childhood", None, "family", [],
      "Open-ended objects and unstructured time \u2192 imaginative play \u2192 flexible meaning-making",
      ["affordance", "developmental", "reinforcing"],
      "Loose parts, outdoor space, and peer time enable self-authored play and a lasting capacity to enjoy activity without prescribed outcomes.",
      [("s1", "Access to loose parts, ordinary objects, outdoor space, art materials, and peer time", None, 0, 0),
       ("s2", "Self-authored play scenarios", None, 1, 0),
       ("s3", "Choice, negotiation, experimentation, and tolerance for ambiguity", None, 2, 0),
       ("s4", "Later ability to enjoy activities without prescribed outcomes", None, 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_intrinsic_joy", "upward", "protective", "explicit")],
      "upward", "protective", 2, S + " #2")
chain("ch_c3", "stage", "childhood", None, "education", [],
      "School assessment and adult praise \u2192 conditional worth \u2192 achievement orientation",
      ["institutional pressure", "motivational displacement", "cumulative"],
      "Evaluation-centered schooling and praise shift attention from process to performance monitoring and external reward orientation.",
      [("s1", "School systems, behavioral charts, grades, and praise framed around \u201cbeing smart,\u201d speed, or compliance", None, 0, 0),
       ("s2", "Attention shifting from process to evaluation", None, 1, 0),
       ("s3", "Performance monitoring", "\u201cAm I doing this correctly?\u201d", 2, 0),
       ("s4", "External reward orientation", "Especially when mistakes carry social or institutional consequences.", 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_extrinsic_orientation", "downward", "constraining", "explicit")],
      "downward", "constraining", 3, S + " #3")
chain("ch_c4", "stage", "childhood", None, "market", ["platform"],
      "Toy marketing and intellectual-property ecosystems \u2192 desire for branded objects \u2192 consumer identity",
      ["market shaping", "identity formation", "ambivalent"],
      "Branded media and toys create attachment and collectible desire; the learned link between play, acquisition, and identity can later feed adult consumption markets but can also offer community and creative practices.",
      [("s1", "Children\u2019s media, retailers, licensors, influencers, and toy manufacturers", None, 0, 0),
       ("s2", "Branded character attachment and collectible desire", None, 1, 0),
       ("s3", "Learned association between play, acquisition, novelty, and identity display", None, 2, 0),
       ("s4a", "Later adult collecting, fandom, blind-box consumption, and nostalgia markets", "Can later feed these.", 3, 0),
       ("s4b", "Community and creative practices", "Can also offer these.", 3, 1)],
      [("s1", "s2", "forward", "neutral"), ("s2", "s3", "forward", "neutral"),
       ("s3", "s4a", "downward", "constraining"), ("s3", "s4b", "upward", "protective")],
      [("s4a", "out_extrinsic_orientation", "downward", "constraining", "inferred"),
       ("s4b", "out_restorative_play", "upward", "protective", "inferred")],
      "forward", "ambivalent", 4, S + " #4")

# ----- Adolescence
S = "Adolescence: causal chains"
chain("ch_a1", "stage", "adolescence", None, "family", ["platform"],
      "Peer belonging \u2192 social comparison \u2192 validation-seeking loop",
      ["social mediation", "algorithmic amplification", "reinforcing"],
      "Visibility becomes a condition of belonging, driving comparison and external validation-seeking.",
      [("s1", "Peer groups and social platforms", None, 0, 0),
       ("s2", "Visibility as a condition of belonging", None, 1, 0),
       ("s3", "Comparison of appearance, popularity, skill, lifestyle, and consumption", None, 2, 0),
       ("s4", "External validation-seeking", "Through likes, rankings, streaks, follower counts, gaming levels, or social approval.", 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_extrinsic_orientation", "downward", "constraining", "inferred")],
      "downward", "constraining", 1, S + " #1")
chain("ch_a2", "stage", "adolescence", None, "education", [],
      "Educational credentialization \u2192 instrumental hobbies \u2192 narrowed play",
      ["institutional incentive", "cultural norm", "motivational displacement"],
      "Admissions and career pressure recode hobbies as r\u00e9sum\u00e9 assets, shifting the guiding question from enjoyment to advantage.",
      [("s1", "Admissions systems, standardized testing, college/career advice, and parental anxiety", None, 0, 0),
       ("s2", "Hobbies recoded as r\u00e9sum\u00e9 assets", None, 1, 0),
       ("s3", "Question shift: from \u201cDo I enjoy this?\u201d to \u201cWill this help me get in, get hired, or stand out?\u201d", None, 2, 0),
       ("s4", "Instrumentalized leisure", "Creative activity may remain pleasurable but becomes burdened by evaluation.", 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_joy_deficit", "downward", "constraining", "explicit")],
      "downward", "constraining", 2, S + " #2")
chain("ch_a3", "stage", "adolescence", None, "platform", [],
      "Digital game design and social media \u2192 intermittent reward \u2192 repeated engagement",
      ["data extraction", "behavioral reinforcement", "commercial feedback loop"],
      "Reward mechanics produce anticipation and repeated checking; engagement data generates revenue and drives further tuning of the mechanics.",
      [("s1", "Notifications, streaks, variable feedback, rank progression, loot systems, and infinite feeds", None, 0, 0),
       ("s2", "Anticipation and repeated checking", None, 1, 0),
       ("s3", "Attention capture and measurable engagement", None, 2, 0),
       ("s4", "Engagement data produces revenue and optimization feedback for platforms", None, 3, 0),
       ("s5", "Further tuning of reward mechanisms", None, 4, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4"), ("s4", "s5")],
      [("s3", "out_extrinsic_orientation", "downward", "constraining", "inferred")],
      "downward", "constraining", 3, S + " #3")
# close the commercial feedback loop explicitly
E("ch_a3_s5", "ch_a3_s1", "circular", "reinforcing", ["data extraction", "behavioral reinforcement", "commercial feedback loop"],
  chain="ch_a3", closure=True,
  note="Commercial feedback loop.")
chains[-1]["edgeIds"].append(edges[-1]["id"])
chain("ch_a4", "stage", "adolescence", None, "family", ["market"],
      "Fandom and participatory culture \u2192 belonging and making \u2192 possible intrinsic-play refuge",
      ["protective social infrastructure", "ambivalent commercialization"],
      "Shared fandoms and making communities can support connection and intrinsic joy when participants keep autonomy and ownership, but the same spaces can be commercialized.",
      [("s1", "Shared fandoms, tabletop games, creative communities, modding, cosplay, music scenes, and collaborative making", None, 0, 0),
       ("s2", "Social connection and low-stakes identity exploration", None, 1, 0),
       ("s3", "Intrinsic joy", "When participants retain autonomy and community ownership.", 2, 0),
       ("s4", "Commercialization through influencer economies and monetized visibility", "The same spaces may be commercialized.", 2, 1)],
      [("s1", "s2", "upward", "protective"), ("s2", "s3", "upward", "protective"),
       ("s1", "s4", "downward", "constraining")],
      [("s3", "out_intrinsic_joy", "upward", "protective", "explicit"),
       ("s4", "out_extrinsic_orientation", "downward", "constraining", "inferred")],
      "upward", "ambivalent", 4, S + " #4")

# ----- Adulthood
S = "Adulthood: adult pathways"
chain("ch_d1", "stage", "adulthood", None, "market", [],
      "Labor market insecurity \u2192 productivity imperative \u2192 joy deferral",
      ["structural economic pressure", "behavioral adaptation", "cumulative depletion"],
      "Economic insecurity produces a perceived need for constant employability, driving self-optimization and the deferral of joy.",
      [("s1", "Housing costs, debt, precarious employment, health insurance systems, and wage stagnation", None, 0, 0),
       ("s2", "Economic insecurity", None, 1, 0),
       ("s3", "Perceived need for constant employability, skill acquisition, and availability", None, 2, 0),
       ("s4", "Self-optimization", "Tracking, upskilling, side hustles, personal branding, and difficulty resting.", 3, 0),
       ("s5", "Joy deferral", "Play must be earned, justified, monetized, or transformed into self-improvement.", 4, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4"), ("s4", "s5")],
      [("s5", "out_joy_deficit", "downward", "constraining", "inferred")],
      "downward", "constraining", 1, S + " #1")
chain("ch_d2", "stage", "adulthood", None, "market", ["platform"],
      "Workplace metrics and AI \u2192 accelerated output expectations \u2192 burnout risk",
      ["socio-technical acceleration", "workload intensification", "negative feedback on wellbeing"],
      "Measurement and AI tooling raise output and responsiveness expectations, reduce recovery and autonomy, and lead to burnout risk and a joy deficit.",
      [("s1", "Managers, enterprise software, performance dashboards, communication tools, and AI systems", None, 0, 0),
       ("s2a", "Increased measurement and expectations of responsiveness", None, 1, 0),
       ("s2b", "Higher output expectations, verification work, tool switching, and constant adaptation",
        "AI can automate or assist tasks, but in many settings it also leads to these.", 1, 1),
       ("s3", "Less recovery time and reduced autonomy", None, 2, 0),
       ("s4", "Burnout risk", None, 3, 0),
       ("s5", "Diminished curiosity and energy for self-directed play", "Burnout diminishes curiosity and energy, producing the joy deficit.", 4, 0)],
      [("s1", "s2a"), ("s1", "s2b"), ("s2a", "s3"), ("s2b", "s3"), ("s3", "s4"), ("s4", "s5")],
      [("s4", "out_burnout", "downward", "constraining", "explicit"),
       ("s5", "out_joy_deficit", "downward", "constraining", "explicit")],
      "downward", "constraining", 2, S + " #2")
chain("ch_d3", "stage", "adulthood", None, "platform", [],
      "Platform leisure \u2192 micro-reward capture \u2192 low-recovery entertainment",
      ["convenience pathway", "behavioral reinforcement", "displacement"],
      "Frictionless screen-based stimulation is often chosen by exhausted people with limited time and energy, and can displace sleep, direct sociality, and effortful restorative play.",
      [("s1", "Streaming services, social media, mobile games, retail platforms, and notification systems", None, 0, 0),
       ("s2", "Frictionless, screen-based stimulation", None, 1, 0),
       ("s3", "Short-term gratification, passive consumption, or repetitive checking", "Often chosen because exhausted people have limited time and energy.", 2, 0),
       ("s4", "Low-recovery entertainment", "Can lead to less sleep, less direct sociality, and less capacity for effortful but restorative play.", 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_joy_deficit", "downward", "constraining", "inferred")],
      "downward", "constraining", 3, S + " #3",
      framing="Do not label screen use as inherently deficient; distinguish self-directed, social, creative digital play from attention-extractive design.")
chain("ch_d4", "stage", "adulthood", None, "market", [],
      "Adult toy, hobby, and game markets \u2192 material play \u2192 dual pathway",
      ["material affordance", "market mediation", "ambivalent pathway"],
      "Adult hobby and toy markets provide playful objects and rituals that can support relaxation, flow, and belonging, or can drive scarcity-based purchasing and status display.",
      [("s1", "LEGO, tabletop games, miniatures, craft kits, collectibles, fidget objects, hobby stores, maker communities, toy designers, and convention cultures", None, 0, 0),
       ("s2", "Adult access to playful objects and rituals", None, 1, 0),
       ("s3a", "Relaxation, flow, tactile engagement, creativity, nostalgia, identity exploration, and social belonging", None, 2, 0),
       ("s3b", "Scarcity-based purchasing, speculative collecting, status display, or blind-box reward loops", None, 2, 1)],
      [("s1", "s2", "forward", "neutral"), ("s2", "s3a", "upward", "protective"), ("s2", "s3b", "downward", "constraining")],
      [("s3a", "out_restorative_play", "upward", "protective", "inferred"),
       ("s3b", "out_extrinsic_orientation", "downward", "constraining", "inferred")],
      "forward", "ambivalent", 4, S + " #4",
      design="Your project can seek objects that support repeated, open-ended use without requiring accumulation, competition, or public proof.")
chain("ch_d5", "stage", "adulthood", None, "family", [],
      "Direct social play and third places \u2192 relatedness \u2192 restorative joy",
      ["social infrastructure", "protective", "regenerative"],
      "Recurring in-person contact in shared places builds belonging and ritual, supporting relatedness \u2014 one of the core psychological needs associated with self-motivation and wellbeing.",
      [("s1", "Community centers, libraries, parks, game caf\u00e9s, workshops, unions, local clubs, friend groups, public festivals, and shared meals", None, 0, 0),
       ("s2", "Recurring in-person contact", None, 1, 0),
       ("s3", "Belonging, laughter, cooperation, and shared ritual", None, 2, 0),
       ("s4", "Relatedness", "One of the core psychological needs associated with self-motivation and wellbeing (Self-Determination Theory).", 3, 0)],
      [("s1", "s2"), ("s2", "s3"), ("s3", "s4")],
      [("s4", "out_restorative_play", "upward", "protective", "explicit")],
      "upward", "protective", 5, S + " #5")
chains[-1]["evidenceIds"] = ["ref_sdt_2000"]

# ----- Cross-life system dynamics
CL = "Cross-life systems"


def xl(cid, system, primary, order, title, conn, summary, steps, links, arrow, valence):
    chain(cid, "cross", None, system, primary, [], title, conn, summary, steps, links, [], arrow, valence,
          order, CL)


xl("xl_fam1", "sys_family", "family", 1, "Caregiver stress / economic precarity \u2192 reliance on screen-based entertainment",
   ["resource constraint", "indirect"], "Less time and emotional bandwidth increases reliance on convenient, screen-based entertainment.",
   [("s1", "Caregiver stress / economic precarity", None, 0, 0), ("s2", "Less time and emotional bandwidth", None, 1, 0),
    ("s3", "Greater reliance on convenient, screen-based entertainment", None, 2, 0)],
   [("s1", "s2"), ("s2", "s3")], "downward", "constraining")
xl("xl_fam2", "sys_family", "family", 2, "Family rituals \u2192 intergenerational models of joy and relatedness",
   ["cultural transmission", "protective"], "Games, shared meals, humor, crafting, and storytelling transmit models of joy and relatedness across generations.",
   [("s1", "Family rituals", "Games, shared meals, humor, crafting, storytelling.", 0, 0),
    ("s2", "Intergenerational models of joy and relatedness", None, 1, 0)],
   [("s1", "s2")], "upward", "protective")
xl("xl_fam3", "sys_family", "family", 3, "Conditional approval \u2192 internalized productivity-based worth",
   ["relational reward conditioning"], "Conditional approval becomes internalized as productivity-based worth.",
   [("s1", "Conditional approval", None, 0, 0), ("s2", "Internalized productivity-based worth", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_edu1", "sys_education", "education", 1, "Testing, grading, ranking \u2192 external evaluation as normal",
   ["institutional normalization"], "Testing, grading, ranking, attendance, and behavioral management make external evaluation the normal condition of learning.",
   [("s1", "Testing, grading, ranking, attendance, behavioral management", None, 0, 0),
    ("s2", "External evaluation as the normal condition of learning", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_edu2", "sys_education", "education", 2, "Recess, arts, exploratory pedagogy \u2192 protected autonomy",
   ["institutional protection"], "Recess, arts, drama, music, workshop learning, and exploratory pedagogy protect autonomy and experimentation.",
   [("s1", "Recess, arts, drama, music, workshop learning, exploratory pedagogy", None, 0, 0),
    ("s2", "Protected autonomy and experimentation", None, 1, 0)],
   [("s1", "s2")], "upward", "protective")
xl("xl_edu3", "sys_education", "education", 3, "Academic admissions / employability discourse \u2192 hobbies converted into credentials",
   ["transition pressure"], "Admissions and employability discourse converts adolescent hobbies into credentials.",
   [("s1", "Academic admissions / employability discourse", None, 0, 0),
    ("s2", "Adolescent hobbies converted into credentials", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_lab1", "sys_market", "market", 1, "Wage conditions, debt, housing, healthcare, childcare costs \u2192 time anxiety and risk aversion",
   ["material constraint"], "Material cost pressures produce time anxiety and risk aversion.",
   [("s1", "Wage conditions, debt, housing, healthcare, childcare costs", None, 0, 0),
    ("s2", "Time anxiety and risk aversion", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_lab2", "sys_market", "market", 2, "Management culture and performance measurement \u2192 output visibility as proxy for value",
   ["managerial incentive"], "Management culture and performance measurement make output visibility a proxy for value.",
   [("s1", "Management culture and performance measurement", None, 0, 0),
    ("s2", "Output visibility as a proxy for value", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_lab3", "sys_market", "market", 3, "Leisure industry and adult toy market \u2192 commodified access to play",
   ["market provisioning; can be both enabling and extractive"], "The leisure industry and adult toy market commodify access to play; this can be both enabling and extractive.",
   [("s1", "Leisure industry and adult toy market", None, 0, 0), ("s2", "Commodified access to play", None, 1, 0)],
   [("s1", "s2")], "forward", "ambivalent")
xl("xl_plat1", "sys_platform", "platform", 1, "Metrics \u2192 visibility of externally rewarded behavior",
   ["quantification", "behavioral cue"], "Likes, streaks, points, rank, followers, badges, and view counts make externally rewarded behavior visible.",
   [("s1", "Metrics", "Likes, streaks, points, rank, followers, badges, view counts.", 0, 0),
    ("s2", "Visibility of externally rewarded behavior", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_plat2", "sys_platform", "platform", 2, "Variable rewards and notifications \u2192 anticipation, repeat checking, engagement",
   ["behavioral reinforcement", "extraction"], "Variable rewards and notifications produce anticipation, repeat checking, and measurable engagement.",
   [("s1", "Variable rewards and notifications", None, 0, 0),
    ("s2", "Anticipation, repeat checking, and measurable engagement", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_plat3", "sys_platform", "platform", 3, "Recommendation algorithms \u2192 narrowed attention",
   ["feedback optimization"], "Recommendation algorithms create personalized consumption pathways and narrowed attention.",
   [("s1", "Recommendation algorithms", None, 0, 0),
    ("s2", "Personalized consumption pathways and narrowed attention", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_plat4", "sys_platform", "platform", 4, "Creative AI tools \u2192 reduced drudgery or increased output expectations",
   ["contested socio-technical transition"], "Creative AI tools may reduce drudgery or increase output expectations and homogenize tool-directed creative labor.",
   [("s1", "Creative AI tools", None, 0, 0),
    ("s2a", "Possible reduction of drudgery", None, 1, 0),
    ("s2b", "Increased output expectations and homogenized, tool-directed creative labor", None, 1, 1)],
   [("s1", "s2a", "upward", "protective"), ("s1", "s2b", "downward", "constraining")], "forward", "ambivalent")
xl("xl_cul1", "sys_cultural", "cultural", 1, "\u201cTime is money\u201d / hustle culture / self-branding \u2192 moralization of output",
   ["ideological pressure"], "Hustle culture and self-branding moralize output and produce guilt about rest.",
   [("s1", "\u201cTime is money\u201d / hustle culture / self-branding", None, 0, 0),
    ("s2", "Moralization of output and guilt about rest", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_cul2", "sys_cultural", "cultural", 2, "\u201cToys are for children\u201d \u2192 adult shame around play",
   ["age norm", "stigma"], "The norm that toys are for children produces adult shame around play and material delight.",
   [("s1", "\u201cToys are for children\u201d", None, 0, 0),
    ("s2", "Adult shame around play and material delight", None, 1, 0)],
   [("s1", "s2")], "downward", "constraining")
xl("xl_cul3", "sys_cultural", "cultural", 3, "Wellness culture \u2192 legitimated rest or instrumentalized joy",
   ["ambivalent cultural translation"], "Wellness culture can legitimate rest, but can also instrumentalize joy as another performance requirement.",
   [("s1", "Wellness culture", None, 0, 0),
    ("s2a", "Can legitimate rest", None, 1, 0),
    ("s2b", "Can instrumentalize joy as another performance requirement", None, 1, 1)],
   [("s1", "s2a", "upward", "protective"), ("s1", "s2b", "downward", "constraining")], "forward", "ambivalent")
xl("xl_cul4", "sys_cultural", "cultural", 4, "Nostalgia and \u201ckidult\u201d discourse \u2192 reopened access or packaged consumption",
   ["market-cultural reframing"], "Nostalgia and kidult discourse reopen access to toys and play, yet may package play as consumption.",
   [("s1", "Nostalgia and \u201ckidult\u201d discourse", None, 0, 0),
    ("s2a", "Reopens access to toys and play", None, 1, 0),
    ("s2b", "May package play as consumption", None, 1, 1)],
   [("s1", "s2a", "upward", "protective"), ("s1", "s2b", "downward", "constraining")], "forward", "ambivalent")

# -------------------------------------------------------------------- LOOPS
LOOPS = [
    dict(id="loop_childhood", hub="loop_childhood", title="Measurable competence", scope="stage", stage="childhood",
         current="education", loopType="Reinforcing loop that shifts joy from self-directed exploration toward performance.",
         valence="reinforcing",
         steps=["Adult institutions reward visible achievement.",
                "The child learns to seek approval, grades, or winning.",
                "These outcomes make adults allocate more attention and opportunities to measurable achievement.",
                "Unstructured play appears less defensible or \u201cless valuable.\u201d",
                "Reduced unstructured play further increases reliance on externally organized stimulation."],
         interventionOpportunities=["Assessment redesign", "Process-centered feedback", "School recess protection",
                                    "Noncompetitive maker/play spaces",
                                    "Parent-facing design that values boredom and experimentation"],
         outcomes=[("out_extrinsic_orientation", "downward", "constraining", "inferred")],
         source="Childhood feedback loop"),
    dict(id="loop_adolescence", hub="loop_adolescence", title="Play becomes proof", scope="stage",
         stage="adolescence", current="education",
         loopType="Reinforcing institutional\u2013cultural loop.", valence="reinforcing",
         steps=["Young people engage in art, sport, games, volunteering, or making.",
                "Institutions ask them to document outcomes, awards, leadership, audience size, or market value.",
                "Activities gain prestige when they become legible as credentials.",
                "Time flows toward credential-bearing activity and away from private, purposeless play.",
                "The cultural expectation that every activity should \u201ccount\u201d becomes stronger."],
         interventionOpportunities=["Portfolio systems that preserve process and private experimentation",
                                    "Youth spaces not organized around achievement", "Non-ranked games",
                                    "Non-public creative tools",
                                    "Education policy that protects arts and recess as ends in themselves"],
         outcomes=[("out_joy_deficit", "downward", "constraining", "inferred")],
         source="Adolescence feedback loop"),
    dict(id="loop_adulthood", hub="loop_adulthood", title="Productivity ratchet", scope="stage",
         stage="adulthood", current="market",
         loopType="Reinforcing socio-technical extraction loop.", valence="reinforcing",
         steps=["Technology or AI reduces the time needed for a task.",
                "Employers, clients, institutions, or the individual raise the expected volume, speed, and availability of output.",
                "Time savings are absorbed rather than converted into rest, play, or connection.",
                "Fatigue increases, making low-effort digital rewards more attractive.",
                "Reduced recovery lowers creative capacity and intrinsic motivation.",
                "Lower capacity is interpreted as a personal failure to optimize, restarting the drive for productivity tools."],
         interventionOpportunities=["Organizational norms around workload and AI", "Non-metricated creative rituals",
                                    "Playful workplace spaces not tied to output",
                                    "Designs that mark recovery as legitimate", "Low-barrier social objects",
                                    "Public infrastructure for adult play"],
         outcomes=[("out_burnout", "downward", "constraining", "inferred"),
                   ("out_joy_deficit", "downward", "constraining", "inferred")],
         source="Adult feedback loop"),
    dict(id="loop_A", hub="loop_A", title="Extrinsic-reward displacement", scope="main", stage="cross", current=None,
         loopType="Reward conditioning \u2192 motivational displacement \u2192 reinforcing loop.",
         valence="reinforcing",
         steps=["Reward system", "External validation", "Reduced attention to internal desire",
                "Less intrinsic engagement", "Increased need for external reward"],
         notes=["Grades, praise, points, money, likes, rankings, and workplace metrics make action legible and socially rewarded.",
                "People learn to prioritize what can be counted or displayed.",
                "Their attention can shift away from curiosity, process, and internal satisfaction.",
                "Reduced access to intrinsically motivated activity makes reward systems feel increasingly necessary."],
         evidenceAnchor="Anticipated and contingent tangible rewards can undermine free-choice intrinsic motivation for otherwise interesting activities; feedback is different when it is informational rather than controlling.",
         evidenceIds=["ref_rewards_pubmed", "ref_rewards_sagepub"],
         outcomes=[("out_extrinsic_orientation", "downward", "constraining", "inferred")],
         source="Main map loops: Loop A"),
    dict(id="loop_B", hub="loop_B", title="Time scarcity and depleted play", scope="main", stage="cross", current=None,
         loopType="Structural pressure \u2192 depletion \u2192 convenience substitution \u2192 reinforcing loop.",
         valence="reinforcing",
         steps=["Economic pressure", "Work intensity", "Fatigue", "Low-effort stimulation",
                "Reduced restorative play", "Lower resilience/creative energy",
                "More perceived need to work or optimize"],
         notes=["This loop is central to the \u201cJoy Deficit.\u201d",
                "It shows why telling individuals to \u201cplay more\u201d is insufficient: depleted time, attention, money, and public space are systemic constraints."],
         outcomes=[("out_joy_deficit", "downward", "constraining", "explicit")],
         source="Main map loops: Loop B"),
    dict(id="loop_C", hub="loop_C", title="Play-to-productivity capture", scope="main", stage="cross", current=None,
         loopType="Institutional capture / commodification / autonomy erosion.", valence="reinforcing",
         steps=["Play activity", "Institutional/market recognition", "Measurement or monetization",
                "Performance pressure", "Reduced freedom to play"],
         notes=["A hobby becomes a portfolio.", "A creative practice becomes content.",
                "A game becomes a ranked competition.", "A social activity becomes networking.",
                "A restorative behavior becomes a wellness metric."],
         designQuestion="How could an object preserve the boundary between play and proof?",
         outcomes=[("out_joy_deficit", "downward", "constraining", "inferred")],
         source="Main map loops: Loop C"),
    dict(id="loop_D", hub="loop_D", title="Social play as restoration", scope="main", stage="cross", current=None,
         loopType="Enabling condition \u2192 social reinforcement \u2192 regenerative loop. The primary counter-loop.",
         valence="protective",
         steps=["Accessible shared space", "Repeated contact", "Trust and relatedness", "Voluntary shared play",
                "Joy and recovery", "Capacity to sustain relationships and collective spaces"],
         notes=["This is the primary counter-loop.",
                "It turns joy from a private consumer experience into shared social infrastructure."],
         outcomes=[("out_restorative_play", "upward", "protective", "explicit")],
         source="Main map loops: Loop D"),
]
for L in LOOPS:
    step_ids = []
    for i, s in enumerate(L["steps"], 1):
        nid = f"{L['id']}_s{i}"
        n = dict(id=nid, type="loop_step", label=s, loopId=L["id"], stage=L["stage"], current=L["current"],
                 layout={"order": i}, sourceSection=L["source"])
        nodes.append(n)
        step_ids.append(nid)
    hub = dict(id=L["hub"], type="loop", label=L["title"], loopId=L["id"], stage=L["stage"],
               current=L["current"], description=L["loopType"], sourceSection=L["source"])
    nodes.append(hub)
    conn = [L["loopType"].rstrip(".")]
    eids = []
    for i, nid in enumerate(step_ids):
        nxt = step_ids[(i + 1) % len(step_ids)]
        eids.append(E(nid, nxt, "circular", L["valence"], conn, loop=L["id"], closure=(i == len(step_ids) - 1)))
    oeids = []
    for oid, ar, va, prov in L["outcomes"]:
        oeids.append(E(L["hub"], oid, ar, va, conn, prov=prov, loop=L["id"]))
    rec = dict(id=L["id"], title=L["title"], scope=L["scope"], stage=L["stage"] if L["scope"] == "stage" else None,
               primaryCurrent=L["current"], hubNodeId=L["hub"], loopType=L["loopType"], valence=L["valence"],
               stepNodeIds=step_ids, edgeIds=eids, outcomeEdgeIds=oeids, sourceSection=L["source"])
    for k in ("notes", "interventionOpportunities", "evidenceAnchor", "evidenceIds", "designQuestion"):
        if k in L:
            rec[k] = L[k]
    loops.append(rec)

# ------------------------------------------------------------ INTERNATIONAL
N(id="ref_denmark", type="reference", label="Work-time regulation, leave, flexible work, and social support",
  description="Protective-policy reference (Denmark), not proof of a universally \u201chappier culture.\u201d",
  country="Denmark", role="Policy and time-use contrast",
  leadsTo=["More protected time", "Social connection", "Room for leisure"],
  connectionTypes=["policy-mediated protective condition"],
  caution="Comparative example; outcomes are shaped by many interacting welfare, labor-market, and cultural conditions.",
  datapoints=[
      {"label": "Satisfaction with time use (OECD, cited cross-country data)", "value": 7.8, "scale": "out of 10"},
      {"label": "Self-reported life satisfaction, Denmark average", "value": 7.5, "scale": "OECD average 6.7"}],
  evidenceIds=["ref_oecd_denmark"], anchor={"stage": "adulthood", "currents": ["market"]}, stage="reference",
  sourceSection="International reference nodes: Denmark")
N(id="ref_japan", type="reference", label="Game and character-industry ecosystem",
  description="Ambivalent play-economy reference (Japan): globally influential games and character industries show how adult-oriented play, collecting, fandom, and creative communities can be culturally legitimate while also deeply commercialized and platform-mediated.",
  country="Japan", role="Cultural-industrial play reference",
  leadsTo=["Adult legitimacy for fandom", "Creative participation", "Game literacy", "Collectible cultures",
           "International cultural exchange"],
  alsoLeadsTo=["Monetization", "IP-driven consumption", "Scarcity", "Engagement capture"],
  connectionTypes=["cultural legitimacy + commercial extraction; explicitly double-edged"],
  caution="Explicitly double-edged: cultural legitimacy and commercial extraction coexist.",
  anchor={"stage": "adulthood", "currents": ["market", "platform"]}, stage="reference",
  sourceSection="International reference nodes: Japan")

# ------------------------------------------------------------- INTERVENTIONS
INTS = [
    ("int_protected_time", "Protected unstructured time",
     "Interrupts early performance conditioning and adult time scarcity", "Policy, school design, organizational practice",
     [("loop_childhood", "interrupts"), ("loop_B", "interrupts")]),
    ("int_nonevaluative_feedback", "Non-evaluative feedback",
     "Interrupts the shift from curiosity to approval-seeking", "Pedagogy, parenting resource, interaction design",
     [("ch_c3_s2", "interrupts"), ("loop_A", "interrupts")]),
    ("int_open_ended_object", "Open-ended playful object",
     "Reinforces autonomy, tactile exploration, ambiguity, repetition without scoring", "Industrial design / toy design",
     [("ch_c2_s2", "reinforces"), ("out_intrinsic_joy", "reinforces")]),
    ("int_antiextractive_digital", "Anti-extractive digital interaction",
     "Interrupts streaks, metrics, infinite feeds, and attention capture", "Interface / interaction design",
     [("ch_a3_s1", "interrupts"), ("xl_plat2_s1", "interrupts")]),
    ("int_adult_third_place", "Adult third place for play",
     "Reinforces relatedness and recurring, low-cost social play", "Service, community infrastructure, event design",
     [("loop_D", "reinforces"), ("ch_d5_s1", "reinforces")]),
    ("int_play_without_proof", "Play without proof ritual",
     "Interrupts portfolio logic, content creation pressure, and instrumental leisure", "Participatory design / cultural programming",
     [("loop_C", "interrupts"), ("loop_adolescence", "interrupts")]),
    ("int_workplace_recovery", "Workplace recovery boundary",
     "Interrupts AI-enabled output escalation and always-on availability", "Organizational policy, labor design",
     [("loop_adulthood", "interrupts"), ("ch_d2_s2b", "interrupts")]),
    ("int_alt_success_metric", "Alternative success metric",
     "Redefines value around agency, connection, delight, and restoration rather than output alone",
     "Design-research framework / evaluation tool",
     [("loop_A", "redefines"), ("xl_lab2_s2", "redefines")]),
    ("int_accessible_play_kit", "Accessible material play kit",
     "Lowers barriers of money, confidence, time, and \u201cchildishness\u201d stigma", "Product-service system",
     [("ch_d4_s3a", "reinforces"), ("xl_cul2_s2", "interrupts")]),
    ("int_intergenerational", "Intergenerational play format",
     "Counteracts age segregation and normalizes play across life stages", "Public program, game, spatial intervention",
     [("sub_later_adulthood", "reinforces"), ("xl_cul2_s2", "interrupts")]),
]
for i, (iid, label, eff, typ, targets) in enumerate(INTS, 1):
    N(id=iid, type="intervention", label=label, effect=eff, interventionType=typ, stage="intervention",
      order=i, selected=False, sourceSection="Map-ready intervention nodes")
    for tgt, rel in targets:
        E(iid, tgt, "dashed", "neutral", ["possible intervention"], prov="inferred", relation=rel)

# --------------------------------------------------------------- REFERENCES
REFS = [
    dict(id="ref_lifecourse", url="https://pmc.ncbi.nlm.nih.gov/articles/PMC3072576/",
         supports="Life-course approach: development as a sequence of age-graded roles, opportunities, constraints, and transitions, where earlier conditions shape later ones.",
         usedBy=["meta"]),
    dict(id="ref_rewards_pubmed", url="https://pubmed.ncbi.nlm.nih.gov/10589297/",
         supports="Expected, tangible, engagement-, completion-, and performance-contingent rewards can reduce later free-choice intrinsic motivation for already-interesting activities.",
         usedBy=["meta", "loop_A"]),
    dict(id="ref_rewards_sagepub", url="https://journals.sagepub.com/doi/10.3102/00346543071001001",
         supports="Contingent rewards and intrinsic motivation; informational versus controlling feedback.",
         usedBy=["loop_A"]),
    dict(id="ref_sdt_2000", url="https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf",
         supports="Self-Determination Theory: autonomy, competence, and relatedness as psychological needs that sustain self-motivation and wellbeing; distinguishes controlling rewards from informational feedback.",
         usedBy=["meta", "ch_d5"]),
    dict(id="ref_oecd_denmark", url="https://oecd-better-life-index.truth-and-beauty.net/countries/denmark/",
         supports="Denmark time-use satisfaction and life satisfaction figures.",
         usedBy=["ref_denmark"]),
]

# --------------------------------------------------------------------- META
META = dict(
    title="Joy Deficit \u2014 Life-Course Systems Map",
    subtitle="Childhood \u2192 Adolescence \u2192 Adulthood, across five \u2018systemic layers\u2019",
    centralUser="adult-in-formation",
    centralUserNote="The map is centered on the \u201cadult-in-formation\u201d: the user is an ordinary adult who has succumbed to the unspoken pressures and rules set by the reward systems in place at the different stages of their life. The lens is that of a person whose work, identity, leisure, and self-promotion are unusually entangled.",
    approach="A chronologic approach treats growth and identity development as a sequence of age defined roles within reward systems, opportunities, constraints, and transitions, where earlier conditions shape later ones rather than appearing in isolation.",
    thesis="Across the life course, social systems increasingly reward visible performance, measurable achievement, and externally validated engagement; intrinsic joy\u2014curiosity, voluntary play, absorption, experimentation, connection, and purposeless delight\u2014receives less protected time, legitimacy, and infrastructure.",
    centralVisualClaim="Across the life course, systems increasingly convert play into preparation, performance, data, status, consumption, or recovery for work\u2014while giving progressively less institutional protection to curiosity, direct connection, and purposeless joy.",
    designFraming="Creating conditions in which adults can access play without having to earn, quantify, display, optimize, or justify it.",
    designFramingNote="Position the potential design intervention not as \u201cbringing back childishness.\u201d This framing leaves room for an adult toy, social ritual, service, space, or critical artifact; the eventual intervention should emerge from the most consequential leverage point in the map. Do not select or rank an intervention node.",
    caveats=[
        "This map should not claim that all extrinsic rewards are harmful: Self-Determination Theory distinguishes controlling rewards from informational feedback, and identifies autonomy, competence, and relatedness as psychological needs that sustain self-motivation and wellbeing.",
        "Evidence suggests expected, tangible, engagement-, completion-, and performance-contingent rewards can reduce later free-choice intrinsic motivation for already-interesting activities.",
        "Do not label screen use as inherently deficient; distinguish self-directed, social, creative digital play from attention-extractive design.",
        "International nodes are comparative references, not the map's central scope.",
        "Age ranges overlap between adjacent substages and are informational only; layout must use substage order, not age.",
    ],
    currents=CURRENTS,
    stages=[s[0] for s in STAGES],
    arrowTypes=[
        dict(id="forward", meaning="Development or institutional transition across the timeline"),
        dict(id="downward", meaning="A constraint, loss, or narrowing of possibility"),
        dict(id="upward", meaning="A protective condition, recovery, or restoration of intrinsic joy"),
        dict(id="circular", meaning="A reinforcing feedback loop"),
        dict(id="dashed", meaning="A possible intervention"),
        dict(id="bidirectional", meaning="Reciprocal shaping, such as parent behavior and child preferences (no instances in this dataset)"),
    ],
    valences=[
        dict(id="protective", meaning="Enabling / protective / regenerative"),
        dict(id="constraining", meaning="Constraining / narrowing / extractive"),
        dict(id="ambivalent", meaning="Double-edged; leads to both enabling and extractive outcomes"),
        dict(id="reinforcing", meaning="Self-reinforcing feedback (direction of value depends on the loop)"),
        dict(id="neutral", meaning="Structural / sequencing / intervention link without a value direction"),
    ],
    provenanceTypes=[
        dict(id="explicit", meaning="The relationship is explicitly stated in the literature."),
        dict(id="inferred", meaning="Inferred through observation in ethnographic research and conclusion across sources in literature review."),
    ],
    arrowAssignmentRule="arrowType is assigned per chain: protective chains = upward; constraining chains = downward; ambivalent chains use forward for the shared trunk and split into one upward and one downward branch. Renderer must read arrowType from data and must not infer it.",
)

# ------------------------------------------------------------ VALIDATION
ids = [n["id"] for n in nodes]
dup = [k for k, v in collections.Counter(ids).items() if v > 1]
assert not dup, dup
idset = set(ids)
for e in edges:
    assert e["source"] in idset, e
    assert e["target"] in idset, e
eid_set = {e["id"] for e in edges}
assert len(eid_set) == len(edges)
for c in chains + loops:
    for x in c["stepNodeIds"]:
        assert x in idset, x
    for x in c["edgeIds"] + c["outcomeEdgeIds"]:
        assert x in eid_set, x
for n in nodes:
    if n.get("parent"):
        assert n["parent"] in idset, n
    if n.get("chainId"):
        assert n["chainId"] in {c["id"] for c in chains}
    if n.get("loopId"):
        assert n["loopId"] in {l["id"] for l in loops}
    if n.get("current"):
        assert n["current"] in {c["id"] for c in CURRENTS}, n
ARROWS = {a["id"] for a in META["arrowTypes"]}
VALS = {v["id"] for v in META["valences"]}
for e in edges:
    assert e["arrowType"] in ARROWS and e["valence"] in VALS, e
refids = {r["id"] for r in REFS}
for n in nodes:
    for x in n.get("evidenceIds", []):
        assert x in refids
for c in chains + loops:
    for x in c.get("evidenceIds", []):
        assert x in refids
# every stage chain must reach >=1 outcome (spec requirement); cross chains exempt
for c in chains:
    if c["scope"] == "stage":
        assert c["outcomeEdgeIds"], c["id"]
for l in loops:
    assert l["outcomeEdgeIds"], l["id"]
# intervention has at least one target
for n in nodes:
    if n["type"] == "intervention":
        assert any(e["source"] == n["id"] for e in edges), n["id"]

counts = dict(
    nodes=len(nodes), edges=len(edges), chains=len(chains), loops=len(loops), references=len(REFS),
    nodesByType=dict(collections.Counter(n["type"] for n in nodes)),
    edgesByArrowType=dict(collections.Counter(e["arrowType"] for e in edges)),
    edgesByProvenance=dict(collections.Counter(e["provenance"] for e in edges)),
    stageChains=len([c for c in chains if c["scope"] == "stage"]),
    crossChains=len([c for c in chains if c["scope"] == "cross"]),
)
META["counts"] = counts


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


dump("meta.json", META)
dump("nodes.json", nodes)
dump("edges.json", edges)
dump("chains.json", chains)
dump("loops.json", loops)
dump("references.json", REFS)
print(json.dumps(counts, indent=1))
