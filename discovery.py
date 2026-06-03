import streamlit as st
import groq
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

# ── CSS ───────────────────────────────────────────
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
    .stTabs [data-baseweb="tab-list"] { background: #e8ecf1; border-radius: 12px; padding: 4px; box-shadow: inset 3px 3px 6px #c5cad4, inset -3px -3px 6px #ffffff; gap: 4px; border-bottom: none !important; }
    .stTabs [data-baseweb="tab"] { background: transparent !important; color: #718096 !important; border-radius: 8px !important; font-weight: 500 !important; font-size: 0.875rem !important; border: none !important; padding: 8px 20px !important; }
    .stTabs [aria-selected="true"] { background: #e8ecf1 !important; color: #4a6fa5 !important; box-shadow: 3px 3px 6px #c5cad4, -3px -3px 6px #ffffff !important; }
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
    code { background: #dde1e7 !important; color: #2d3748 !important; border-radius: 4px !important; padding: 2px 6px !important; font-size: 0.85rem !important; }
    .verified-tag { background: #eafaf1; color: #27ae60; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; font-family: 'Segoe UI', sans-serif; }
    .ai-tag { background: #fef9e7; color: #f39c12; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; font-family: 'Segoe UI', sans-serif; }
    #MainMenu { visibility: hidden; }
    footer { visibility: hidden; }
</style>
""", unsafe_allow_html=True)

# ── SESSION STATE ─────────────────────────────────
if "discovered_leads" not in st.session_state:
    st.session_state["discovered_leads"] = []
if "api_key" not in st.session_state:
    st.session_state["api_key"] = ""
if "apollo_key" not in st.session_state:
    st.session_state["apollo_key"] = ""
if "tavily_key" not in st.session_state:
    st.session_state["tavily_key"] = ""

# ── SIDEBAR ───────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div class="sidebar-brand">
        <h2>Foundree42</h2>
        <p>Lead Discovery</p>
    </div>
    """, unsafe_allow_html=True)

    groq_key = st.text_input("Groq API Key", type="password", placeholder="sk-...")
    if groq_key:
        st.session_state["api_key"] = groq_key
        st.success("Groq active")

    apollo_key = st.text_input("Apollo API Key", type="password", placeholder="apollo...")
    if apollo_key:
        st.session_state["apollo_key"] = apollo_key
        st.success("Apollo active — verified data")

    tavily_key = st.text_input("Tavily API Key", type="password", placeholder="tvly-...")
    if tavily_key:
        st.session_state["tavily_key"] = tavily_key
        st.success("Tavily active — live search")

    st.markdown("---")

    leads = st.session_state["discovered_leads"]
    st.metric("Leads Found",  len(leads))
    st.metric("Hot (80+)",    len([l for l in leads if l.get("score",0) >= 80]))
    st.metric("Verified",     len([l for l in leads if "Apollo" in l.get("source","")]))

    st.markdown("---")

    # Accuracy indicator
    acc = 60
    if st.session_state.get("apollo_key"): acc += 20
    if st.session_state.get("tavily_key"): acc += 12
    if st.session_state.get("api_key"):    acc += 3
    acc = min(acc, 95)

    st.metric("Est. Accuracy", str(acc) + "%")
    st.markdown("---")
    st.caption("Foundree42 — US Market")
    st.caption("Use results in the Research tool")

# ── AI SETUP ──────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a lead generation specialist for Foundree42, "
    "a US-based Salesforce consultancy. "
    "You find real, verifiable US companies that need Salesforce help. "
    "Foundree42 ICPs: "
    "ICP1=$1B+ needing partner reset. "
    "ICP2=$500M-$3B needing governance. "
    "ICP3=$50M-$500M needing virtual support. "
    "ICP4=any size with messy Salesforce needing audit. "
    "ICP5=replacing offshore Salesforce delivery. "
    "ICP6=needing trusted senior delivery. "
    "Always return valid JSON only. No markdown. No explanation."
)

SCORING_GUIDE = (
    " Score 0-100 for Salesforce fit: "
    "90-100=perfect fit. 75-89=strong. 60-74=moderate. Below 60=weak. "
    "Score each company independently based on its specific situation."
)

def ask_ai(prompt):
    if not st.session_state.get("api_key"):
        return "ERROR: No Groq key"
    try:
        client = groq.Groq(api_key=st.session_state["api_key"])
        resp   = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt}
            ],
            temperature=0.4,
            max_tokens=2500
        )
        return resp.choices[0].message.content
    except Exception as e:
        return "ERROR: " + str(e)

def parse_json(raw):
    clean = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(clean)
    except:
        pass
    match = re.search(r"\[.*\]", clean, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass
    match = re.search(r"\{.*\}", clean, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass
    return []

# ── DATA SOURCES ──────────────────────────────────
def apollo_search(industry, location, emp_range, count):
    key = st.session_state.get("apollo_key","")
    if not key:
        return []
    try:
        url     = "https://api.apollo.io/v1/mixed_companies/search"
        headers = {"Content-Type": "application/json", "X-Api-Key": key}
        payload = {
            "q_organization_keyword_tags"      : [industry],
            "organization_locations"           : [location],
            "organization_num_employees_ranges": [emp_range],
            "page"    : 1,
            "per_page": count
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        return resp.json().get("organizations",[])
    except:
        return []

def tavily_search(query, max_results=8):
    key = st.session_state.get("tavily_key","")
    if not key:
        return []
    try:
        url     = "https://api.tavily.com/search"
        payload = {
            "api_key"      : key,
            "query"        : query,
            "search_depth" : "basic",
            "max_results"  : max_results
        }
        resp = requests.post(url, headers={"Content-Type":"application/json"}, json=payload, timeout=8)
        return resp.json().get("results",[])
    except:
        return []

def news_search(company):
    try:
        url    = "https://news.google.com/rss/search"
        params = {"q": company + " Salesforce OR CRM OR funding", "hl": "en-US", "gl": "US"}
        resp   = requests.get(url, params=params, timeout=5)
        items  = re.findall(r"<title>(.*?)</title>", resp.text)[1:3]
        return [re.sub(r"<.*?>|&amp;|&quot;|&#39;","",i).strip() for i in items if len(i) > 10]
    except:
        return []

# ── CONTACT ROLE LOGIC ────────────────────────────
def get_target_roles(employee_count):
    """
    Returns prioritised contact roles based on company size.
    CEO is valid for small companies but deprioritised for larger ones.
    """
    try:
        count = int(str(employee_count).replace(",","").split("-")[0].strip())
    except:
        count = 200  # Default to mid-size if unknown

    if count <= 50:
        # Small company — CEO is a valid first contact
        return [
            "CEO / Founder / Owner",
            "VP of Sales",
            "Head of Operations",
            "Director of Technology",
            "Sales Manager"
        ]
    elif count <= 200:
        # Growing company — CEO deprioritised, ops/sales leaders first
        return [
            "VP of Sales",
            "Head of Operations",
            "Director of Revenue Operations",
            "Head of CRM",
            "COO",
            "Director of Sales Operations",
            "CEO (if no other contacts found)"
        ]
    elif count <= 1000:
        # Mid-market — dedicated CRM/RevOps roles exist
        return [
            "Director of Revenue Operations",
            "VP Revenue Operations",
            "Head of CRM",
            "Salesforce Manager",
            "Director of Sales Operations",
            "VP of Sales Operations",
            "Director of IT Applications"
        ]
    else:
        # Enterprise — never contact CEO
        return [
            "VP Revenue Operations",
            "Salesforce Platform Owner",
            "Director of Revenue Operations",
            "Head of CRM",
            "Director of IT Applications",
            "VP of Information Technology",
            "Enterprise Architect"
        ]

# ── CORE DISCOVERY FUNCTIONS ──────────────────────
def score_company_with_ai(company_data):
    """Score a single company using AI analysis."""
    prompt = (
        "Score this company for Salesforce consultancy fit for Foundree42."
        " Company: " + (company_data.get("name") or company_data.get("company","")) + "."
        " Industry: " + (company_data.get("industry","")) + "."
        " Employees: " + str(company_data.get("employees","")) + "."
        " Revenue: " + (company_data.get("revenue","")) + "."
        " Description: " + (company_data.get("description",""))[:200] + "."
        " Technologies: " + str(company_data.get("technologies",[])[:5]) + "."
        + SCORING_GUIDE +
        " Return ONLY this JSON:"
        + '{"score":75,'
        + '"why_fit":"one specific sentence ICP match reason",'
        + '"trigger":"one specific buying signal for this company",'
        + '"best_contact":"most relevant job title based on company size",'
        + '"icp":"ICP1/ICP2/ICP3/ICP4/ICP5/ICP6"}'
    )
    raw    = ask_ai(prompt)
    result = parse_json(raw)
    if isinstance(result, dict):
        return result
    return {"score": 65, "why_fit": "Potential Salesforce fit", "trigger": "Review manually", "best_contact": "VP of Sales", "icp": "ICP3"}

def discover_via_apollo(industry, location, size, count):
    """Pull verified companies from Apollo database."""
    size_map = {
        "1-50 employees"         : "1,50",
        "50-200 employees"       : "50,200",
        "200-500 employees"      : "200,500",
        "500-2,000 employees"    : "500,2000",
        "2,000-10,000 employees" : "2000,10000",
        "10,000+ employees"      : "10000,100000",
        "Any size"               : "1,100000"
    }
    emp_range = size_map.get(size, "200,5000")
    orgs      = apollo_search(industry, location, emp_range, count)

    if not orgs:
        return []

    leads = []
    progress = st.progress(0)
    for i, org in enumerate(orgs):
        progress.progress((i+1) / len(orgs))
        employees = org.get("estimated_num_employees",0) or 0
        tech_names = [t.get("name","") for t in org.get("technologies",[])[:6]]
        target_roles = get_target_roles(employees)

        company_data = {
            "name"       : org.get("name",""),
            "industry"   : org.get("industry",""),
            "employees"  : str(employees),
            "revenue"    : org.get("annual_revenue_printed",""),
            "description": org.get("short_description",""),
            "technologies": tech_names
        }

        scoring = score_company_with_ai(company_data)

        # Get live news signal
        news = news_search(org.get("name",""))

        leads.append({
            "company"      : org.get("name",""),
            "industry"     : org.get("industry",""),
            "employees"    : str(employees),
            "revenue"      : org.get("annual_revenue_printed",""),
            "location"     : (org.get("city","") + ", " + org.get("state","")),
            "website"      : org.get("website_url",""),
            "technologies" : tech_names,
            "description"  : org.get("short_description","")[:150],
            "score"        : scoring.get("score", 65),
            "why_fit"      : scoring.get("why_fit",""),
            "trigger"      : scoring.get("trigger",""),
            "icp"          : scoring.get("icp",""),
            "target_roles" : target_roles,
            "best_contact" : scoring.get("best_contact",""),
            "news_signals" : news,
            "source"       : "Apollo Verified",
            "verified"     : True,
            "found_at"     : datetime.now().strftime("%Y-%m-%d %H:%M")
        })
    progress.empty()
    return sorted(leads, key=lambda x: x.get("score",0), reverse=True)

def discover_via_tavily(industry, location, signals, count):
    """Find companies via Tavily live web search."""
    query   = (
        "US " + industry + " company " + location +
        " Salesforce CRM " + signals +
        " 2024 2025"
    )
    results = tavily_search(query, max_results=12)

    if not results:
        return []

    # Extract company mentions from search results
    search_text = "\n".join([
        (r.get("title","") + " — " + r.get("content","")[:200])
        for r in results
    ])

    prompt = (
        "From these real web search results, identify up to " + str(count) +
        " real US companies in " + industry + " near " + location +
        " that would benefit from Salesforce consultancy."
        "\n\nSearch results:\n" + search_text +
        "\n\nRules:"
        " Only use companies explicitly mentioned in the search results above."
        " Never invent company names."
        " Each company must appear in the search text."
        + SCORING_GUIDE +
        " Return ONLY a JSON array:"
        + '[{"company":"exact name from search results",'
        + '"industry":"their industry",'
        + '"employees":"estimate if mentioned or unknown",'
        + '"revenue":"if mentioned or unknown",'
        + '"location":"city, state if mentioned",'
        + '"why_fit":"specific reason from search context",'
        + '"trigger":"specific signal from search results",'
        + '"score":75,'
        + '"icp":"best matching ICP",'
        + '"source":"Tavily Web Search"}]'
        + " If fewer than " + str(count) + " real companies found, return fewer."
        " Do not pad with invented names."
    )

    raw    = ask_ai(prompt)
    result = parse_json(raw)

    if not isinstance(result, list):
        return []

    # Add target roles based on employee count
    for lead in result:
        emp_str  = str(lead.get("employees",""))
        try:
            emp_count = int(re.search(r"\d+", emp_str).group())
        except:
            emp_count = 200
        lead["target_roles"] = get_target_roles(emp_count)
        lead["verified"]     = False
        lead["found_at"]     = datetime.now().strftime("%Y-%m-%d %H:%M")

    return sorted(result, key=lambda x: x.get("score",0), reverse=True)

def discover_via_ai_fallback(industry, location, revenue, size, signals, count):
    """
    AI fallback — only used when no other source available.
    Uses strict instructions to return only well-known companies.
    """
    prompt = (
        "List " + str(count) + " well-known, verifiable US companies that:"
        " 1. Are genuinely in the " + industry + " industry."
        " 2. Are based in or near " + location + "."
        " 3. Have revenue around " + revenue + "."
        " 4. Have " + size + "."
        " 5. Are likely to need Salesforce consultancy help."
        "\n\nIMPORTANT RULES:"
        " Only name companies you are 100% certain exist."
        " Only name companies that actually operate in " + industry + "."
        " These must be real companies anyone can Google right now."
        " Do not invent or hallucinate company names."
        " If you are not sure a company exists, do not include it."
        + SCORING_GUIDE +
        " Return ONLY a JSON array:"
        + '[{"company":"real verified company name",'
        + '"industry":"their specific industry",'
        + '"employees":"verified employee count",'
        + '"revenue":"verified revenue",'
        + '"location":"city, state",'
        + '"why_fit":"specific ICP match reason",'
        + '"trigger":"specific buying signal",'
        + '"score":75,'
        + '"icp":"ICP1/ICP2/ICP3/ICP4/ICP5/ICP6",'
        + '"source":"AI Estimate — verify before outreach"}]'
    )
    raw    = ask_ai(prompt)
    result = parse_json(raw)

    if not isinstance(result, list):
        return []

    for lead in result:
        emp_str = str(lead.get("employees",""))
        try:
            emp_count = int(re.search(r"\d+", emp_str).group())
        except:
            emp_count = 200
        lead["target_roles"] = get_target_roles(emp_count)
        lead["verified"]     = False
        lead["found_at"]     = datetime.now().strftime("%Y-%m-%d %H:%M")

    return sorted(result, key=lambda x: x.get("score",0), reverse=True)

# ── MAIN UI ───────────────────────────────────────
st.markdown("## Foundree42 — Lead Discovery")
st.markdown(
    "Find US companies that are strong Salesforce consultancy prospects. "
    "Results feed directly into the Research and Outreach tool."
)
st.markdown("---")

# ── SEARCH FORM ───────────────────────────────────
tab_search, tab_results, tab_export = st.tabs([
    "Search", "Results", "Export"
])

with tab_search:
    st.markdown("### Define Your Search")

    c1, c2 = st.columns(2)
    with c1:
        s_industry = st.text_input(
            "Industry",
            placeholder="e.g. Manufacturing, Financial Services, Healthcare"
        )
        s_location = st.text_input(
            "Location",
            placeholder="e.g. Arizona, Phoenix AZ, United States"
        )
        s_signals  = st.text_area(
            "Buying Signals to Look For",
            placeholder=(
                "e.g. hiring Salesforce Admin, recent funding, "
                "replacing CRM, scaling sales team, post-merger..."
            ),
            height=100
        )
    with c2:
        s_revenue = st.selectbox("Revenue", [
            "Any revenue",
            "Under $10M",
            "$10M - $50M",
            "$50M - $500M",
            "$500M - $3B",
            "$1B+",
            "Over $3B"
        ])
        s_size = st.selectbox("Company Size", [
            "Any size",
            "1-50 employees",
            "50-200 employees",
            "200-500 employees",
            "500-2,000 employees",
            "2,000-10,000 employees",
            "10,000+ employees"
        ])
        s_count    = st.slider("Number of leads to find", 3, 15, 8)
        s_min_score = st.slider("Minimum fit score to show", 0, 100, 60)

    # Source selection
    st.markdown("---")
    st.markdown("**Data Sources**")
    src1, src2, src3 = st.columns(3)
    with src1:
        use_apollo = st.checkbox(
            "Apollo (verified)",
            value=bool(st.session_state.get("apollo_key")),
            disabled=not bool(st.session_state.get("apollo_key")),
            help="Requires Apollo API key in sidebar"
        )
    with src2:
        use_tavily = st.checkbox(
            "Tavily (live web)",
            value=bool(st.session_state.get("tavily_key")),
            disabled=not bool(st.session_state.get("tavily_key")),
            help="Requires Tavily API key in sidebar"
        )
    with src3:
        use_ai = st.checkbox(
            "AI fallback",
            value=True,
            help="Uses AI when other sources return no results"
        )

    st.markdown("---")

    if st.button("Find Leads", type="primary"):
        if not st.session_state.get("api_key"):
            st.error("Add your Groq API key in the sidebar.")
        elif not s_industry or not s_location:
            st.error("Industry and Location are required.")
        else:
            all_leads   = []
            used_sources = []

            # Apollo first — most accurate
            if use_apollo and st.session_state.get("apollo_key"):
                with st.spinner("Searching Apollo verified database..."):
                    apollo_leads = discover_via_apollo(
                        s_industry, s_location, s_size, s_count
                    )
                if apollo_leads:
                    all_leads    += apollo_leads
                    used_sources.append("Apollo (" + str(len(apollo_leads)) + " companies)")
                    st.success("Apollo found " + str(len(apollo_leads)) + " verified companies")
                else:
                    st.warning("Apollo returned no results for this search. Trying other sources...")

            # Tavily second — live web search
            if use_tavily and st.session_state.get("tavily_key"):
                existing_names = [l.get("company","").lower() for l in all_leads]
                with st.spinner("Searching live web via Tavily..."):
                    tavily_leads = discover_via_tavily(
                        s_industry, s_location,
                        s_signals or "Salesforce CRM hiring scaling",
                        s_count
                    )
                # Only add new companies not already found
                new_tavily = [
                    l for l in tavily_leads
                    if l.get("company","").lower() not in existing_names
                ]
                if new_tavily:
                    all_leads    += new_tavily
                    used_sources.append("Tavily (" + str(len(new_tavily)) + " companies)")

            # AI fallback only if nothing found
            if not all_leads and use_ai:
                st.info("Using AI fallback — please verify results before outreach.")
                with st.spinner("AI generating lead list..."):
                    ai_leads = discover_via_ai_fallback(
                        s_industry, s_location,
                        s_revenue, s_size,
                        s_signals or "CRM scaling sales",
                        s_count
                    )
                if ai_leads:
                    all_leads    += ai_leads
                    used_sources.append("AI Estimate")

            if all_leads:
                # Filter by min score
                filtered = [l for l in all_leads if l.get("score",0) >= s_min_score]
                # Deduplicate by company name
                seen  = set()
                dedup = []
                for l in sorted(filtered, key=lambda x: x.get("score",0), reverse=True):
                    name = l.get("company","").lower()
                    if name not in seen:
                        seen.add(name)
                        dedup.append(l)

                st.session_state["discovered_leads"] = dedup
                st.success(
                    "Found " + str(len(dedup)) + " leads. "
                    "Sources: " + ", ".join(used_sources) + ". "
                    "Go to Results tab."
                )
            else:
                st.error("No leads found. Try broader criteria or check your API keys.")

# ── RESULTS TAB ───────────────────────────────────
with tab_results:
    leads = st.session_state.get("discovered_leads",[])

    if not leads:
        st.info("No results yet. Go to Search tab and run a search.")
    else:
        # Summary
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Found",   len(leads))
        m2.metric("Hot (80+)",     len([l for l in leads if l.get("score",0) >= 80]))
        m3.metric("Apollo Verified", len([l for l in leads if l.get("verified")]))
        m4.metric("Avg Score",     str(int(sum(l.get("score",0) for l in leads) / len(leads))) + "/100")

        st.markdown("---")

        # Filter
        rf1, rf2 = st.columns(2)
        with rf1:
            r_filter = st.selectbox("Filter by source", ["All","Apollo Verified","Tavily Web Search","AI Estimate"])
        with rf2:
            r_min = st.slider("Minimum score", 0, 100, 0, key="results_min")

        filtered = [
            l for l in leads
            if (r_filter == "All" or r_filter in l.get("source",""))
            and l.get("score",0) >= r_min
        ]

        st.caption("Showing " + str(len(filtered)) + " leads")
        st.markdown("---")

        for i, lead in enumerate(filtered):
            score    = lead.get("score",0)
            label    = "Hot" if score >= 80 else "Warm" if score >= 60 else "Cold"
            verified = lead.get("verified",False)
            src_tag  = " [Verified]" if verified else " [Estimate — verify]"
            emp      = lead.get("employees","")

            with st.expander(
                lead.get("company","") + "   |   " +
                str(score) + "/100   |   " + label + src_tag,
                expanded=(i < 3)
            ):
                col_a, col_b = st.columns([3,1])
                with col_a:
                    st.markdown("**Industry**")
                    st.write(lead.get("industry","—"))

                    st.markdown("**Why they fit**")
                    st.write(lead.get("why_fit","—"))

                    st.markdown("**Buying signal**")
                    st.write(lead.get("trigger","—"))

                    if lead.get("technologies"):
                        st.markdown("**Technologies**")
                        st.caption(", ".join(lead["technologies"][:5]))

                    if lead.get("news_signals"):
                        st.markdown("**Live News**")
                        for n in lead["news_signals"]:
                            st.caption("— " + n)

                with col_b:
                    st.metric("Fit Score", str(score) + "/100")
                    st.markdown("**Employees**")
                    st.write(emp or "—")
                    st.markdown("**Revenue**")
                    st.write(lead.get("revenue","—"))
                    st.markdown("**Location**")
                    st.write(lead.get("location","—"))
                    st.markdown("**ICP**")
                    st.write(lead.get("icp","—"))

                # Contact roles — size-aware
                target_roles = lead.get("target_roles",[])
                if target_roles:
                    st.markdown("---")
                    st.markdown("**Who to Contact**")

                    # Determine company size for context
                    try:
                        emp_count = int(str(emp).replace(",","").split("-")[0].strip())
                    except:
                        emp_count = 200

                    if emp_count <= 50:
                        st.caption("Small company — CEO is a valid contact alongside ops/sales leaders.")
                    elif emp_count <= 200:
                        st.caption("Growing company — focus on ops and sales leaders. CEO is secondary.")
                    else:
                        st.caption("Mid-market or enterprise — target CRM, RevOps and IT leaders directly.")

                    for role_idx, role in enumerate(target_roles[:4]):
                        li_url = (
                            "https://www.linkedin.com/search/results/people/?keywords=" +
                            (role + " " + lead.get("company","")).replace(" ","%20")
                        )
                        priority = "Primary" if role_idx == 0 else "Secondary"
                        st.markdown(
                            str(role_idx+1) + ". **" + role + "** — " +
                            priority + "   [Find on LinkedIn](" + li_url + ")"
                        )

                st.markdown("---")
                # Use in research tool button
                if st.button(
                    "Copy to Research Tool",
                    key="copy_" + str(i)
                ):
                    st.code(lead.get("company",""), language=None)
                    st.caption(
                        "Copy the company name above and paste it "
                        "into the Company Research tab of the main tool."
                    )

# ── EXPORT TAB ────────────────────────────────────
with tab_export:
    leads = st.session_state.get("discovered_leads",[])

    if not leads:
        st.info("No leads to export yet. Run a search first.")
    else:
        st.markdown("### Export Your Leads")
        st.markdown(
            "Download your leads as CSV to use in the "
            "Research tool or share with your team."
        )
        st.markdown("---")

        # Export filters
        ef1, ef2 = st.columns(2)
        with ef1:
            exp_min = st.slider("Minimum score to export", 0, 100, 60)
        with ef2:
            exp_verified = st.checkbox("Only export Apollo verified leads", value=False)

        to_export = [
            l for l in leads
            if l.get("score",0) >= exp_min
            and (not exp_verified or l.get("verified",False))
        ]

        st.caption("Ready to export: " + str(len(to_export)) + " leads")
        st.markdown("---")

        if to_export:
            # Build CSV
            output   = io.StringIO()
            fieldnames = [
                "company", "industry", "employees", "revenue",
                "location", "score", "icp", "why_fit", "trigger",
                "best_contact", "technologies", "source", "found_at"
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for lead in to_export:
                row = {k: lead.get(k,"") for k in fieldnames}
                row["technologies"] = ", ".join(lead.get("technologies",[]))
                writer.writerow(row)

            csv_content = output.getvalue()

            st.download_button(
                label    = "Download CSV (" + str(len(to_export)) + " leads)",
                data     = csv_content,
                file_name= "foundree42_leads_" + datetime.now().strftime("%Y%m%d_%H%M") + ".csv",
                mime     = "text/csv",
                type     = "primary"
            )

            # Preview table
            st.markdown("---")
            st.markdown("**Preview**")
            for lead in to_export[:5]:
                score = lead.get("score",0)
                st.markdown(
                    "**" + lead.get("company","") + "**   |   " +
                    str(score) + "/100   |   " +
                    lead.get("industry","") + "   |   " +
                    lead.get("location","")
                )
                st.caption(lead.get("why_fit","") + " — " + lead.get("trigger",""))

            if len(to_export) > 5:
                st.caption("... and " + str(len(to_export)-5) + " more in the CSV")

        st.markdown("---")
        st.markdown("### How to Use These Leads")
        st.markdown(
            "1. Download the CSV above\n"
            "2. Open the **Foundree42 Research Tool** in another tab\n"
            "3. Go to **Company Research** tab\n"
            "4. Type each company name and run **Run Full Pipeline**\n"
            "5. Save each one to the Lead Tracker\n\n"
            "The research tool gives you verified contacts, "
            "pitch strategy and personalised outreach messages for each company."
        )
