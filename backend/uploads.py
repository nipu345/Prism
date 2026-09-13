from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from db import supabase
from auth import get_current_user_and_company
import pandas as pd
import io
import time

router = APIRouter()

REQUIRED_COLUMNS = {"date", "revenue", "units_sold", "product", "region"}

CONTENT_TYPES = {
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
}


class SalesFileError(ValueError):
    """A file that can't be turned into the five standard columns."""


def detect_columns(df: pd.DataFrame) -> dict:
    mapping = {}
    for col in df.columns:
        col_lower = str(col).lower().strip()
        if "date" in col_lower or "time" in col_lower:
            mapping["date"] = col
        elif "revenue" in col_lower or "sales" in col_lower or "amount" in col_lower:
            mapping["revenue"] = col
        elif "unit" in col_lower or "quantity" in col_lower or "qty" in col_lower:
            mapping["units_sold"] = col
        elif "product" in col_lower or "item" in col_lower or "sku" in col_lower:
            mapping["product"] = col
        elif "region" in col_lower or "location" in col_lower or "area" in col_lower:
            mapping["region"] = col
    return mapping


def load_sales_file(contents: bytes, filename: str) -> pd.DataFrame:
    """Parse an uploaded CSV/Excel file into the five standard columns.

    Runs when a file is uploaded AND again when it's analyzed. It has to be
    the same function in both places: storage keeps the original file, so
    anything done to it on upload (reading .xlsx as a spreadsheet, treating
    'Sales Amount' as revenue) must be redone when it's read back, or the
    analysis sees columns it doesn't recognize and fails.
    """
    name = (filename or "").lower()
    ext = next((e for e in CONTENT_TYPES if name.endswith(e)), None)
    if ext is None:
        raise SalesFileError("Only CSV and Excel files are supported")

    try:
        df = pd.read_csv(io.BytesIO(contents)) if ext == ".csv" else pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise SalesFileError(f"Couldn't read this file as {'CSV' if ext == '.csv' else 'Excel'}")

    if df.empty:
        raise SalesFileError("File contains no rows")

    mapping = detect_columns(df)
    missing = REQUIRED_COLUMNS - set(mapping)
    if missing:
        raise SalesFileError(
            f"Couldn't find a column for: {', '.join(sorted(missing))}. "
            f"Your columns were: {', '.join(map(str, df.columns))}"
        )

    df = df.rename(columns={v: k for k, v in mapping.items()})

    try:
        pd.to_datetime(df["date"])
        pd.to_numeric(df["revenue"])
        pd.to_numeric(df["units_sold"])
    except Exception:
        raise SalesFileError(
            "Could not parse the date/revenue/units_sold columns — check for missing or non-numeric values"
        )

    return df


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    auth=Depends(get_current_user_and_company),
):
    user, company_id = auth
    storage_path = None
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        # a bad file is now a 400 with the reason, rather than a 200 "warning"
        # the frontend never read (it went on to analyze upload_id=undefined)
        try:
            df = load_sales_file(contents, file.filename)
        except SalesFileError as e:
            raise HTTPException(status_code=400, detail=str(e))

        ext = next(e for e in CONTENT_TYPES if file.filename.lower().endswith(e))
        storage_path = f"{user.id}/{int(time.time())}_{file.filename}"
        supabase.storage.from_("uploads").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": CONTENT_TYPES[ext]}
        )

        try:
            upload_record = supabase.table("uploads").insert({
                "filename": file.filename,
                "row_count": len(df),
                "uploaded_by": user.id,
                "storage_url": storage_path
            }).execute()
        except Exception:
            # don't leave an orphaned file in storage if the DB insert fails
            supabase.storage.from_("uploads").remove([storage_path])
            raise

        return {
            "status": "success",
            "upload_id": upload_record.data[0]["id"],
            "filename": file.filename,
            "rows": len(df),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_uploads(auth=Depends(get_current_user_and_company)):
    user, company_id = auth
    try:
        teammates = supabase.table("users").select("id").eq("company_id", company_id).execute()
        teammate_ids = [row["id"] for row in teammates.data] or [user.id]

        uploads = (
            supabase.table("uploads")
            .select("*")
            .in_("uploaded_by", teammate_ids)
            .order("uploaded_at", desc=True)
            .execute()
        )

        # an upload's id is not the same as its report's id, so the
        # frontend needs the report_id to actually link to results
        upload_ids = [u["id"] for u in uploads.data]
        report_by_upload = {}
        if upload_ids:
            reports = (
                supabase.table("reports")
                .select("id, upload_id, status")
                .in_("upload_id", upload_ids)
                .execute()
            )
            for r in reports.data:
                report_by_upload[r["upload_id"]] = {"report_id": r["id"], "report_status": r["status"]}

        return [
            {**u, **report_by_upload.get(u["id"], {"report_id": None, "report_status": None})}
            for u in uploads.data
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
