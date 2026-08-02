"""
PDF generation for reports — converts report JSON to downloadable PDFs.
"""
import io
import html
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle


def _clean(text: str) -> str:
    if not text:
        return ""
    s = str(text).replace("**", "").replace("*", "").replace("###", "").replace("##", "").replace("#", "")
    return html.escape(s.strip())


def _add_multiline_text(story: list, text: str, body_style, heading_style=None):
    """Parse multiline text/markdown into structured ReportLab paragraphs"""
    if not text:
        return
    lines = str(text).splitlines()
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            story.append(Spacer(1, 0.06 * inch))
            continue
        safe_text = html.escape(cleaned.lstrip("#-* ").strip())
        if cleaned.startswith("#"):
            style = heading_style if heading_style else body_style
            story.append(Paragraph(safe_text, style))
        elif cleaned.startswith("-") or cleaned.startswith("*"):
            story.append(Paragraph(f"• {safe_text}", body_style))
        else:
            story.append(Paragraph(safe_text, body_style))


def _fmt_currency(n, currency="INR"):
    """Always format currency strictly in INR (Rupees ₹)"""
    sym = "₹"
    if not isinstance(n, (int, float)):
        return f"{sym}0"
    if n >= 10000000: return f"{sym}{n/10000000:.2f}Cr"
    if n >= 100000: return f"{sym}{n/100000:.2f}L"
    return f"{sym}{int(n):,}"


def _fmt_num(n):
    if not isinstance(n, (int, float)):
        return "0"
    if n >= 10000000: return f"{n/10000000:.2f}Cr"
    if n >= 100000: return f"{n/100000:.2f}L"
    return f"{int(n):,}"


def profile_to_pdf(profile: dict) -> bytes:
    """Generate a PDF summary for an influencer profile."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=0.75 * inch, leftMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle", parent=styles["Heading1"],
        fontSize=20, spaceAfter=8, textColor=colors.HexColor("#1e1e1e"),
    )
    subtitle_style = ParagraphStyle(
        name="Subtitle", parent=styles["BodyText"],
        fontSize=12, spaceAfter=20, textColor=colors.HexColor("#666666"),
    )
    heading_style = ParagraphStyle(
        name="SectionHeading", parent=styles["Heading2"],
        fontSize=14, spaceBefore=18, spaceAfter=10, textColor=colors.HexColor("#1e1e1e"),
        borderPadding=(0, 0, 2, 0), borderStyle="solid", borderWidth=0
    )
    metric_label_style = ParagraphStyle(
        name="MetricLabel", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#999999"), alignment=1
    )
    metric_value_style = ParagraphStyle(
        name="MetricValue", parent=styles["Normal"],
        fontSize=14, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e1e1e"), alignment=1
    )

    story = []

    # Header
    name = profile.get("name", "Influencer Profile")
    handle = profile.get("handle", "")
    platform = profile.get("platform", "Unknown").title()
    story.append(Paragraph(_clean(name), title_style))
    story.append(Paragraph(f"{platform} • {handle}", subtitle_style))

    # Stats Table
    stats_data = [
        [
            Paragraph("FOLLOWERS", metric_label_style),
            Paragraph("ENG. RATE", metric_label_style),
            Paragraph("AVG LIKES", metric_label_style),
            Paragraph("AVG COMMENTS", metric_label_style),
            Paragraph("ROI PREDICTION", metric_label_style)
        ],
        [
            Paragraph(_fmt_num(profile.get("followers", 0)), metric_value_style),
            Paragraph(f"{profile.get('engagement_rate', 0)}%", metric_value_style),
            Paragraph(_fmt_num(profile.get("avg_likes", 0)), metric_value_style),
            Paragraph(_fmt_num(profile.get("avg_comments", 0)), metric_value_style),
            Paragraph(f"{profile.get('predicted_roi', 0)}x", metric_value_style)
        ]
    ]
    
    t = Table(stats_data, colWidths=[1.3 * inch] * 5)
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1, -1), colors.HexColor("#f9f9f9")),
        ('ROUNDEDCORNERS', [12, 12, 12, 12]),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3 * inch))

    # About
    story.append(Paragraph("About", heading_style))
    story.append(Paragraph(_clean(profile.get("bio", "No bio available.")), styles["Normal"]))
    
    # Niche
    niche = ", ".join(profile.get("niche", ["General"]))
    story.append(Paragraph(f"<b>Niches:</b> {niche}", styles["Normal"]))
    
    # Verified & Risk
    story.append(Paragraph(f"<b>Verified:</b> {'Yes' if profile.get('verified') else 'No'}", styles["Normal"]))
    story.append(Paragraph(f"<b>Risk Level:</b> {profile.get('risk_level', 'Unknown').upper()}", styles["Normal"]))

    doc.build(story)
    return buffer.getvalue()


def report_to_pdf(report: dict) -> bytes:
    """Generate a single PDF from report data."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=0.75 * inch, leftMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle", parent=styles["Heading1"],
        fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1a1a1a"),
    )
    heading_style = ParagraphStyle(
        name="SectionHeading", parent=styles["Heading2"],
        fontSize=14, spaceBefore=16, spaceAfter=8, textColor=colors.HexColor("#333333"),
    )
    body_style = ParagraphStyle(
        name="Body", parent=styles["Normal"],
        fontSize=10, spaceAfter=8, textColor=colors.HexColor("#444444"),
    )

    story = []
    data = report.get("report_data") or {}
    name = report.get("name", "Report")

    story.append(Paragraph(_clean(name), title_style))
    story.append(Spacer(1, 0.2 * inch))

    summary = data.get("summary", "")
    if summary:
        story.append(Paragraph("<b>Executive Summary</b>", heading_style))
        story.append(Paragraph(_clean(summary), body_style))
        story.append(Spacer(1, 0.15 * inch))

    key_insights = data.get("key_insights", [])
    if key_insights:
        story.append(Paragraph("<b>Key Insights</b>", heading_style))
        for insight in key_insights[:10]:
            story.append(Paragraph(f"• {_clean(str(insight))}", body_style))
        story.append(Spacer(1, 0.15 * inch))

    score = data.get("score")
    rec = data.get("recommendation", "")
    if score is not None or rec:
        story.append(Paragraph("<b>Assessment</b>", heading_style))
        if score is not None:
            story.append(Paragraph(f"Overall Score: {score}/100", body_style))
        if rec:
            story.append(Paragraph(f"Recommendation: {rec}", body_style))
        story.append(Spacer(1, 0.15 * inch))

    for section in data.get("sections", []):
        if section.get("heading"):
            story.append(Paragraph(_clean(section["heading"]), heading_style))
        if section.get("content"):
            story.append(Paragraph(_clean(section["content"]), body_style))
        story.append(Spacer(1, 0.1 * inch))

    brief = data.get("brief", "")
    if brief:
        story.append(Paragraph("<b>Marketing Brief</b>", heading_style))
        _add_multiline_text(story, brief, body_style, heading_style)

    doc.build(story)
    return buffer.getvalue()


def reports_to_combined_pdf(reports: list[dict]) -> bytes:
    """Combine multiple reports into one PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=0.75 * inch, leftMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle", parent=styles["Heading1"],
        fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1a1a1a"),
    )
    heading_style = ParagraphStyle(
        name="SectionHeading", parent=styles["Heading2"],
        fontSize=14, spaceBefore=16, spaceAfter=8, textColor=colors.HexColor("#333333"),
    )
    body_style = ParagraphStyle(
        name="Body", parent=styles["Normal"],
        fontSize=10, spaceAfter=8, textColor=colors.HexColor("#444444"),
    )
    story = []

    for i, report in enumerate(reports):
        if i > 0:
            story.append(PageBreak())
        data = report.get("report_data") or {}
        name = report.get("name", "Report")
        story.append(Paragraph(_clean(name), title_style))
        story.append(Spacer(1, 0.2 * inch))
        summary = data.get("summary", "")
        if summary:
            story.append(Paragraph("<b>Executive Summary</b>", heading_style))
            story.append(Paragraph(_clean(summary), body_style))
            story.append(Spacer(1, 0.15 * inch))
        key_insights = data.get("key_insights", [])
        if key_insights:
            valid_insights = [str(k).strip() for k in key_insights if str(k).strip()]
            if valid_insights:
                story.append(Paragraph("<b>Key Insights</b>", heading_style))
                for insight in valid_insights[:10]:
                    story.append(Paragraph(f"• {_clean(insight)}", body_style))
                story.append(Spacer(1, 0.15 * inch))
        score, rec = data.get("score"), data.get("recommendation", "")
        if score is not None or rec:
            story.append(Paragraph("<b>Assessment</b>", heading_style))
            if score is not None:
                story.append(Paragraph(f"Overall Score: {score}/100", body_style))
            if rec:
                story.append(Paragraph(f"Recommendation: {rec}", body_style))
            story.append(Spacer(1, 0.15 * inch))
        for section in data.get("sections", []):
            if section.get("heading"):
                story.append(Paragraph(_clean(section["heading"]), heading_style))
            if section.get("content"):
                story.append(Paragraph(_clean(section["content"]), body_style))
            story.append(Spacer(1, 0.1 * inch))
        brief = data.get("brief", "")
        if brief:
            story.append(Paragraph("<b>Marketing Brief</b>", heading_style))
            _add_multiline_text(story, brief, body_style, heading_style)

    doc.build(story)
    return buffer.getvalue()


def generate_brief_pdf(brief_data: dict) -> bytes:
    """Generate a standalone PDF document for campaign briefs with target completion dates (Refinement 11)"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        rightMargin=0.75 * inch, leftMargin=0.75 * inch,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(name="BriefTitle", parent=styles["Heading1"], fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1a1a1a"))
    heading_style = ParagraphStyle(name="BriefHeading", parent=styles["Heading2"], fontSize=13, spaceBefore=14, spaceAfter=6, textColor=colors.HexColor("#222222"))
    body_style = ParagraphStyle(name="BriefBody", parent=styles["Normal"], fontSize=10, spaceAfter=6, textColor=colors.HexColor("#444444"))

    story = []
    title = brief_data.get("title", "Campaign Brief")
    target_date = (datetime.now() + timedelta(days=14)).strftime("%B %d, %Y")
    
    story.append(Paragraph(_clean(title), title_style))
    story.append(Paragraph(f"<b>Target Execution Date:</b> {target_date}", body_style))
    story.append(Spacer(1, 0.15 * inch))

    content = brief_data.get("brief") or brief_data.get("content") or ""
    if content:
        _add_multiline_text(story, content, body_style, heading_style)

    doc.build(story)
    return buffer.getvalue()
