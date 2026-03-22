from __future__ import annotations

import operator
import re
from typing import TypedDict, List, Annotated

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.services.cloudinary_service import upload_image

# ============================================================
# STATE
# ============================================================


class State(TypedDict):
    topic: str
    sections: Annotated[List[tuple[int, str]], operator.add]
    final: str
    md_with_placeholders: str
    image_specs: list


# ============================================================
# LLM
# ============================================================


def get_llm(api_key: str):
    return ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=api_key)


# ============================================================
# NODES
# ============================================================


def planner_node(state: State, llm):
    res = llm.invoke(
        [
            SystemMessage(content="Create blog outline"),
            HumanMessage(content=state["topic"]),
        ]
    )
    return {"sections": [(1, res.content)]}


def writer_node(state: State, llm):
    content = llm.invoke(
        [
            SystemMessage(content="Write full blog with placeholders like [[IMAGE_1]]"),
            HumanMessage(content=state["sections"][0][1]),
        ]
    )
    return {"md_with_placeholders": content.content}


# ============================================================
# IMAGE PLANNING
# ============================================================


def decide_images(state: State, llm):
    prompt = f"""
Find max 2 images needed in this blog.
Return placeholders like [[IMAGE_1]] and description.
{state['md_with_placeholders']}
"""
    res = llm.invoke([HumanMessage(content=prompt)])

    # Simplified parsing
    return {
        "image_specs": [
            {
                "placeholder": "[[IMAGE_1]]",
                "prompt": "technical diagram explaining topic",
            }
        ]
    }


# ============================================================
# GEMINI IMAGE GENERATION
# ============================================================


def generate_image_bytes(prompt: str, api_key: str) -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    resp = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=prompt,
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )

    for part in resp.parts:
        if part.inline_data:
            return part.inline_data.data

    raise Exception("No image generated")


# ============================================================
# IMAGE GENERATION + CLOUDINARY
# ============================================================


def generate_and_replace_images(state: State, api_key: str):
    md = state["md_with_placeholders"]

    for i, spec in enumerate(state["image_specs"], start=1):
        try:
            img_bytes = generate_image_bytes(spec["prompt"], api_key)

            url = upload_image(img_bytes, f"blog_image_{i}")

            img_md = f"![image]({url})"

            md = md.replace(spec["placeholder"], img_md)

        except Exception as e:
            md = md.replace(spec["placeholder"], f"*Image failed: {e}*")

    return {"final": md}


# ============================================================
# GRAPH
# ============================================================


def build_graph(api_key: str):

    llm = get_llm(api_key)

    def planner(state):
        return planner_node(state, llm)

    def writer(state):
        return writer_node(state, llm)

    def image_planner(state):
        return decide_images(state, llm)

    def image_generator(state):
        return generate_and_replace_images(state, api_key)

    g = StateGraph(State)

    g.add_node("planner", planner)
    g.add_node("writer", writer)
    g.add_node("image_planner", image_planner)
    g.add_node("image_generator", image_generator)

    g.add_edge(START, "planner")
    g.add_edge("planner", "writer")
    g.add_edge("writer", "image_planner")
    g.add_edge("image_planner", "image_generator")
    g.add_edge("image_generator", END)

    return g.compile()
