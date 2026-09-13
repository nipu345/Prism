from fastapi import APIRouter, HTTPException, Depends
from db import supabase
from auth import get_current_user_and_company
from agents import run_all_agents
from llm import GeminiNarrator
from notify import notify_report_ready
from uploads import load_sales_file, SalesFileError

router = APIRouter()
narrator = GeminiNarrator()


@router.post("/analyze/{upload_id}")
async def analyze(upload_id: str, auth=Depends(get_current_user_and_company)):
    user, company_id = auth
    try:
        upload = supabase.table("uploads").select("*").eq("id", upload_id).execute()
        if not upload.data:
            raise HTTPException(status_code=404, detail="Upload not found")
        upload_data = upload.data[0]

        # the upload row only stores who uploaded it — resolve their
        # company and make sure it matches the caller's before touching it
        owner = supabase.table("users").select("company_id").eq("id", upload_data["uploaded_by"]).execute()
        if not owner.data or owner.data[0]["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="You do not have access to this upload")

        # storage holds the file exactly as uploaded, so it goes back through
        # the same parser the upload used (Excel, header matching). Parsing
        # happens before the report row exists, so an unreadable file fails
        # cleanly instead of leaving a report stuck in "processing".
        file_bytes = supabase.storage.from_("uploads").download(upload_data["storage_url"])
        try:
            df = load_sales_file(file_bytes, upload_data["filename"])
        except SalesFileError as e:
            raise HTTPException(status_code=400, detail=str(e))

        report = supabase.table("reports").insert({
            "upload_id": upload_id,
            "company_id": company_id,
            "status": "processing"
        }).execute()
        report_id = report.data[0]["id"]

        results = run_all_agents(df)
        ai_summary = narrator.summarize(results)

        # per-scenario plain-English translation of each agent's technical
        # insight sentence (model name, ARIMA order, MAPE, etc. decoded) —
        # merges straight into the same dicts that get saved below, so no
        # separate DB column is needed
        plain_english = narrator.explain_scenarios(results)
        for key, explanation in plain_english.items():
            results[key]["plain_english"] = explanation

        update_payload = {
            "conservative": results["conservative"],
            "moderate": results["moderate"],
            "aggressive": results["aggressive"],
            "status": "complete",
        }
        if ai_summary:
            update_payload["ai_summary"] = ai_summary

        try:
            supabase.table("reports").update(update_payload).eq("id", report_id).execute()
        except Exception:
            # reports.ai_summary may not exist yet if the migration hasn't
            # been run — degrade gracefully instead of failing the whole analysis
            update_payload.pop("ai_summary", None)
            supabase.table("reports").update(update_payload).eq("id", report_id).execute()

        notify_report_ready(email=user.email, filename=upload_data["filename"], report_id=report_id)

        return {
            "report_id": report_id,
            "status": "complete",
            "results": results,
            "ai_summary": ai_summary,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}")
async def get_report(report_id: str, auth=Depends(get_current_user_and_company)):
    user, company_id = auth
    try:
        report = supabase.table("reports").select("*").eq("id", report_id).execute()
        if not report.data:
            raise HTTPException(status_code=404, detail="Report not found")

        report_data = report.data[0]
        if report_data.get("company_id") != company_id:
            raise HTTPException(status_code=403, detail="You do not have access to this report")

        # the report row doesn't carry the source filename, but the results
        # header shows it — pull it off the upload it came from
        upload = (
            supabase.table("uploads")
            .select("filename, row_count, uploaded_at")
            .eq("id", report_data["upload_id"])
            .execute()
        )
        if upload.data:
            report_data["filename"] = upload.data[0].get("filename")
            report_data["row_count"] = upload.data[0].get("row_count")
            report_data["uploaded_at"] = upload.data[0].get("uploaded_at")

        return report_data

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
