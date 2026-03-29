from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
import json
import logging
import sys
import asyncio
import uuid
from datetime import date

from app.api.deps import get_current_user
from app.services.langgraph_service import build_graph
from app.core.config import settings

# Setup logging to console AND file
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Also log to stdout so we can see it immediately in terminal
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

router = APIRouter(prefix="/generate", tags=["Generation"])

# In-memory job store
# Structure: { job_id: { "status": "running"|"done"|"error", "events": [...], "final": None, "error": None } }
jobs = {}


@router.post("/")
async def generate_blog(request: Request, user=Depends(get_current_user)):
    """
    Start a blog generation job and return the job_id.
    The actual generation runs in the background.
    Use GET /stream/{job_id} to stream the results.
    """
    body = await request.json()
    topic = body.get("topic")
    api_key = body.get("api_key", "").strip()

    if not api_key:
        api_key = settings.GOOGLE_API_KEY

    msg = f"🚀 Generate request received. User: {user}. Topic: {topic[:50] if topic else 'EMPTY'}..."
    logger.info(msg)
    print(msg, flush=True)

    if not topic or not topic.strip():
        logger.error("❌ Topic is empty!")
        return {"error": "Topic is required"}

    # Create job
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "running",
        "events": [],
        "final": None,
        "error": None,
    }

    # Start background task (non-blocking)
    asyncio.create_task(run_generation(job_id, topic, api_key))

    logger.info(f"[{job_id}] Job created. Stream at GET /generate/stream/{job_id}")
    print(f"[{job_id}] Job created", flush=True)

    return {"job_id": job_id}


async def run_generation(job_id: str, topic: str, api_key: str):
    """
    Background task that runs the LangGraph generation pipeline.
    Stores updates in jobs[job_id]["events"].
    """
    try:
        logger.debug(f"[{job_id}] Building LangGraph...")
        print(f"[{job_id}] Building LangGraph...", flush=True)

        graph = build_graph(api_key=api_key)

        logger.debug(f"[{job_id}] Graph built successfully")
        print(f"[{job_id}] ✅ Graph built successfully", flush=True)

        # Store initial event
        jobs[job_id]["events"].append(
            {"event": "log", "data": {"status": "✅ Connected. Building graph..."}}
        )

        inputs = {
            "topic": topic,
            "sections": [],
            "evidence": [],
            "plan": None,
            "mode": "",
            "needs_research": False,
            "queries": [],
            "as_of": date.today().isoformat(),
            "recency_days": 3650,
            "merged_md": "",
            "md_with_placeholders": "",
            "image_specs": [],
            "final": "",
        }

        final_state = None
        update_count = 0
        last_node = None

        logger.info(f"[{job_id}] 🔄 Starting graph.astream()...")
        print(f"[{job_id}] 🔄 Starting graph stream execution...", flush=True)

        async for step in graph.astream(inputs, stream_mode="updates"):
            update_count += 1
            final_state = step

            print(
                f"[{job_id}] 📡 Received step #{update_count}: {list(step.keys()) if isinstance(step, dict) else type(step)}",
                flush=True,
            )

            # Extract and log node name
            if isinstance(step, dict) and len(step) == 1:
                node_name = list(step.keys())[0]
                if node_name != last_node:
                    msg = f"[{job_id}] ➡️ Node: {node_name}"
                    logger.info(msg)
                    print(msg, flush=True)
                    last_node = node_name

            # Store update event in job
            jobs[job_id]["events"].append({"event": "update", "data": step})

            print(
                f"[{job_id}] 📤 Stored update event #{update_count}, total events: {len(jobs[job_id]['events'])}",
                flush=True,
            )

        logger.info(f"[{job_id}] ✅ Graph completed. Total updates: {update_count}")
        print(f"[{job_id}] ✅ Graph completed with {update_count} updates", flush=True)

        # Extract final content from the last streamed state
        final_md = ""
        if final_state:
            for node_name, node_output in final_state.items():
                if isinstance(node_output, dict) and "final" in node_output:
                    final_md = node_output["final"]
                    logger.debug(
                        f"[{job_id}] Extracted final markdown: {len(final_md)} chars"
                    )
                    break

        if not final_md and final_state:
            logger.warning(
                f"[{job_id}] No final field found in last state, using raw state"
            )
            final_md = json.dumps(final_state, default=str)

        # Store final event
        jobs[job_id]["events"].append({"event": "final", "data": {"final": final_md}})

        jobs[job_id]["status"] = "done"
        jobs[job_id]["final"] = final_md

        logger.info(f"[{job_id}] ✅ Generation completed successfully")
        print(f"[{job_id}] ✅ Successfully completed blog generation", flush=True)

    except Exception as e:
        error_msg = f"❌ ERROR: {type(e).__name__}: {str(e)}"
        logger.error(f"[{job_id}] {error_msg}", exc_info=True)
        print(f"[{job_id}] {error_msg}", flush=True)

        jobs[job_id]["events"].append({"event": "error", "data": {"error": error_msg}})

        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = error_msg


@router.get("/stream/{job_id}")
async def stream_generation(job_id: str):
    """
    Stream SSE events for a job.
    Continuously sends updates from jobs[job_id]["events"] until the job completes.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        sent_count = 0

        while True:
            job = jobs.get(job_id)
            if not job:
                logger.warning(f"[{job_id}] Job disappeared from store")
                break

            # Send all new events
            current_events = job["events"]
            while sent_count < len(current_events):
                event = current_events[sent_count]
                event_json = json.dumps(event["data"], default=str)
                yield f"event: {event['event']}\ndata: {event_json}\n\n"
                print(
                    f"[{job_id}] 📤 Streamed event #{sent_count + 1}: {event['event']}",
                    flush=True,
                )
                sent_count += 1

            # If job is done and all events sent, exit
            if job["status"] in ["done", "error"] and sent_count == len(current_events):
                logger.info(f"[{job_id}] Stream complete. Status: {job['status']}")
                print(
                    f"[{job_id}] Stream ended. Total events sent: {sent_count}",
                    flush=True,
                )
                break

            # Wait before checking again (allows new events to accumulate)
            await asyncio.sleep(0.1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
