from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
import json
import logging
import sys
import os
from datetime import date

from app.api.deps import get_current_user
from app.services.langgraph_service import build_graph

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


@router.post("/")
async def generate_blog(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    topic = body.get("topic")
    api_key = body.get(
        "api_key", ""
    ).strip()  # Get API key from request, default to empty

    # If no API key provided, use the developer's API key from environment
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY", "")

    msg = f"🚀 Generate request received. User: {user}. Topic: {topic[:50] if topic else 'EMPTY'}..."
    logger.info(msg)
    print(msg, flush=True)

    if not topic or not topic.strip():
        logger.error("❌ Topic is empty!")
        return {"error": "Topic is required"}

    async def event_generator():
        try:
            logger.debug("Building LangGraph...")
            print("Building LangGraph...", flush=True)

            graph = build_graph(api_key=api_key)

            logger.debug("Graph built successfully")
            print("✅ Graph built successfully", flush=True)

            # Send immediate feedback
            yield {
                "event": "log",
                "data": json.dumps(
                    {"status": "✅ Connected. Building graph..."}, default=str
                ),
            }

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

            # Use astream() — the async version — so we don't block the event loop.
            # This lets SSE events flush to the frontend in real-time.
            logger.info("🔄 Starting graph.astream()...")
            print("🔄 Starting graph stream execution...", flush=True)

            async for step in graph.astream(inputs, stream_mode="updates"):
                update_count += 1
                final_state = step

                # Log EVERY update
                print(
                    f"📡 Received step #{update_count}: {list(step.keys()) if isinstance(step, dict) else type(step)}",
                    flush=True,
                )

                # Extract and log node name
                if isinstance(step, dict) and len(step) == 1:
                    node_name = list(step.keys())[0]
                    if node_name != last_node:
                        msg = f"➡️ Node: {node_name}"
                        logger.info(msg)
                        print(msg, flush=True)
                        last_node = node_name

                # Send progress update
                update_json = json.dumps(step, default=str)
                print(
                    f"📤 Sending update event #{update_count}, size: {len(update_json)} bytes",
                    flush=True,
                )
                yield {
                    "event": "update",
                    "data": update_json,
                }
                logger.debug(f"  Update {update_count}: yielded to SSE")

            logger.info(f"✅ Graph completed. Total updates: {update_count}")
            print(f"✅ Graph stream completed with {update_count} updates", flush=True)

            # Extract final content from the last streamed state
            final_md = ""
            if final_state:
                for node_name, node_output in final_state.items():
                    if isinstance(node_output, dict) and "final" in node_output:
                        final_md = node_output["final"]
                        logger.debug(f"Extracted final markdown: {len(final_md)} chars")
                        break

            if not final_md and final_state:
                logger.warning("No final field found in last state, using raw state")
                final_md = json.dumps(final_state, default=str)

            logger.debug("📤 Sending final event...")
            yield {
                "event": "final",
                "data": json.dumps({"final": final_md}, default=str),
            }

            logger.info("✅ Generation completed successfully")
            print("✅ Successfully completed blog generation", flush=True)

        except Exception as e:
            error_msg = f"❌ ERROR in stream: {type(e).__name__}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            print(error_msg, flush=True)
            yield {
                "event": "error",
                "data": json.dumps({"error": error_msg}, default=str),
            }

    # Return SSE response with proper headers
    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
