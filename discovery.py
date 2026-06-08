import streamlit as st
import anthropic
import requests
import json
import re
import csv
import io
from datetime import datetime

st.set_page_config(
    page_title="Foundree42 | Lead Discovery",
    page_icon="F",
    layout="wide"
)

st.markdown("""
<style>
    [data-testid="stAppViewContainer"] { background-color: #e8ecf1; }
    [data-testid="stSidebar"] { background-color: #e8ecf1; border-right: none; }
    [data-testid="stHeader"] { background: transparent; }
    .main .block-container { padding-top: 2rem; padding-left: 2rem; padding-right: 2rem; }
    h1, h2, h3 { color: #2d3748 !important; font-family: 'Segoe UI', sans-serif !important; font-weight: 600 !important; }
    p, li, .stMarkdown { color: #4a5568 !important; font-family: 'Segoe UI', sans-serif !important; }
    label { color: #718096 !important; font-size: 0.8rem !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; font-family: 'Segoe UI', sans-serif !important; }
    .stTextInput > div > div > input, .stTextArea > div > div > textarea {
        background: #e8ecf1 !important; border: none !important; border-radius: 10px !important;
        color: #2d3748 !important; font-family: 'Segoe UI', sans-serif !important; font-size: 0.9rem !important;
        box-shadow: inset 3px 3px 6px #c5cad4, inset -3px -3px 6px #ffffff !important; padding: 10px 14px !important;
    }
    .stTextInput > div > div > input::placeholder, .stTextArea > div > div > textarea::placeholder { color: #a0aec0 !important; }
    .stSelectbox > div > div, .stSelectbox > div > div > div,
    .stSelectbox div[data-baseweb="select"], .stSelectbox div[data-baseweb="select"] > div,
    .stSelectbox div[data-baseweb="select"] span, .stSelectbox div[data-baseweb="select"] div,
    [data-baseweb="select"] > div {
        background: #e8ecf1 !important; border: none !important; border-radius: 10px !important;
        color: #2d3748 !important; font-family: 'Segoe UI', sans-serif !important; font-size: 0.9rem !important;
        box-shadow: inset 3px 3px 6px #c5cad4, inset -3px -3px 6px #ffffff !important;
    }
    [data-baseweb="select"] span, [data-baseweb="select"] div { color: #2d3748 !important; }
    [data-baseweb="popover"] { background: #e8ecf1 !important; border: none !important; box-shadow: 6px 6px 12px #c5cad4, -6px -6px 12px #ffffff !important; border-radius: 10px !important; }
    [data-baseweb="menu"] { background: #e8ecf1 !important; }
    [data-baseweb="option"] { background: #e8ecf1 !important; color: #2d3748 !important; font-family: 'Segoe UI', sans-serif !important; }
    [data-baseweb="option"]:hover { background: #dde1e7 !important; }
    .stButton > button {
        background: #e8ecf1 !important; color: #2d3748 !important; border: none !important;
        border-radius: 10px !important; font-family: 'Segoe UI', sans-serif !important;
        font-weight: 600 !important; font-size: 0.875rem !important; padding: 10px 24px !important;
        box-shadow: 4px 4px 8px #c5cad4, -4px -4px 8px #ffffff !important;
        transition: all 0.2s ease !important; width: 100% !important;
    }
    .stButton > button:hover { box-shadow: 2px 2px 4px #c5cad4, -2px -2px 4px #ffffff !important; color: #4a6fa5 !important; }
    .stButton > button[kind="primary"] { background: #4a6fa5 !important; color: #ffffff !important; }
    .stButton > button[kind="primary"]:hover { background: #3d5d8f !important; color: #ffffff !important; }
    [data-testid="stMetric"] { background: #e8ecf1; border-radius: 14px; padding: 16px 20px; box-shadow: 5px 5px 10px #c5cad4, -5px -5px 10px #ffffff; }
    [data-testid="stMetricLabel"] { color: #718096 !important; font-size: 0.7rem !important; text-transform: uppercase !important; letter-spacing: 1px !important; }
    [data-testid="stMetricValue"] { color: #2d3748 !important; font-size: 1.8rem !important; font-weight: 700 !important; }
    .streamlit-expanderHeader { background: #e8ecf1 !important; border-radius: 10px !important; border: none !important; box-shadow: 3px 3px 6px #c5cad4, -3px -3px 6px #ffffff !important; color: #2d3748 !important; font-weight: 600 !important; padding: 12px 16px !important; }
    .streamlit-expanderContent { background: #e8ecf1 !important; border: none !important; padding: 16px !important; }
    div[data-testid="stSuccessMessage"] { background: #e8ecf1 !important; border-radius: 10px !important; border-left: 3px solid #68d391 !important; color: #2d3748 !important; }
    div[data-testid="stInfoMessage"] { background: #e8ecf1 !important; border-radius: 10px !important; border-left: 3px solid #63b3ed !important; color: #2d3748 !important; }
    div[data-testid="stWarningMessage"] { background: #e8ecf1 !important; border-radius: 10px !important; border-left: 3px solid #f6ad55 !important; color: #2d3748 !important; }
    div[data-testid="stErrorMessage"] { background: #e8ecf1 !important; border-radius: 10px !important; border-left: 3px solid #fc8181 !important; color: #2d3748 !important; }
    hr { border: none !important; height: 1px !important; background: linear-gradient(to right, transparent, #c5cad4, transparent) !important; margin: 1.5rem 0 !important; }
    .stSpinner > div { border-top-color: #4a6fa5 !important; }
    .sidebar-brand { background: #e8ecf1; border-radius: 16px; padding: 20px; margin-bottom: 20px; box-shadow: 5px 5px 10px #c5cad4, -5px -5px 10px #ffffff; text-align: center; }
    .sidebar-brand h2 { font-size: 1.5rem !important; color: #2d3748 !important; margin: 0 !important; font-family: 'Segoe UI', sans-serif !important; }
    .sidebar-brand p { font-size: 0.7rem !important; color: #a0aec0 !important; letter-spacing: 2px !important; text-transform: uppercase !important; margin: 4px 0 0 0 !important; }
    .stCaption, .stCaption p { color: #a0aec0 !important; font-size: 0.75rem !important; }
    code { background: #dde1e7 !important; color: #2d3748 !important; border-radius: 4px !important; padding: 2px 6px !important; }
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# ── SESSION STATE ─────────────────────────────────
for k, v in {
    "discovered_leads": [],
    "api_key"         : "",
    "apollo_key"      : "",
    "tavily_key"      : "",
    "search_done"     : False,
}.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ── SIDEBAR ───────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div class="sidebar-brand">
        <h2>Foundree42</h2>
        <p>Lead Discovery</p>
    </div>
    """, unsafe_allow_html=True)

    gk = st.text_input("Anthropic API Key", type="password", placeholder="sk-ant-...")
    if gk: st.session_state["api_key"] = gk; st.success("Anthropic active")

    ak = st.text_input("Apollo API Key", type="password", placeholder="apollo...")
    if ak: st.session_state["apollo_key"] = ak; st.success("Apollo active")

    tk = st.text_input("Tavily API Key", type="password", placeholder="tvly-...")
    if tk: st.session_state["tavily_key"] = tk; st.success("Tavily active")

    st.markdown("---")
    leads = st.session_state["discovered_leads"]
    ca, cb = st.columns(2)
    with ca:
        st.metric("Found",    len(leads))
        st.metric("Hot 80+",  len([l for l in leads if l.get("score",0) >= 80]))
    with cb:
        st.metric("Verified", len([l for l in leads if l.get("verified")]))
        avg = int(sum(l.get("score",0) for l in leads)/len(leads)) if leads else 0
        st.metric("Avg Score", str(avg))
    st.markdown("---")
    st.caption("Foundree42 — US Market")

# ── AI ────────────────────────────────────────────
SYSTEM = (
    "You are a lead generation specialist for Foundree42, "
    "a US-based Salesforce consultancy. Find real US companies "
    "that need Salesforce help. Always return valid JSON only. "
    "No markdown. No explanation."
)
SCORING = (
    " Score 0-100 for Salesforce fit: "
    "90-100=perfect. 75-89=strong. 60-74=moderate. Below 60=weak. "
    "Score each company independently."
)

def ask_ai(prompt):
    if not st.session_state.get("api_key"):
        return "ERROR: No Anthropic key"
    try:
        client = anthropic.Anthropic(api_key=st.session_state["api_key"])
        r = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            system=SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        return r.content[0].text
    except Exception as e:
        return "ERROR: " + str(e)

def parse_json(raw):
    clean = re.sub(r"```json|```","",raw).strip()
    try: return json.loads(clean)
    except: pass
    m = re.search(r"\[.*\]", clean, re.DOTALL)
    if m:
        try: return json.loads(m.group())
        except: pass
    m = re.search(r"\{.*\}", clean, re.DOTALL)
    if m:
        try: return json.loads(m.group())
        except: pass
    return []

# ── CONTACT ROLE LOGIC ────────────────────────────
def get_target_roles(emp_raw):
    try:
        count = int(str(emp_raw).replace(",","").split("-")[0].split("–")[0].strip())
    except:
        count = 300
    if count <= 50:
        return {
            "primary"  : ["CEO / Founder / Owner", "VP of Sales", "Head of Operations"],
            "secondary": ["Director of Technology", "Sales Manager"],
            "note"     : "Small company — CEO is a valid primary contact."
        }
    elif count <= 200:
        return {
            "primary"  : ["VP of Sales", "Head of Operations", "Director of Revenue Operations"],
            "secondary": ["COO", "Head of CRM", "Director of Sales Operations"],
            "note"     : "Growing company — focus on sales and ops leaders. CEO is secondary."
        }
    elif count <= 1000:
        return {
            "primary"  : ["Director of Revenue Operations", "VP Revenue Operations", "Head of CRM"],
            "secondary": ["Salesforce Manager", "Director of Sales Operations", "Director of IT Applications"],
            "note"     : "Mid-market — target CRM and RevOps leaders. Do not contact CEO."
        }
    else:
        return {
            "primary"  : ["Salesforce Platform Owner", "VP Revenue Operations", "Director of Revenue Operations"],
            "secondary": ["Head of CRM", "Director of IT Applications", "Enterprise Architect"],
            "note"     : "Enterprise — target Salesforce and RevOps leaders only. Never CEO."
        }

# ── DATA SOURCES ──────────────────────────────────
def apollo_search(industry, location, emp_range, count):
    key = st.session_state.get("apollo_key","")
    if not key: return []
    try:
        r = requests.post(
            "https://api.apollo.io/v1/mixed_companies/search",
            headers={"Content-Type":"application/json","X-Api-Key":key},
            json={"q_organization_keyword_tags":[industry],"organization_locations":[location],
                  "organization_num_employees_ranges":[emp_range],"page":1,"per_page":count},
            timeout=10
        )
        return r.json().get("organizations",[])
    except: return []

def tavily_search(query, max_results=10):
    key = st.session_state.get("tavily_key","")
    if not key: return []
    try:
        r = requests.post(
            "https://api.tavily.com/search",
            headers={"Content-Type":"application/json"},
            json={"api_key":key,"query":query,"search_depth":"basic","max_results":max_results},
            timeout=8
        )
        return r.json().get("results",[])
    except: return []

def news_search(company):
    try:
        r = requests.get(
            "https://news.google.com/rss/search",
            params={"q":'"'+company+'" Salesforce OR CRM OR funding',"hl":"en-US","gl":"US"},
            timeout=5
        )
        items = re.findall(r"<title>(.*?)</title>", r.text)[1:3]
        return [re.sub(r"<.*?>|&amp;|&quot;|&#39;","",i).strip() for i in items if len(i)>10]
    except: return []

# ── DISCOVERY FUNCTIONS ───────────────────────────
def score_company(company_data):
    prompt = (
        "Score this company for Salesforce consultancy fit."
        " Company=" + (company_data.get("name") or "") +
        " Industry=" + (company_data.get("industry","")) +
        " Employees=" + str(company_data.get("employees","")) +
        " Revenue=" + (company_data.get("revenue","")) +
        " Description=" + (company_data.get("description",""))[:150] +
        " Technologies=" + str(company_data.get("technologies",[])[:5]) +
        SCORING +
        ' Return ONLY: {"score":75,"why_fit":"one sentence","trigger":"one signal","best_contact":"best title","icp":"ICP1-6"}'
    )
    r = parse_json(ask_ai(prompt))
    if isinstance(r, dict): return r
    return {"score":65,"why_fit":"Potential fit","trigger":"Review manually","best_contact":"VP of Sales","icp":"ICP3"}

def discover_apollo(industry, location, size, count):
    size_map = {
        "1-50 employees":"1,50","50-200 employees":"50,200",
        "200-500 employees":"200,500","500-2,000 employees":"500,2000",
        "2,000-10,000 employees":"2000,10000","10,000+ employees":"10000,100000","Any size":"1,100000"
    }
    orgs = apollo_search(industry, location, size_map.get(size,"200,5000"), count)
    if not orgs: return []
    leads = []
    prog  = st.progress(0)
    for i, org in enumerate(orgs):
        prog.progress((i+1)/len(orgs))
        emp  = org.get("estimated_num_employees",0) or 0
        tech = [t.get("name","") for t in org.get("technologies",[])[:6]]
        sc   = score_company({"name":org.get("name",""),"industry":org.get("industry",""),
                               "employees":str(emp),"revenue":org.get("annual_revenue_printed",""),
                               "description":org.get("short_description",""),"technologies":tech})
        leads.append({
            "company":org.get("name",""),"industry":org.get("industry",""),
            "employees":str(emp),"revenue":org.get("annual_revenue_printed",""),
            "location":(org.get("city","") + ", " + org.get("state","")),
            "technologies":tech,"description":(org.get("short_description","") or "")[:150],
            "score":sc.get("score",65),"why_fit":sc.get("why_fit",""),"trigger":sc.get("trigger",""),
            "icp":sc.get("icp",""),"best_contact":sc.get("best_contact",""),
            "target_roles":get_target_roles(emp),"news_signals":news_search(org.get("name","")),
            "source":"Apollo Verified","verified":True,"found_at":datetime.now().strftime("%Y-%m-%d %H:%M")
        })
    prog.empty()
    return sorted(leads, key=lambda x: x.get("score",0), reverse=True)

def discover_tavily(industry, location, signals, count):
    """
    Run MULTIPLE Tavily queries to get enough results.
    This is the fix for only returning 1 lead.
    """
    queries = [
        industry + " companies " + location + " Salesforce CRM 2024 2025",
        industry + " business " + location + " " + (signals or "hiring sales operations"),
        "top " + industry + " companies " + location + " technology CRM",
        industry + " firms " + location + " revenue growth expansion",
    ]
    all_results = []
    seen_titles = set()
    for q in queries:
        results = tavily_search(q, max_results=8)
        for r in results:
            t = r.get("title","")
            if t and t not in seen_titles:
                seen_titles.add(t)
                all_results.append(r)
    if not all_results: return []

    search_text = "\n".join([
        (r.get("title","") + " — " + (r.get("content",""))[:200])
        for r in all_results[:20]
    ])

    prompt = (
        "From these web search results, identify exactly " + str(count) +
        " real US companies in " + industry + " near " + location +
        " that need Salesforce consultancy help."
        "\n\nSearch results:\n" + search_text +
        "\n\nRules:"
        " Use companies mentioned in the search results."
        " If fewer are found in results, you may add well-known " + industry + " companies from " + location + " that you know exist."
        " Never invent unknown company names."
        " Return exactly " + str(count) + " companies."
        + SCORING +
        " Return ONLY a JSON array of exactly " + str(count) + " items:"
        + '[{"company":"company name",'
        + '"industry":"their industry",'
        + '"employees":"estimate",'
        + '"revenue":"estimate",'
        + '"location":"city, state",'
        + '"why_fit":"specific ICP reason",'
        + '"trigger":"specific buying signal",'
        + '"score":75,'
        + '"icp":"ICP1-6",'
        + '"source":"Tavily Web Search"}]'
    )
    raw = ask_ai(prompt)
    result = parse_json(raw)
    if not isinstance(result, list): return []
    for lead in result:
        emp_str = str(lead.get("employees",""))
        try: emp_count = int(re.search(r"\d+", emp_str).group())
        except: emp_count = 200
        lead["target_roles"] = get_target_roles(emp_count)
        lead["verified"]     = False
        lead["found_at"]     = datetime.now().strftime("%Y-%m-%d %H:%M")
    return sorted(result, key=lambda x: x.get("score",0), reverse=True)

def discover_ai(industry, location, revenue, size, signals, count):
    """AI fallback that returns EXACTLY the requested number."""
    prompt = (
        "List exactly " + str(count) + " well-known US companies that:"
        " are genuinely in the " + industry + " industry,"
        " are based in or near " + location + ","
        " have revenue around " + revenue + ","
        " have " + size + ","
        " and are likely to need Salesforce consultancy help."
        "\nRules: Only name companies you are certain exist."
        " You MUST return exactly " + str(count) + " companies."
        " Do not return fewer. Fill to " + str(count) + " with any real "
        + industry + " companies near " + location + " if needed."
        + SCORING +
        " Return ONLY a JSON array of exactly " + str(count) + " items:"
        + '[{"company":"real company name","industry":"industry",'
        + '"employees":"count","revenue":"revenue","location":"city, state",'
        + '"why_fit":"reason","trigger":"signal","score":75,'
        + '"icp":"ICP1-6","source":"AI Estimate — verify before outreach"}]'
    )
    raw    = ask_ai(prompt)
    result = parse_json(raw)
    if not isinstance(result, list): return []
    for lead in result:
        emp_str = str(lead.get("employees",""))
        try: emp_count = int(re.search(r"\d+", emp_str).group())
        except: emp_count = 200
        lead["target_roles"] = get_target_roles(emp_count)
        lead["verified"]     = False
        lead["found_at"]     = datetime.now().strftime("%Y-%m-%d %H:%M")
    return sorted(result, key=lambda x: x.get("score",0), reverse=True)

# ── RESULTS DISPLAY FUNCTION ──────────────────────
def show_results(leads):
    """Reusable results display — used in both Search and Results tabs."""
    if not leads:
        st.info("No results yet.")
        return

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total",     len(leads))
    m2.metric("Hot 80+",   len([l for l in leads if l.get("score",0) >= 80]))
    m3.metric("Verified",  len([l for l in leads if l.get("verified")]))
    avg = int(sum(l.get("score",0) for l in leads)/len(leads)) if leads else 0
    m4.metric("Avg Score", str(avg) + "/100")
    st.markdown("---")

    for i, lead in enumerate(leads):
        score  = lead.get("score",0)
        label  = "Hot" if score >= 80 else "Warm" if score >= 60 else "Cold"
        src    = " [Verified]" if lead.get("verified") else " [AI Estimate]"
        emp    = lead.get("employees","")

        with st.expander(
            lead.get("company","") + "   |   " + str(score) + "/100   |   " + label + src,
            expanded=(i < 2)
        ):
            ca, cb = st.columns([3,1])
            with ca:
                st.markdown("**Industry**");      st.write(lead.get("industry","—"))
                st.markdown("**Why they fit**");  st.write(lead.get("why_fit","—"))
                st.markdown("**Buying signal**"); st.write(lead.get("trigger","—"))
                if lead.get("technologies"):
                    st.caption("Tech: " + ", ".join(lead["technologies"][:4]))
                if lead.get("news_signals"):
                    for n in lead["news_signals"]: st.caption("— " + n)
            with cb:
                st.metric("Score",    str(score) + "/100")
                st.markdown("**Employees**"); st.write(emp or "—")
                st.markdown("**Revenue**");   st.write(lead.get("revenue","—"))
                st.markdown("**Location**");  st.write(lead.get("location","—"))
                st.markdown("**ICP**");       st.write(lead.get("icp","—"))

            roles = lead.get("target_roles",{})
            if roles:
                st.markdown("---")
                st.markdown("**Who to Contact**")
                st.caption(roles.get("note",""))
                all_roles = roles.get("primary",[]) + roles.get("secondary",[])
                for idx, role in enumerate(all_roles[:4]):
                    li_url = (
                        "https://www.linkedin.com/search/results/people/?keywords=" +
                        (role + " " + lead.get("company","")).replace(" ","%20")
                    )
                    pri = "Primary" if idx < len(roles.get("primary",[])) else "Secondary"
                    st.markdown(str(idx+1) + ". **" + role + "** — " + pri + "   [LinkedIn](" + li_url + ")")

            st.markdown("---")
            if st.button("Copy company name", key="copy_" + str(i) + "_" + lead.get("company","")):
                st.code(lead.get("company",""), language=None)
                st.caption("Paste this into the Company Research tool.")

# ── CSV EXPORT FUNCTION ───────────────────────────
def build_csv(leads):
    output = io.StringIO()
    fields = ["company","industry","employees","revenue","location",
              "score","icp","why_fit","trigger","best_contact","source","found_at"]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for lead in leads:
        row = {k: lead.get(k,"") for k in fields}
        writer.writerow(row)
    return output.getvalue()

# ══════════════════════════════════════════════════
# MAIN UI — NO TABS — Everything on one page
# ══════════════════════════════════════════════════
st.markdown("## Foundree42 — Lead Discovery")
st.markdown("Find US companies that need Salesforce help. Results appear instantly below.")
st.markdown("---")

# ── SEARCH FORM ───────────────────────────────────
st.markdown("### Search Criteria")
c1, c2 = st.columns(2)
with c1:
    s_industry  = st.text_input("Industry",  placeholder="e.g. Healthcare, Manufacturing, Financial Services")
    s_location  = st.text_input("Location",  placeholder="e.g. Arizona, Phoenix AZ, United States")
    s_signals   = st.text_area("Buying Signals", placeholder="e.g. hiring Salesforce Admin, recent funding...", height=90)
with c2:
    s_revenue   = st.selectbox("Revenue",      ["Any revenue","Under $10M","$10M - $50M","$50M - $500M","$500M - $3B","$1B+","Over $3B"])
    s_size      = st.selectbox("Company Size", ["Any size","1-50 employees","50-200 employees","200-500 employees","500-2,000 employees","2,000-10,000 employees","10,000+ employees"])
    s_count     = st.slider("Number of leads to find", 3, 15, 8)
    s_min_score = st.slider("Minimum fit score",       0, 100, 60)

st.markdown("---")
if st.button("Find Leads", type="primary"):
    if not st.session_state.get("api_key"):
        st.error("Add your Anthropic API key in the sidebar.")
    elif not s_industry or not s_location:
        st.error("Industry and Location are required.")
    else:
        all_leads    = []
        used_sources = []

        # Apollo first
        if st.session_state.get("apollo_key"):
            with st.spinner("Searching Apollo verified database..."):
                apollo_leads = discover_apollo(s_industry, s_location, s_size, s_count)
            if apollo_leads:
                all_leads += apollo_leads
                used_sources.append("Apollo (" + str(len(apollo_leads)) + ")")
                st.success("Apollo found " + str(len(apollo_leads)) + " verified companies")
            else:
                st.warning("Apollo returned no results. Trying Tavily and AI...")

        # Tavily — multiple queries for more results
        if st.session_state.get("tavily_key"):
            existing = [l.get("company","").lower() for l in all_leads]
            needed   = max(s_count - len(all_leads), s_count)
            with st.spinner("Searching live web via Tavily (multiple queries)..."):
                tavily_leads = discover_tavily(s_industry, s_location, s_signals or "Salesforce CRM hiring scaling", needed)
            new_ones = [l for l in tavily_leads if l.get("company","").lower() not in existing]
            if new_ones:
                all_leads += new_ones
                used_sources.append("Tavily (" + str(len(new_ones)) + ")")

        # AI fallback — always runs if still under count
        if len(all_leads) < s_count:
            still_needed = s_count - len(all_leads)
            existing     = [l.get("company","").lower() for l in all_leads]
            with st.spinner("AI finding " + str(still_needed) + " more companies..."):
                ai_leads = discover_ai(s_industry, s_location, s_revenue, s_size,
                                       s_signals or "CRM scaling sales", still_needed)
            new_ai = [l for l in ai_leads if l.get("company","").lower() not in existing]
            if new_ai:
                all_leads += new_ai
                used_sources.append("AI (" + str(len(new_ai)) + ")")

        if all_leads:
            # Deduplicate and filter
            seen, dedup = set(), []
            for l in sorted(all_leads, key=lambda x: x.get("score",0), reverse=True):
                name = l.get("company","").lower()
                if name not in seen and l.get("score",0) >= s_min_score:
                    seen.add(name)
                    dedup.append(l)

            st.session_state["discovered_leads"] = dedup
            st.session_state["search_done"]      = True
        else:
            st.error("No leads found. Try broader criteria.")

# ── RESULTS — shown immediately on same page ──────
if st.session_state.get("search_done") and st.session_state.get("discovered_leads"):
    leads = st.session_state["discovered_leads"]
    st.markdown("---")
    st.markdown("### Results — " + str(len(leads)) + " leads found")
    show_results(leads)

    # Export section right below results
    st.markdown("---")
    st.markdown("### Export")
    exp_min = st.slider("Minimum score to export", 0, 100, 60, key="exp_slider")
    to_export = [l for l in leads if l.get("score",0) >= exp_min]
    st.caption(str(len(to_export)) + " leads ready to export")

    if to_export:
        st.download_button(
            label    = "Download CSV (" + str(len(to_export)) + " leads)",
            data     = build_csv(to_export),
            file_name= "foundree42_leads_" + datetime.now().strftime("%Y%m%d_%H%M") + ".csv",
            mime     = "text/csv",
            type     = "primary"
        )
        st.caption(
            "Download the CSV then upload it in the "
            "Foundree42 Research Tool to batch research all companies at once."
        )
