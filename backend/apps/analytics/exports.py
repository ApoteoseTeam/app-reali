import csv
from io import BytesIO, StringIO
from xml.sax.saxutils import escape

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    TableStyle,
)

FIELDS = {
    "date": "Data",
    "total_student_entries": "Entradas",
    "total_forecast_plates": "Previstos",
    "total_served_plates": "Servidos",
    "forecast_difference": "Desvio",
    "absolute_error": "Erro absoluto",
    "percentage_error": "Erro (%)",
    "compared_services": "Serviços comparados",
    "mae": "MAE",
    "wape": "WAPE (%)",
    "data_status": "Estado",
    "stale": "Pendente",
}


def report_file(rows, file_format, organization, scope, start, end, generated_at):
    keys = list(FIELDS)
    table = [list(FIELDS.values())]
    table += [
        [row.get(field) if row.get(field) is not None else "" for field in keys]
        for row in rows
    ]
    if file_format == "csv":
        stream = StringIO()
        csv.writer(stream).writerows(table)
        response = HttpResponse(
            "\ufeff" + stream.getvalue(), content_type="text/csv; charset=utf-8"
        )
    else:
        stream = BytesIO()
        doc = SimpleDocTemplate(
            stream,
            pagesize=landscape(A4),
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )
        styles = getSampleStyleSheet()
        content = [
            Paragraph("Reali | Relatório de merenda", styles["Title"]),
            Paragraph(
                escape(f"{organization} | {scope} | {start} a {end}"), styles["Normal"]
            ),
            Paragraph(
                escape(f"Gerado em {generated_at.isoformat(timespec='seconds')}"),
                styles["Normal"],
            ),
            Spacer(1, 12),
        ]
        if rows and any(row["coverage"] or row["stale"] for row in rows):
            grid = LongTable(
                table,
                repeatRows=1,
                colWidths=[62, 48, 50, 50, 44, 70, 52, 105, 44, 55, 80, 56],
            )
            grid.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#176342")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                        (
                            "ROWBACKGROUNDS",
                            (0, 1),
                            (-1, -1),
                            [colors.whitesmoke, colors.white],
                        ),
                    ]
                )
            )
            content.append(grid)
        else:
            content.append(
                Paragraph("Sem dados para o período selecionado.", styles["Normal"])
            )
        doc.build(content)
        response = HttpResponse(stream.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="reali-merenda-{start}-{end}.{file_format}"'
    )
    response["Cache-Control"] = "private, no-store"
    return response
