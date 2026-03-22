from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
import json

from app.api.deps import get_current_user
from app.services.langgraph_service import build_graph

router = APIRouter(prefix="/generate", tags=["Generation"])


@router.post("/")
async def generate_blog(request: Request, user=Depends(get_current_user)):
    body = await request.json()

    topic = body.get("topic")
    api_key = body.get("api_key")

    graph = build_graph(api_key)

    async def event_generator():
        inputs = {
            "topic": topic,
            "sections": [],
            "plan": None,
            "evidence": [],
            "final": ""
        }

        try:
            for step in graph.stream(inputs, stream_mode="updates"):
                yield {
                    "event": "update",
                    "data": json.dumps(step, default=str)
                }

            final = graph.invoke(inputs)

            yield {
                "event": "final",
                "data": json.dumps(final, default=str)
            }

        except Exception as e:
            yield {
                "event": "error",
                "data": str(e)
            }

    return EventSourceResponse(event_generator())