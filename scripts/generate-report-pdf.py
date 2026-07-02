# Python helper script that generates a FinSage financial report PDF using ReportLab.
# Invoked via subprocess from the Next.js API route.
# Receives JSON data on stdin, writes PDF bytes to stdout.
import sys, json, io
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def fmt(amount):
    formatted = f"{abs(amount):,.0f}"
    return f"{'-' if amount < 0 else ''}\u20b9{formatted}"

def build_report(data):
    user = data["user"]
    month = data["month"]
    month_label = data["monthLabel"]
    fin = data["financial"]
    health = data["health"]
    trend = data["trend"]
    categories = data["categories"]
    goals = data["goals"]
    recent = data["recent"]

    EMERALD = HexColor("#10b981")
    EMERALD_DARK = HexColor("#047857")
    AMBER = HexColor("#f59e0b")
    ROSE = HexColor("#f43f5e")
    SLATE_50 = HexColor("#f8fafc")
    SLATE_100 = HexColor("#f1f5f9")
    SLATE_200 = HexColor("#e2e8f0")
    SLATE_500 = HexColor("#64748b")
    SLATE_700 = HexColor("#334155")
    SLATE_900 = HexColor("#0f172a")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("T", parent=styles.Title, fontSize=24, textColor=SLATE_900, fontName="Helvetica-Bold", spaceAfter=4)
    subtitle_style = ParagraphStyle("S", parent=styles.Normal, fontSize=11, textColor=SLATE_500, spaceAfter=20)
    h1_style = ParagraphStyle("H1", parent=styles.Heading1, fontSize=16, textColor=EMERALD_DARK, spaceBefore=18, spaceAfter=10, fontName="Helvetica-Bold")
    body_style = ParagraphStyle("B", parent=styles.Normal, fontSize=10, textColor=SLATE_700, leading=14, spaceAfter=6)
    metric_label = ParagraphStyle("ML", parent=styles.Normal, fontSize=8, textColor=SLATE_500, alignment=1)
    metric_value = ParagraphStyle("MV", parent=styles.Normal, fontSize=16, textColor=SLATE_900, fontName="Helvetica-Bold", alignment=1)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=50, rightMargin=50, topMargin=50, bottomMargin=50,
                            title=f"FinSage AI Report - {month}", author="FinSage AI", subject="Personal Financial Report")
    story = []

    story.append(Paragraph("FinSage AI", ParagraphStyle("Brand", parent=styles.Normal, fontSize=10, textColor=EMERALD_DARK, fontName="Helvetica-Bold")))
    story.append(Paragraph("Personal Financial Report", title_style))
    story.append(Paragraph(f"Prepared for {user['name']} \u00b7 {month_label} \u00b7 Generated {data['generatedDate']}", subtitle_style))

    story.append(Table([[""]], colWidths=[510], rowHeights=[2], style=TableStyle([("BACKGROUND", (0,0), (-1,-1), EMERALD)])))
    story.append(Spacer(1, 16))

    story.append(Paragraph("Executive Summary", h1_style))
    savings = fin["totalIncome"] - fin["totalExpense"]
    savings_color = EMERALD if savings >= 0 else ROSE
    kpi = [
        [Paragraph("TOTAL INCOME", metric_label), Paragraph("TOTAL EXPENSE", metric_label), Paragraph("NET SAVINGS", metric_label), Paragraph("SAVINGS RATE", metric_label)],
        [Paragraph(fmt(fin["totalIncome"]), metric_value),
         Paragraph(fmt(fin["totalExpense"]), metric_value),
         Paragraph(fmt(savings), ParagraphStyle("V2", parent=metric_value, textColor=savings_color)),
         Paragraph(f"{fin['savingsRate']:.1f}%", ParagraphStyle("V3", parent=metric_value, textColor=savings_color))],
    ]
    story.append(Table(kpi, colWidths=[127.5]*4, style=TableStyle([
        ("BACKGROUND", (0,0), (-1,0), SLATE_50),
        ("BOX", (0,0), (-1,-1), 0.5, SLATE_200),
        ("INNERGRID", (0,0), (-1,-1), 0.5, SLATE_200),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ])))
    story.append(Spacer(1, 8))

    if fin["totalIncome"] > 0:
        if fin["savingsRate"] >= 20:
            rate_note = "above the recommended 20% threshold \u2014 excellent financial discipline."
        elif fin["savingsRate"] >= 10:
            rate_note = "below the recommended 20% but still positive \u2014 consider increasing your savings."
        else:
            rate_note = "a concern \u2014 immediate action is recommended to reduce expenses."
        summary_text = f"In {month_label}, you earned <b>{fmt(fin['totalIncome'])}</b> and spent <b>{fmt(fin['totalExpense'])}</b>, resulting in a {'positive' if savings >= 0 else 'negative'} net savings of <b>{fmt(abs(savings))}</b>. Your savings rate is <b>{fin['savingsRate']:.1f}%</b>, which is {rate_note}"
    else:
        summary_text = f"No income was recorded for {month_label}. Add income transactions to receive a complete analysis."
    story.append(Paragraph(summary_text, body_style))

    story.append(Paragraph("Financial Health Score", h1_style))
    score = health["score"]
    hcolor = EMERALD if score >= 85 else HexColor("#22c55e") if score >= 70 else AMBER if score >= 50 else HexColor("#f97316") if score >= 30 else ROSE
    budget_used = f"{round(fin['totalExpense']/fin['monthlyBudget']*100)}%" if fin["monthlyBudget"] > 0 else "\u2014"
    hdata = [
        [Paragraph("SCORE", metric_label), Paragraph("GRADE", metric_label), Paragraph("BUDGET USED", metric_label), Paragraph("GOALS", metric_label)],
        [Paragraph(f"{score}/100", ParagraphStyle("HV", parent=metric_value, textColor=hcolor, fontSize=20)),
         Paragraph(health["grade"], ParagraphStyle("HG", parent=metric_value, textColor=hcolor)),
         Paragraph(budget_used, metric_value),
         Paragraph(str(len(goals)), metric_value)],
    ]
    story.append(Table(hdata, colWidths=[127.5]*4, style=TableStyle([
        ("BACKGROUND", (0,0), (-1,0), SLATE_50),
        ("BOX", (0,0), (-1,-1), 0.5, SLATE_200),
        ("INNERGRID", (0,0), (-1,-1), 0.5, SLATE_200),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ])))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Score Breakdown:</b>", body_style))
    bd = health["breakdown"]
    bdata = [
        ["Factor", "Score", "Max", "Weight"],
        ["Savings Ratio", str(bd["savings"]), "30", "30%"],
        ["Expense Control", str(bd["expenses"]), "20", "20%"],
        ["Budget Discipline", str(bd["budget"]), "20", "20%"],
        ["Goal Progress", str(bd["goals"]), "15", "15%"],
        ["Emergency Fund", str(bd["emergency"]), "15", "15%"],
    ]
    story.append(Table(bdata, colWidths=[200, 80, 80, 80], style=TableStyle([
        ("BACKGROUND", (0,0), (-1,0), EMERALD_DARK),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTSIZE", (0,0), (-1,0), 9),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,1), (-1,-1), 9),
        ("ALIGN", (1,0), (-1,-1), "CENTER"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, SLATE_50]),
        ("GRID", (0,0), (-1,-1), 0.25, SLATE_200),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ])))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Recommendations:</b>", body_style))
    for r in health["recommendations"][:4]:
        story.append(Paragraph(f"\u2022 {r}", body_style))

    story.append(Paragraph("Spending by Category", h1_style))
    if not categories:
        story.append(Paragraph("No expenses recorded for this month.", body_style))
    else:
        cat_data = [["Category", "Amount", "% of Total", "Txns"]]
        for c in categories:
            pct = f"{(c['amount']/fin['totalExpense']*100):.1f}%" if fin["totalExpense"] > 0 else "0%"
            cat_data.append([c["category"], fmt(c["amount"]), pct, str(c["count"])])
        cat_data.append(["TOTAL", fmt(fin["totalExpense"]), "100%", str(sum(c["count"] for c in categories))])
        story.append(Table(cat_data, colWidths=[180, 110, 90, 80], style=TableStyle([
            ("BACKGROUND", (0,0), (-1,0), EMERALD_DARK),
            ("TEXTCOLOR", (0,0), (-1,0), white),
            ("FONTSIZE", (0,0), (-1,0), 9),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,1), (-1,-1), 9),
            ("ALIGN", (1,0), (-1,-1), "RIGHT"),
            ("ROWBACKGROUNDS", (0,1), (-1,-2), [white, SLATE_50]),
            ("BACKGROUND", (0,-1), (-1,-1), SLATE_100),
            ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
            ("GRID", (0,0), (-1,-1), 0.25, SLATE_200),
            ("TOPPADDING", (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ])))

    story.append(Paragraph("6-Month Income vs Expense Trend", h1_style))
    tdata = [["Month", "Income", "Expense", "Savings", "Savings Rate"]]
    for t in trend:
        s = t["income"] - t["expense"]
        sr = f"{(s/t['income']*100):.1f}%" if t["income"] > 0 else "\u2014"
        tdata.append([t["month"], fmt(t["income"]), fmt(t["expense"]), fmt(s), sr])
    story.append(Table(tdata, colWidths=[70, 110, 110, 110, 80], style=TableStyle([
        ("BACKGROUND", (0,0), (-1,0), EMERALD_DARK),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTSIZE", (0,0), (-1,0), 9),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,1), (-1,-1), 9),
        ("ALIGN", (1,0), (-1,-1), "RIGHT"),
        ("ALIGN", (0,0), (0,-1), "CENTER"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, SLATE_50]),
        ("GRID", (0,0), (-1,-1), 0.25, SLATE_200),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ])))

    story.append(Paragraph("Savings Goals Progress", h1_style))
    if not goals:
        story.append(Paragraph("No savings goals set.", body_style))
    else:
        gdata = [["Goal", "Target", "Saved", "Progress", "Priority"]]
        for g in goals:
            pct = min(100, round(g["currentAmount"]/g["targetAmount"]*100))
            gdata.append([g["title"], fmt(g["targetAmount"]), fmt(g["currentAmount"]), f"{pct}%", g["priority"]])
        story.append(Table(gdata, colWidths=[150, 100, 100, 70, 70], style=TableStyle([
            ("BACKGROUND", (0,0), (-1,0), EMERALD_DARK),
            ("TEXTCOLOR", (0,0), (-1,0), white),
            ("FONTSIZE", (0,0), (-1,0), 9),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,1), (-1,-1), 9),
            ("ALIGN", (1,0), (-1,-1), "RIGHT"),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, SLATE_50]),
            ("GRID", (0,0), (-1,-1), 0.25, SLATE_200),
            ("TOPPADDING", (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ])))

    story.append(Paragraph("Recent Transactions", h1_style))
    if not recent:
        story.append(Paragraph("No transactions recorded.", body_style))
    else:
        xdata = [["Date", "Type", "Category", "Note", "Amount"]]
        for t in recent[:12]:
            note = (t.get("note") or "")[:30]
            xdata.append([t["date"], t["type"], t["category"], note, f"{'+' if t['type']=='Income' else '-'}{fmt(t['amount'])}"])
        story.append(Table(xdata, colWidths=[70, 60, 90, 180, 90], style=TableStyle([
            ("BACKGROUND", (0,0), (-1,0), EMERALD_DARK),
            ("TEXTCOLOR", (0,0), (-1,0), white),
            ("FONTSIZE", (0,0), (-1,0), 9),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,1), (-1,-1), 8.5),
            ("ALIGN", (4,0), (4,-1), "RIGHT"),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, SLATE_50]),
            ("GRID", (0,0), (-1,-1), 0.25, SLATE_200),
            ("TOPPADDING", (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ])))

    story.append(Spacer(1, 20))
    story.append(Table([[""]], colWidths=[510], rowHeights=[1], style=TableStyle([("BACKGROUND", (0,0), (-1,-1), SLATE_200)])))
    story.append(Spacer(1, 6))
    story.append(Paragraph("FinSage AI \u00b7 Personal Budget Planning Agent", ParagraphStyle("F1", parent=styles.Normal, fontSize=8, textColor=SLATE_500, alignment=1)))
    story.append(Paragraph("This report is generated from your recorded financial data. Predictions and recommendations are for informational purposes only and do not constitute investment advice.", ParagraphStyle("F2", parent=styles.Normal, fontSize=7, textColor=SLATE_500, alignment=1)))

    doc.build(story)
    return buf.getvalue()

if __name__ == "__main__":
    raw = sys.stdin.read()
    data = json.loads(raw)
    pdf_bytes = build_report(data)
    sys.stdout.buffer.write(pdf_bytes)
